import React, {useEffect,useRef,useState} from 'react';
import manifest from '../package.json';
import {downloadBlob} from './usePagedSession.js';
import {reproductionCommand,reproductionInstructions} from './reproduction.js';

export function ReproducePanel({result}) {
  const [shell,setShell]=useState('powershell');
  const [message,setMessage]=useState('');
  const snapshot=result.reproduction;
  const ready=result.phase==='ready'&&!result.busy&&Boolean(snapshot);
  useEffect(()=>setMessage(''),[snapshot,ready]);
  const save=(data,name,type)=>{if(ready)downloadBlob(new Blob([data],{type}),name);};
  const command=snapshot?reproductionCommand(snapshot,shell):'';
  const live=useRef(null);live.current=ready?command:null;
  return <details className="reproduce-panel"><summary>在本机复现</summary>
    <p>原文包含属性值，仅下载到本机。原文保存不代表检查通过；整理导出仍需通过检查。</p>
    <p>安装 Node.js 24，<a href={`https://github.com/WeiR-h/moonldif/releases/tag/v${manifest.version}`} target="_blank" rel="noreferrer">下载同版本 CLI 并核对校验和</a>，将以下文件放在解压目录。</p>
    <div className="reproduce-actions">{(snapshot?.files||[{name:'input.ldif'}]).map(f=><button key={f.name} disabled={!ready} onClick={()=>save(new TextEncoder().encode(f.text),f.name,'application/ldif')}>保存本次原文 {f.name}</button>)}
    <button disabled={!ready||!snapshot?.profile} onClick={()=>save(snapshot.profile.bytes,'rules.json','application/json')}>保存本次复现配置</button>
    <button disabled={!ready} onClick={()=>save(reproductionInstructions(snapshot,manifest.version,result.report),'moonldif-reproduce.md','text/markdown;charset=utf-8')}>下载复现说明</button></div>
    <label>命令格式 <select aria-label="复现命令格式" value={shell} onChange={e=>{setShell(e.target.value);setMessage('');}}><option value="powershell">PowerShell</option><option value="bash">Bash</option></select></label>
    <textarea aria-label="本机复现命令" readOnly rows={3} value={ready?command:''} />
    <button disabled={!ready} onClick={async()=>{try {await navigator.clipboard.writeText(command);if(live.current===command)setMessage('命令已复制；请在本机手动执行。');}catch {if(live.current===command)setMessage('浏览器未允许复制，请选中上方命令手动复制。');}}}>复制复现命令</button>
    <span role="status">{ready?message:'重新检查完成后才能保存本次复现材料。'}</span>
    {ready&&snapshot.profile&&!snapshot.profile.original&&<p>配置已手工修改：CLI 将记录新文件的来源指纹，有效规则与有效指纹应保持一致。</p>}
  </details>;
}
