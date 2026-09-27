import React from 'react';
import { limitNames } from './useProfile.js';
export function ProfilePanel({profile,mode,report,locate}) {
  const blockers=[['denyDelete','整条删除'],['denyClear','属性清空'],['denyRename','改名与移动']].filter(([key])=>profile.flags[key]).map(([,name])=>name);
  const state=profile.loading?'正在读取配置':profile.checking?'正在校验当前设置':profile.error?'配置有错误，检查已暂停':profile.active?'配置有效（不代表 LDIF 检查通过）':'使用手工选项';
  const prefix=`profile-${mode}`;
  return <section className="profile-panel" aria-label={mode==='review'?'预检配置':'核对配置'}>
    <div className="profile-actions"><strong>可复用检查配置</strong><label>加载配置<input type="file" accept=".json" aria-label={mode==='review'?'加载预检配置':'加载核对配置'} onChange={e=>{profile.load(e.target.files[0]);e.target.value='';}} /></label><button onClick={profile.save} disabled={profile.blocked}>下载当前配置</button><button onClick={profile.restore} disabled={!profile.canRestore} aria-describedby={`${prefix}-restore-help`}>恢复最近加载配置</button><button onClick={profile.clear} aria-describedby={`${prefix}-disable-help`}>停用配置</button></div>
    <p role="status" aria-live="polite">{state} · {profile.active?'配置已启用':'配置未启用'}{profile.modified?' · 已手工修改':''} · {mode==='review'?'文件预检':'迁移前后核对'}</p>
    <p>{profile.message}</p>
    {profile.error&&<p role="alert" className="profile-error">配置错误：{profile.error}{profile.issue?.path&&<> 字段：<code>{profile.issue.path}</code></>}</p>}
    {mode==='review'&&<div className="profile-limits">{Object.entries(limitNames).map(([key,label])=>{
      const invalid=profile.fieldIssue?.path===`/review/limits/${key}`;
      const help=`${prefix}-${key}-help`;
      return <label key={key}>{label}<input type="text" inputMode="numeric" maxLength={32} aria-label={label} aria-invalid={invalid?'true':undefined} aria-describedby={help} placeholder="不限制" value={profile.limits[key]??''} onChange={e=>profile.changeLimit(key,e.target.value)} /><span id={help} className={invalid?'profile-error':'profile-help'}>{invalid?profile.error:'空白不限，0 表示禁止'}</span></label>;
    })}</div>}
    <div className="profile-summary" aria-label="当前规则摘要"><strong>当前设置</strong><p>允许缺版本头：{profile.flags.compat?'是':'否'}；允许旧 DN 空格：{profile.flags.legacySpaces?'是':'否'}。</p>{mode==='review'?<><p>拦截：{blockers.join('、')||'未启用单项拦截'}。</p><p>数量限制：{Object.entries(limitNames).map(([key,label])=>`${label} ${profile.limits[key]||'不限'}`).join('；')}（每份文件独立计算）。</p></>:<p>排除属性：{profile.ignoredText||'无'}。</p>}<p>当前设置仅在重新检查后用于新报告；配置校验不会自动检查 LDIF。</p></div>
    <p id={`${prefix}-restore-help`}>{profile.canRestore?'恢复会撤销加载后手工修改，保留当前 LDIF 编辑内容；随后需重新检查。':'尚无成功加载的配置，暂不能恢复。'}</p>
    <p id={`${prefix}-disable-help`}>停用保留当前手工开关{mode==='compare'?'与排除属性':'，清除数量限制'}。恢复记录仅在当前页面保留，刷新后清空。</p>
    {report?.change_limits&&<div className="profile-metrics"><strong>本次报告 · {report.change_limits.counts_complete?'完整数量':'仅已知数量，不代表检查通过'}</strong>{report.change_limits.metrics.map(m=><span key={m.rule}>{limitNames[m.rule]}：{m.actual} / {m.limit??'不限制'} {m.first_exceeded_span&&<button onClick={()=>locate(m.first_exceeded_span)}>定位越界</button>}</span>)}</div>}
  </section>;
}
