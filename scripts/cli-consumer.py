"""Run the extracted CLI in an independent directory with no MoonBit environment."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def verify(archive, expected_commit=None):
    expected = json.loads((ROOT / 'package.json').read_text())['version']
    folder = Path(tempfile.mkdtemp(prefix='moonldif-cli-中文 空格-'))
    node = shutil.which('node')
    env = {k:v for k,v in os.environ.items() if k not in {'MOON_HOME','NODE_PATH','NODE_OPTIONS'}}
    cases = []
    with zipfile.ZipFile(archive) as bundle:
        for name in bundle.namelist():
            if not (folder / name).resolve().is_relative_to(folder.resolve()):
                raise RuntimeError('Archive path escapes consumer')
        bundle.extractall(folder)
    manifest = json.loads((folder / 'BUILD.json').read_text())
    assert manifest['version'] == expected
    compiler = next((v for v in manifest['toolchain'] if v.startswith('moonc ')), '')
    match = re.search(r'^moonc v(\d+)\.(\d+)\.(\d+)(?:\+|$)', compiler)
    assert match and tuple(map(int,match.groups())) >= (0,10,14), 'CLI was built with an unsupported compiler'
    if expected_commit:
        assert manifest['source_commit'] == expected_commit
        assert manifest.get('source_tree_clean') is True
    for name, digest in manifest['files'].items():
        assert hashlib.sha256((folder / name).read_bytes()).hexdigest() == digest, name
    assert not (folder / 'moon.mod').exists()
    def run(args, code):
        r = subprocess.run([node,*args],cwd=folder,env=env,capture_output=True,timeout=120)
        assert r.returncode == code, (args,r.returncode,r.stdout[-1000:],r.stderr[-1000:])
        cases.append({'args':args,'exit_code':code})
        return r.stdout.decode('utf8')
    cli = ['dist/moonldif.js']
    assert run(cli+['--version'],0).strip() == expected
    run(cli+['--help'],0)
    good='version: 1\r\ndn: cn=demo\r\ncn: synthetic-secret\r\n'
    (folder/'input.ldif').write_bytes(good.encode())
    (folder/'delete.ldif').write_text('version: 1\ndn: cn=demo\nchangetype: delete\n',encoding='utf8')
    (folder/'bad.ldif').write_text('version: 1\ndn: cn=a\nphoto:< file:///not-read\n',encoding='utf8')
    run(cli+['check','input.ldif'],0)
    run(cli+['inspect','input.ldif','--format','json'],0)
    review=run(cli+['review','delete.ldif','--deny-delete','--all','--format','json'],1)
    assert json.loads(review)['exit_code']==1
    run(cli+['review','bad.ldif'],2)
    run(cli+['format','input.ldif','--output','normalized.ldif'],0)
    run(cli+['format','input.ldif','--output','normalized.ldif'],2)
    run(cli+['compare','input.ldif','normalized.ldif'],0)
    (folder/'after.ldif').write_bytes(good.replace('synthetic-secret','changed').encode())
    run(cli+['compare','input.ldif','after.ldif','--all'],1)
    run(cli+['batch','input.ldif','missing.ldif','--format','json'],2)
    for name,code in [('within',0),('exceeded',1),('incomplete',2)]:
        report=f'reports/{name}.json'
        args=['examples/profiles/check-ci.mjs',report,'examples/profiles/rules.json',f'examples/profiles/{name}.ldif']
        run(args,code)
        assert json.loads((folder/report).read_text(encoding='utf8'))['exit_code']==code
        before=(folder/report).read_bytes()
        run(args,2)
        assert (folder/report).read_bytes()==before
    run(['examples/ci/check-plan.mjs','reports/plan.json','delete.ldif'],1)
    (folder/'not-a-directory').write_text('keep')
    run(['examples/profiles/check-ci.mjs','not-a-directory/report.json','examples/profiles/rules.json','examples/profiles/within.ldif'],2)
    evidence={'status':'passed','version':expected,'archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
              'platform':os.name,'source_commit':manifest['source_commit'],'source_tree_clean':manifest.get('source_tree_clean',False),'method':'independent temporary extraction; Node only; no source imports or MoonBit environment','cases':cases}
    out=ROOT/'verification/local/cli-consumer.json'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'status':'passed','cases':len(cases),'version':expected}))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--archive',type=Path)
    p.add_argument('--expected-commit')
    a=p.parse_args()
    version=json.loads((ROOT/'package.json').read_text())['version']
    verify(a.archive or ROOT/f'_build/cli/moonldif-cli-v{version}.zip',a.expected_commit)
