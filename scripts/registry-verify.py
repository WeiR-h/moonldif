"""Install a released version from mooncakes in an isolated consumer (no moon.work)."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--version', required=True)
args = parser.parse_args()
if not re.fullmatch(r'\d+\.\d+\.\d+', args.version):
    parser.error('Use an exact stable MAJOR.MINOR.PATCH version')
config = ROOT / '.local-toolchain.json'
home = os.environ.get('MOON_HOME') or (json.loads(config.read_text(encoding='utf-8-sig'))['moonHome'] if config.exists() else None)
moon = str(Path(home) / 'bin' / ('moon.exe' if os.name == 'nt' else 'moon')) if home else shutil.which('moon')
if not moon:
    raise RuntimeError('Install MoonBit and add moon to PATH')
env = os.environ.copy()
if home:
    env['MOON_HOME'] = home
    env['PATH'] = str(Path(home) / 'bin') + os.pathsep + env.get('PATH', '')
workspace = Path(tempfile.mkdtemp(prefix='moonldif-registry-'))
evidence = {'version': args.version, 'started': datetime.now(timezone.utc).isoformat(),
            'method': 'exact mooncakes dependency in a new external temporary directory; no local overrides',
            'platform': os.name, 'status': 'running', 'steps': []}

def run(command):
    result = subprocess.run(command, cwd=workspace, env=env, capture_output=True, encoding='utf8', errors='replace', timeout=180)
    evidence['steps'].append({'command': [str(x) for x in command], 'exit_code': result.returncode,
                              'output': result.stdout + result.stderr})
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)

try:
    (workspace / 'moon.mod').write_text('name = "local/registry_consumer"\nversion = "0.0.0"\n', encoding='utf8')
    run([moon, 'add', 'WeiR-h/moonldif@' + args.version])
    manifest = (workspace / 'moon.mod').read_text(encoding='utf8')
    if 'path =' in manifest or (workspace / 'moon.work').exists():
        raise RuntimeError('Local override unexpectedly present')
    installed = workspace / '.mooncakes/WeiR-h/moonldif/moon.mod'
    text = installed.read_text(encoding='utf8')
    if not re.search(r'^version\s*=\s*"' + re.escape(args.version) + r'"', text, re.M):
        raise RuntimeError('Installed registry version differs from requested version')
    evidence['installed_manifest'] = text
    (workspace / 'moon.pkg').write_text('import { "WeiR-h/moonldif" @ldif }\n', encoding='utf8')
    test = '''///|
test "released registry API" {
  assert_eq(@ldif.version(), "VERSION")
  let report = @ldif.check_text("version: 1\\ndn: cn=Demo\\ncn: Demo\\nphoto:: /wAB\\n")
  assert_eq(report.exit_code(), 0)
  assert_eq(@ldif.document_json(@ldif.check_text(report.format()).document), @ldif.document_json(report.document))
  let denied = @ldif.check_text("version: 1\\ndn: cn=Demo\\nchangetype: delete\\n", options={allow_missing_version: false, deny_delete: true})
  assert_eq(denied.exit_code(), 1)
  let unknown = @ldif.check_text("version: 1\\ndn: cn=Demo\\nphoto:< file:///never-read\\n")
  assert_eq(unknown.exit_code(), 2)
  let plan = @ldif.check_text("version: 1\\ndn: cn=Demo\\nchangetype: modify\\ndelete: description\\n-\\n")
  assert_eq(plan.review().items[0].code, "attribute-delete-all")
}
'''.replace('VERSION', args.version)
    if tuple(map(int, args.version.split('.'))) >= (0, 2, 0):
        test += '''///|
test "released risk policy" {
  let report = @ldif.check_text("version: 1\\ndn: cn=Demo\\nchangetype: modify\\nreplace: mail\\n-\\n", risk_policy={deny_clear: true, deny_rename: false})
  assert_eq(report.exit_code(), 1)
}
'''
    (workspace / 'consumer_test.mbt').write_text(test, encoding='utf8')
    for target in ['js', 'wasm-gc']:
        run([moon, 'test', '--target', target])
    evidence['status'] = 'passed'
except Exception as error:
    evidence['status'] = 'failed'
    evidence['error'] = str(error)
    raise
finally:
    evidence['finished'] = datetime.now(timezone.utc).isoformat()
    out = ROOT / 'verification/local' / ('registry-' + args.version + '.json')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(evidence, ensure_ascii=True, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'status': evidence['status'], 'version': args.version}))
