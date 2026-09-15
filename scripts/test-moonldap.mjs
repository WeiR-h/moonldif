import { root, runMoon } from './moon.mjs';
import { resolve } from 'node:path';
runMoon(['test', '--target', 'js', '-p', 'WeiR-h/moonldif_moonldap'], resolve(root, 'integrations/moonldap'));
