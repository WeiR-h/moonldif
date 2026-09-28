import React, { useEffect, useSyncExternalStore } from 'react';
import { downloads } from './downloads.js';

export function DownloadPanel() {
  const item = useSyncExternalStore(downloads.subscribe, downloads.getSnapshot);
  useEffect(() => () => downloads.clear(), []);
  if (!item) return null;
  return <section className="download-panel" aria-label="本次文件保存">
    <strong>文件已准备：{item.name}</strong>
    <p>已请求浏览器下载，请在下载列表确认。若未出现文件，可再次点击保存；编辑或重新检查后此入口失效。</p>
    <a href={item.url} download={item.name}>再次保存 {item.name}</a>
    <button onClick={()=>downloads.clear()}>关闭保存入口</button>
  </section>;
}
