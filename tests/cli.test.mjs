import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workbench } from '../dist/core.mjs';

const cli = fileURLToPath(new URL('../dist/moonldif.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
function withFiles(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'moonldif 中文 space-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const content = 'version: 1\ndn: cn=A\ncn: A\nphoto:: /wBB\n';

test('help, version and command failures are predictable', () => {
  assert.equal(run('--help').status, 0);
  assert.match(run('--version').stdout, /^0\.1\.0-dev\.3\s*$/);
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
  writeFileSync(input, 'version: 1\ndn: cn=A\nchangetype: delete\n');
  assert.equal(run('check', input, '--deny-delete').status, 1);
  writeFileSync(input, 'version: 1\ndn: cn=A\nchangetype: delete\n\ndn: cn=B\nchangetype: add\nphoto:< file:///never-read\n');
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

test('preflight blocks malformed directory names before writing', () => withFiles(dir => {
  const input = join(dir, 'bad-name.ldif');
  const output = join(dir, 'blocked.ldif');
  writeFileSync(input, 'version: 1\ndn: cn=A,\nchangetype: delete\n');
  const r = run('format', input, '--output', output, '--deny-delete', '--format', 'json');
  assert.equal(r.status, 2);
  const report = JSON.parse(r.stdout);
  assert.equal(report.names_checked, true);
  assert.ok(report.diagnostics.some(d => d.code === 'name-empty-component' && d.span.line === 2));
  assert.ok(report.diagnostics.some(d => d.code === 'delete-denied'));
  assert.equal(existsSync(output), false);
}));

test('legacy name padding is opt-in and preserved with a diagnostic', () => withFiles(dir => {
  const input = join(dir, 'legacy.ldif');
  const output = join(dir, 'legacy-output.ldif');
  writeFileSync(input, 'version: 1\ndn: cn=A, dc=example\ncn: A\n');
  assert.equal(run('check', input).status, 2);
  assert.equal(run('check', input, '--compat').status, 2);
  const r = run('format', input, '--output', output, '--legacy-dn-spaces', '--format', 'json');
  assert.equal(r.status, 0);
  assert.ok(JSON.parse(r.stdout).diagnostics.some(d => d.code === 'legacy-name-separator-spaces'));
  assert.match(readFileSync(output, 'utf8'), /dn: cn=A, dc=example/);
  assert.equal(run('check', input, '--legacy-dn-spaces', '--legacy-dn-spaces').status, 2);
}));

test('review reports ordered intent and retains policy and incomplete exit codes', () => withFiles(dir => {
  const input = join(dir, 'review.ldif');
  writeFileSync(input, 'version: 1\ndn: cn=A\nchangetype: modify\nreplace: photo\n-\n\ndn: cn=B\nchangetype: delete\n');
  const r = run('review', input, '--deny-delete', '--format', 'json');
  assert.equal(r.status, 1);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.review.items.map(i => i.code), ['attribute-clear', 'entry-delete']);
  assert.equal(report.review.items[1].attribute, null);
  assert.equal(report.document, null);
  assert.equal(JSON.parse(run('check', input, '--format', 'json').stdout).review, null);
  assert.match(run('review', input).stdout, /Operation review: 2 items/);
  writeFileSync(input, 'version: 1\ndn: cn=A\nchangetype: add\nphoto:< file:///never-read\n');
  const partial = run('review', input, '--format', 'json');
  assert.equal(partial.status, 2);
  assert.equal(JSON.parse(partial.stdout).review.analysis_complete, false);
}));

test('browser bridge uses the actual core writer and refuses policy or incomplete exports', () => {
  const call = (text, deny = true) => JSON.parse(workbench(Buffer.from(text).toString('base64'), false, deny, false, true));
  const valid = call(content);
  assert.equal(valid.exit_code, 0);
  assert.match(valid.written, /photo:: \/wBB/);
  assert.equal(JSON.parse(valid.output).review.total_items, 0);
  const denied = call('version: 1\ndn: cn=A\nchangetype: delete\n');
  assert.equal(denied.exit_code, 1);
  assert.equal(denied.written, null);
  const incomplete = call('version: 1\ndn: cn=A\nphoto:< file:///never-read\n');
  assert.equal(incomplete.exit_code, 2);
  assert.equal(incomplete.written, null);
  const invalidName = call('version: 1\ndn: broken\ncn: A\n');
  assert.equal(invalidName.exit_code, 2);
  assert.equal(invalidName.written, null);
});
