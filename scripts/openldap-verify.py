"""Verify unchanged, pinned OpenLDAP fixtures and retain profile differences.

The four supported content files are compared in three directions with the
independent python-ldap parser/writer. The other two must remain rejected.
No OpenLDAP server, client or directory connection is executed.
"""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '725ae5b0e583a1b2a3c3c445e6d3d45cf9fea972'
BASE = f'https://raw.githubusercontent.com/openldap/openldap/{COMMIT}/'
FILES = {
    'test.ldif': ('32b4a60c1e3c62a4fc003cb8360c5a828b14fc6f2012e7754cb931d8c9dce01f', 19, 0),
    'test-dn.ldif': ('32e41736aefc4b6acb89eb3393b4e3801f81dcb88eac8de37c6ff9eca401f115', 35, 2),
    'test-lang.ldif': ('ccfea61d80109a53dcc5bed56983a7af27a1745c33021af132ecc32d8c744168', 1, 0),
    'test-modify.ldif': ('d8de4245de88b7dec8ebce3204372936588ac11a2f90ddc980613e4bda1a8c4f', 8, 2),
    'test-ordered.ldif': ('4768177869d00ad1d0b488d80e078d7593ac4896e78fa16abd16e4e2372bddea', 19, 0),
    'rootdse.ldif': ('d8f4ac11308e63bf80de1205f578356436b07369702e15b580436df699672dd9', 1, 0),
}
REFERENCE_URL = 'https://raw.githubusercontent.com/python-ldap/python-ldap/7ffae5b4f16eed9dae4ed3ab682396cd678acd5d/Lib/ldif.py'
REFERENCE_SHA = '4bfd6cc743c4651e54a7a8e673586ccc42c5c632a0381f4775240aed4d7c080a'
parser = argparse.ArgumentParser()
parser.add_argument('--reference', type=Path, default=ROOT / 'verification/local/reference_ldif.py')
args = parser.parse_args()
local = ROOT / 'verification/local'
local.mkdir(parents=True, exist_ok=True)
evidence = {'at': datetime.now(timezone.utc).isoformat(), 'status': 'running',
            'version': json.loads((ROOT / 'package.json').read_text())['version'],
            'upstream_commit': COMMIT, 'source': BASE, 'license': 'OpenLDAP Public License 2.8',
            'scope': 'Unmodified upstream test fixtures; no enterprise users or server import claimed',
            'cases': []}


def fetch(path, url, digest):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=30).read())
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise RuntimeError(f'Hash mismatch: {path.name}')


def invoke(command, path, *flags):
    result = subprocess.run(['node', str(ROOT / 'dist/moonldif.js'), command,
                             str(path), '--format', 'json', *flags],
                            capture_output=True, encoding='utf8', timeout=30)
    data = json.loads(result.stdout)
    assert result.returncode == data['exit_code'], result.stderr
    return data


def entries(report):
    result = []
    for record in report['document']['records']:
        assert record['body']['type'] == 'entry'
        attributes = {}
        for attr in record['body']['attributes']:
            assert attr['value']['kind'] == 'inline'
            attributes.setdefault(attr['name'], []).append(base64.b64decode(attr['value']['base64'], validate=True))
        result.append((record['dn'], attributes))
    return result


try:
    folder = ROOT / '.tools/openldap' / COMMIT
    fetch(folder / 'LICENSE', BASE + 'LICENSE', '310fe25c858a9515fc8c8d7d1f24a67c9496f84a91e0a0e41ea9975b1371e569')
    fetch(args.reference, REFERENCE_URL, REFERENCE_SHA)
    spec = importlib.util.spec_from_file_location('openldap_reference', args.reference)
    ldif = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ldif)

    def no_url(*_args, **_kwargs):
        raise AssertionError('No external LDIF values may be fetched')

    ldif.urlopen = no_url

    def oracle(raw):
        reader = ldif.LDIFRecordList(io.BytesIO(raw), process_url_schemes=[])
        reader.parse_entry_records()
        return reader.all_records

    with tempfile.TemporaryDirectory(prefix='openldap-', dir=local) as temporary:
        temporary = Path(temporary)
        for name, (digest, count, expected_exit) in FILES.items():
            path = folder / name
            fetch(path, BASE + 'tests/data/' + name, digest)
            strict = invoke('inspect', path)
            compatible = invoke('inspect', path, '--compat')
            assert strict['exit_code'] == 2, name
            assert compatible['exit_code'] == expected_exit, name
            assert compatible['record_count'] == count, name
            row = {'file': name, 'sha256': digest, 'bytes': path.stat().st_size,
                   'strict_exit': strict['exit_code'], 'compat_exit': compatible['exit_code'],
                   'records': count, 'diagnostics': compatible['diagnostics']}
            evidence['cases'].append(row)
            target = temporary / ('formatted-' + name)
            formatted = invoke('format', path, '--compat', '--output', str(target))
            if expected_exit == 2:
                assert formatted['exit_code'] == 2 and not target.exists(), name
                row['write'] = 'blocked as expected'
                if name == 'test-dn.ldif':
                    bad = [d['span']['line'] for d in compatible['diagnostics'] if d['code'] == 'unsafe-initial-value']
                    assert bad == [207, 208], bad
                else:
                    review = invoke('review', path, '--compat')['review']
                    unknown = [i for i in review['items'] if i['span']['line'] in (101, 104)]
                    assert len(unknown) == 2 and all(i['code'] == 'unsupported-modification' for i in unknown)
                    assert not review['analysis_complete']
                    row['unsupported_review'] = [{'code': i['code'], 'span': i['span']} for i in unknown]
                continue
            assert formatted['exit_code'] == 0, name
            expected = oracle(path.read_bytes())
            assert entries(compatible) == expected, name + ' parse comparison'
            assert oracle(target.read_bytes()) == expected, name + ' MoonLDIF writer / Python reader'
            rendered = io.StringIO()
            writer = ldif.LDIFWriter(rendered)
            for dn, attributes in expected:
                writer.unparse(dn, attributes)
            reverse = temporary / ('python-' + name)
            reverse.write_text(rendered.getvalue(), encoding='utf8', newline='')
            assert entries(invoke('inspect', reverse, '--compat')) == expected, name + ' Python writer / MoonLDIF reader'
            row['comparison'] = ['parse passed', 'MoonLDIF writer / Python reader passed', 'Python writer / MoonLDIF reader passed']
    evidence['status'] = 'passed'
except Exception as error:
    evidence['status'] = 'failed'
    evidence['error'] = str(error)
    raise
finally:
    (local / 'openldap-reference.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'status': evidence['status'], 'files': len(evidence['cases'])}))
