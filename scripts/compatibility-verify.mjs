// Differential regression: baseline is a frozen built release, never a local import override.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const before = await import(pathToFileURL(resolve(process.argv[2] || 'verification/local/baseline-0.6.0/core.mjs')));
const after = await import(pathToFileURL(resolve('dist/core.mjs')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = [];
function walk(folder) {
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, item.name);
    if (item.isDirectory()) walk(path);
    else if (path.endsWith('.ldif')) inputs.push({ name: path, bytes: readFileSync(path) });
  }
}
walk('examples');
const generated = [
  '', 'version: 1', 'version: 1\n\n orphan\ndn: cn=A\ncn: A',
  'version: 1\r\n# comment\r\n continued\r\ndn: cn=中文\r\ncn: 中\r\n 文\r\nphoto:: /w\r\n AB',
  'version: 1\ndn: cn=A\ncn: A\rB\n',
  'version: 1\ndn: cn=A\ncn: ' + 'x'.repeat(1024 * 1024 - 4) + '\n x\n',
  'version: 1\n' + 'dn: cn=A\nchangetype: modrdn\nnewrdn: cn=B\ndeleteoldrdn: 1\n\n'.repeat(205),
  'version: 1\ndn: cn=A\nchangetype: modify\n' + 'add: description\ndescription: x\n-\n'.repeat(205) + 'delete: mail\n-\nunknown: cn\n-\n',
  'version: 1\ndn: cn=A\n' + 'control: 1.2.3 false\n'.repeat(205) + 'changetype: delete\n',
  'version: 1\ndn: cn=A\nphoto:< file:///never-read\n',
];
generated.forEach((text, i) => inputs.push({ name: `synthetic-${i}`, bytes: Buffer.from(text) }));
inputs.push({ name: 'invalid-utf8', bytes: Buffer.from([118,101,114,115,105,111,110,58,32,49,10,255,10]) });
// Normalize tool-version metadata only; attribute values and written LDIF are untouched.
function normalize(envelope) {
  const x = JSON.parse(envelope);
  const versions = /("version"\s*:\s*")(?:0\.5\.[01]|0\.[67]\.0)(")/g;
  x.output = x.output.replace(versions, '$1<VERSION>$2').replace(/MoonLDIF (?:0\.5\.[01]|0\.[67]\.0)/g, 'MoonLDIF <VERSION>').replace(/Tool version: (?:0&#46;5&#46;[01]|0&#46;[67]&#46;0)/g, 'Tool version: <VERSION>');
  if (x.markdown) x.markdown = x.markdown.replace(/Tool version: (?:0&#46;5&#46;[01]|0&#46;[67]&#46;0)/g, 'Tool version: <VERSION>');
  x.output = x.output.replace(/^- version: 0&#46;[67]&#46;0$/gm, '- version: <VERSION>');
  return x;
}
const evidence = { status: 'running', method: 'Identical bytes/options compared against frozen v0.6.0; only tool-version metadata normalized; complete envelope including written LDIF and v2 pages/full reports compared', cases: [] };
try {
  for (const input of inputs) {
    for (const [command, format] of [['check','json'],['inspect','json'],['review','json'],['review','text'],['review','markdown'],['format','json']]) {
      for (const policies of [false, true]) {
        const args = [input.bytes.toString('base64'), command, format, false, policies, false, policies, policies, sha(input.bytes)];
        assert.deepEqual(normalize(after.analyse_v2(...args)), normalize(before.analyse_v2(...args)), `${input.name}/${command}/${format}/${policies}`);
        evidence.cases.push({ input: input.name, sha256: sha(input.bytes), command, format, policies });
      }
    }
  }
  for(const command of ['review','compare']) {
    const a=Buffer.from(command==='review'?'version: 1\n'+'dn: cn=a\nchangetype: delete\n\n'.repeat(205):'version: 1\ndn: cn=a\ncn: before\n');
    const b=Buffer.from('version: 1\ndn: cn=a\ncn: after\n');
    const config=JSON.stringify({before_sha256:sha(a),after_sha256:sha(b),deny_delete:true});
    const sessions=[before,after].map(c=>c.paged_start(command,a.toString('base64'),b.toString('base64'),config));
    for(const format of ['json','markdown','text']) {
      const pages=[before,after].map((c,i)=>normalize(c.paged_page(sessions[i],JSON.stringify({offset:200,limit:50}),format)));
      assert.deepEqual(pages[0],pages[1]);
      const reports=[before,after].map((c,i)=>{
        const cursor=c.paged_report_start(sessions[i],format);let output='';
        for(;;){const part=JSON.parse(c.paged_report_next(cursor));assert.equal(part.error,undefined);if(part.done)break;output+=part.chunk;}
        return normalize(JSON.stringify({output}));
      });
      assert.deepEqual(reports[0],reports[1]);
      evidence.cases.push({command,format,contract:'v2 page and complete export'});
    }
  }
  evidence.status = 'passed';
} catch (error) { evidence.status = 'failed'; evidence.error = error.stack; process.exitCode = 1; }
mkdirSync('verification/local', { recursive: true });
writeFileSync('verification/local/compatibility.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ status: evidence.status, comparisons: evidence.cases.length, error: evidence.error }));
