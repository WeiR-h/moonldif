import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const paths={baseline:'.tools/performance-baseline-0.7.3/dist/core.mjs',candidate:'dist/core.mjs'};
if(process.argv[2]==='--worker'){
  const core=await import(pathToFileURL(resolve(process.argv[3])));
  const before='version: 1\n\n'+Array.from({length:100},(_,i)=>`dn: cn=${String(i).padStart(5,'0')}\nmail: before\n\n`).join('');
  const after=before.replaceAll('mail: before','mail: after');
  const sha=s=>createHash('sha256').update(s).digest('hex');
  const s=core.paged_start('compare',Buffer.from(before).toString('base64'),Buffer.from(after).toString('base64'),JSON.stringify({before_sha256:sha(before),after_sha256:sha(after)}));
  const measurements=[];
  for(let run=0;run<8;run++){
    const start=performance.now();
    for(let n=0;n<500;n++)assert.equal(JSON.parse(JSON.parse(core.paged_page(s,'{"offset":50}','json')).output).items.at(-1).item_index,99);
    if(run)measurements.push((performance.now()-start)/500);
  }
  console.log(JSON.stringify({measurements,median_ms:[...measurements].sort((a,b)=>a-b)[3]}));
}else{
  const baseline=readFileSync(paths.baseline,'utf8').replaceAll('0.7.3','0.7.4'),candidate=readFileSync(paths.candidate,'utf8');
  const data={method:'Diagnostic of the sub-millisecond compare-100 tail stage: 500 queries per timing block, one warm-up block and seven measured blocks per process; three alternating pairs. Initial and repeat measurements are retained separately.',same_compiled_core_except_version:baseline===candidate,normalized_sha256:createHash('sha256').update(candidate).digest('hex'),rounds:[]};
  for(let i=0;i<3;i++){
    const pair={};
    for(const kind of i%2?['candidate','baseline']:['baseline','candidate']){
      const run=spawnSync(process.execPath,[process.argv[1],'--worker',paths[kind]],{encoding:'utf8',timeout:120000});
      assert.equal(run.status,0,run.stderr);pair[kind]=JSON.parse(run.stdout);
    }
    pair.ratio=pair.candidate.median_ms/pair.baseline.median_ms;data.rounds.push(pair);
  }
  data.ratio=data.rounds.map(r=>r.ratio).sort((a,b)=>a-b)[1];
  data.status=data.ratio<=1.1?'passed':'needs-investigation';
  writeFileSync('verification/local/pagination-v0.7.4-tail-diagnostic.json',JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({status:data.status,ratio:data.ratio,same_core:data.same_compiled_core_except_version}));
}
