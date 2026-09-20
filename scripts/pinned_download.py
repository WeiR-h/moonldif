"""Bounded, hash-pinned downloads for development verification dependencies.

Normal urllib TLS verification is retained. Only transient network failures are
retried; cache corruption, certificate failures and local I/O failures are fatal.
"""
import errno
import hashlib
import http.client
import os
from pathlib import Path
import re
import socket
import ssl
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request


class IntegrityError(ValueError):
    pass


def transient(error):
    if isinstance(error, urllib.error.HTTPError):
        return error.code in {408, 429, 500, 502, 503, 504}
    if isinstance(error, urllib.error.URLError):
        return transient(error.reason)
    if isinstance(error, ssl.SSLError):
        return False
    if isinstance(error, (TimeoutError, ConnectionError, http.client.IncompleteRead)):
        return True
    return isinstance(error, OSError) and error.errno in {
        errno.ECONNRESET, errno.ECONNABORTED, errno.ETIMEDOUT,
        errno.EHOSTUNREACH, errno.ENETUNREACH, socket.EAI_AGAIN,
    }


def download_pinned(url, destination, expected, *, max_bytes=16 * 1024 * 1024):
    """Return verified SHA-256; at most three requests (35s I/O timeout each).

    The timeout is urllib's socket timeout, not a total wall-clock deadline.
    Existing corrupt caches are reported, never silently overwritten. Temporary
    files live alongside the cache; only verified bytes become the final file.
    """
    if urllib.parse.urlsplit(url).scheme != 'https':
        raise ValueError('Pinned downloads require HTTPS')
    if not re.fullmatch('[0-9a-f]{64}', expected) or max_bytes <= 0:
        raise ValueError('Invalid pin or byte limit')
    destination = Path(destination)
    if destination.is_symlink():
        raise IntegrityError('Cache destination must not be a symbolic link')
    def verify(data):
        if len(data) > max_bytes:
            raise IntegrityError('Pinned download exceeds byte limit')
        if hashlib.sha256(data).hexdigest() != expected:
            raise IntegrityError('Pinned download hash mismatch; refusing use')
    if destination.exists():
        with destination.open('rb') as cached:
            verify(cached.read(max_bytes + 1))
        return expected
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=35) as response:
                if urllib.parse.urlsplit(response.geturl()).scheme != 'https':
                    raise IntegrityError('Pinned download redirected away from HTTPS')
                data = response.read(max_bytes + 1)
                if len(data) > max_bytes:
                    raise IntegrityError('Pinned download exceeds byte limit')
                length = response.headers.get('Content-Length')
                if length is not None and length.isdigit() and len(data) < int(length):
                    raise http.client.IncompleteRead(data, int(length) - len(data))
        except (OSError, http.client.HTTPException) as error:
            if attempt == 2 or not transient(error):
                raise
            print(f'Transient download failure; retry {attempt + 2}/3.', file=sys.stderr)
            time.sleep(0.5 * (2 ** attempt))
            continue
        verify(data)
        break
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=destination.name + '.', suffix='.part', delete=False) as output:
            temporary = Path(output.name)
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, destination)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return expected
