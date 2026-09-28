// Public, immutable release downloads: verify both named artifacts before Pages deployment.
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {root} from './moon.mjs';
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const base=`https://github.com/WeiR-h/moonldif/releases/download/v${version}/`;
async function get(name) {
  const r=await fetch(base+name,{signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw new Error(`Missing public release attachment: ${name} (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}
const checks=(await get('SHA256SUMS')).toString('utf8');
const folder=resolve(root,'verification/local/public-downloads');mkdirSync(folder,{recursive:true});
const files=[];
for(const name of [`WeiR-h-moonldif-${version}.zip`,`moonldif-cli-v${version}.zip`]) {
  const line=checks.split(/\r?\n/).find(s=>s.slice(66)===name);
  if(!line||!/^[a-f0-9]{64}  /.test(line))throw new Error('Missing checksum for '+name);
  const bytes=await get(name),actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==line.slice(0,64))throw new Error('Checksum mismatch: '+name);
  writeFileSync(resolve(folder,name),bytes);
  files.push({name,bytes:bytes.length,sha256:actual});
}
writeFileSync(resolve(root,'verification/local/release-assets.json'),JSON.stringify({status:'passed',version,files},null,2)+'\n');
console.log('Public release artifacts and SHA-256 verified.');
