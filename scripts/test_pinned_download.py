"""Offline fault injection; no remote service is contacted by these tests."""
import hashlib
import http.client
import io
from pathlib import Path
import ssl
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
from pinned_download import download_pinned, IntegrityError

DATA = b'pinned-synthetic-archive'
PIN = hashlib.sha256(DATA).hexdigest()
URL = 'https://example.invalid/dependency.zip'


class Response(io.BytesIO):
    def __init__(self, data=DATA, length=None):
        super().__init__(data)
        self.headers = {'Content-Length': str(len(data) if length is None else length)}
    def geturl(self):
        return URL


class DownloadTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='moonldif-download-')
        self.addCleanup(self.folder.cleanup)
        self.file = Path(self.folder.name) / 'dependency.zip'
        self.sleep = patch('pinned_download.time.sleep').start()
        self.addCleanup(patch.stopall)
    def test_transient_reset_then_valid_cache_is_reusable(self):
        with patch('pinned_download.urllib.request.urlopen', side_effect=[ConnectionResetError(), Response()]) as fetch:
            self.assertEqual(download_pinned(URL, self.file, PIN), PIN)
            self.assertEqual(fetch.call_count, 2)
            self.assertEqual(download_pinned(URL, self.file, PIN), PIN)
            self.assertEqual(fetch.call_count, 2)
        self.assertEqual(self.file.read_bytes(), DATA)
        self.assertEqual(list(self.file.parent.glob('*.part')), [])
    def test_partial_response_retries_without_exposing_cache(self):
        with patch('pinned_download.urllib.request.urlopen', side_effect=[Response(b'part', len(DATA)), Response()]) as fetch:
            download_pinned(URL, self.file, PIN)
            self.assertEqual(fetch.call_count, 2)
        self.assertEqual(self.file.read_bytes(), DATA)
    def test_timeout_stops_after_three_attempts(self):
        with patch('pinned_download.urllib.request.urlopen', side_effect=urllib.error.URLError(TimeoutError())) as fetch:
            with self.assertRaises(urllib.error.URLError): download_pinned(URL, self.file, PIN)
            self.assertEqual(fetch.call_count, 3)
        self.assertFalse(self.file.exists())
    def test_certificate_failure_never_retries(self):
        for error in [ssl.SSLCertVerificationError('certificate'), urllib.error.URLError(ssl.SSLCertVerificationError('certificate'))]:
            with patch('pinned_download.urllib.request.urlopen', side_effect=error) as fetch:
                with self.assertRaises((ssl.SSLCertVerificationError, urllib.error.URLError)): download_pinned(URL, self.file, PIN)
                self.assertEqual(fetch.call_count, 1)
    def test_http_retry_classification(self):
        for code, attempts in [(404,1),(403,1),(429,3),(503,3)]:
            with patch('pinned_download.urllib.request.urlopen', side_effect=urllib.error.HTTPError(URL, code, 'synthetic', {}, None)) as fetch:
                with self.assertRaises(urllib.error.HTTPError): download_pinned(URL, self.file, PIN)
                self.assertEqual(fetch.call_count, attempts)
    def test_wrong_hash_never_retries_or_installs(self):
        with patch('pinned_download.urllib.request.urlopen', return_value=Response(b'bad')) as fetch:
            with self.assertRaises(IntegrityError): download_pinned(URL, self.file, PIN)
            self.assertEqual(fetch.call_count, 1)
        self.assertFalse(self.file.exists())
    def test_corrupt_cache_is_preserved_and_refused(self):
        self.file.write_bytes(b'bad')
        with patch('pinned_download.urllib.request.urlopen') as fetch:
            with self.assertRaises(IntegrityError): download_pinned(URL, self.file, PIN)
            fetch.assert_not_called()
        self.assertEqual(self.file.read_bytes(), b'bad')
    def test_oversize_and_insecure_url_are_refused(self):
        with patch('pinned_download.urllib.request.urlopen', return_value=Response()) as fetch:
            with self.assertRaises(IntegrityError): download_pinned(URL, self.file, PIN, max_bytes=3)
            self.assertEqual(fetch.call_count, 1)
            with self.assertRaises(ValueError): download_pinned('http://example.invalid/a', self.file, PIN)
            self.assertEqual(fetch.call_count, 1)
        self.assertFalse(self.file.exists())
    def test_atomic_replace_failure_removes_temporary_file(self):
        with patch('pinned_download.urllib.request.urlopen', return_value=Response()) as fetch, patch('pinned_download.os.replace', side_effect=PermissionError('synthetic')):
            with self.assertRaises(PermissionError): download_pinned(URL, self.file, PIN)
            self.assertEqual(fetch.call_count, 1)
        self.assertEqual(list(self.file.parent.iterdir()), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
