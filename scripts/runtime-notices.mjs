import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { root } from './moon.mjs';

export function coreNotices() {
  const config = resolve(root, '.local-toolchain.json');
  const local = existsSync(config) ? JSON.parse(readFileSync(config, 'utf8')).moonHome : null;
  const home = process.env.MOON_HOME || local || resolve(homedir(), '.moon');
  return 'MoonBit standard library — compiled into the MoonLDIF core\nSource: https://github.com/moonbitlang/core\n\n' + readFileSync(resolve(home, 'lib/core/LICENSE'), 'utf8');
}
export function writeCoreNotices() {
  writeFileSync(resolve(root, 'dist/THIRD_PARTY_LICENSES.txt'), coreNotices(), 'utf8');
}
