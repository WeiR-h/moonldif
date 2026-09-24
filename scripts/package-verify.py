"""Build an archive, import it in a new local consumer, and test the public API.

This deliberately verifies the archive, not a mooncakes registry download.
Only the installed toolchain is shared with the development checkout.
"""
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification/local/package-consumer.json'
evidence = {'started': datetime.now(timezone.utc).isoformat(),
            'method': 'fresh local workspace importing extracted moon package archive; not registry installation',
            'status': 'running', 'steps': []}


def run(args, cwd=ROOT, env=None):
    result = subprocess.run(args, cwd=cwd, env=env, capture_output=True,
                            encoding='utf8', errors='replace', timeout=120)
    evidence['steps'].append({'command': [str(a) for a in args],
                              'exit_code': result.returncode,
                              'output': result.stdout + result.stderr})
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout


try:
    config_path = ROOT / '.local-toolchain.json'
    config = json.loads(config_path.read_text(encoding='utf-8-sig')) if config_path.exists() else {}
    home = os.environ.get('MOON_HOME') or config.get('moonHome')
    moon = str(Path(home) / 'bin' / ('moon.exe' if os.name == 'nt' else 'moon')) if home else shutil.which('moon')
    if not moon:
        raise RuntimeError('Install MoonBit and put moon on PATH or set MOON_HOME')
    env = os.environ.copy()
    if home:
        env['MOON_HOME'] = home
        env['PATH'] = str(Path(home) / 'bin') + os.pathsep + env.get('PATH', '')
    run([moon, 'package'], env=env)
    archives = list((ROOT / '_build/publish').glob('*.zip'))
    archive = max(archives, key=lambda p: p.stat().st_mtime_ns)
    evidence['archive'] = archive.name
    evidence['sha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
    parent = ROOT / '.tools/package-consumers'
    parent.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix='consumer-', dir=parent))
    library = workspace / 'library'
    library.mkdir()
    with zipfile.ZipFile(archive) as bundle:
        for member in bundle.infolist():
            destination = (library / member.filename).resolve()
            if not destination.is_relative_to(library.resolve()):
                raise RuntimeError('Archive path escapes consumer workspace')
        bundle.extractall(library)
    consumer = workspace / 'consumer'
    consumer.mkdir()
    (workspace / 'moon.work').write_text('members = ["library", "consumer"]\n', encoding='utf8')
    version = re.search(r'^version\s*=\s*"([^"]+)"', (library / 'moon.mod').read_text(encoding='utf8'), re.M).group(1)
    (consumer / 'moon.mod').write_text('name = "local/moonldif_consumer"\nversion = "0.0.0"\nimport { "WeiR-h/moonldif@' + version + '" }\n', encoding='utf8')
    (consumer / 'moon.pkg').write_text('import { "WeiR-h/moonldif" @ldif }\n', encoding='utf8')
    (consumer / 'consumer_test.mbt').write_text('''///|
test "public API from packaged archive" {
  let text = "version: 1\\ndn: cn=Demo\\ncn: Demo\\nphoto:: /wAB\\n"
  let report = @ldif.check_text(text)
  assert_eq(report.exit_code(), 0)
  let written = report.format()
  assert_eq(@ldif.document_json(@ldif.check_text(written).document), @ldif.document_json(report.document))
  let plan = @ldif.check_text("version: 1\\ndn: cn=Demo\\nchangetype: modify\\ndelete: description\\n-\\n")
  assert_eq(plan.review().items[0].code, "attribute-delete-all")
  let blocked = @ldif.check_text("version: 1\\ndn: cn=Demo\\nchangetype: delete\\n", options={ allow_missing_version: false, deny_delete: true })
  assert_eq(blocked.exit_code(), 1)
  let external = @ldif.check_text("version: 1\\ndn: cn=Demo\\nphoto:< file:///not-read\\n")
  assert_eq(external.exit_code(), 2)
}
''', encoding='utf8')
    with (consumer / 'consumer_test.mbt').open('a', encoding='utf8') as tests:
        tests.write(r'''///|
test "packaged batch API" {
  let batch = @ldif.BatchReview::new(options={allow_missing_version: false, deny_delete: true})
  batch.add_bytes("delete.ldif", b"version: 1\ndn: cn=Demo\nchangetype: delete\n", "a".repeat(64))
  assert_eq(batch.exit_code(), 1)
  assert_true(batch.to_json().stringify().contains("delete-denied"))
  batch.add_unavailable("missing.ldif")
  assert_eq(batch.exit_code(), 2)
}
''')
    with (consumer / 'consumer_test.mbt').open('a', encoding='utf8') as tests:
        tests.write(r'''///|
test "snapshot public API" {
  let a = b"version: 1\ndn: cn=Demo\ncn: Demo\nmail: before\n"
  let b = b"version: 1\ndn: cn=Demo\ncn: Demo\nmail: after\n"
  assert_eq(@ldif.compare_snapshots(a, a).exit_code(), 0)
  assert_eq(@ldif.compare_snapshots(a, b, ignored_attributes=["mail"]).exit_code(), 0)
  let changed = @ldif.compare_snapshots(a, b)
  assert_eq(changed.exit_code(), 1)
  assert_true(changed.to_json().stringify().contains("values-changed"))
  assert_true(changed.to_markdown().contains("Differences"))
  assert_eq(@ldif.compare_snapshots(a, b"bad").exit_code(), 2)
}
''')
    with (consumer / 'consumer_test.mbt').open('a', encoding='utf8') as tests:
        tests.write(r'''///|
test "paged public API and complete report" {
  let s = @ldif.ReviewSession::new(b"version: 1\ndn: cn=Demo\nchangetype: delete\n", options={allow_missing_version: false, deny_delete: true})
  assert_eq(s.exit_code(), 1)
  assert_true(s.page(@ldif.PageQuery::default()).stringify().contains("entry-delete"))
  let cursor = s.report("json")
  let out = StringBuilder()
  while true { match cursor.next() { Some(chunk) => out.write_string(chunk); None => break } }
  assert_true(out.to_string().contains("selection"))
  let before = b"version: 1\ndn: cn=Demo\nmail: before\n"
  let after = b"version: 1\ndn: cn=Demo\nmail: after\n"
  let compare = @ldif.SnapshotSession::new(before, after)
  assert_eq(compare.exit_code(), 1)
  assert_true(compare.page(@ldif.PageQuery::default()).stringify().contains("values-changed"))
}
''')
    with (consumer / 'consumer_test.mbt').open('a', encoding='utf8') as tests:
        tests.write(r'''///|
test "configuration policy public API" {
  let p = @ldif.parse_profile(b"{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":0}}}")
  let data = b"version: 1\ndn: cn=Demo\nchangetype: delete\n"
  let r = @ldif.check_with_profile(data, p)
  assert_eq(r.exit_code(), 1)
  let s = @ldif.ReviewSession::with_profile(data, p)
  assert_eq(s.exit_code(), 1)
  assert_true(s.page(@ldif.PageQuery::default()).stringify().contains("delete-record-limit"))
  assert_true(p.effective_json("review").stringify().contains("max_delete_records"))
  let b = @ldif.BatchReview::with_profile(p)
  b.add_bytes("example.ldif", data, "a".repeat(64))
  assert_eq(b.exit_code(), 1)
  let content = b"version: 1\ndn: cn=Demo\ncn: Demo\n"
  assert_eq(@ldif.SnapshotSession::with_profile(content, content, p).exit_code(), 0)
}
''')
    for target in ['js', 'wasm-gc']:
        run([moon, 'test', '-p', 'local/moonldif_consumer', '--target', target], cwd=workspace, env=env)
    evidence['status'] = 'passed'
except Exception as error:
    evidence['status'] = 'failed'
    evidence['error'] = str(error)
    raise
finally:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    evidence['finished'] = datetime.now(timezone.utc).isoformat()
    OUT.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'status': evidence['status'], 'evidence': str(OUT)}))
