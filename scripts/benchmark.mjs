// Same harness and fresh process per case for baseline and candidate artifacts.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { root } from './moon.mjs';
import { cases, fixture } from './performance-fixtures.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv[2] === '--worker') {
  const spec = cases.find(c => c.id === process.argv[3]);
  if (!spec) throw new Error('Unknown performance case');
  const corePath = resolve(process.argv[4]);
  const core = await import(pathToFileURL(corePath));
  const bytes = fixture(spec), after = Buffer.from(bytes.toString().replace('cn: User 0\n', 'cn: Changed\n'));
  let folder, paths;
  if (spec.command === 'batch') {
    folder = mkdtempSync(join(tmpdir(), 'moonldif-perf-'));
    paths = Array.from({ length: 50 }, (_, i) => join(folder, `synthetic-${i}.ldif`));
    for (const path of paths) writeFileSync(path, bytes);
  }
  const measurements = [], rssBefore = process.memoryUsage().rss;
  let version;
  try {
    for (let i = 0; i < 8; i++) {
      const start = performance.now();
      let envelope;
      if (spec.command === 'batch') {
        const run = spawnSync(process.execPath, [join(dirname(corePath), 'moonldif.js'), 'batch', ...paths, '--format', 'json'], { encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
        assert.equal(run.status, 0, run.stderr + run.stdout);
        envelope = { exit_code: run.status, output: run.stdout };
      } else if (spec.command === 'compare') {
        envelope = JSON.parse(core.compare_exports_v2(bytes.toString('base64'), after.toString('base64'), sha(bytes), sha(after), false, false, 'json', '[]'));
        assert.equal(envelope.exit_code, 1);
      } else {
        envelope = JSON.parse(core.analyse_v2(bytes.toString('base64'), spec.command, 'json', false, false, false, false, false, sha(bytes)));
        assert.equal(envelope.exit_code, 0);
        if (spec.command === 'format') assert.equal(typeof envelope.written, 'string');
      }
      const output = JSON.parse(envelope.output);
      version = output.version;
      if (spec.command === 'batch') assert.equal(output.files.length, 50);
      else if (spec.command === 'compare') assert.equal(output.changes.length, 1);
      else assert.equal(output.record_count, spec.records);
      if (spec.command === 'review') {
        assert.equal(output.review.total_items, 10000);
        assert.equal(output.review.items.length, 200);
      }
      if (i > 0) measurements.push(performance.now() - start);
    }
  } finally { if (folder) rmSync(folder, { recursive: true, force: true }); }
  const sorted = [...measurements].sort((a, b) => a - b);
  console.log(JSON.stringify({ id: spec.id, command: spec.command, records: spec.records, version,
    input_bytes: bytes.length, input_sha256: sha(bytes), after_sha256: spec.command === 'compare' ? sha(after) : null,
    measured_runs: 7, measurements_ms: measurements, min_ms: sorted[0], median_ms: sorted[3], max_ms: sorted[6],
    rss_before_bytes: spec.command === 'batch' ? null : rssBefore,
    rss_after_bytes: spec.command === 'batch' ? null : process.memoryUsage().rss,
    memory_scope: spec.command === 'batch' ? 'CLI child RSS not measured' : 'process before/after, not peak', status: 'passed' }));
} else {
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const corePath = resolve(option('--core', resolve(root, 'dist/core.mjs')));
  const output = resolve(option('--out', resolve(root, 'verification/local/performance.json')));
  const selected = option('--case', null);
  if (selected && !cases.some(c => c.id === selected)) throw new Error('Unknown performance case');
  const report = { at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
    cpu: cpus()[0]?.model, core_sha256: sha(readFileSync(corePath)),
    method: 'Fresh process per case, one warm-up plus seven measured runs. analyse_v2 with host SHA-256, Base64, report parsing and safe writer round-trip. Compare uses compare_exports_v2. Batch invokes real CLI with 50 local files including startup and I/O; its child RSS is not measured. RSS before/after is not peak. Synthetic data; no competing-library claim.',
    status: 'running', cases: [] };
  for (const spec of cases.filter(c => !selected || c.id === selected)) {
    console.log(`Scale validation: ${spec.id}`);
    const result = spawnSync(process.execPath, ['scripts/benchmark.mjs', '--worker', spec.id, corePath], { cwd: root, encoding: 'utf8', timeout: 120000 });
    if (result.status !== 0 || result.error) { report.status = 'failed'; report.error = result.error?.message || result.stderr; break; }
    report.cases.push(JSON.parse(result.stdout));
  }
  if (report.status !== 'failed') report.status = 'passed';
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, cases: report.cases.length, error: report.error }));
  if (report.status !== 'passed') process.exitCode = 1;
}
