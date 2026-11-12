import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './moon.mjs';

const toolchain = JSON.parse(readFileSync(resolve(root, 'scripts/toolchain.json'), 'utf8'));

export function assertCompilerVersion(output, expectedVersion) {
  const match = output.match(/^moonc v(\d+)\.(\d+)\.(\d+)(?:[+\s]|$)/m);
  if (!match) throw new Error('Cannot identify the MoonBit compiler version');
  const actual = match.slice(1).map(Number), minimum = toolchain.minimumVersion.split('.').map(Number);
  if (expectedVersion && expectedVersion !== 'latest') {
    const installed = output.match(/^moonc v([^\s]+)/m)?.[1];
    if (installed !== expectedVersion) throw new Error(`Expected moonc ${expectedVersion}, installed ${installed}`);
  }
  for (let i = 0; i < minimum.length; i++) {
    if (actual[i] > minimum[i]) return actual.join('.');
    if (actual[i] < minimum[i]) throw new Error(`moonc >= ${toolchain.minimumVersion} is required; install the documented toolchain before building`);
  }
  return actual.join('.');
}
export function verifyToolchain() {
  const result = spawnSync(process.execPath, [resolve(root,'scripts/moon.mjs'),'version','--all'], {cwd:root,encoding:'utf8'});
  if (result.error || result.status !== 0) throw new Error('Cannot run the MoonBit toolchain');
  const version = assertCompilerVersion(result.stdout, process.env.MOONBIT_INSTALL_VERSION);
  console.log('Verified compiler minimum: moonc '+version);
  return version;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verifyToolchain();
