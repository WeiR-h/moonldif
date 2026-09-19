import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { workbench } from '../dist/core.mjs';

const cli = fileURLToPath(new URL('../dist/moonldif.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
function withFiles(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'moonldif 中文 space-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const content = 'version: 1\ndn: cn=A\ncn: A\nphoto:: /wBB\n';

test('snapshot CLI distinguishes representation, drift and incomplete input', () => withFiles(dir => {
  const oldFile = join(dir, '迁移前 文件.ldif'), newFile = join(dir, '迁移后 文件.ldif');
  const before = 'version: 1\r\ndn: cn=[demo]\r\nmail: synthetic-secret\r\nmail: second\r\n';
  const equal = 'version: 1\ndn:: Y249W2RlbW9d\nMAIL: second\nmail:: c3ludGhldGljLXNlY3JldA==\n';
  writeFileSync(oldFile, before); writeFileSync(newFile, equal);
  let r = run('compare', oldFile, newFile, '--format', 'json');
  assert.equal(r.status, 0, r.stdout);
  assert.equal(JSON.parse(r.stdout).before.sha256, createHash('sha256').update(before).digest('hex'));
  assert.equal(JSON.parse(r.stdout).after.byte_length, Buffer.byteLength(equal));
  const changed = equal.replace('MAIL: second\n', ''); writeFileSync(newFile, changed);
  r = run('compare', oldFile, newFile, '--format', 'json');
  assert.equal(r.status, 1, r.stdout);
  assert.equal(r.stdout, run('compare', oldFile, newFile, '--format', 'json').stdout);
  const doc = JSON.parse(r.stdout); assert.equal(doc.changes[0].removed_value_count, 1);
  assert.ok(!r.stdout.includes('synthetic-secret')); assert.ok(!r.stdout.includes(dir));
  const md = run('compare', oldFile, newFile, '--format', 'markdown');
  assert.equal(md.status, 1); assert.match(md.stdout, /&#91;demo&#93;/);
  writeFileSync(newFile, 'version: 1\ndn: cn=[demo]\nphoto:< file:///never-read\n');
  r = run('compare', oldFile, newFile, '--format', 'json');
  assert.equal(r.status, 2); assert.equal(JSON.parse(r.stdout).comparison_performed, false);
  assert.deepEqual(JSON.parse(r.stdout).changes, []);
}));

test('snapshot CLI refuses misapplied policies, missing/extra files and oversized inputs', () => withFiles(dir => {
  const f = join(dir, 'a.ldif'); writeFileSync(f, content);
  for (const args of [[], [f], [f,f,f], [f,f,'--deny-delete'], [f,f,'--deny-clear'], [f,f,'--deny-rename'], [f,f,'--output',join(dir,'x')], [f,join(dir,'missing')], [f,dir]]) {
    const result = run('compare', ...args, '--format', 'json');
    assert.equal(result.status, 2); assert.equal(JSON.parse(result.stdout).exit_code, 2);
    assert.ok(!result.stdout.includes(dir));
  }
  const big = join(dir, 'big.ldif'); writeFileSync(big, Buffer.alloc(8 * 1024 * 1024 + 1, 65));
  assert.equal(run('compare', f,big).status, 2);
  const headerless = join(dir, 'old.ldif'); writeFileSync(headerless, content.replace('version: 1\n',''));
  assert.equal(run('compare', headerless, f).status, 2);
  assert.equal(run('compare', headerless, f, '--compat').status, 0);
}));

test('risk policies, source identity and Markdown review are consistent', () => withFiles(dir => {
  const input = join(dir, '个人 文件.ldif');
  const source = 'version: 1\r\ndn: cn=[demo]&user\r\nchangetype: modify\r\nreplace: description\r\ndescription: secret-value-not-for-report\r\n-\r\nreplace: mail\r\n-\r\n\r\ndn: cn=Demo\r\nchangetype: modrdn\r\nnewrdn: cn=New\r\ndeleteoldrdn: 1\r\n';
  writeFileSync(input, source);
  const args = ['review', input, '--deny-clear', '--deny-rename'];
  const result = run(...args, '--format', 'json');
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.source.sha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(report.source.byte_length, Buffer.byteLength(source));
  assert.equal(report.options.deny_clear, true);
  assert.equal(report.options.deny_rename, true);
  assert.equal(report.document, null);
  assert.deepEqual(report.diagnostics.map(d => d.code), ['clear-denied', 'rename-denied']);
  assert.equal(result.stdout, run(...args, '--format', 'json').stdout);
  const md = run(...args, '--format', 'markdown');
  assert.equal(md.status, 1);
  assert.match(md.stdout, /&#91;demo&#93;&#38;user/);
  for (const output of [result.stdout, md.stdout]) {
    assert.ok(!output.includes('secret-value-not-for-report'));
    assert.ok(!output.includes(dir));
    assert.ok(!output.includes('个人 文件'));
  }
  assert.equal(run('check', input).status, 0);
  assert.equal(run('check', input, '--deny-clear').status, 1);
  assert.equal(run('check', input, '--deny-rename').status, 1);
  const target = join(dir, 'refused.ldif');
  assert.equal(run('format', input, '--output', target, '--deny-clear').status, 1);
  assert.ok(!existsSync(target));
  assert.equal(run('check', input, '--format', 'markdown').status, 2);
  assert.equal(run('check', input, '--deny-clear', '--deny-clear').status, 2);
  assert.equal(run('check', input, '--deny-rename', '--deny-rename').status, 2);
  writeFileSync(input, source + '\r\ndn: cn=Photo\r\nchangetype: add\r\nphoto:< file:///private-secret\r\n');
  const incomplete = run(...args, '--format', 'json');
  assert.equal(incomplete.status, 2);
  assert.ok(JSON.parse(incomplete.stdout).diagnostics.some(d => d.code === 'clear-denied'));
  assert.ok(!incomplete.stdout.includes('file:///private-secret'));
}));

test('help, version and command failures are predictable', () => {
  assert.equal(run('--help').status, 0);
  const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  assert.equal(run('--version').stdout, packageVersion + '\n');
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
  assert.match(run('review', input).stdout, /Attribute: photo; supplied values: 0/);
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
  const unknown = call('version: 1\ndn: cn=A\nchangetype: modify\nincrement: uidNumber\nuidNumber: 1\n-\n');
  assert.equal(unknown.exit_code, 2);
  assert.equal(unknown.written, null);
  assert.equal(JSON.parse(unknown.output).review.items[0].code, 'unsupported-modification');
});


test('batch preserves single reports, failed file slots, names and stable fingerprints', () => withFiles(dir => {
  const safe = join(dir, '中文 [目录]&.ldif');
  const risk = join(dir, 'same.ldif');
  const other = join(dir, 'nested'); mkdirSync(other);
  const missing = join(other, 'same.ldif');
  const source = 'version: 1\r\ndn: cn=Demo\r\nchangetype: modify\r\nreplace: description\r\ndescription: secret-batch-attribute\r\n-\r\nreplace: mail\r\n-\r\n';
  writeFileSync(safe, content); writeFileSync(risk, source);
  const flags = ['--deny-delete', '--deny-clear', '--deny-rename'];
  const args = ['batch', safe, missing, risk, ...flags, '--format', 'json'];
  const result = run(...args); assert.equal(result.status, 2);
  const batch = JSON.parse(result.stdout);
  assert.equal(batch.requested_files, 3); assert.equal(batch.reported_files, 3);
  assert.deepEqual(batch.files.map(f => f.report.exit_code), [0, 2, 1]);
  assert.deepEqual(batch.files.map(f => f.index), [0, 1, 2]);
  assert.deepEqual(batch.files.map(f => f.label), ['中文 [目录]&.ldif', 'same.ldif', 'same.ldif']);
  assert.equal(batch.files[1].report.source, null);
  for (const [index, file] of [[0, safe], [2, risk]]) {
    assert.deepEqual(batch.files[index].report, JSON.parse(run('review', file, ...flags, '--format', 'json').stdout));
  }
  assert.equal(batch.files[2].report.source.sha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(batch.input_byte_budget_used, Buffer.byteLength(content) + Buffer.byteLength(source));
  assert.equal(result.stdout, run(...args).stdout);
  const md = run('batch', safe, missing, risk, ...flags, '--format', 'markdown');
  assert.equal(md.status, 2); assert.match(md.stdout, /&#91;目录&#93;&#38;/);
  assert.match(md.stdout, /Incomplete batch/);
  for (const output of [result.stdout, md.stdout, run('batch', risk, ...flags).stdout]) {
    assert.ok(!output.includes(dir)); assert.ok(!output.includes('secret-batch-attribute'));
  }
  assert.equal(run('batch', safe, risk, ...flags).status, 1);
  assert.equal(run('batch', safe, risk).status, 0);
  writeFileSync(risk, source + '\r\ndn: cn=External\r\nchangetype: add\r\nphoto:< file:///never-fetch\r\n');
  const mixed = JSON.parse(run('batch', risk, ...flags, '--format', 'json').stdout);
  assert.equal(mixed.exit_code, 2);
  assert.ok(mixed.files[0].report.diagnostics.some(d => d.code === 'clear-denied'));
}));

test('batch empty, argument, directory, file-count and late danger boundaries fail closed', () => withFiles(dir => {
  const safe = join(dir, 'safe.ldif'); const risk = join(dir, 'danger.ldif');
  writeFileSync(safe, content); writeFileSync(risk, 'version: 1\ndn: cn=Demo\nchangetype: delete\n');
  for (const args of [['batch'], ['batch', safe, '--output', join(dir, 'out')], ['batch', safe, '--deny-clear', '--deny-clear'], ['batch', ...Array(51).fill(safe)], ['batch', dir], ['batch', join(dir, '*.ldif')]]) assert.equal(run(...args).status, 2);
  const late = run('batch', ...Array(49).fill(safe), risk, '--deny-delete', '--format', 'json');
  assert.equal(late.status, 1); assert.equal(JSON.parse(late.stdout).files[49].report.exit_code, 1);
  const hyphen = join(dir, '-option.ldif'); writeFileSync(hyphen, content);
  const positional = spawnSync(process.execPath, [cli, 'batch', '--format', 'json', '--', '-option.ldif'], { cwd: dir, encoding: 'utf8' });
  assert.equal(positional.status, 0);
}));

test('batch cumulative byte budget retains earlier results and refuses unread content', () => withFiles(dir => {
  const file = join(dir, 'four-mib.ldif');
  const parts = [content]; let left = 4 * 1024 * 1024 - Buffer.byteLength(content);
  while (left > 0) { const n = Math.min(left, 512 * 1024); parts.push(n === 1 ? '\n' : '#' + 'x'.repeat(n - 2) + '\n'); left -= n; }
  writeFileSync(file, parts.join(''));
  const r = run('batch', ...Array(9).fill(file), '--format', 'json');
  assert.equal(r.status, 2, r.stderr);
  const b = JSON.parse(r.stdout);
  assert.equal(b.input_byte_budget_used, 32 * 1024 * 1024);
  assert.deepEqual(b.files.map(f => f.report.exit_code), [0,0,0,0,0,0,0,0,2]);
  assert.equal(b.files[8].report.source, null);
  assert.equal(b.files[8].report.status, 'unavailable');
}));


test('documented CI helper saves blocked/error reports and never overwrites evidence', () => withFiles(dir => {
  const helper = fileURLToPath(new URL('../examples/ci/check-plan.mjs', import.meta.url));
  const input = join(dir, 'plan.ldif'); const output = join(dir, 'report.json');
  writeFileSync(input, 'version: 1\ndn: cn=Demo\nchangetype: delete\n');
  const r = spawnSync(process.execPath, [helper, output, input], { encoding: 'utf8' });
  assert.equal(r.status, 1); assert.equal(JSON.parse(readFileSync(output, 'utf8')).exit_code, 1);
  const original = readFileSync(output, 'utf8');
  assert.equal(spawnSync(process.execPath, [helper, output, input]).status, 2);
  assert.equal(readFileSync(output, 'utf8'), original);
  const missingReport = join(dir, 'missing-report.json');
  assert.equal(spawnSync(process.execPath, [helper, missingReport, input, join(dir, 'missing.ldif')]).status, 2);
  const b = JSON.parse(readFileSync(missingReport, 'utf8'));
  assert.deepEqual(b.files.map(f => f.report.exit_code), [1, 2]);
}));
test('snapshot exclusions are repeatable, audited and fail closed', () => withFiles(dir => {
  const a = join(dir, 'before.ldif'), b = join(dir, 'after.ldif');
  const input = 'version: 1\ndn: cn=A\nmodifyTimestamp: before\nmail: same\n';
  writeFileSync(a, input); writeFileSync(b, input.replace('before', 'after'));
  assert.equal(run('compare', a, b).status, 1);
  const args = ['compare', a, b, '--ignore-attribute', 'MODIFYTIMESTAMP', '--ignore-attribute', 'modifyTimestamp', '--format', 'json'];
  const output = run(...args); assert.equal(output.status, 0);
  const report = JSON.parse(output.stdout);
  assert.deepEqual(report.options.ignored_attributes, ['modifytimestamp']);
  assert.deepEqual(report.excluded_attribute_occurrences, { before: 1, after: 1 });
  assert.equal(output.stdout, run(...args).stdout);
  assert.equal(report.before.sha256, createHash('sha256').update(input).digest('hex'));
  for (const invalid of ['', '*', 'dn', 'mail ', 'a'.repeat(257)]) assert.equal(run('compare', a, b, '--ignore-attribute', invalid).status, 2);
  for (const command of ['check', 'review', 'batch', 'inspect']) assert.equal(run(command, a, '--ignore-attribute', 'mail').status, 2);
  assert.equal(run('compare', a, b, '--ignore-attribute').status, 2);
  assert.equal(run('compare', a, b, ...Array(65).fill(['--ignore-attribute', 'mail']).flat()).status, 2);
  writeFileSync(b, input.replace('modifyTimestamp: before', 'modifyTimestamp:< file:///secret'));
  assert.equal(run(...args).status, 2);
}));
