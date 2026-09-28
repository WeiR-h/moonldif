import {existsSync,lstatSync,realpathSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const web=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const output=resolve(web,'dist');
// Only this generated output directory, never a redirected checkout or junction.
if (existsSync(output)) {
  if (lstatSync(output).isSymbolicLink() || realpathSync(output)!==output) throw new Error('Refusing redirected workbench output');
  rmSync(output,{recursive:true});
}
