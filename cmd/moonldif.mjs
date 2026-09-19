#!/usr/bin/env node
// Host responsibilities: bounded local byte I/O, source SHA-256 and process status.
import { openSync, fstatSync, readSync, closeSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import * as core from './core.mjs';

function readBounded(path, budget = 8 * 1024 * 1024) {
  const fd = openSync(path, 'r');
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new Error('Input must be a regular file.');
    const limit = Math.min(8 * 1024 * 1024, budget);
    if (stat.size > limit) throw new Error('Input exceeds the file or batch limit.');
    const buffer = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < buffer.length) {
      const n = readSync(fd, buffer, count, buffer.length - count, null);
      if (!n) break;
      count += n;
    }
    if (count > limit) throw new Error('Input exceeds 8 MiB.');
    return buffer.subarray(0, count);
  } finally { closeSync(fd); }
}

let format = 'text';
let result;
try {
  const plan = JSON.parse(core.cli_plan(JSON.stringify(process.argv.slice(2))));
  if (plan.action === 'report') result = plan;
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
