import { openSync, fstatSync, readSync, closeSync } from 'node:fs';

const nativeIO = { openSync, fstatSync, readSync, closeSync };
const FILE_LIMIT = 8 * 1024 * 1024;

// Internal host adapter. Injectable I/O makes short reads and file races testable.
export function readBounded(path, budget = FILE_LIMIT, io = nativeIO) {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Invalid input budget.');
  const fd = io.openSync(path, 'r');
  try {
    const stat = io.fstatSync(fd);
    if (!stat.isFile()) throw new Error('Input must be a regular file.');
    const limit = Math.min(FILE_LIMIT, budget);
    if (!Number.isSafeInteger(stat.size) || stat.size < 0 || stat.size > limit) throw new Error('Input exceeds the file or batch limit.');
    let buffer = Buffer.alloc(stat.size + 1);
    let count = 0;
    for (;;) {
      if (count === buffer.length) {
        const grown = Buffer.alloc(Math.min(limit + 1, buffer.length * 2));
        buffer.copy(grown, 0, 0, count);
        buffer = grown;
      }
      const n = io.readSync(fd, buffer, count, buffer.length - count, null);
      if (n === 0) break;
      count += n;
      if (count > limit) throw new Error('Input exceeds the file or batch limit.');
    }
    // A concurrent truncation should not keep a large, now-unused backing buffer.
    return buffer.length > Math.max(65536, count * 2) ? Buffer.from(buffer.subarray(0, count)) : buffer.subarray(0, count);
  } finally { io.closeSync(fd); }
}
