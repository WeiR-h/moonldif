import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, runMoon } from './moon.mjs';

runMoon(['build', '--target', 'js', '--release']);
mkdirSync(resolve(root, 'dist'), { recursive: true });
copyFileSync(resolve(root, '_build/js/release/build/bridge/bridge.js'), resolve(root, 'dist/core.mjs'));
copyFileSync(resolve(root, 'cmd/moonldif.mjs'), resolve(root, 'dist/moonldif.js'));
console.log('Built MoonLDIF CLI.');
