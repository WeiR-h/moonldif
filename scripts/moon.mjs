import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function runMoon(args, cwd = root) {
  const config = resolve(root, '.local-toolchain.json');
  const local = existsSync(config) ? JSON.parse(readFileSync(config, 'utf8')).moonHome : null;
  const home = process.env.MOON_HOME || local;
  const env = { ...process.env };
  if (home) {
    env.MOON_HOME = home;
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
    env.PATH = [resolve(home, 'bin'), dirname(process.execPath), process.env.PATH || ''].join(delimiter);
  }
  const binary = home ? resolve(home, 'bin', process.platform === 'win32' ? 'moon.exe' : 'moon') : 'moon';
  const result = spawnSync(binary, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`MoonBit exited with ${result.status}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runMoon(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
