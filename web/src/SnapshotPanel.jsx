import React, { useEffect, useRef, useState } from 'react';

const samples = {
  before: 'version: 1\ndn: uid=alice,dc=example,dc=org\ncn: Alice\nmail: alice@example.org\nmemberOf: cn=staff,dc=example,dc=org\nmemberOf: cn=reviewers,dc=example,dc=org\n\ndn: uid=bob,dc=example,dc=org\ncn: Bob\nmail: bob@example.org\n',
  after: 'version: 1\ndn: uid=alice,dc=example,dc=org\nCN:: QWxpY2U=\nmemberOf: cn=staff,dc=example,dc=org\n\ndn: uid=carol,dc=example,dc=org\ncn: Carol\nmail: carol@example.org\n',
};
const names = { before: '迁移前', after: '迁移后' };
const codes = { 'entry-added': '新增条目', 'entry-removed': '缺失条目', 'attribute-added': '新增属性', 'attribute-removed': '缺失属性', 'values-changed': '属性值变化' };

export function SnapshotPanel() {
  const [texts, setTexts] = useState(samples);
  const [flags, setFlags] = useState({ compat: false, legacySpaces: false });
  const [result, setResult] = useState({ phase: 'stale' });
  const [format, setFormat] = useState('markdown');
  const inputs = useRef({});
  const active = useRef({ serial: 0, files: 0, worker: null, timer: null });
  function stop() {
    active.current.serial++;
    active.current.worker?.terminate(); active.current.worker = null;
    clearTimeout(active.current.timer);
  }
  function invalidate() { stop(); active.current.files++; setResult({ phase: 'stale' }); }
  useEffect(() => () => { stop(); active.current.files++; }, []);
  function edit(side, text) { invalidate(); setTexts(previous => ({ ...previous, [side]: text })); }
  async function load(side, file) {
    if (!file) return;
    invalidate(); const ticket = active.current.files;
    setResult({ phase: 'loading', message: '正在读取本地快照…' });
    try {
      if (file.size > 1024 * 1024) throw new Error('所选快照超过 1 MiB，请使用 CLI。');
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
      if (text.split('\n').length > 10000) throw new Error('所选快照超过 10,000 行，请使用 CLI。');
      if (ticket !== active.current.files) return;
      setTexts(previous => ({ ...previous, [side]: text })); setResult({ phase: 'stale' });
    } catch (error) {
      if (ticket === active.current.files) setResult({ phase: 'error', message: error instanceof TypeError ? '文件不是有效 UTF-8，原编辑内容保留。' : error.message });
    }
  }
  function run() {
    stop(); active.current.files++;
    const serial = active.current.serial;
    setResult({ phase: 'running', message: '正在核对两份快照…' });
    const fail = message => { if (serial === active.current.serial) { stop(); setResult({ phase: 'error', message }); } };
    try {
      const worker = new Worker(new URL('./snapshot.worker.js', import.meta.url), { type: 'module' });
      active.current.worker = worker;
      active.current.timer = setTimeout(() => fail('核对超过 20 秒，已停止；请减小文件或使用 CLI。'), 20000);
      worker.onerror = () => fail('核对线程发生错误，请重新核对或使用 CLI。');
      worker.onmessage = ({ data }) => {
        if (serial !== active.current.serial) return;
        if (data.error) { fail(data.error); return; }
        stop(); setResult({ phase: 'ready', ...data });
      };
      worker.postMessage({ ...texts, ...flags });
    } catch { fail('无法启动核对线程，请重新加载或使用 CLI。'); }
  }
  function locate(side, span) {
    const input = inputs.current[side]; if (!input || !span) return;
    const lines = input.value.split('\n');
    const start = lines.slice(0, span.line - 1).join('\n').length + (span.line > 1 ? 1 : 0);
    const end = lines.slice(0, span.end_line).join('\n').length;
    input.focus(); input.setSelectionRange(start, end); input.scrollTop = Math.max(0, (span.line - 2) * 24);
  }
  const ready = result.phase === 'ready';
  const report = ready ? result.report : null;
  function download() {
    if (!ready || !report || !result.markdown) return;
    const text = format === 'json' ? JSON.stringify(report, null, 2) + '\n' : result.markdown;
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'moonldif-snapshot-diff.' + (format === 'json' ? 'json' : 'md');
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const title = report ? report.exit_code === 2 ? '核对不完整，请先处理输入或歧义' : report.exit_code === 1 ? `发现 ${report.total_changes} 项差异` : '当前比较规则下未发现差异' : result.message || '请核对当前两份内容';
  return <section aria-label="迁移前后核对" className="snapshot-panel">
    <div className="page-intro"><div><h1>迁移前后，少了什么？</h1><p>核对目录导出，排除折行、编码表示与排列顺序的干扰。</p></div><div className="main-actions"><button onClick={() => { invalidate(); setTexts(samples); }}>载入合成迁移示例</button><button className="primary" onClick={run} disabled={['running','loading'].includes(result.phase)}>开始核对</button></div></div>
    <p className="snapshot-scope">按解码后的 DN 原字符串匹配，属性值按字节及重复次数比较。DN 改写会显示为新增与缺失，不推断重命名或服务器语义相等，也不生成执行脚本。</p>
    <div className="settings"><label><input type="checkbox" checked={flags.compat} onChange={e => { invalidate(); setFlags(f => ({ ...f, compat: e.target.checked })); }} />核对时允许缺版本头</label><label><input type="checkbox" checked={flags.legacySpaces} onChange={e => { invalidate(); setFlags(f => ({ ...f, legacySpaces: e.target.checked })); }} />核对时允许旧 DN 空格</label></div>
    <div className="snapshot-editors">{['before','after'].map(side => <section className="panel" key={side}><div className="editor-toolbar"><h2>{names[side]}快照</h2><label className="snapshot-file">打开文件<input type="file" disabled={result.phase === 'loading'} accept=".ldif,.txt" aria-label={`打开${names[side]}快照`} onChange={e => { load(side, e.target.files[0]); e.target.value = ''; }} /></label></div><textarea ref={element => { inputs.current[side] = element; }} aria-label={`${names[side]}快照内容`} disabled={result.phase === 'loading'} spellCheck={false} wrap="off" value={texts[side]} onChange={e => edit(side,e.target.value)} /><div className="panel-footer">每份上限 1 MiB / 10,000 行 · 编辑后需重新核对</div></section>)}</div>
    <div className={`status-strip ${report?.exit_code === 0 ? 'success' : report || result.phase === 'error' ? 'caution' : 'neutral'}`} role="status"><div><strong>{title}</strong><p>{report ? `已展示 ${report.reported_changes} / ${report.total_changes} 项差异 · 排除 ${report.ambiguous_dn_count} 个重复 DN` : '过期、读取中、运行失败的结果不可下载。'}</p>{report?.truncated && <p>列表已截断；总数涵盖全部可比较条目。</p>}</div></div>
    <div className="report-tools"><label>核对报告 <select aria-label="核对报告格式" value={format} onChange={e => setFormat(e.target.value)}><option value="markdown">Markdown</option><option value="json">JSON</option></select></label><button disabled={!ready} onClick={download}>下载核对报告</button><p>报告包含 DN、属性名称、行号与两份内容指纹，不包含原始属性值。指纹不是签名。</p></div>
    {report && <div className="panel snapshot-results">
      <div className="snapshot-counts">{Object.entries(report.counts).map(([code,count]) => <span key={code}>{codes[code]} <strong>{count}</strong></span>)}</div>
      {[...report.diagnostics.map(d => ({...d, side:d.side})), ...['before','after'].flatMap(side => report[side].diagnostics.map(d => ({ ...d, side })))].map((d,i) => <div key={i} className="partial-note"><strong>{names[d.side] || '核对'} · {d.code}</strong><p>{d.reason}{d.dn ? ` DN: ${d.dn}` : ''}</p>{d.span && <button onClick={() => locate(d.side,d.span)}>定位问题行</button>}</div>)}
      {report.changes.map((item,i) => <article className="result-row" key={i}><div className="row-heading"><h3>{codes[item.code]}</h3>{item.attribute && <span className="line-label">{item.attribute}</span>}</div><p className="snapshot-target">{item.dn || '(根 DN)'}</p><p>{item.code.startsWith('entry-') ? '整条目录记录发生增减，属性值不展开。' : `减少 ${item.removed_value_count} 个属性值；增加 ${item.added_value_count} 个属性值`}</p><div className="snapshot-locations">{['before','after'].map(side => item[side + '_span'] && <button key={side} onClick={() => locate(side,item[side + '_span'])}>{`定位${names[side]}第 ${item[side + '_span'].line} 行`}</button>)}</div></article>)}
      {report.exit_code === 0 && <p>两份输入在当前比较规则下相同。仍需独立确认导出范围一致，以及服务端 Schema、权限与目录状态。</p>}
    </div>}
  </section>;
}
