// Alternate version order in three rounds to expose environmental drift.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { cases } from './performance-fixtures.mjs';
const paths = { baseline: resolve('.tools/performance-baseline-0.5.1/dist/core.mjs'), candidate: resolve('dist/core.mjs') };
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length / 2)];
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name)+1] : fallback;
const selected = option('--case', null);
const output = option('--out', 'verification/local/performance-paired.json');
if (selected && !cases.some(c => c.id === selected)) throw new Error('Unknown performance case');
const evidence = { method: 'Three rounds, alternating baseline/candidate order, each fresh worker warms up once and measures seven runs; median of paired ratios. All observations retained, no forced GC.',
  hashes: Object.fromEntries(Object.entries(paths).map(([name,path]) => [name,createHash('sha256').update(readFileSync(path)).digest('hex')])), cases: [], status: 'running' };
try {
  for (const spec of cases.filter(c => !selected || c.id === selected)) {
    const rounds = [];
    for (let round = 0; round < 3; round++) {
      const pair = {};
      for (const version of round % 2 ? ['candidate','baseline'] : ['baseline','candidate']) {
        const run = spawnSync(process.execPath, ['scripts/benchmark.mjs','--worker',spec.id,paths[version]], { encoding:'utf8',timeout:120000 });
        if (run.status !== 0) throw new Error(run.stderr || String(run.error));
        pair[version] = JSON.parse(run.stdout);
      }
      pair.ratio = pair.candidate.median_ms / pair.baseline.median_ms;
      rounds.push(pair);
    }
    const ratio = median(rounds.map(r => r.ratio));
    evidence.cases.push({ id: spec.id, ratio, regression: ratio > 1.1, rounds });
    console.log(JSON.stringify({ id: spec.id, median_paired_change_percent: +(100*(ratio-1)).toFixed(1) }));
    writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
  }
  evidence.status = evidence.cases.some(c => c.regression) ? 'regression-needs-investigation' : 'passed';
} catch (error) { evidence.status='failed'; evidence.error=error.stack; }
writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
console.log(evidence.status);
if(evidence.status!=='passed') process.exitCode=1;
