import test from 'node:test';
import assert from 'node:assert/strict';
import {createDownloads} from '../web/src/downloads.js';

test('download URL survives retry, replacement and invalidation release retained files',()=>{
  let n=0,updates=0; const revoked=[];
  const store=createDownloads({createObjectURL:()=>`blob:${++n}`,revokeObjectURL:url=>revoked.push(url)});
  const unsubscribe=store.subscribe(()=>updates++);
  const blob=new Blob(['synthetic']);
  const first=store.prepare(blob,'input.ldif');
  assert.equal(store.getSnapshot(),first);assert.deepEqual(revoked,[]);
  const second=store.prepare(blob,'report.json');
  assert.equal(store.getSnapshot(),second);assert.deepEqual(revoked,['blob:1']);
  store.clear();store.clear();assert.equal(store.getSnapshot(),null);assert.deepEqual(revoked,['blob:1','blob:2']);
  assert.equal(updates,3);unsubscribe();store.prepare(blob,'input.ldif');assert.equal(updates,3);store.clear();
});
