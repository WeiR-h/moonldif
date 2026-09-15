import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../dist/moonldif.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
function withFiles(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'moonldif 中文 space-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const content = 'version: 1\ndn: cn=A\ncn: A\nphoto:: /wBB\n';

test('help, version and command failures are predictable', () => {
  assert.equal(run('--help').status, 0);
  assert.match(run('--version').stdout, /^0\.1\.0-dev\.1\s*$/);
  for (const args of [[], ['check'], ['check', 'a', 'b'], ['check', 'a', '--format', 'xml'], ['format', 'a'], ['check', 'a', '--output', 'b']]) {
    assert.equal(run(...args).status, 2);
  }
  const missing = run('check', 'does-not-exist.ldif', '--format', 'json');
  assert.equal(missing.status, 2);
  assert.equal(JSON.parse(missing.stdout).diagnostics[0].code, 'execution-error');
});

test('Chinese and space paths, binary inspect and deterministic JSON', () => withFiles(dir => {
  const input = join(dir, '中文 文件.ldif');
  writeFileSync(input, content);
  const one = run('inspect', input, '--format', 'json');
  const two = run('inspect', input, '--format', 'json');
  assert.equal(one.status, 0);
  assert.equal(one.stdout, two.stdout);
  const result = JSON.parse(one.stdout);
  assert.equal(result.document.records[0].body.attributes[1].value.base64, '/wBB');
  assert.equal(result.document.records[0].body.attributes[1].value.text, null);
}));

test('format writes a new file, preserves semantics and refuses every overwrite', () => withFiles(dir => {
  const input = join(dir, 'source.ldif');
  const output = join(dir, '整理 后.ldif');
  writeFileSync(input, content);
  assert.equal(run('format', input, '--output', output).status, 0);
  assert.equal(run('check', output).status, 0);
  const before = readFileSync(output, 'utf8');
  assert.equal(run('format', input, '--output', output).status, 2);
  assert.equal(run('format', input, '--output', input).status, 2);
  assert.equal(readFileSync(output, 'utf8'), before);
  assert.equal(readFileSync(input, 'utf8'), content);
  const doc = path => JSON.parse(run('inspect', path, '--format', 'json').stdout).document;
  assert.deepEqual(doc(input), doc(output));
}));

test('policy and incomplete checks retain diagnostics and block writing', () => withFiles(dir => {
  const input = join(dir, 'changes.ldif');
  const output = join(dir, 'must-not-exist.ldif');
  writeFileSync(input, 'version: 1\ndn: a\nchangetype: delete\n');
  assert.equal(run('check', input, '--deny-delete').status, 1);
  writeFileSync(input, 'version: 1\ndn: a\nchangetype: delete\n\ndn: b\nchangetype: add\nphoto:< file:///never-read\n');
  const r = run('format', input, '--output', output, '--deny-delete', '--format', 'json');
  assert.equal(r.status, 2);
  const report = JSON.parse(r.stdout);
  assert.equal(report.status, 'incomplete');
  assert.ok(report.diagnostics.some(d => d.code === 'delete-denied'));
  assert.ok(report.diagnostics.some(d => d.code === 'external-value-unresolved'));
  assert.equal(existsSync(output), false);
}));

test('invalid bytes, large inputs and directories become input errors', () => withFiles(dir => {
  const input = join(dir, 'bad.ldif');
  writeFileSync(input, Buffer.from([255, 10]));
  assert.equal(run('check', input).status, 2);
  writeFileSync(input, Buffer.alloc(8 * 1024 * 1024 + 1, 65));
  assert.equal(run('check', input).status, 2);
  assert.equal(run('check', dir).status, 2);
}));
