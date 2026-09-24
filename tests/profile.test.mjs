import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as core from '../dist/core.mjs';

const folder = mkdtempSync(join(tmpdir(),'moonldif-profile-中文 '));
const hash = x => createHash('sha256').update(x).digest('hex');
const encode = x => Buffer.from(x).toString('base64');
const p = {profile_version:1,review:{limits:{max_delete_records:5}}};
const profile = join(folder,'规则.json');
writeFileSync(profile,JSON.stringify(p));
function input(n, extra='') {return 'version: 1\n'+Array.from({length:n},(_,i)=>`dn: cn=${i}\nchangetype: delete\n\n`).join('')+extra;}
function run(args) {
  const r=spawnSync(process.execPath,['dist/moonldif.js',...args],{encoding:'utf8',maxBuffer:34*1024*1024});
  assert.equal(r.error,undefined);return r;
}
const file=join(folder,'计划.ldif');
test('profile validation is strict, bounded and canonical across key order',()=>{
  for(const raw of ['{}','[]','{"profile_version":1,"profile_vers\\u0069on":1}',JSON.stringify({...p,unknown:1}),JSON.stringify({...p,common:{allow_missing_version:'true'}}),JSON.stringify({...p,compare:{ignored_attributes:['dn']}}),'{"profile_version":1,"review":{"limits":{"max_delete_records":1.00000000000000000001}}}',JSON.stringify({...p,review:{limits:{max_delete_records:2147483648}}}),JSON.stringify({...p,review:{limits:{max_delete_records:-1}}}),'['.repeat(17)+'0'+']'.repeat(17)]) {
    assert.equal(JSON.parse(core.profile_validate(encode(raw))).exit_code,2,raw);
  }
  assert.equal(JSON.parse(core.profile_validate(Buffer.from([0xff]).toString('base64'))).exit_code,2);
  const base='{"profile_version":1}';
  assert.equal(JSON.parse(core.profile_validate(encode(base+' '.repeat(65536-base.length)))).exit_code,0);
  assert.equal(JSON.parse(core.profile_validate(encode(base+' '.repeat(65537-base.length)))).exit_code,2);
  const a=JSON.parse(core.profile_validate(encode(JSON.stringify(p))));
  const b=JSON.parse(core.profile_validate(encode('{"review":{"limits":{"max_delete_records":5}},"profile_version":1}')));
  assert.equal(a.canonical,b.canonical);
});

test('CLI limits, fingerprints, full reports and writer gates use the same rules',()=>{
  for(const n of [0,4,5,6,250]) {
    writeFileSync(file,input(n));
    const r=run(['review',file,'--profile',profile,'--format','json','--all']);
    const doc=JSON.parse(r.stdout);
    assert.equal(r.status,n===0?2:n>5?1:0);
    assert.equal(doc.report_schema_version,3);
    assert.equal(doc.items.length,n);
    assert.equal(doc.summary.change_limits.metrics[1].actual,n);
    assert.equal(doc.summary.profile.source_sha256,hash(readFileSync(profile)));
    const canonical=JSON.parse(core.profile_validate(encode(readFileSync(profile)))).canonical_review;
    assert.equal(doc.summary.profile.effective_sha256,hash(canonical));
    assert.equal(doc.summary.source.sha256,hash(readFileSync(file)));
    assert.equal(run(['review',file,'--profile',profile,'--format','json','--all']).stdout,r.stdout);
  }
  const empty=run(['review',file,'--profile',profile,'--query','no-match','--format','json']);
  assert.equal(empty.status,1);assert.equal(JSON.parse(empty.stdout).items.length,0);
  const output=join(folder,'refused.ldif');
  assert.equal(run(['format',file,'--profile',profile,'--output',output]).status,1);
  assert.equal(existsSync(output),false);
  writeFileSync(file,input(5));
  assert.equal(run(['format',file,'--profile',profile,'--output',output]).status,0);
  assert.equal(run(['check',output]).status,0);
  assert.equal(run(['format',file,'--profile',profile,'--output',output]).status,2);
});

test('incomplete input preserves lower-bound violations; batch limits are per file',()=>{
  writeFileSync(file,input(6,'dn: cn=x\nchangetype: mystery\n\n'));
  const r=run(['review',file,'--profile',profile,'--format','json']);
  assert.equal(r.status,2);
  const summary=JSON.parse(r.stdout).summary;
  assert.equal(summary.change_limits.counts_are_lower_bounds,true);
  assert.ok(summary.diagnostics.some(d=>d.code==='delete-record-limit'));
  writeFileSync(file,input(4));
  const batch=run(['batch',file,file,'--profile',profile,'--format','json']);
  assert.equal(batch.status,0,batch.stdout);
  const doc=JSON.parse(batch.stdout);assert.equal(doc.report_schema_version,3);assert.equal(doc.limit_scope,'per_file');
  assert.deepEqual(doc.files.map(f=>f.report.change_limits.metrics[1].actual),[4,4]);
  assert.equal(run(['batch',join(folder,'missing'),file,'--profile',profile]).status,2);
  writeFileSync(file,'version: 1\ndn: cn=a\ncn: hidden-value\n');
  assert.equal(run(['check',file,'--profile',profile]).status,2);
});

test('comparison uses only its section; CLI conflicting flags fail closed',()=>{
  const b=join(folder,'before.ldif'),a=join(folder,'after.ldif'),pp=join(folder,'compare.json');
  writeFileSync(b,'version: 1\ndn: cn=a\ncn: first-hidden-value\n');writeFileSync(a,'version: 1\ndn: cn=a\ncn: second-hidden-value\n');
  writeFileSync(pp,JSON.stringify({...p,compare:{ignored_attributes:['cn']}}));
  const r=run(['compare',b,a,'--profile',pp,'--all','--format','json']);
  assert.equal(r.status,0,r.stdout);const doc=JSON.parse(r.stdout);
  assert.equal(doc.summary.profile.applied_section,'compare');assert.equal(doc.summary.change_limits,undefined);
  assert.ok(!r.stdout.includes('hidden-value'));
  for(const flag of ['--compat','--deny-delete','--deny-clear','--deny-rename','--legacy-dn-spaces']) assert.equal(run(['check',b,'--profile',pp,flag]).status,2);
  assert.equal(run(['compare',b,a,'--profile',pp,'--ignore-attribute','cn']).status,2);
  assert.equal(run(['inspect',b,'--profile',pp]).status,2);
  assert.equal(run(['check',b,'--profile',pp,'--profile',pp]).status,2);
});

test('CI example retains 0/1/2 and refuses an existing output',()=>{
  for(const [name,code] of [['within',0],['exceeded',1],['incomplete',2]]) {
    const out=join(folder,`ci-${name}.json`);
    const args=['examples/profiles/check-ci.mjs',out,'examples/profiles/rules.json',`examples/profiles/${name}.ldif`];
    assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,code);
    assert.equal(JSON.parse(readFileSync(out,'utf8')).exit_code,code);
    assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,2);
  }
});

test('all metrics survive diagnostic truncation and deny rules cannot be relaxed by limits',()=>{
  const pp=join(folder,'deny.json');
  writeFileSync(pp,JSON.stringify({profile_version:1,review:{deny_delete:true,limits:{max_delete_records:999}}}));
  writeFileSync(file,input(1));
  assert.equal(run(['check',file,'--profile',pp]).status,1);
  writeFileSync(pp,JSON.stringify({profile_version:1,review:{deny_clear:true,limits:{max_change_records:0,max_clear_operations:200}}}));
  writeFileSync(file,'version: 1\ndn: cn=a\nchangetype: modify\n'+'delete: mail\n-\n'.repeat(201));
  const result=run(['review',file,'--profile',pp,'--format','json','--query','absent']);
  assert.equal(result.status,2);
  const doc=JSON.parse(result.stdout);
  assert.equal(doc.summary.change_limits.metrics[0].actual,1);
  assert.equal(doc.summary.change_limits.metrics[2].actual,201);
  assert.ok(doc.summary.change_limits.metrics[2].first_exceeded_span);
  assert.equal(doc.items.length,0);
  writeFileSync(pp,Buffer.alloc(65537,32));
  assert.equal(run(['check',file,'--profile',pp]).status,2);
  assert.equal(run(['check',file,'--profile',folder]).status,2);
});
