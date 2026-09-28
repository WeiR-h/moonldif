import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8');
const version=JSON.parse(read('package.json')).version;
assert.match(version,/^\d+\.\d+\.\d+$/);
assert.equal(read('moon.mod').match(/^version\s*=\s*"([^"]+)"/m)[1],version);
assert.equal(JSON.parse(read('web/package.json')).version,version);
const lock=JSON.parse(read('web/package-lock.json'));
assert.equal(lock.version,version);assert.equal(lock.packages[''].version,version);
const compiled=spawnSync(process.execPath,['dist/moonldif.js','--version'],{encoding:'utf8'});
assert.equal(compiled.status,0);assert.equal(compiled.stdout.trim(),version);
for(const file of ['README.md','docs/CLI-DISTRIBUTION.md','examples/ci/README.md','examples/profiles/README.md','.github/workflows/ci.yml','.github/workflows/cli-consumer.yml']) {
  const text=read(file);
  for(const match of text.matchAll(/(?:moonldif@|moonldif-cli-v|--version |download\/v)(\d+\.\d+\.\d+)/g)) assert.equal(match[1],version,file);
  assert.ok(text.includes(version),file+' must identify current version');
}
assert.ok(read('docs/SUPPORT.md').includes('版本：'+version+'。'));
console.log('Current manifests, compiled CLI, installation examples and attachment names agree: '+version);
