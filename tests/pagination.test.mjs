import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as core from '../dist/core.mjs';
import { spoolReport } from '../dist/report-output.mjs';

const hash = s => createHash('sha256').update(s).digest('hex');
const cfg = (a, b = '', extra = {}) => JSON.stringify({ before_sha256: hash(a), after_sha256: hash(b), ...extra });
const start = (a, b = '', extra = {}, command = 'review') => core.paged_start(command, Buffer.from(a).toString('base64'), Buffer.from(b).toString('base64'), cfg(a, b, extra));
const page = (session, query = {}) => JSON.parse(JSON.parse(core.paged_page(session, JSON.stringify(query), 'json')).output);
const complete = (session, format = 'json') => {
  const c = core.paged_report_start(session, format), parts = [];
  for (;;) { const p = JSON.parse(core.paged_report_next(c)); assert.ok(!p.error, p.error); if (p.done) break; parts.push(p.chunk); }
  return parts.join('');
};
const plan = 'version: 1\n\n' + Array.from({length: 260}, (_,i) => `dn:: ${Buffer.from(`cn=用户${i},dc=example`).toString('base64')}\nchangetype: modify\nreplace: mail\nmail: SECRET-${i}\n-\n\n`).join('') + `dn:: ${Buffer.from('cn=尾部,dc=example').toString('base64')}\nchangetype: delete\n\n`;

test('review full traversal, page concatenation, tail search and stable policy status', () => {
  const s = start(plan, '', {deny_delete:true});
  const all = JSON.parse(complete(s));
  assert.equal(all.exit_code, 1); assert.equal(all.items.length, 261);
  assert.equal(all.page.has_more, false); assert.equal(all.page.selection, 'all');
  assert.equal(all.summary.source.sha256, hash(plan));
  const joined = [];
  for (let offset=0; offset<261; offset+=50) joined.push(...page(s,{offset}).items);
  assert.deepEqual(joined, all.items);
  assert.equal(page(s,{query:'尾部'}).items[0].item_index,260);
  assert.equal(page(s,{query:'MAIL'}).page.matched_items,260);
  const empty = page(s,{query:'not-present'});
  assert.equal(empty.items.length,0); assert.equal(empty.exit_code,1);
  assert.equal(page(s,{offset:9999}).items.length,0);
  assert.equal(complete(s),complete(s));
  assert.ok(!complete(s).includes('SECRET-')); assert.ok(!complete(s,'markdown').includes('SECRET-'));
  assert.equal(page(s).items.length,50);
});

test('single record has more than 200 controls/modifications; incomplete keeps tail risks', () => {
  const input = 'version: 1\ndn: cn=one\n' + 'control: 1.2.3 false\n'.repeat(205) +
    'changetype: modify\n' + 'replace: cn\ncn: hidden\n-\n'.repeat(205) +
    'replace: mail\n-\nincrement: counter\ncounter: 1\n-\n';
  const s = start(input,'',{deny_clear:true});
  const p = page(s,{offset:400});
  assert.equal(p.exit_code,2); assert.equal(p.page.total_items,412);
  assert.ok(p.items.some(i=>i.code==='attribute-clear'));
  assert.ok(p.summary.diagnostics.some(d=>d.code==='clear-denied'));
  assert.equal(page(s,{kind:'operation-control',offset:200}).items.length,5);
});

test('snapshot pages retain exact order, exclusions, ambiguity and tail source locations', () => {
  const before='version: 1\n\n'+Array.from({length:260},(_,i)=>`dn: cn=${String(i).padStart(3,'0')}\ncn: old\nmail: old\n\n`).join('');
  const after=before.replaceAll('cn: old','cn: new').replaceAll('mail: old','mail: new');
  const s=start(before,after,{ignored_attributes:['mail']},'compare');
  const all=JSON.parse(complete(s));
  assert.equal(all.exit_code,1); assert.equal(all.items.length,260);
  assert.equal(all.summary.before.sha256,hash(before));
  assert.ok(all.items.every(i=>i.attribute==='cn'));
  assert.equal(page(s,{query:'cn=259'}).items[0].item_index,259);
  assert.deepEqual([...page(s,{limit:200}).items,...page(s,{offset:200,limit:200}).items],all.items);
  const ambiguous=start(before+'dn: cn=000\ncn: duplicate\n',after,{},'compare');
  assert.equal(page(ambiguous,{query:'cn=259'}).exit_code,2);
  assert.equal(page(ambiguous,{query:'cn=259'}).items.length,2);
  assert.equal(page(start(before,'version: 1\ndn: cn=a\ncn:< file:///never\n',{},'compare')).exit_code,2);
});

test('CLI opt-in behavior, invalid parameters and complete spool failure isolation', () => {
  const folder=mkdtempSync(join(tmpdir(),'moonldif-pages-')), file=join(folder,'中文 path.ldif');
  writeFileSync(file,plan);
  try {
    const run=(...args)=>spawnSync(process.execPath,['dist/moonldif.js','review',file,'--format','json',...args],{encoding:'utf8'});
    assert.equal(JSON.parse(run().stdout).review.items.length,200);
    const full=run('--all','--deny-delete');
    assert.equal(full.status,1); assert.equal(JSON.parse(full.stdout).items.length,261);
    assert.equal(JSON.parse(run('--page','6').stdout).items.length,11);
    for (const args of [['--all','--query','x'],['--page','0'],['--page-size','201'],['--kind','wrong'],['--query','x'.repeat(257)],['--page','999999999','--page-size','200']]) {
      assert.equal(run(...args).status,2,args.join(' '));
    }
    let writes=0;
    const failing={paged_report_start(){return {}},paged_report_next(){return JSON.stringify(++writes===1?{chunk:'partial'}:{error:'injected failure'})}};
    const out=[];
    assert.throws(()=>spoolReport(failing,{},'json',{write:b=>out.push(b)}),/injected failure/);
    assert.deepEqual(out,[]);
  } finally { unlinkSync(file); rmdirSync(folder); }
});

test('Markdown escapes injected syntax and oversized complete report fails closed', () => {
  const s=start('version: 1\ndn: cn=<script>*[x]\nchangetype: delete\n');
  const md=complete(s,'markdown');
  assert.ok(!md.includes('<script>')); assert.ok(md.includes('&#60;script&#62;'));
  const dn='a'.repeat(60000);
  const large='version: 1\ndn: cn='+dn+'\nchangetype: modify\n'+'replace: cn\ncn: v\n-\n'.repeat(600);
  const cursor=core.paged_report_start(start(large),'json');
  let error=false, bytes=0;
  for (;;) { const p=JSON.parse(core.paged_report_next(cursor)); if(p.error){error=true;break} if(p.done)break; bytes+=Buffer.byteLength(p.chunk); }
  assert.ok(error); assert.ok(bytes<=32*1024*1024);
  assert.ok(JSON.parse(core.paged_report_next(cursor)).error);
});
