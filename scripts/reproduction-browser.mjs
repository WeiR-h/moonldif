import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');

export async function verifyReproduction(page,output,browser) {
  await page.addInitScript(()=>{
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    window.__downloadUrls=new Set();
    URL.createObjectURL=blob=>{const url=create(blob);window.__downloadUrls.add(url);return url;};
    URL.revokeObjectURL=url=>{window.__downloadUrls.delete(url);revoke(url);};
  });
  await page.reload();
  const panel=()=>page.locator('.reproduce-panel:visible');
  const ready=()=>page.waitForFunction(()=>[...document.querySelectorAll('.reproduce-panel button')].some(b=>b.textContent==='下载复现说明'&&!b.disabled));
  await ready();await panel().locator('summary').click();
  const folder=resolve(output,browser+'-reproduce');mkdirSync(folder,{recursive:true});
  async function save(button,name) {
    // Chromium drops excessive download bursts (15 rapid clicks reproduced only
    // 10 download events). Pace separate user gestures; never suppress assertions.
    await page.waitForTimeout(250);
    const wait=page.waitForEvent('download');await button.click();const download=await wait;
    assert.equal(download.suggestedFilename(),name);
    const file=resolve(folder,name);await download.saveAs(file);return readFileSync(file);
  }
  const data='version: 1\r\ndn: cn=raw\r\nchangetype: modify\r\nreplace: description\r\ndescription: synthetic-original-only\r\n-\r\nreplace: mail\r\n-\r\n';
  const raw=' {"profile_version":1,"review":{"deny_clear":true},"compare":{"ignored_attributes":["cn"]}}\r\n';
  const upload=()=>page.getByLabel('加载预检配置',{exact:true}).setInputFiles({name:'raw.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await upload();
  await page.getByLabel('打开本地 LDIF 文件').setInputFiles({name:'original.ldif',mimeType:'text/plain',buffer:Buffer.from(data)});
  // Loading LDIF during draft validation can correctly require a manual recheck.
  await page.getByRole('button',{name:'重新检查',exact:true}).click();await ready();
  async function roundtrip(kind, expected, original) {
    const names=kind==='review'?['input.ldif']:['before.ldif','after.ldif'];
    const bytes=[];
    for(const name of names) bytes.push(await save(panel().getByRole('button',{name:'保存本次原文 '+name,exact:true}),name));
    const configButton=panel().getByRole('button',{name:'保存本次复现配置',exact:true});
    if(await configButton.isEnabled()) {
      const config=await save(configButton,'rules.json');if(original)assert.equal(config.toString(),raw);
    }
    const notes=(await save(panel().getByRole('button',{name:'下载复现说明',exact:true}),'moonldif-reproduce.md')).toString();
    assert.ok(!notes.includes('synthetic-original-only'));assert.ok(!notes.includes('undefined'));
    await page.getByLabel(kind==='review'?'审阅报告格式':'核对报告格式').selectOption('json');
    const reportName=kind==='review'?'moonldif-review.json':'moonldif-snapshot-diff.json';
    const report=JSON.parse(await save(page.getByRole('button',{name:kind==='review'?'下载完整审阅报告':'下载完整核对报告',exact:true}),reportName));
    assert.equal(report.exit_code,expected);
    names.forEach((name,i)=>assert.equal(sha(bytes[i]),kind==='review'?report.summary.source.sha256:report.summary[i===0?'before':'after'].sha256));
    // Execute the actual displayed command with the platform shell and fixed local names.
    const shell=process.platform==='win32'?'powershell':'bash';
    await panel().getByLabel('复现命令格式').selectOption(shell);
    const displayed=await panel().getByLabel('本机复现命令').inputValue();
    const command=displayed.replace('node dist/moonldif.js',`node '${resolve('dist/moonldif.js').replaceAll("'","''")}'`);
    const run=process.platform==='win32'
      ? spawnSync('powershell',['-NoProfile','-Command',"[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); "+command+'; exit $LASTEXITCODE'],{cwd:folder,encoding:'utf8'})
      : spawnSync('bash',['-c',command],{cwd:folder,encoding:'utf8'});
    assert.equal(run.status,expected,run.stderr+run.stdout);
    const cli=JSON.parse(run.stdout);assert.deepEqual(cli.items,report.items);
    const actual=structuredClone(cli.summary), wanted=structuredClone(report.summary);
    if(actual.profile&&!original) {assert.equal(actual.profile.source_sha256,sha(readFileSync(resolve(folder,'rules.json'))));actual.profile.source_sha256='';}
    assert.deepEqual(actual,wanted);
  }
  await roundtrip('review',1,true);
  assert.equal(readFileSync(resolve(folder,'input.ldif')).toString(),data);
  await page.getByLabel('拦截属性清空',{exact:true}).uncheck();
  assert.equal(await panel().getByRole('button',{name:'下载复现说明'}).isEnabled(),false);
  await page.getByRole('button',{name:'重新检查',exact:true}).click();await ready();await roundtrip('review',0,false);
  await page.getByLabel('LDIF 源文件内容').fill(data+'\r\ndn: cn=external\r\nphoto:< file:///never-read\r\n');
  await page.getByRole('button',{name:'重新检查',exact:true}).click();await ready();await roundtrip('review',2,false);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(output,browser+'-reproduce-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1080});
  await page.getByRole('button',{name:'迁移前后核对',exact:true}).click();
  await panel().locator('summary').click();
  assert.equal(await panel().getByRole('button',{name:'下载复现说明'}).isEnabled(),false);
  await page.getByLabel('加载核对配置',{exact:true}).setInputFiles({name:'raw.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await page.getByLabel('迁移前快照内容').fill('version: 1\ndn: cn=a\ncn: before\n');
  await page.getByLabel('迁移后快照内容').fill('version: 1\ndn: cn=a\ncn: after\n');
  await page.getByRole('button',{name:'开始核对',exact:true}).click();await ready();await roundtrip('compare',0,true);
  await page.getByLabel('排除指定属性（可选）').fill('');
  await page.getByRole('button',{name:'开始核对',exact:true}).click();await ready();await roundtrip('compare',1,false);
  await page.screenshot({path:resolve(output,browser+'-reproduce-desktop.png'),fullPage:true});
  await page.waitForFunction(()=>window.__downloadUrls.size===0);
  return ['raw-CRLF-download','original-profile-bytes','canonical-edited-profile','displayed-shell-command-executed','review-0-1-2-equivalence','compare-exclusion-equivalence','reproduce-stale-invalidation','reproduce-mobile'];
}
