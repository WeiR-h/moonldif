import manifest from '../package.json';
import React, { useRef, useState } from 'react';
import { useWorkbench } from './useWorkbench.js';
import { Editor } from './Editor.jsx';
import { Results } from './Results.jsx';
import { Icon } from './Icon.jsx';

function Status({ analysis }) {
  const report = analysis.report;
  const ready = analysis.phase === 'ready';
  const blocked = report?.diagnostics?.filter(d => d.severity === 'policy').length || 0;
  const warnings = report?.diagnostics?.filter(d => d.severity === 'warning').length || 0;
  let title = analysis.message || '内容已更改，请重新检查';
  let tone = 'neutral';
  if (ready) {
    if (report.exit_code === 2) { title = report.status === 'incomplete' ? '分析不完整，暂不能导出' : '发现输入问题，暂不能导出'; tone = 'danger'; }
    else if (report.exit_code === 1) { title = `已拦截 ${blocked} 项风险操作`; tone = 'danger'; }
    else if (warnings) { title = `检查完成，另有 ${warnings} 条警告`; tone = 'caution'; }
    else { title = '支持范围内检查通过'; tone = 'success'; }
  }
  if (analysis.phase === 'error') tone = 'danger';
  return <div className={`status-strip ${tone}`} role="status" aria-live="polite"><Icon name={tone === 'success' ? 'check' : 'alert'} /><div><strong>{title}</strong><p>{ready ? `${report.record_count ?? 0} 条记录 · ${report.review?.total_items ?? 0} 项变更审阅 · ${report.diagnostics?.length || 0} 条${report.exit_code === 1 ? '策略' : ''}诊断` : '仅当前内容和当前选项的检查结果可用于导出。'}</p>{ready && analysis.message && <p>{analysis.message}</p>}</div></div>;
}
export default function App() {
  const state = useWorkbench();
  const fileInput = useRef(null);
  const [reportFormat, setReportFormat] = useState('markdown');
  const running = state.analysis.phase === 'running' || state.analysis.phase === 'loading';
  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span>MoonLDIF</span><span className="brand-separator" /><span className="brand-subtitle">目录文件预检工作台</span></div><div className="privacy"><Icon name="lock" /><span>文件仅在本机处理</span></div></header>
    <main>
      <div className="page-intro"><div><h1>检查文件，再执行变更</h1><p>读取、定位问题、审阅影响，并导出经过复检的新文件。</p></div><div className="main-actions">
        <input ref={fileInput} type="file" accept=".ldif,.txt" aria-label="打开本地 LDIF 文件" tabIndex={-1} className="visually-hidden" onChange={e => { state.loadFile(e.target.files[0]); e.target.value = ''; }} />
        <button onClick={() => fileInput.current.click()}><Icon name="folder" />打开 LDIF</button>
        <button className="primary" onClick={state.recheck} disabled={running}><Icon name="refresh" />{running ? '检查中…' : '重新检查'}</button>
        <button onClick={state.exportFile} disabled={!state.canExport}><Icon name="download" />导出新文件</button>
      </div></div>
      <div className="settings" aria-label="检查选项">
        <label><input type="checkbox" checked={state.options.denyDelete} onChange={e => state.setOption('denyDelete', e.target.checked)} />拦截整条删除</label>
        <label><input type="checkbox" checked={state.options.denyClear} onChange={e => state.setOption('denyClear', e.target.checked)} />拦截属性清空</label>
        <label><input type="checkbox" checked={state.options.denyRename} onChange={e => state.setOption('denyRename', e.target.checked)} />拦截改名与移动</label>
        <label><input type="checkbox" checked={state.options.compat} onChange={e => state.setOption('compat', e.target.checked)} />允许缺版本头</label>
        <label><input type="checkbox" checked={state.options.legacySpaces} onChange={e => state.setOption('legacySpaces', e.target.checked)} />允许旧 DN 空格</label>
      </div>
      <Status analysis={state.analysis} />
      <div className="report-tools">
        <label>审阅报告 <select aria-label="审阅报告格式" value={reportFormat} onChange={e => setReportFormat(e.target.value)}><option value="markdown">Markdown</option><option value="json">JSON</option></select></label>
        <button onClick={() => state.exportReport(reportFormat)} disabled={!state.canExportReport}><Icon name="download" />下载审阅报告</button>
        <p>报告包含目标 DN 和内容指纹，不包含原始属性值；可记录拦截或不完整结果。</p>
      </div>
      <div className="workspace"><Editor document={state.document} edit={state.edit} loadSample={state.loadSample} loadFile={state.loadFile} selection={state.selection} /><Results analysis={state.analysis} locate={span => state.setSelection({ ...span, focus: true })} selected={state.selection} /></div>
    </main>
    <footer className="app-footer"><span>MoonLDIF {manifest.version} · 核心由 MoonBit 实现</span><a href="https://github.com/WeiR-h/moonldif" target="_blank" rel="noreferrer">源码</a><a href="https://github.com/WeiR-h/moonldif/blob/main/docs/SUPPORT.md" target="_blank" rel="noreferrer">支持范围</a><span>检查通过不等于导入成功</span></footer>
  </div>;
}
