import test from 'node:test';
import assert from 'node:assert/strict';
import {captureReproduction,reproductionCommand,reproductionInstructions} from '../web/src/reproduction.js';
import * as core from '../dist/core.mjs';
const b64=s=>Buffer.from(s).toString('base64');
test('reproduction freezes exact text and manual flags, without user filenames',()=>{
  const payload={text:'\uFEFFversion: 1\r\ndn: cn=a\r\ncn: synthetic-secret\r\n',options:{denyDelete:true,denyClear:true,legacySpaces:true}};
  const s=captureReproduction('review',payload);
  payload.text='changed';payload.options.denyClear=false;
  assert.equal(s.files[0].name,'input.ldif');assert.ok(s.files[0].text.startsWith('\uFEFF'));
  assert.deepEqual(s.args,['review','input.ldif','--legacy-dn-spaces','--deny-delete','--deny-clear','--all','--format','json']);
  const notes=reproductionInstructions(s,'0.7.2',{source:{byte_length:42,sha256:'abc'},exit_code:2});
  assert.ok(notes.includes('abc'));assert.ok(!notes.includes('synthetic-secret'));assert.ok(notes.includes('$LASTEXITCODE'));
});
test('source configuration bytes survive; edits save canonical profile',()=>{
  const raw=' {"profile_version":1,"review":{"deny_delete":true}}\r\n';
  const validated=JSON.parse(core.profile_validate(b64(raw)));
  const p={text:'',profileEncoded:b64(raw),profileCanonical:validated.canonical,profileSourceEncoded:b64(raw)};
  assert.equal(Buffer.from(captureReproduction('review',p).profile.bytes).toString(),raw);
  p.profileSourceEncoded='';
  assert.equal(Buffer.from(captureReproduction('review',p).profile.bytes).toString(),validated.canonical);
});
test('comparison includes exclusions as separate quoted arguments',()=>{
  const s=captureReproduction('compare',{before:'a',after:'b',compat:true,ignoredAttributes:['description;lang-en',"x'$(never);echo"]});
  assert.equal(s.files[1].name,'after.ldif');
  assert.ok(reproductionCommand(s,'powershell').includes("'x''$(never);echo'"));
  assert.ok(reproductionCommand(s,'bash').includes("'x'\"'\"'$(never);echo'"));
});
