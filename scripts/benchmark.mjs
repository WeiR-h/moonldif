// Reproducible synthetic scale evidence. This is not a competing-library benchmark.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { root } from './moon.mjs';

if (process.argv[2] === '--worker') {
  const count = Number(process.argv[3]);
  const command = process.argv[4];
  if (![100, 1000, 5000, 10000].includes(count) || !['check', 'format'].includes(command)) throw new Error('Invalid benchmark case');
  const core = await import('../dist/core.mjs');
  const lines = ['version: 1\n\n'];
  for (let i = 0; i < count; i++) lines.push(`dn: uid=user-${i},ou=People,dc=example,dc=org\nobjectClass: inetOrgPerson\nuid: user-${i}\ncn: User ${i}\nsn: User\ndescription: ${'x'.repeat(80)}\nphoto:: /wAB\n\n`);
  const bytes = Buffer.from(lines.join(''));
  const measurements = [];
  const rssBefore = process.memoryUsage().rss;
  for (let i = 0; i < 4; i++) {
    const start = performance.now();
    const report = JSON.parse(core.analyse(bytes.toString('base64'), command, 'json', false, false, false));
    const elapsed = performance.now() - start;
    if (report.exit_code !== 0 || JSON.parse(report.output).record_count !== count || (command === 'format' && report.written === null)) throw new Error('Incorrect benchmark result');
    if (i > 0) measurements.push(elapsed);
  }
  const sorted = [...measurements].sort((a, b) => a - b);
  console.log(JSON.stringify({ command, records: count, input_bytes: bytes.length, measured_runs: measurements.length,
    min_ms: sorted[0], median_ms: sorted[1], max_ms: sorted[2], rss_before_bytes: rssBefore,
    rss_after_bytes: process.memoryUsage().rss, status: 'passed' }));
} else {
  const report = { at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
    cpu: cpus()[0]?.model, version: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version,
    method: 'Fresh Node process per case; one warm-up plus three measured runs. Includes Base64 transport, MoonBit analysis, report and optional writer round-trip. RSS is before/after, not peak or core-only allocation. Synthetic input; no speed comparison claim.',
    status: 'running', cases: [] };
  for (const count of [100, 1000, 5000, 10000]) {
    for (const command of ['check', 'format']) {
      console.log(`规模验证：${count} 条记录，${command}`);
      const result = spawnSync(process.execPath, ['scripts/benchmark.mjs', '--worker', String(count), command], { cwd: root, encoding: 'utf8', timeout: 120000 });
      if (result.status !== 0 || result.error) {
        report.status = 'failed'; report.error = result.error?.message || result.stderr; break;
      }
      report.cases.push(JSON.parse(result.stdout));
    }
    if (report.status === 'failed') break;
  }
  if (report.status !== 'failed') report.status = 'passed';
  mkdirSync(resolve(root, 'verification/local'), { recursive: true });
  writeFileSync(resolve(root, 'verification/local/performance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`规模验证：${report.status}，${report.cases.length} 组。`);
  if (report.status !== 'passed') { console.error(report.error); process.exitCode = 1; }
}
