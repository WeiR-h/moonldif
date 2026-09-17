import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const sha = s => createHash('sha256').update(s).digest('hex');
const button = page => page.getByRole('button', { name: '下载核对报告', exact: true });
export async function snapshotReady(page) { await button(page).waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === '下载核对报告' && !b.disabled)); }
async function download(page, output, name, format = 'json') {
  await page.getByLabel('核对报告格式').selectOption(format);
  const wait = page.waitForEvent('download'); await button(page).click(); const file = await wait;
  const path = resolve(output, name + '.' + (format === 'json' ? 'json' : 'md'));
  await file.saveAs(path); return readFileSync(path, 'utf8');
}
export async function verifySnapshot(page, output, browser) {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: '迁移前后核对', exact: true }).click();
  assert.equal(await page.getByRole('heading',{name:'迁移前后，少了什么？'}).count(),1);
  await page.getByRole('button',{name:'开始核对',exact:true}).click(); await snapshotReady(page);
  let report = JSON.parse(await download(page,output,browser+'-snapshot-demo'));
  assert.equal(report.total_changes,4); assert.equal(report.exit_code,1);
  assert.equal(report.counts['attribute-removed'],1);
  await page.getByRole('button',{name:'定位迁移前第 4 行',exact:true}).click();
  assert.match(await page.getByLabel('迁移前快照内容').evaluate(e => e.value.slice(e.selectionStart,e.selectionEnd)),/mail:/);
  await page.screenshot({path:resolve(output,browser+'-snapshot-desktop.png'),fullPage:true});
  const before = 'version: 1\r\ndn: cn=[demo]\r\nmail: private-secret\r\nphoto:: /wA=\r\n';
  const equal = 'version: 1\ndn:: Y249W2RlbW9d\nphoto:: /wA=\nMAIL:: cHJpdmF0ZS1zZWNyZXQ=\n';
  for (const [side,text] of [['迁移前',before],['迁移后',equal]]) {
    await page.getByLabel('打开'+side+'快照').setInputFiles({name:side+' 空格.ldif',mimeType:'text/plain',buffer:Buffer.from(text)});
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent === '开始核对').disabled);
  }
  assert.equal(await button(page).isEnabled(),false);
  await page.getByRole('button',{name:'开始核对',exact:true}).click();await snapshotReady(page);
  report=JSON.parse(await download(page,output,browser+'-snapshot-equal'));
  assert.equal(report.exit_code,0); assert.equal(report.before.sha256,sha(before)); assert.equal(report.after.sha256,sha(equal));
  await page.getByLabel('迁移后快照内容').fill(equal.replace('/wA=','/gA='));
  assert.equal(await button(page).isEnabled(),false);
  await page.getByRole('button',{name:'开始核对',exact:true}).click();await snapshotReady(page);
  report=JSON.parse(await download(page,output,browser+'-snapshot-drift'));
  assert.equal(report.exit_code,1); assert.equal(report.changes[0].attribute,'photo');
  assert.ok(!JSON.stringify(report).includes('private-secret'));
  const md=await download(page,output,browser+'-snapshot-drift','markdown');assert.ok(md.includes('&#91;demo&#93;'));assert.ok(!md.includes('private-secret'));
  await page.getByLabel('核对时允许缺版本头').check(); assert.equal(await button(page).isEnabled(),false);
  await page.getByLabel('迁移后快照内容').fill('version: 1\ndn: cn=[demo]\nphoto:< file:///never-read\n');
  await page.getByRole('button',{name:'开始核对',exact:true}).click();await snapshotReady(page);
  report=JSON.parse(await download(page,output,browser+'-snapshot-incomplete'));
  assert.equal(report.exit_code,2);assert.equal(report.comparison_performed,false);assert.deepEqual(report.changes,[]);
  await page.getByLabel('打开迁移后快照').setInputFiles({name:'large.ldif',mimeType:'text/plain',buffer:Buffer.alloc(1024*1024+1,65)});
  await page.getByText('所选快照超过 1 MiB，请使用 CLI。',{exact:true}).waitFor();assert.equal(await button(page).isEnabled(),false);
  await page.getByLabel('打开迁移后快照').setInputFiles({name:'bad.ldif',mimeType:'text/plain',buffer:Buffer.from([255,254])});
  await page.getByText('文件不是有效 UTF-8，原编辑内容保留。',{exact:true}).waitFor();assert.equal(await button(page).isEnabled(),false);
  await page.getByRole('button',{name:'载入合成迁移示例',exact:true}).click();
  await page.getByRole('button',{name:'开始核对',exact:true}).click();await snapshotReady(page);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(output,browser+'-snapshot-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'文件预检',exact:true}).click();
}
