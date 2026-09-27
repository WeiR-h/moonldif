import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

export async function verifyProfileRecovery(page,output,browser) {
  await page.setViewportSize({width:1440,height:1080});
  await page.getByRole('button',{name:'文件预检',exact:true}).click();
  const region=page.getByRole('region',{name:'预检配置',exact:true});
  const check=page.getByRole('button',{name:'重新检查',exact:true});
  const report=page.getByRole('button',{name:'下载完整审阅报告',exact:true});
  const limit=page.getByLabel('最多整条删除',{exact:true});
  const restore=region.getByRole('button',{name:'恢复最近加载配置'});
  const raw=' {"profile_version":1,"review":{"limits":{"max_delete_records":5}},"compare":{"ignored_attributes":["cn"]}}\n';
  const upload=()=>page.getByLabel('加载预检配置',{exact:true}).setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await upload();await region.getByText('已加载配置',{exact:false}).waitFor();
  const data='version: 1\n'+Array.from({length:6},(_,i)=>`dn: cn=restore-${i}\nchangetype: delete\n\n`).join('');
  await page.getByLabel('LDIF 源文件内容').fill(data);
  await check.click();await report.waitFor({state:'visible'});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='下载完整审阅报告'&&!b.disabled));
  for(const bad of ['-1','1.5','1e2','2147483648','abc',' ']) {
    await limit.fill(bad);
    assert.equal(await report.isEnabled(),false);
    await region.locator('input[aria-invalid="true"]').waitFor();
    assert.equal(await check.isEnabled(),false);
    assert.equal(await region.getByRole('button',{name:'下载当前配置'}).isEnabled(),false);
    assert.equal(await limit.getAttribute('aria-invalid'),'true');
    const described=await limit.getAttribute('aria-describedby');
    assert.match(await page.locator('#'+described).innerText(),/整数/);
  }
  await page.screenshot({path:resolve(output,browser+'-profile-inline-error.png'),fullPage:true});
  await limit.fill('2147483647');await check.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='下载完整审阅报告'&&!b.disabled));
  await limit.fill('0');await check.click();await region.getByText('最多整条删除：6 / 0',{exact:false}).waitFor();
  await limit.fill('');await check.click();await region.getByText('最多整条删除：6 / 不限制',{exact:false}).waitFor();
  await limit.fill('6');await check.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='下载完整审阅报告'&&!b.disabled));
  // Keyboard recovery does not touch input, and requires a new analysis.
  await restore.focus();await page.keyboard.press('Enter');
  assert.equal(await limit.inputValue(),'5');assert.equal(await report.isEnabled(),false);
  assert.equal(await page.getByLabel('LDIF 源文件内容').inputValue(),data);
  await check.click();await region.getByText('最多整条删除：6 / 5',{exact:false}).waitFor();
  await page.getByLabel('审阅报告格式').selectOption('json');
  const dl=page.waitForEvent('download');await report.click();const file=resolve(output,browser+'-profile-restored.json');await(await dl).saveAs(file);
  const restored=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(restored.exit_code,1);assert.equal(restored.summary.profile.source_sha256,createHash('sha256').update(raw).digest('hex'));
  assert.equal(restored.summary.profile.effective_sha256,createHash('sha256').update(JSON.stringify(restored.summary.profile.effective)).digest('hex'));
  await page.getByLabel('加载预检配置',{exact:true}).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"profile_version":1,"review":{"deny_delete":"wrong"}}')});
  await region.getByRole('alert').waitFor();
  await limit.fill('6');await page.getByLabel('允许缺版本头',{exact:true}).check();
  await page.waitForTimeout(450);assert.equal(await check.isEnabled(),false);
  await restore.click();assert.equal(await page.getByLabel('允许缺版本头',{exact:true}).isChecked(),false);assert.equal(await limit.inputValue(),'5');
  await region.getByRole('button',{name:'停用配置',exact:true}).click();assert.equal(await limit.inputValue(),'');
  await restore.click();assert.equal(await limit.inputValue(),'5');
  // A pending draft never enables old downloads after switching modes.
  await limit.fill('999');await limit.fill('-1');await limit.fill('7');
  await page.getByRole('button',{name:'迁移前后核对',exact:true}).click();
  const compare=page.getByRole('region',{name:'核对配置',exact:true});
  const compareRaw='{"profile_version":1,"compare":{"ignored_attributes":["mail"]}}';
  await page.getByLabel('加载核对配置',{exact:true}).setInputFiles({name:'compare.json',mimeType:'application/json',buffer:Buffer.from(compareRaw)});
  await compare.getByText('已加载配置',{exact:false}).waitFor();
  await page.getByLabel('排除指定属性（可选）').fill('dn');
  await page.locator('#snapshot-exclusions[aria-invalid="true"]').waitFor();
  await compare.getByRole('button',{name:'恢复最近加载配置'}).click();
  assert.equal(await page.getByLabel('排除指定属性（可选）').inputValue(),'mail');
  await page.getByRole('button',{name:'文件预检',exact:true}).click();await restore.click();assert.equal(await limit.inputValue(),'5');
  assert.equal(await report.isEnabled(),false);
  await check.click();await region.getByText('最多整条删除：6 / 5',{exact:false}).waitFor();
  await page.screenshot({path:resolve(output,browser+'-profile-recovery-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(output,browser+'-profile-recovery-mobile.png'),fullPage:true});
  await region.getByRole('button',{name:'停用配置',exact:true}).click();
  return ['profile-inline-validation','profile-error-sticky','profile-keyboard-restore','profile-restore-source-hash','profile-restore-after-disable','profile-mode-isolation','profile-draft-race'];
}
