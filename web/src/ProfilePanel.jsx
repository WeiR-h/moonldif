import React from 'react';
import { limitNames } from './useProfile.js';
export function ProfilePanel({profile,mode,report,locate}) {
  return <section className="profile-panel" aria-label={mode==='review'?'预检配置':'核对配置'}>
    <div className="profile-actions"><strong>可复用检查配置</strong><label>加载配置<input type="file" accept=".json" aria-label={mode==='review'?'加载预检配置':'加载核对配置'} onChange={e=>{profile.load(e.target.files[0]);e.target.value='';}} /></label><button onClick={profile.save} disabled={profile.loading||Boolean(profile.error)}>下载当前配置</button><button onClick={profile.clear}>停用配置</button></div>
    <p>{profile.message} {profile.error&&<span role="alert">配置错误：{profile.error}</span>}</p>
    {mode==='review'&&<div className="profile-limits">{Object.entries(limitNames).map(([key,label])=><label key={key}>{label}<input type="text" inputMode="numeric" maxLength={32} aria-label={label} placeholder="不限制" value={profile.limits[key]??''} onChange={e=>profile.changeLimit(key,e.target.value)} /></label>)}</div>}
    <p>配置只在当前页面保留。数量限制按每份变更文件计数；空白不限制，0 表示不允许。配置不是目录 Schema。</p>
    {report?.change_limits&&<div className="profile-metrics"><strong>{report.change_limits.counts_complete?'完整数量':'仅已知数量，不代表检查通过'}</strong>{report.change_limits.metrics.map(m=><span key={m.rule}>{limitNames[m.rule]}：{m.actual} / {m.limit??'不限制'} {m.first_exceeded_span&&<button onClick={()=>locate(m.first_exceeded_span)}>定位越界</button>}</span>)}</div>}
  </section>;
}
