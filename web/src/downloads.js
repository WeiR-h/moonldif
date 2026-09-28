// Keep one file until replacement or invalidation. Never infer disk success from an anchor click.
export function createDownloads(urls) {
  let current = null, serial = 0;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const live = item => current?.id === item.id;
  const update = (item,fields) => {if(live(item)){current={...current,...fields};notify();}};
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => current,
    clear() {
      if (!current) return;
      urls.revokeObjectURL(current.url); current = null; notify();
    },
    prepare(blob, name) {
      const url = urls.createObjectURL(blob);
      if (current) urls.revokeObjectURL(current.url);
      current = {blob,name,url,id:++serial,busy:false,message:''}; notify();
      return current;
    },
    async saveAs(picker) {
      if (!current || current.busy) return;
      const item=current; let writer=null;
      update(item,{busy:true,message:'请选择保存位置…'});
      try {
        // Invoke in the click before any asynchronous preparation, retaining user activation.
        const handle=await picker({suggestedName:item.name});
        if(!live(item))return;
        writer=await handle.createWritable();
        if(!live(item)){await writer.abort();writer=null;return;}
        await writer.write(item.blob);
        if(!live(item)){await writer.abort();writer=null;return;}
        await writer.close();writer=null;
        update(item,{message:'文件已写入所选位置。'});
      } catch(error) {
        try {await writer?.abort();}catch{}
        update(item,{message:error?.name==='AbortError'?'已取消另存为，仍可重新保存。':'此浏览器未能另存为。可复制文件内容，或在普通浏览器中保存。'});
      } finally {update(item,{busy:false});}
    },
    async copyText(writeText) {
      if(!current||current.busy)return;
      const item=current;update(item,{busy:true,message:'正在准备复制…'});
      try {
        const text=await item.blob.text();
        if(!live(item))return;
        await writeText(text);
        update(item,{message:'文件内容已复制，尚未保存为文件。请粘贴到文本编辑器并以 UTF-8 保存；严格字节复现请使用文件下载或另存为。'});
      }catch {update(item,{message:'浏览器未允许复制。请使用文件下载、另存为，或在普通浏览器中打开工作台。'});}
      finally {update(item,{busy:false});}
    },
    requestFailed() {
      if(current)update(current,{message:'浏览器未接受下载请求。请选择另存为或复制文件内容。'});
    },
  };
}
export const downloads = createDownloads(URL);
export function downloadBlob(blob, name) {
  const item = downloads.prepare(blob,name);
  const link = document.createElement('a');
  link.href = item.url; link.download = item.name;
  document.body.append(link);
  try { link.click(); } catch {downloads.requestFailed();} finally { link.remove(); }
}
