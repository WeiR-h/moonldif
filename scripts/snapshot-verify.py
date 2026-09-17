"""Independent parsing + fixed-seed model oracle for export comparisons.

Run reference-verify.py first to prepare the pinned python-ldap source. This
tests a byte-multiset export contract, not LDAP schema/matching semantics.
"""
from collections import Counter
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import platform
import random
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification/local/snapshot-reference.json'
reference = ROOT / 'verification/local/reference_ldif.py'
SHA = '4bfd6cc743c4651e54a7a8e673586ccc42c5c632a0381f4775240aed4d7c080a'
assert hashlib.sha256(reference.read_bytes()).hexdigest() == SHA, 'Run reference-verify.py first'
spec = importlib.util.spec_from_file_location('snapshot_oracle_ldif', reference)
ldif = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ldif)
def no_url(*args, **kwargs):
    raise AssertionError('External URL resolution prohibited')
ldif.urlopen = no_url
rng = random.Random(45122849)
evidence = {'status': 'running', 'seed': 45122849, 'reference_sha256': SHA,
            'scope': 'Synthetic export models; independent python-ldap writer/parser, Counter oracle; no server validation',
            'platform': platform.platform(), 'checks': [], 'scale_observations': []}

def export(model, reorder=False):
    stream = io.StringIO()
    writer = ldif.LDIFWriter(stream, cols=37)
    entries = list(model.items())
    if reorder:
        rng.shuffle(entries)
    for dn, attributes in entries:
        attrs = {}
        keys = list(attributes)
        if reorder:
            rng.shuffle(keys)
        for key in keys:
            values = attributes[key][:]
            if reorder:
                rng.shuffle(values)
            attrs[key.upper() if reorder else key] = values
        writer.unparse(dn, attrs)
    text = 'version: 1\n' + stream.getvalue()
    if reorder:
        text = text.replace('\n', '\r\n')
    parser = ldif.LDIFRecordList(io.BytesIO(text.encode()), process_url_schemes=[])
    parser.parse_entry_records()
    actual = {dn: {key.lower(): Counter(values) for key, values in attrs.items()} for dn, attrs in parser.all_records}
    assert actual == {dn: {key: Counter(values) for key, values in attrs.items()} for dn, attrs in model.items()}
    return text

def expected(a, b):
    changes = set()
    for dn in a.keys() | b.keys():
        if dn not in a:
            changes.add(('entry-added',dn,None,0,0)); continue
        if dn not in b:
            changes.add(('entry-removed',dn,None,0,0)); continue
        for key in a[dn].keys() | b[dn].keys():
            old, new = Counter(a[dn].get(key, [])), Counter(b[dn].get(key, []))
            removed, added = sum((old-new).values()), sum((new-old).values())
            code = 'attribute-added' if key not in a[dn] else 'attribute-removed' if key not in b[dn] else 'values-changed'
            if removed or added:
                changes.add((code,dn,key,removed,added))
    return changes

try:
    with tempfile.TemporaryDirectory(prefix='moonldif-snapshot-') as temporary:
        folder = Path(temporary)
        for case in range(36):
            old = {f'cn=user{i}': {'cn': [f'user{i}'.encode()], 'data': [bytes([i,255,0]), b'', b'duplicate', b'duplicate']} for i in range(12)}
            new = copy.deepcopy(old)
            if case % 3:
                for _ in range(8):
                    dn = f'cn=user{rng.randrange(12)}'
                    action = rng.randrange(5)
                    if dn not in new: continue
                    if action == 0: del new[dn]
                    elif action == 1: new[dn].pop('data',None)
                    elif action == 2: new[dn].setdefault('data',[]).append(bytes(rng.randrange(256) for _ in range(16)))
                    elif action == 3: new[dn]['description'] = [b'new-value']
                    else: new[dn]['cn'] = [b'CHANGED']
                new['cn=added'] = {'cn':[b'added']}
            a,b = export(old),export(new,reorder=True)
            first,second = folder/'before.ldif',folder/'after.ldif'
            first.write_bytes(a.encode());second.write_bytes(b.encode())
            p = subprocess.run(['node', str(ROOT/'dist/moonldif.js'), 'compare', str(first), str(second), '--format', 'json'], capture_output=True,encoding='utf8',timeout=30)
            report = json.loads(p.stdout)
            actual = {(x['code'],x['dn'],x['attribute'],x['removed_value_count'],x['added_value_count']) for x in report['changes']}
            want = expected(old,new)
            assert actual == want, (case,actual ^ want)
            assert p.returncode == int(bool(want)), case
            assert report['before']['sha256'] == hashlib.sha256(a.encode()).hexdigest()
            assert report['after']['sha256'] == hashlib.sha256(b.encode()).hexdigest()
            evidence['checks'].append({'case':case,'changes':len(want),'status':'passed'})
        for size in [100,1000,5000]:
            first.write_text('version: 1\n' + ''.join(f'dn: cn=user{i}\nmail: old\n\n' for i in range(size)),encoding='utf8',newline='')
            second.write_text('version: 1\n' + ''.join(f'dn: cn=user{i}\nmail: new\n\n' for i in range(size)),encoding='utf8',newline='')
            start=time.perf_counter()
            p=subprocess.run(['node',str(ROOT/'dist/moonldif.js'),'compare',str(first),str(second),'--format','json'],capture_output=True,encoding='utf8',timeout=30)
            elapsed=time.perf_counter()-start
            report=json.loads(p.stdout)
            assert p.returncode == 1 and report['total_changes'] == size and report['reported_changes'] == min(size,200)
            evidence['scale_observations'].append({'records_per_side':size,'seconds_including_node_startup':round(elapsed,4),'input_bytes':first.stat().st_size+second.stat().st_size,'status':'passed'})
    evidence['status']='passed'
except Exception as error:
    evidence.update(status='failed', error=repr(error))
    raise
finally:
    OUT.write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'status':evidence['status'],'model_cases':len(evidence['checks']),'scales':evidence['scale_observations']}))
