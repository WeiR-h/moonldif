#!/usr/bin/env node
// Host responsibilities: bounded local byte I/O and process status only.
import { openSync, fstatSync, readSync, closeSync, writeFileSync } from 'node:fs';
import * as core from './core.mjs';

function readBounded(path) {
  const fd = openSync(path, 'r');
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Input must be a regular file.');
    const limit = 8 * 1024 * 1024;
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
  else {
    format = plan.format;
    const bytes = readBounded(plan.input);
    result = JSON.parse(core.analyse(bytes.toString('base64'), plan.command, plan.format, plan.compat, plan.deny_delete, plan.legacy_dn_spaces));
    if (result.written !== null && result.exit_code === 0) {
      writeFileSync(plan.output_path, result.written, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    }
  }
} catch (error) {
  result = JSON.parse(core.host_error(error.message, format));
}
process.stdout.write(result.output);
process.exitCode = result.exit_code;
