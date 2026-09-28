import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export async function verifyRecovery(context,url,output,browser) {
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const Original=window.Worker;
    const p=window.__recovery={failures:0,starts:0,active:0,max:0,postFail:false,late:null};
    window.Worker=class extends Original {
      constructor(...args) {super(...args);p.starts++;p.active++;p.max=Math.max(p.max,p.active);this.alive=true;}
      terminate(){if(this.alive){this.alive=false;p.active--;}super.terminate();}
      postMessage(...args){
        if(p.postFail){p.postFail=false;throw new DOMException('Synthetic post failure','DataCloneError');}
        if(p.failures>0){p.failures--;const handler=this.onerror;p.late=handler;setTimeout(()=>handler(new ErrorEvent('error',{cancelable:true})),10);return;}
        super.postMessage(...args);
      }
    };
  });
  const ready=()=>page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='下载完整审阅报告'&&!b.disabled));
  const recheck=()=>page.getByRole('button',{name:'重新检查',exact:true}).click();
  try {
    await page.goto(url);await ready();
    await page.evaluate(()=>{window.__recovery.failures=1;});
    await recheck();await ready();
    assert.equal(await page.evaluate(()=>window.__recovery.max),1);
    // Error delivered after the failed worker has already been replaced.
    await page.evaluate(()=>window.__recovery.late(new ErrorEvent('error',{cancelable:true})));
    assert.equal(await page.getByRole('button',{name:'下载完整审阅报告',exact:true}).isEnabled(),true);
    await page.evaluate(()=>{window.__recovery.failures=3;});
    const before=await page.evaluate(()=>window.__recovery.starts);
    await recheck();await page.getByText('分析线程发生错误。旧结果已失效，请重新检查；若仍失败，请刷新页面或使用 CLI。',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__recovery.starts)-before,2);
    assert.equal(await page.evaluate(()=>window.__recovery.active),0);
    await page.evaluate(()=>{window.__recovery.failures=0;});await recheck();await ready();
    await page.evaluate(()=>{window.__recovery.postFail=true;});
    await page.getByRole('button',{name:'下载完整审阅报告',exact:true}).click();
    await page.getByText('报告请求失败，请重新检查。',{exact:true}).waitFor();
    assert.equal(await page.locator('.download-panel').count(),0);
    await recheck();await ready();
    // Real browser download, then an explicit second user gesture for the same bytes.
    await page.getByLabel('审阅报告格式').selectOption('json');
    const first=page.waitForEvent('download');
    await page.getByRole('button',{name:'下载完整审阅报告',exact:true}).click();
    const one=await first;const file=resolve(output,browser+'-retry-first.json');await one.saveAs(file);
    const second=page.waitForEvent('download');
    await page.getByRole('link',{name:'再次保存 moonldif-review.json',exact:true}).click();
    const two=await second;const file2=resolve(output,browser+'-retry-second.json');await two.saveAs(file2);
    assert.deepEqual(readFileSync(file),readFileSync(file2));
    await page.getByLabel('LDIF 源文件内容').fill('version: 1\ndn: cn=Recovery\ncn: Recovery\n');
    assert.equal(await page.locator('.download-panel').count(),0);
    await recheck();await ready();
    assert.deepEqual(errors,[]);
    writeFileSync(resolve(output,browser+'-recovery.json'),JSON.stringify({status:'passed',cases:['single startup retry','bounded two failures','late error discarded','post failure invalidates','retry without page refresh','real download retry byte identity','edited download invalidated','one active worker'],errors},null,2)+'\n');
  } finally {await page.close();}
}
