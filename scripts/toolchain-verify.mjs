import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { root } from './moon.mjs';

export function assertCompilerVersion(output) {
  const match = output.match(/^moonc v(\d+)\.(\d+)\.(\d+)(?:[+\s]|$)/m);
  if (!match) throw new Error('Cannot identify the MoonBit compiler version');
  const actual = match.slice(1).map(Number), minimum = [0, 10, 14];
  for (let i = 0; i < minimum.length; i++) {
    if (actual[i] > minimum[i]) return actual.join('.');
    if (actual[i] < minimum[i]) throw new Error('moonc >= 0.10.14 is required; install the pinned toolchain before building');
  }
  return actual.join('.');
}
export function verifyToolchain() {
  const result = spawnSync(process.execPath, [resolve(root,'scripts/moon.mjs'),'version','--all'], {cwd:root,encoding:'utf8'});
  if (result.error || result.status !== 0) throw new Error('Cannot run the MoonBit toolchain');
  const version = assertCompilerVersion(result.stdout);
  console.log('Verified compiler minimum: moonc '+version);
  return version;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verifyToolchain();
