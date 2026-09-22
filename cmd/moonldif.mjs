#!/usr/bin/env node
// Host responsibilities: bounded local byte I/O, source SHA-256 and process status.
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import * as core from './core.mjs';
import { readBounded } from './read-bounded.mjs';
import { spoolReport } from './report-output.mjs';

let format = 'text';
let result;
try {
  const plan = JSON.parse(core.cli_plan(JSON.stringify(process.argv.slice(2))));
  if (plan.action === 'report') result = plan;
  else if (plan.paged) {
    format = plan.format;
    const before = readBounded(plan.inputs[0]);
    const after = plan.command === 'compare' ? readBounded(plan.inputs[1]) : Buffer.alloc(0);
    const session = core.paged_start(plan.command, before.toString('base64'), after.toString('base64'), JSON.stringify({
      ...plan, before_sha256: createHash('sha256').update(before).digest('hex'),
      after_sha256: createHash('sha256').update(after).digest('hex'),
    }));
    if (plan.all) {
      spoolReport(core, session, format);
      result = { output: '', exit_code: core.paged_exit_code(session) };
    } else result = JSON.parse(core.paged_page(session, JSON.stringify(plan.page_query), format));
  }
  else if (plan.action === 'compare') {
    format = plan.format;
    const before = readBounded(plan.inputs[0]);
    const after = readBounded(plan.inputs[1]);
    result = JSON.parse(core.compare_exports_v2(before.toString('base64'), after.toString('base64'),
      createHash('sha256').update(before).digest('hex'), createHash('sha256').update(after).digest('hex'),
      plan.compat, plan.legacy_dn_spaces, format, JSON.stringify(plan.ignored_attributes)));
  }
  else if (plan.action === 'batch') {
    format = plan.format;
    const batch = core.batch_start(plan.compat, plan.deny_delete, plan.legacy_dn_spaces, plan.deny_clear, plan.deny_rename);
    for (const input of plan.inputs) {
      const label = basename(input);
      let bytes;
      try { bytes = readBounded(input, core.batch_remaining_bytes(batch)); }
      catch { core.batch_unavailable(batch, label); continue; }
      core.batch_add(batch, label, bytes.toString('base64'), createHash('sha256').update(bytes).digest('hex'));
    }
    result = JSON.parse(core.batch_finish(batch, format));
  } else {
    format = plan.format;
    const bytes = readBounded(plan.input);
    result = JSON.parse(core.analyse_v2(bytes.toString('base64'), plan.command, plan.format, plan.compat, plan.deny_delete, plan.legacy_dn_spaces, plan.deny_clear, plan.deny_rename, createHash('sha256').update(bytes).digest('hex')));
    if (result.written !== null && result.exit_code === 0) {
      writeFileSync(plan.output_path, result.written, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    }
  }
} catch (error) {
  result = JSON.parse(core.host_error('Local file operation failed' + (typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? ': ' + error.code : '.'), format));
}
process.stdout.write(result.output);
process.exitCode = result.exit_code;
