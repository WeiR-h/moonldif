import React, { useState } from 'react';
import { Icon } from './Icon.jsx';

const reviewCopy = {
  'attribute-replace': ['替换属性值', '替换整个属性值集合，请核对是否需要保留旧值。'],
  'unsupported-modification': ['尚未支持的修改操作', '此操作的效果尚未分析，请使用支持它的工具或有意修订原文；不能将它当作替换或清空。'],
  'attribute-delete-all': ['删除整个属性', '没有指定值，将请求删除该属性的所有值。请确认该属性不是必填项。'],
  'attribute-delete-values': ['删除指定属性值', '仅请求删除指定值，请核对这些值是否存在、是否为预期目标。'],
  'attribute-clear': ['清空属性值', '空替换将请求移除属性值，请确认清空操作符合预期及目录规则。'],
  'attribute-add': ['添加属性值', '请核对目录约束及重复值；没有提供值的添加操作可能被服务器拒绝。'],
  'entry-add': ['添加目录条目', '请核对父目录、对象类及必填属性是否满足目标目录要求。'],
  'entry-delete': ['删除目录条目', '请核对目标条目与恢复方式；实际影响取决于服务端状态和控制项。'],
  'entry-rename': ['重命名目录条目', '请审阅新名称、旧 RDN 值的处理方式及依赖该名称的条目。'],
  'entry-move': ['重命名并指定新父目录', '请核对目标父目录、子条目及权限。'],
  'operation-control': ['操作控制项需人工审阅', '仅识别控制项是否存在，不解释其值与服务端执行效果。'],
};
const diagnosticTitles = {
  'delete-denied': '删除策略已拦截此操作', 'external-value-unresolved': '外部值尚未解析',
  'name-empty-component': '名称包含空组件', 'name-invalid-attribute': '名称属性类型无效',
  'name-expected-rdn': '新名称必须是一个 RDN', 'name-trailing-space': '名称值尾部空格需要转义',
  'name-unescaped-character': '名称含未转义字符', 'missing-version': '缺少版本头',
  'invalid-base64': 'Base64 编码无效', 'legacy-name-separator-spaces': '已启用旧 DN 分隔空格兼容',
  'unsupported-control-encoding': '整个控制项的编码扩展暂不支持',
  'unsupported-modification': '修改操作暂不支持',
};
function lineLabel(span) { return span ? `第 ${span.line}${span.end_line !== span.line ? `–${span.end_line}` : ''} 行` : '输入'; }
export function Results({ analysis, locate, selected }) {
  const [tab, setTab] = useState('review');
  const report = analysis.report;
  const items = report?.review?.items || [];
  const diagnostics = report?.diagnostics || [];
  const ready = analysis.phase === 'ready';
  const tabKey = e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 'diagnostics' : e.key === 'End' ? 'review' : tab === 'review' ? 'diagnostics' : 'review';
    setTab(next);
    e.currentTarget.parentElement.querySelector(`#tab-${next}`).focus();
  };
  return <section className="results-panel panel" aria-label="检查结果">
    <div className="result-tabs" role="tablist" aria-label="结果类型">
      <button id="tab-diagnostics" role="tab" tabIndex={tab === 'diagnostics' ? 0 : -1} onKeyDown={tabKey} aria-selected={tab === 'diagnostics'} aria-controls="results-content" onClick={() => setTab('diagnostics')}>诊断 <span>{ready ? diagnostics.length : '—'}</span></button>
      <button id="tab-review" role="tab" tabIndex={tab === 'review' ? 0 : -1} onKeyDown={tabKey} aria-selected={tab === 'review'} aria-controls="results-content" onClick={() => setTab('review')}>变更审阅 <span>{ready ? report?.review?.total_items ?? 0 : '—'}</span></button>
    </div>
    <div className="results-content" id="results-content" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {!ready ? <div className="empty-state"><Icon name="refresh" /><h3>{analysis.phase === 'running' ? '正在分析当前内容' : '等待检查当前内容'}</h3><p>编辑内容或更改选项后，请重新检查。旧结果不会用于导出。</p></div> : <>
        {report?.exit_code === 2 && <p className="partial-note">输入存在错误或分析不完整。以下是已识别部分，不能据此判断其余内容没有影响。</p>}
        {tab === 'review' ? <>
          {report?.review?.truncated && <p className="partial-note">共 {report.review.total_items} 项，仅显示前 200 项。请分段审阅文件。</p>}
          {items.length === 0 ? <div className="empty-state"><Icon name="check" /><h3>{report?.mode === 'content' ? '这是目录内容文件' : '暂无已识别的变更项'}</h3><p>{report?.mode === 'content' ? '内容记录不会自动当作新增操作。请在“诊断”中查看检查结果。' : '请结合文件内容与诊断判断，不能将此视为无风险。'}</p></div> : items.map((item, index) => {
            const copy = reviewCopy[item.code] || [item.title, item.reason];
            const isSelected = selected?.line === item.span.line;
            const blockedDeletion = item.code === 'entry-delete' && diagnostics.some(d => d.code === 'delete-denied' && d.span?.line === item.span.line);
            return <article className={`result-row ${isSelected ? 'selected' : ''}`} key={`${item.record_index}-${index}`}>
              <div className="row-heading"><h3>{copy[0]}</h3><span className="line-label">{lineLabel(item.span)}</span><button className="locate" onClick={() => locate({ ...item.span })} aria-label={`定位${copy[0]}，${lineLabel(item.span)}`}><Icon name="arrow" />定位原文</button></div>
              <p className="item-target" title={item.dn}>{item.attribute || item.dn}{item.attribute && item.value_count > 0 ? ` · ${item.value_count} 个值` : ''}</p>
              <p>{blockedDeletion ? '删除策略已拦截；请核对目标条目后再决定。' : copy[1]}</p>
              {['entry-move', 'entry-rename', 'operation-control', 'unsupported-modification'].includes(item.code) && <p className="raw-detail">{item.reason}</p>}
            </article>;
          })}
        </> : diagnostics.length === 0 ? <div className="empty-state"><Icon name="check" /><h3>支持范围内未发现问题</h3><p>仍需在目标目录核对 Schema、权限及服务端状态。</p></div> : diagnostics.map((d, i) => <article className="result-row" key={`${d.code}-${i}`}>
          <div className="row-heading"><h3>{diagnosticTitles[d.code] || d.code}</h3><span className="line-label">{lineLabel(d.span)}</span>{d.span && <button className="locate" onClick={() => locate({ ...d.span })} aria-label={`定位诊断，${lineLabel(d.span)}`}><Icon name="arrow" />定位原文</button>}</div>
          <p className="diagnostic-code">{d.code} · {d.severity}</p><p className="raw-detail">{d.reason}</p>
        </article>)}
      </>}
    </div>
    <div className="panel-footer">审阅描述文件中的操作，不代表服务器执行结果。</div>
  </section>;
}
