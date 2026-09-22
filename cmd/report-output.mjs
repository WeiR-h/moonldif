// Finish and validate the entire report before exposing its bytes on stdout.
import { mkdtempSync, openSync, writeSync, closeSync, readSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function spoolReport(core, session, format, output = process.stdout) {
  const folder = mkdtempSync(join(tmpdir(), 'moonldif-report-'));
  const path = join(folder, 'report');
  let fd;
  try {
    fd = openSync(path, 'wx+', 0o600);
    const cursor = core.paged_report_start(session, format);
    let total = 0;
    for (;;) {
      const part = JSON.parse(core.paged_report_next(cursor));
      if (part.error) throw new Error(part.error);
      if (part.done) break;
      const bytes = Buffer.from(part.chunk, 'utf8');
      total += bytes.length;
      if (total > 32 * 1024 * 1024) throw new Error('Report size limit exceeded.');
      let offset = 0;
      while (offset < bytes.length) {
        const n = writeSync(fd, bytes, offset, bytes.length - offset);
        if (!n) throw new Error('Report write made no progress.');
        offset += n;
      }
    }
    const buffer = Buffer.alloc(65536);
    for (let pos = 0; pos < total;) {
      const n = readSync(fd, buffer, 0, Math.min(buffer.length, total - pos), pos);
      if (!n) throw new Error('Report spool was truncated.');
      // Synchronous file-descriptor writes bound CLI memory for redirected output.
      if (output === process.stdout) {
        let offset = 0;
        while (offset < n) offset += writeSync(1, buffer, offset, n - offset);
      } else output.write(Buffer.from(buffer.subarray(0, n)));
      pos += n;
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(path); } finally { rmdirSync(folder); }
  }
}
