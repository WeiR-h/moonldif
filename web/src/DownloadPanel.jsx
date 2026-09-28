import React, { useEffect, useSyncExternalStore } from 'react';
import { downloads } from './downloads.js';

export function DownloadPanel() {
  const item = useSyncExternalStore(downloads.subscribe, downloads.getSnapshot);
  useEffect(() => () => downloads.clear(), []);
  if (!item) return null;
  return <section className="download-panel" aria-label="本次文件保存">
    <strong>文件已准备：{item.name}</strong>
    <p>已请求浏览器下载，请在下载列表确认。若未出现文件，可使用“另存为”或复制文件内容。编辑或重新检查后此入口失效。</p>
    <a href={item.url} download={item.name}>再次保存 {item.name}</a>
    {typeof window.showSaveFilePicker==='function' && <button disabled={item.busy} onClick={()=>downloads.saveAs(options=>window.showSaveFilePicker(options))}>另存为</button>}
    <button disabled={item.busy} onClick={()=>downloads.copyText(text=>navigator.clipboard.writeText(text))}>复制文件内容</button>
    <button onClick={()=>downloads.clear()}>关闭保存入口</button>
    <p role="status">{item.message}</p>
    <p>原文文件包含属性值；复制会写入本机剪贴板。普通下载只能确认已发起，另存为在写入完成后才显示成功。</p>
  </section>;
}
