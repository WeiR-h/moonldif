import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCompilerVersion } from '../scripts/toolchain-verify.mjs';

test('compiler gate rejects unsupported or unidentifiable compilers', () => {
  for (const text of ['moonc v0.10.14+abc', 'moonc v0.10.19', 'moonc v0.9.99', 'moon 0.10.20', 'moonc v0.10.20-rc.1']) assert.throws(()=>assertCompilerVersion(text));
  for (const version of ['0.10.20','0.10.21','0.11.0','1.0.0']) assert.equal(assertCompilerVersion(`moon 0.1.20261104\nmoonc v${version}+abc (date)\nmoonrun 0.1.20261104`),version);
});

test('compiler gate verifies the installed build for a pinned CI, and records latest separately', () => {
  const output = 'moonc v0.10.20+65efd5b93 (2026-11-05)';
  assert.equal(assertCompilerVersion(output, '0.10.20+65efd5b93'), '0.10.20');
  assert.throws(()=>assertCompilerVersion(output, '0.10.20+different'), /Expected moonc/);
  assert.equal(assertCompilerVersion(output, 'latest'), '0.10.20');
});
