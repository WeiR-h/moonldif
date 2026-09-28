import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Real UI and download bytes; OS-picker success/cancel/error are injected independently.
export async function verifySaveFallback(context,url,output,browser) {
  const page=await context.newPage();
  await page.addInitScript(()=>{
    const p=window.__saveProbe={mode:'success',bytes:null,aborted:0,opened:0,activation:false,release:null,copied:'',copyDenied:false};
    const handle={createWritable:async()=>{
      p.opened++;
      return {write:async blob=>{p.bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));if(p.mode==='disk-error')throw Error('injected disk failure');},close:async()=>{},abort:async()=>{p.aborted++;}};
    }};
    window.showSaveFilePicker=()=>{
      p.activation=navigator.userActivation.isActive;
      if(p.mode==='cancel')return Promise.reject(new DOMException('cancel','AbortError'));
      if(p.mode==='pending')return new Promise(resolve=>{p.release=()=>resolve(handle);});
      return Promise.resolve(handle);
    };
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(p.copyDenied)throw Error('denied');p.copied=text;}}});
  });
  try {
    await page.goto(url);
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='下载完整审阅报告'&&!b.disabled));
    await page.getByLabel('审阅报告格式').selectOption('json');
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载完整审阅报告',exact:true}).click();
    const path=resolve(output,browser+'-save-reference.json');await (await download).saveAs(path);
    await page.getByRole('button',{name:'另存为',exact:true}).click();
    await page.getByText('文件已写入所选位置。',{exact:true}).waitFor();
    assert.deepEqual(Buffer.from(await page.evaluate(()=>window.__saveProbe.bytes)),readFileSync(path));
    assert.equal(await page.evaluate(()=>window.__saveProbe.activation),true);
    await page.evaluate(()=>{window.__saveProbe.mode='cancel';});
    await page.getByRole('button',{name:'另存为',exact:true}).click();
    await page.getByText('已取消另存为，仍可重新保存。',{exact:true}).waitFor();
    await page.evaluate(()=>{window.__saveProbe.mode='disk-error';});
    await page.getByRole('button',{name:'另存为',exact:true}).click();
    await page.getByText('此浏览器未能另存为。可复制文件内容，或在普通浏览器中保存。',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__saveProbe.aborted),1);
    await page.getByRole('button',{name:'复制文件内容',exact:true}).click();
    await page.getByText('文件内容已复制，尚未保存为文件。',{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>window.__saveProbe.copied),readFileSync(path,'utf8'));
    await page.evaluate(()=>{window.__saveProbe.copyDenied=true;});
    await page.getByRole('button',{name:'复制文件内容',exact:true}).click();
    await page.getByText('浏览器未允许复制。',{exact:false}).waitFor();
    await page.evaluate(()=>{window.__saveProbe.mode='pending';});
    const opened=await page.evaluate(()=>window.__saveProbe.opened);
    await page.getByRole('button',{name:'另存为',exact:true}).click();
    await page.getByLabel('LDIF 源文件内容').fill('version: 1\ndn: cn=Updated\ncn: Updated\n');
    await page.evaluate(()=>window.__saveProbe.release());
    assert.equal(await page.locator('.download-panel').count(),0);
    assert.equal(await page.evaluate(()=>window.__saveProbe.opened),opened);
    writeFileSync(resolve(output,browser+'-save-fallback.json'),JSON.stringify({status:'passed',method:'Real browser controls/download; picker and clipboard injected, not a real OS save dialog',checks:['direct user activation','exact blob byte write','cancel retains file','write error aborts','clipboard success and rejection','stale picker cannot write']},null,2)+'\n');
  } finally {await page.close();}
}
