import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as core from './core.mjs';
import { readBounded } from './read-bounded.mjs';
import { spoolReport } from './report-output.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function runProfile(plan) {
  let raw;
  try { raw = readBounded(plan.profile_path, 65536); }
  catch { return JSON.parse(core.host_error('Configuration must be a readable local regular file within 64 KiB.', plan.format)); }
  const encoded = raw.toString('base64');
  const checked = JSON.parse(core.profile_validate(encoded));
  if (checked.exit_code !== 0) {
    const diagnostic = JSON.parse(checked.output).diagnostics[0].reason;
    return JSON.parse(core.host_error(diagnostic, plan.format));
  }
  const sourceSha = hash(raw), effectiveSha = hash(plan.command==='compare'?checked.canonical_compare:checked.canonical_review);
  if (plan.command === 'batch') {
    const batch = core.profile_batch_start(encoded, sourceSha, effectiveSha);
    if (!batch) throw new Error('Invalid configuration session.');
    for (const input of plan.inputs) {
      let bytes;
      try { bytes = readBounded(input, core.batch_remaining_bytes(batch)); }
      catch { core.batch_unavailable(batch, basename(input)); continue; }
      core.batch_add(batch, basename(input), bytes.toString('base64'), hash(bytes));
    }
    const result = JSON.parse(core.batch_finish(batch, plan.format));
    if (Buffer.byteLength(result.output, 'utf8') > 32 * 1024 * 1024) return JSON.parse(core.host_error('Configured batch report exceeds 32 MiB; no report was exported.', plan.format));
    return result;
  }
  const before = readBounded(plan.inputs[0]);
  const after = plan.command === 'compare' ? readBounded(plan.inputs[1]) : Buffer.alloc(0);
  const session = core.paged_start(plan.command, before.toString('base64'), after.toString('base64'), JSON.stringify({
    profile_encoded:encoded, profile_source_sha256:sourceSha, profile_effective_sha256:effectiveSha,
    before_sha256:hash(before), after_sha256:hash(after),
  }));
  if (plan.all) {
    spoolReport(core, session, plan.format);
    return {output:'',exit_code:core.paged_exit_code(session)};
  }
  const query = plan.paged ? plan.page_query : {offset:0,limit:200,query:'',kind:'all'};
  const result = JSON.parse(core.paged_page(session, JSON.stringify(query), plan.format));
  if (plan.command === 'format' && result.exit_code === 0) {
    const written = JSON.parse(core.paged_write(session));
    if (written.exit_code !== 0 || typeof written.written !== 'string') return written;
    writeFileSync(plan.output_path, written.written, {encoding:'utf8',flag:'wx',mode:0o600});
  }
  return result;
}
