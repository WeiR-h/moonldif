import {existsSync,lstatSync,realpathSync,readdirSync,unlinkSync,rmdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const web=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const output=resolve(web,'dist');
// Only this generated output directory, never a redirected checkout or junction.
function removeGenerated(directory) {
  if (lstatSync(directory).isSymbolicLink() || realpathSync(directory)!==directory) throw new Error('Refusing redirected workbench output');
  for (const name of readdirSync(directory)) {
    const file=resolve(directory,name);
    const stat=lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('Unexpected link in generated output');
    if (stat.isDirectory()) removeGenerated(file); else unlinkSync(file);
  }
  rmdirSync(directory);
}
if (existsSync(output)) {
  removeGenerated(output);
  if (existsSync(output)) throw new Error('Generated output was not removed');
}
