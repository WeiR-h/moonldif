// Host-only CI example: persist the MoonBit report and preserve its status.
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const [report,profile,...inputs]=process.argv.slice(2);
if(!report||!profile||!inputs.length){console.error('Expected REPORT PROFILE INPUT...');process.exitCode=2;}
else {
  const cli=fileURLToPath(new URL('../../dist/moonldif.js',import.meta.url));
  const result=spawnSync(process.execPath,[cli,'batch','--profile',profile,'--format','json','--',...inputs],{encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024});
  if(result.error||![0,1,2].includes(result.status)){console.error('Analysis did not complete.');process.exitCode=2;}
  else try {writeFileSync(report,result.stdout,{encoding:'utf8',flag:'wx',mode:0o600});process.exitCode=result.status;}
  catch {console.error('Cannot save a new report; existing files are not overwritten.');process.exitCode=2;}
}
