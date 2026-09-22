import React, { useEffect, useState } from 'react';

export function Pager({page, busy, exporting, onQuery, kinds, label = '操作类型'}) {
  const [query,setQuery] = useState(page.query || '');
  const [kind,setKind] = useState(page.kind || 'all');
  const [number,setNumber] = useState('1');
  const actual = Math.floor(page.offset / page.limit) + 1;
  const pages = Math.max(1,Math.ceil(page.matched_items / page.limit));
  useEffect(() => {setNumber(String(actual));},[actual]);
  useEffect(() => {
    if (exporting || (query === page.query && kind === page.kind)) return;
    const timer = setTimeout(() => onQuery({offset:0,limit:50,query,kind}),200);
    return () => clearTimeout(timer);
  },[query,kind,page.query,page.kind,onQuery,exporting]);
  const go = n => onQuery({offset:(n-1)*page.limit,limit:page.limit,query,kind});
  return <div className="full-review-controls">
    <div className="snapshot-filters">
      <label>查找 DN 或属性<input disabled={exporting} type="search" maxLength={256} value={query} onChange={e=>setQuery(e.target.value)} placeholder="在全部已识别项目中查找" /></label>
      <label>{label}<select disabled={exporting} value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部类型</option>{Object.entries(kinds).map(([code,text])=><option key={code} value={code}>{text}</option>)}</select></label>
      <button disabled={exporting} onClick={()=>{setQuery('');setKind('all');}}>清除筛选</button>
    </div>
    <p role="status">{busy ? '正在更新列表…' : `当前显示 ${page.returned_items} 项 · 匹配 ${page.matched_items} 项 · 总计 ${page.total_items} 项`}。筛选仅影响列表；完整报告包含本次分析的全部已知项目。</p>
    <div className="page-navigation" aria-label="结果分页">
      <button disabled={busy || actual<=1} onClick={()=>go(actual-1)}>上一页</button>
      <span>第 {actual} / {pages} 页</span>
      <button disabled={busy || !page.has_more} onClick={()=>go(actual+1)}>下一页</button>
      <form onSubmit={e=>{e.preventDefault();const n=Number(number);if(Number.isSafeInteger(n)&&n>=1&&n<=pages)go(n);}}>
        <label>跳转页码<input type="number" min="1" max={pages} value={number} onChange={e=>setNumber(e.target.value)} /></label><button disabled={busy}>跳转</button>
      </form>
    </div>
  </div>;
}
