// CI glue: save the core-generated JSON report and preserve its exit code.
// Usage: node examples/ci/check-plan.mjs REPORT.json INPUT.ldif [INPUT.ldif ...]
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const [output, ...inputs] = process.argv.slice(2);
if (!output || inputs.length === 0) {
  console.error('Expected a new report path and at least one explicit LDIF input.');
  process.exitCode = 2;
} else {
  const cli = fileURLToPath(new URL('../../dist/moonldif.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'batch', '--format', 'json', '--deny-delete', '--deny-clear', '--deny-rename', '--', ...inputs], { encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || ![0, 1, 2].includes(result.status)) {
    console.error('Preflight did not finish; no successful report is available.');
    process.exitCode = 2;
  } else {
    try {
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, result.stdout, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      console.log('Saved the batch report; preflight exit code: ' + result.status);
      process.exitCode = result.status;
    } catch {
      console.error('Could not save a new report. Existing files were not overwritten.');
      process.exitCode = 2;
    }
  }
}
