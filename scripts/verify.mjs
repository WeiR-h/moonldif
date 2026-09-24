import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './moon.mjs';

const steps = [
  ['toolchain', ['scripts/moon.mjs', 'version', '--all']],
  ['format', ['scripts/moon.mjs', 'fmt', '--check']],
  ['check', ['scripts/moon.mjs', 'check', '--target', 'js', '--deny-warn']],
  ['moonbit-tests', ['scripts/moon.mjs', 'test', '--target', 'js']],
  ['wasm-gc-check', ['scripts/moon.mjs', 'check', '--target', 'wasm-gc', '--deny-warn']],
  ['wasm-gc-tests', ['scripts/moon.mjs', 'test', '--target', 'wasm-gc']],
  ['build', ['scripts/build.mjs']],
  ['cli-tests', ['--test', 'tests/cli.test.mjs']],
  ['bounded-reader-tests', ['--test', 'tests/read-bounded.test.mjs']],
  ['pagination-tests', ['--test', 'tests/pagination.test.mjs']],
  ['profile-tests', ['--test', 'tests/profile.test.mjs']],
  ['scenarios', ['scripts/demo.mjs']],
];
const folder = resolve(root, 'verification/local');
mkdirSync(folder, { recursive: true });
const evidence = { started: new Date().toISOString(), node: process.version, platform: process.platform, status: 'running', steps: [] };
for (const [name, args] of steps) {
  console.log(`验证：${name}`);
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? '\n' + result.error.message : ''}`;
  writeFileSync(resolve(folder, `${name}.log`), output);
  const ok = result.status === 0 && !result.error;
  evidence.steps.push({ name, status: ok ? 'passed' : 'failed', exit_code: result.status, args });
  evidence.status = ok ? 'running' : 'failed';
  writeFileSync(resolve(folder, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
  if (!ok) { process.stderr.write(output); process.exitCode = 1; break; }
}
if (evidence.status !== 'failed') {
  evidence.status = 'passed';
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(folder, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('本地核心验收通过；详细记录位于 verification/local。独立对照和 moonldap 适配分别运行。');
}
