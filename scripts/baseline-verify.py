"""Rebuild the exact released baseline and compare behavior; no registry override."""
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'v0.5.1'
folder = ROOT / '.tools/performance-baseline-0.5.1'
archive = ROOT / 'verification/local/baseline-0.5.1.zip'
archive.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(['git', 'cat-file', '-e', BASELINE], cwd=ROOT, check=True)
subprocess.run(['git', 'archive', '--format=zip', '--output=' + str(archive), BASELINE], cwd=ROOT, check=True)
folder.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive) as bundle:
    for item in bundle.infolist():
        if not (folder / item.filename).resolve().is_relative_to(folder.resolve()):
            raise RuntimeError('Unexpected archive traversal')
    bundle.extractall(folder)
if (ROOT / '.local-toolchain.json').exists():
    shutil.copyfile(ROOT / '.local-toolchain.json', folder / '.local-toolchain.json')
subprocess.run(['node', 'scripts/build.mjs'], cwd=folder, check=True, timeout=120)
subprocess.run(['node', 'scripts/compatibility-verify.mjs', str(folder / 'dist/core.mjs')], cwd=ROOT, check=True, timeout=120)
print(json.dumps({'baseline_commit': BASELINE, 'status': 'passed'}))
