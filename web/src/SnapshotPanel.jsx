import React, { useEffect, useRef, useState } from 'react';
import { usePagedSession } from './usePagedSession.js';
import { ProfilePanel } from './ProfilePanel.jsx';
import { useProfile } from './useProfile.js';
import { Pager } from './Pager.jsx';

const samples = {
  before: 'version: 1\ndn: uid=alice,dc=example,dc=org\ncn: Alice\nmail: alice@example.org\nmemberOf: cn=staff,dc=example,dc=org\nmemberOf: cn=reviewers,dc=example,dc=org\n\ndn: uid=bob,dc=example,dc=org\ncn: Bob\nmail: bob@example.org\n',
  after: 'version: 1\ndn: uid=alice,dc=example,dc=org\nCN:: QWxpY2U=\nmemberOf: cn=staff,dc=example,dc=org\n\ndn: uid=carol,dc=example,dc=org\ncn: Carol\nmail: carol@example.org\n',
};
const names = { before: '迁移前', after: '迁移后' };
const codes = { 'entry-added': '新增条目', 'entry-removed': '缺失条目', 'attribute-added': '新增属性', 'attribute-removed': '缺失属性', 'values-changed': '属性值变化' };

export function SnapshotPanel({enabled}) {
  const [texts, setTexts] = useState(samples);
  const [flags, setFlags] = useState({ compat: false, legacySpaces: false });
  const session = usePagedSession('compare');
  const result = session.result, setResult = session.setResult;
  const [format, setFormat] = useState('markdown');
  const [ignoredText, setIgnoredText] = useState('');
  const inputs = useRef({});
  const active = useRef({files:0});
  function invalidate() {session.invalidate();active.current.files++;}
  const profile=useProfile('compare',invalidate,flags,setFlags,ignoredText,setIgnoredText);
  const profileRef=useRef(profile);profileRef.current=profile;
  useEffect(() => {if(!enabled){profileRef.current.cancelPending();session.invalidate();active.current.files++;}},[enabled,session.invalidate]);
  useEffect(() => () => {active.current.files++;},[]);
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
    active.current.files++;
    try {session.run({...texts,...flags,ignoredAttributes:ignoredText.trim()===''?[]:ignoredText.split(',').map(value=>value.trim()),...profile.payload()});}
    catch(error){setResult({phase:'error',report:null,message:error.message});}
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
  const visibleChanges = result.busy ? [] : report?.changes || [];
  function download() { session.exportReport(format,'moonldif-snapshot-diff'); }
  const title = report ? report.exit_code === 2 ? '核对不完整，请先处理输入或歧义' : report.exit_code === 1 ? `发现 ${report.total_changes} 项差异` : '当前比较规则下未发现差异' : result.message || '请核对当前两份内容';
  return <section aria-label="迁移前后核对" className="snapshot-panel">
    <div className="page-intro"><div><h1>迁移前后，少了什么？</h1><p>核对目录导出，排除折行、编码表示与排列顺序的干扰。</p></div><div className="main-actions"><button onClick={() => { invalidate(); setTexts(samples); setIgnoredText('');  }}>载入合成迁移示例</button><button className="primary" onClick={run} disabled={['running','loading'].includes(result.phase)||profile.loading||Boolean(profile.error)}>开始核对</button>{(['running','loading'].includes(result.phase) || result.busy) && <button onClick={() => { invalidate(); setResult({phase: 'stale', message: '已停止，本次结果不可下载。'}); }}>停止核对</button>}</div></div>
    <p className="snapshot-scope">按解码后的 DN 原字符串匹配，属性值按字节及重复次数比较。DN 改写会显示为新增与缺失，不推断重命名或服务器语义相等，也不生成执行脚本。</p>
    <div className="settings"><label><input type="checkbox" checked={flags.compat} onChange={e => { profile.dirty(); setFlags(f => ({ ...f, compat: e.target.checked })); }} />核对时允许缺版本头</label><label><input type="checkbox" checked={flags.legacySpaces} onChange={e => { profile.dirty(); setFlags(f => ({ ...f, legacySpaces: e.target.checked })); }} />核对时允许旧 DN 空格</label></div>
    <div className="snapshot-exclusions"><label htmlFor="snapshot-exclusions">排除指定属性（可选）</label><input id="snapshot-exclusions" type="text" maxLength={16447} value={ignoredText} onChange={e => { profile.dirty(); setIgnoredText(e.target.value); }} placeholder="例如 modifyTimestamp, entryCSN" aria-describedby="exclusion-help" /><p id="exclusion-help">默认不排除。用英文逗号分隔，最多 64 项；属性选项需精确匹配。排除项会写入报告，格式错误、外部值、重复 DN 与整条增减仍会检查。</p></div>
    <ProfilePanel profile={profile} mode="compare" />
    <div className="snapshot-editors">{['before','after'].map(side => <section className="panel" key={side}><div className="editor-toolbar"><h2>{names[side]}快照</h2><label className="snapshot-file">打开文件<input type="file" disabled={result.phase === 'loading'} accept=".ldif,.txt" aria-label={`打开${names[side]}快照`} onChange={e => { load(side, e.target.files[0]); e.target.value = ''; }} /></label></div><textarea ref={element => { inputs.current[side] = element; }} aria-label={`${names[side]}快照内容`} disabled={result.phase === 'loading'} spellCheck={false} wrap="off" value={texts[side]} onChange={e => edit(side,e.target.value)} /><div className="panel-footer">每份上限 1 MiB / 10,000 行 · 编辑后需重新核对</div></section>)}</div>
    <div className={`status-strip ${report?.exit_code === 0 ? 'success' : report || result.phase === 'error' ? 'caution' : 'neutral'}`} role="status"><div><strong>{title}</strong><p>{report ? `已展示 ${report.reported_changes} / ${report.total_changes} 项差异 · 排除 ${report.ambiguous_dn_count} 个重复 DN` : '过期、读取中、运行失败的结果不可下载。'}</p>{report?.truncated && <p>列表已截断；总数涵盖全部可比较条目。</p>}</div></div>
    <div className="report-tools"><label>核对报告 <select aria-label="核对报告格式" value={format} onChange={e => setFormat(e.target.value)}><option value="markdown">Markdown</option><option value="json">JSON</option></select></label><button disabled={!ready || result.busy} onClick={download}>下载完整核对报告</button><p>报告包含 DN、属性名称、行号与两份内容指纹，不包含原始属性值。指纹不是签名。</p></div>
    {report && <div className="panel snapshot-results">
      <div className="snapshot-counts">{Object.entries(report.counts).map(([code,count]) => <span key={code}>{codes[code]} <strong>{count}</strong></span>)}</div>
      {report.options.ignored_attributes.length > 0 && <div className="partial-note"><strong>本次比较已排除：{report.options.ignored_attributes.join(', ')}</strong><p>{report.excluded_attribute_occurrences ? `命中属性行：迁移前 ${report.excluded_attribute_occurrences.before}，迁移后 ${report.excluded_attribute_occurrences.after}。这是出现次数，不是被忽略的差异数。` : '输入不满足比较前提，未统计排除命中数。'}</p></div>}
      {[...report.diagnostics.map(d => ({...d, side:d.side})), ...['before','after'].flatMap(side => report[side].diagnostics.map(d => ({ ...d, side })))].map((d,i) => <div key={i} className="partial-note"><strong>{names[d.side] || '核对'} · {d.code}</strong><p>{d.reason}{d.dn ? ` DN: ${d.dn}` : ''}</p>{d.span && <button onClick={() => locate(d.side,d.span)}>定位问题行</button>}</div>)}
      <Pager page={report.page} busy={result.busy} exporting={result.exporting} onQuery={session.queryPage} kinds={codes} label="差异类型" />
      {visibleChanges.length === 0 && report.total_changes > 0 && <p className="partial-note">当前筛选下没有匹配项，不代表两份内容相同。</p>}
      {visibleChanges.map((item,i) => <article className="result-row" key={item.item_index ?? i}><div className="row-heading"><h3>{codes[item.code]}</h3>{item.attribute && <span className="line-label">{item.attribute}</span>}</div><p className="snapshot-target">{item.dn || '(根 DN)'}</p><p>{item.code.startsWith('entry-') ? '整条目录记录发生增减，属性值不展开。' : `减少 ${item.removed_value_count} 个属性值；增加 ${item.added_value_count} 个属性值`}</p><div className="snapshot-locations">{['before','after'].map(side => item[side + '_span'] && <button key={side} onClick={() => locate(side,item[side + '_span'])}>{`定位${names[side]}第 ${item[side + '_span'].line} 行`}</button>)}</div></article>)}
      {report.exit_code === 0 && <p>两份输入在当前比较规则下相同。仍需独立确认导出范围一致，以及服务端 Schema、权限与目录状态。</p>}
    </div>}
  </section>;
}
