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

const makeStore=()=>createDownloads({createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}});
const defer=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:v=>resolve(v)};};

test('save-as requests the picker synchronously and confirms only after exact blob write and close',async()=>{
  const store=makeStore(),blob=new Blob(['中文\r\n\u0000']);store.prepare(blob,'中文.json');
  const calls=[],closed=defer();
  const promise=store.saveAs(options=>{
    calls.push(options.suggestedName);
    return Promise.resolve({createWritable:async()=>({write:async value=>{assert.equal(value,blob);calls.push('write');},close:()=>closed.promise,abort:async()=>calls.push('abort')})});
  });
  assert.deepEqual(calls,['中文.json']);assert.equal(store.getSnapshot().busy,true);
  await new Promise(r=>setImmediate(r));assert.deepEqual(calls,['中文.json','write']);
  assert.ok(!store.getSnapshot().message.includes('已写入'));
  closed.resolve();await promise;assert.equal(store.getSnapshot().message,'文件已写入所选位置。');
});

test('cancel, denied write and close failure never claim success or discard retry file',async()=>{
  for(const where of ['picker','write','close']) {
    const store=makeStore();store.prepare(new Blob(['data']),'r.json');let aborts=0;
    await store.saveAs(async()=>{
      if(where==='picker')throw new DOMException('cancel','AbortError');
      return {createWritable:async()=>({write:async()=>{if(where==='write')throw Error('disk');},close:async()=>{if(where==='close')throw Error('disk');},abort:async()=>{aborts++;}})};
    });
    assert.equal(store.getSnapshot().busy,false);assert.ok(!store.getSnapshot().message.includes('已写入'));
    assert.equal(aborts,where==='picker'?0:1);
  }
});

test('invalidated save selection cannot write and invalidation during write aborts before commit',async()=>{
  const store=makeStore();store.prepare(new Blob(['old']),'old.json');const chosen=defer();let opened=0;
  const first=store.saveAs(()=>chosen.promise);store.clear();
  chosen.resolve({createWritable:async()=>{opened++;}});await first;assert.equal(opened,0);
  store.prepare(new Blob(['old']),'old.json');const written=defer();let aborted=0,closed=0;
  const second=store.saveAs(async()=>({createWritable:async()=>({write:()=>written.promise,abort:async()=>{aborted++;},close:async()=>{closed++;}})}));
  await new Promise(r=>setImmediate(r));store.prepare(new Blob(['new']),'new.json');written.resolve();await second;
  assert.equal(aborted,1);assert.equal(closed,0);assert.equal(store.getSnapshot().name,'new.json');assert.equal(store.getSnapshot().message,'');
});

test('copy preserves text, explains that it is not a saved file, and discards stale completion',async()=>{
  const store=makeStore();store.prepare(new Blob(['中文\r\nline\n']),'r.json');let copied='';
  await store.copyText(async text=>{copied=text;});assert.equal(copied,'中文\r\nline\n');
  assert.match(store.getSnapshot().message,/尚未保存/);
  const pending=defer();const copy=store.copyText(()=>pending.promise);await new Promise(r=>setImmediate(r));store.clear();pending.resolve();await copy;assert.equal(store.getSnapshot(),null);
  store.prepare(new Blob(['data']),'r.json');await store.copyText(async()=>{throw Error('denied');});assert.match(store.getSnapshot().message,/未允许复制/);
});
