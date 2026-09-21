import test from 'node:test';
import assert from 'node:assert/strict';
import { readBounded } from '../cmd/read-bounded.mjs';

function fake({ bytes = Buffer.from('abc'), size = bytes.length, chunk = Infinity, regular = true, failStat = false, failRead = false } = {}) {
  let offset = 0, closed = 0;
  const allocations = [];
  return { allocations, get closed() { return closed; },
    openSync(path, mode) { assert.equal(path, '中文 文件.ldif'); assert.equal(mode, 'r'); return 42; },
    fstatSync() { if (failStat) throw new Error('stat fault'); return { size, isFile: () => regular }; },
    readSync(fd, buffer, position, length) {
      assert.equal(fd, 42); allocations.push(buffer.length);
      if (failRead) throw new Error('read fault');
      const n = Math.min(length, chunk, bytes.length - offset);
      bytes.copy(buffer, position, offset, offset + n); offset += n; return n;
    },
    closeSync(fd) { assert.equal(fd, 42); closed++; },
  };
}
const read = (io, budget) => readBounded('中文 文件.ldif', budget, io);
test('small files allocate from their opened size, not the 8 MiB ceiling', () => {
  const io = fake(); assert.deepEqual(read(io), Buffer.from('abc'));
  assert.deepEqual(io.allocations, [4, 4]); assert.equal(io.closed, 1);
});
test('short reads, growth, shrinkage and zero-size stat preserve actual bytes', () => {
  for (const options of [{ chunk: 1 }, { size: 0 }, { size: 1 }, { size: 100000 }, { bytes: Buffer.alloc(0), size: 0 }]) {
    const io = fake(options); const actual = read(io);
    assert.deepEqual(actual, options.bytes ?? Buffer.from('abc')); assert.equal(io.closed, 1);
    assert.ok(Math.max(...io.allocations) <= 8 * 1024 * 1024 + 1);
  }
});
test('exact limit succeeds; growing one byte past limit fails and closes', () => {
  for (const size of [0, 3, 8]) {
    const io = fake({ bytes: Buffer.alloc(8, 65), size });
    assert.equal(read(io, 8).length, 8); assert.equal(io.closed, 1);
    const over = fake({ bytes: Buffer.alloc(9, 65), size });
    assert.throws(() => read(over, 8), /limit/); assert.equal(over.closed, 1);
    assert.ok(Math.max(...over.allocations) <= 9);
  }
});
test('zero budget only permits empty data and catches growth', () => {
  const empty = fake({ bytes: Buffer.alloc(0) }); assert.equal(read(empty, 0).length, 0);
  const grown = fake({ size: 0 }); assert.throws(() => read(grown, 0), /limit/); assert.equal(grown.closed, 1);
});
test('stat/read failures, non-files and exhausted budgets always close', () => {
  for (const options of [{ failStat: true }, { failRead: true }, { regular: false }, { size: 9 }]) {
    const io = fake(options); assert.throws(() => read(io, 8)); assert.equal(io.closed, 1);
  }
  for (const budget of [-1, NaN, 1.5]) assert.throws(() => read(fake(), budget), /budget/);
});
