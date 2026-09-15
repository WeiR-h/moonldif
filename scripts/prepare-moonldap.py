"""Prepare pinned public packages as local workspace dependencies.

Works around a Moon package downloader TLS failure on the development host.
Uses normal verified TLS and exact archive hashes; never changes global caches.
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVES = ROOT / ".tools/dependency-archives"
DESTINATION = ROOT / ".tools/dependencies"
PACKAGES = [
    ("async", "0.20.3", "moonbitlang", "dadf4d932f133981d7b4139b34883b8b3f4f6a2af4c281f4b426421ae29f845b"),
    ("moonldap", "0.3.0", "hbYlj", "559022618c01e03187fe3992ac0d958af083cba2162508a54ed3b43deeb0f10c"),
]
ARCHIVES.mkdir(parents=True, exist_ok=True)
provenance = []
for name, version, owner, expected in PACKAGES:
    url = f"https://download.mooncakes.io/user/{owner}%2F{name}%2F{version}.zip"
    archive = ARCHIVES / f"{name}-{version}.zip"
    if not archive.exists():
        archive.write_bytes(urllib.request.urlopen(url, timeout=35).read())
    actual = hashlib.sha256(archive.read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"Hash mismatch for {name}; refusing extraction.")
    destination = (DESTINATION / name).resolve()
    destination.relative_to(ROOT.resolve())
    with zipfile.ZipFile(archive) as package:
        for member in package.infolist():
            relative = PurePosixPath(member.filename)
            if relative.is_absolute() or ".." in relative.parts or ":" in member.filename or "\\" in member.filename or stat.S_ISLNK(member.external_attr >> 16):
                raise SystemExit("Unsafe archive member.")
            target = destination.joinpath(*relative.parts).resolve()
            target.relative_to(destination)
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(package.read(member))
    provenance.append({"module": f"{owner}/{name}", "version": version, "url": url, "sha256": actual})
DESTINATION.mkdir(parents=True, exist_ok=True)
(DESTINATION / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf8")
print("Prepared two hash-verified local dependencies; no server connection was made.")
