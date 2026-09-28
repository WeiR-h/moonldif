"""Build the Node-only CLI ZIP from the already compiled release core."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def build():
    subprocess.run(['node','scripts/toolchain-verify.mjs'], cwd=ROOT, check=True)
    package = json.loads((ROOT / 'package.json').read_text(encoding='utf8'))
    version = package['version']
    actual = subprocess.check_output(['node', 'dist/moonldif.js', '--version'], cwd=ROOT, text=True).strip()
    if actual != version:
        raise RuntimeError('Rebuild core: compiled version differs from package')
    files = {p: (ROOT / p).read_bytes() for p in [
        'dist/core.mjs', 'dist/moonldif.js', 'dist/read-bounded.mjs',
        'dist/report-output.mjs', 'dist/profile-host.mjs', 'dist/THIRD_PARTY_LICENSES.txt', 'LICENSE']}
    for path in sorted((ROOT / 'examples').rglob('*')):
        if path.is_file() and path.suffix in {'.ldif', '.json', '.mjs'}:
            files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
    files['package.json'] = (json.dumps({k: package[k] for k in ['name','version','private','type','license','engines']}, indent=2)+'\n').encode()
    files['README.md'] = (ROOT / 'docs/CLI-DISTRIBUTION.md').read_bytes()
    commit = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
    version_output = subprocess.check_output(['node','scripts/moon.mjs','version','--all'], cwd=ROOT, encoding='utf8')
    toolchain = [line.split(' (')[0] for line in version_output.splitlines() if line.startswith(('moon ', 'moonc ', 'moonrun '))]
    clean = not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'], cwd=ROOT).strip()
    manifest = {'version':version, 'source_commit':commit, 'source_tree_clean':clean, 'toolchain':toolchain,
                'files':{name:hashlib.sha256(data).hexdigest() for name,data in sorted(files.items())}}
    files['BUILD.json'] = (json.dumps(manifest, indent=2)+'\n').encode()
    output = ROOT / '_build/cli'
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f'moonldif-cli-v{version}.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026,1,1,0,0,0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data)
    print(json.dumps({'archive':archive.name, 'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(), 'source_commit':commit}))
    return archive

if __name__ == '__main__':
    build()
