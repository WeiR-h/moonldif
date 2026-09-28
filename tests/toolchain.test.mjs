import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCompilerVersion } from '../scripts/toolchain-verify.mjs';

test('compiler gate checks moonc, rejecting older or unidentifiable compiler output', () => {
  for (const text of ['moonc v0.10.11+abc', 'moonc v0.10.13 (date)', 'moonc v0.9.99', 'moon 0.10.14', 'moonc v0.10.14-rc.1']) assert.throws(()=>assertCompilerVersion(text));
  for (const version of ['0.10.14','0.10.15','0.11.0','1.0.0']) assert.equal(assertCompilerVersion(`moon 0.1.20260918\nmoonc v${version}+abc (date)\nmoonrun 0.1.20260918`),version);
});
