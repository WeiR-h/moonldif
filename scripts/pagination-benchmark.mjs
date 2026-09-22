// Synthetic scale evidence: independent process per mode/size, warm-up + seven runs.
import {spawnSync} from 'node:child_process';
import {writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
if(process.argv[2]==='--worker') {
  const mode=process.argv[3], n=Number(process.argv[4]), core=await import('../dist/core.mjs');
  const source='version: 1\n\n'+Array.from({length:n},(_,i)=>`dn: cn=${String(i).padStart(5,'0')}\n`+(mode==='review'?'changetype: modify\nreplace: mail\nmail: before\n-\n\n':'mail: before\n\n')).join('');
  const after=source.replaceAll('mail: before','mail: after');
  const sha=s=>createHash('sha256').update(s).digest('hex');
  const measurements=[];const rssBefore=process.memoryUsage().rss;
  for(let i=0;i<8;i++) {
    const t0=performance.now();
    const s=core.paged_start(mode==='review'?'review':'compare',Buffer.from(source).toString('base64'),Buffer.from(after).toString('base64'),JSON.stringify({before_sha256:sha(source),after_sha256:sha(after)}));
    const first=JSON.parse(JSON.parse(core.paged_page(s,'{}','json')).output);
    const t1=performance.now();assert.equal(first.page.total_items,n);
    const tail=JSON.parse(JSON.parse(core.paged_page(s,JSON.stringify({offset:Math.max(0,n-50)}),'json')).output);
    const t2=performance.now();assert.equal(tail.items.at(-1).item_index,n-1);
    const match=JSON.parse(JSON.parse(core.paged_page(s,JSON.stringify({query:String(n-1).padStart(5,'0')}),'json')).output);
    const t3=performance.now();assert.equal(match.items.length,1);
    const c=core.paged_report_start(s,'json'), chunks=[];
    for(;;){const p=JSON.parse(core.paged_report_next(c));assert.ok(!p.error);if(p.done)break;chunks.push(p.chunk)}
    const all=JSON.parse(chunks.join(''));assert.equal(all.items.length,n);
    const t4=performance.now();
    if(i>0)measurements.push({analysis_ms:t1-t0,tail_ms:t2-t1,search_ms:t3-t2,export_parse_ms:t4-t3,total_ms:t4-t0});
  }
  const median=key=>measurements.map(m=>m[key]).sort((a,b)=>a-b)[3];
  console.log(JSON.stringify({mode,records:n,input_bytes:Buffer.byteLength(source),sha256:sha(source),version:JSON.parse(core.cli_plan('["--version"]')).output.trim(),measurements,
    medians:Object.fromEntries(Object.keys(measurements[0]).map(k=>[k,median(k)])),rss_before:rssBefore,rss_after:process.memoryUsage().rss,status:'passed'}));
} else {
  const cases=[];
  for(const mode of ['review','compare'])for(const n of [100,1000,5000,10000]) {
    const r=spawnSync(process.execPath,[process.argv[1],'--worker',mode,String(n)],{encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
    assert.equal(r.status,0,r.stderr+r.stdout);cases.push(JSON.parse(r.stdout));console.log(`${mode} ${n} passed`);
  }
  mkdirSync('verification/local',{recursive:true});
  writeFileSync(resolve('verification/local/pagination-performance.json'),JSON.stringify({node:process.version,platform:process.platform,cpu:cpus()[0]?.model,
    method:'Independent process per scenario; one warm-up and seven measured runs. Includes source hashing, Base64 transport, initial page, tail lookup, full search, chunk transport and full JSON parsing. RSS before/after is not peak or a leak proof; synthetic data.',cases,status:'passed'},null,2)+'\n');
}
