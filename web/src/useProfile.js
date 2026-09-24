import { useEffect, useRef, useState } from 'react';
import { effectiveProfile, validateProfile, encodedProfile } from './profile-config.js';
import { downloadBlob } from './usePagedSession.js';

export const limitNames={max_change_records:'最多变更记录',max_delete_records:'最多整条删除',max_clear_operations:'最多属性清空'};
export function useProfile(mode, invalidate, flags, applyFlags, ignoredText='', applyIgnored=()=>{}) {
  const [base,setBase]=useState(null),[limits,setLimits]=useState({});
  const [source,setSource]=useState(''),[message,setMessage]=useState('未加载配置，使用当前选项。');
  const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  const ticket=useRef(0),unmounted=useRef(false);
  useEffect(()=>{unmounted.current=false;return ()=>{unmounted.current=true;ticket.current++;};},[]);
  const valid=id=>!unmounted.current&&id===ticket.current;
  function dirty() {ticket.current++;setLoading(false);invalidate();setSource('');setMessage('已修改；报告将记录当前有效配置。');}
  function changeLimit(key,value) {dirty();setError('');setBase(p=>p||{profile_version:1});setLimits(old=>({...old,[key]:value}));}
  function clear() {dirty();setBase(null);setLimits({});setError('');setMessage('已停用配置，使用当前选项。');}
  async function load(file) {
    if(!file)return;
    dirty();const id=ticket.current;setLoading(true);setError('');
    try {
      if(file.size>65536)throw new Error('配置最多 64 KiB。');
      const bytes=await file.arrayBuffer();
      const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      const result=await validateProfile(text);
      if(!valid(id))return;
      setBase(result.profile);setSource(result.encoded);
      const common=result.profile.common, review=result.profile.review;
      applyFlags(mode==='review'?{compat:common.allow_missing_version,legacySpaces:common.legacy_dn_spaces,denyDelete:review.deny_delete,denyClear:review.deny_clear,denyRename:review.deny_rename}:{compat:common.allow_missing_version,legacySpaces:common.legacy_dn_spaces});
      if(mode==='review')setLimits(Object.fromEntries(Object.entries(review.limits).map(([k,v])=>[k,String(v)])));
      else applyIgnored(result.profile.compare.ignored_attributes.join(', '));
      setMessage('已加载配置；仅应用当前模式对应规则。');
    }catch(e){if(valid(id)){setError(e instanceof TypeError?'配置不是有效 UTF-8。':e.message);setMessage('配置未应用，请重新加载或停用配置。');}}
    finally{if(valid(id))setLoading(false);}
  }
  function payload() {
    if(error||loading)throw new Error(error||'配置仍在读取中。');
    return base?{profileEncoded:encodedProfile(JSON.stringify(effectiveProfile(base,mode,flags,ignoredText,limits))),profileSourceEncoded:source}:{};
  }
  async function save() {
    const id=ticket.current;
    try{
      if(error||loading)return;
      const result=await validateProfile(JSON.stringify(effectiveProfile(base,mode,flags,ignoredText,limits)));
      if(!valid(id))return;
      downloadBlob(new Blob([result.canonical],{type:'application/json;charset=utf-8'}),'moonldif-profile.json');
    }catch(e){if(valid(id)){invalidate();setError(e.message);}}
  }
  function cancelPending(){ticket.current++;setLoading(false);if(loading)setError("配置读取已停止，请重新加载或停用配置。");}
  return {cancelPending,active:Boolean(base),limits,error,loading,message,load,save,clear,dirty,changeLimit,payload};
}
