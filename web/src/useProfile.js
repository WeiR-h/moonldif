import { useEffect, useRef, useState } from 'react';
import { effectiveProfile, validateProfile } from './profile-config.js';
import { downloadBlob } from './usePagedSession.js';

export const limitNames={max_change_records:'最多变更记录',max_delete_records:'最多整条删除',max_clear_operations:'最多属性清空'};
export function useProfile(mode, invalidate, flags, applyFlags, ignoredText='', applyIgnored=()=>{}, enabled=true) {
  const [base,setBase]=useState(null),[limits,setLimits]=useState({});
  const [source,setSource]=useState(''),[message,setMessage]=useState('未加载配置，使用当前选项。');
  const [importError,setImportError]=useState(null),[draftError,setDraftError]=useState(null);
  const [loading,setLoading]=useState(false),[checking,setChecking]=useState(false),[revision,setRevision]=useState(0);
  const [modified,setModified]=useState(false);
  const work=useRef({read:0,check:0,timer:null,unmounted:false,loaded:null,validated:null});
  const text=JSON.stringify(effectiveProfile(base,mode,flags,ignoredText,limits));
  const latest=useRef(text);latest.current=text;
  useEffect(()=>{work.current.unmounted=false;return()=>{const w=work.current;w.unmounted=true;w.read++;w.check++;clearTimeout(w.timer);};},[]);
  const problem=e=>({message:e.message||'配置处理失败，请重试。',issue:e.issue||null});
  function invalidateDraft() {
    const w=work.current;w.check++;w.validated=null;clearTimeout(w.timer);
    invalidate();setDraftError(null);setChecking(true);setRevision(r=>r+1);
  }
  useEffect(()=>{
    const w=work.current,id=++w.check;
    clearTimeout(w.timer);
    if(!enabled||loading||importError){setChecking(false);return;}
    if(revision===0)return;
    setChecking(true);
    w.timer=setTimeout(async()=>{
      try {
        const result=await validateProfile(text);
        if(w.unmounted||id!==w.check||text!==latest.current)return;
        w.validated={text,result};setDraftError(null);
      } catch(error){if(!w.unmounted&&id===w.check&&text===latest.current)setDraftError(problem(error));}
      finally{if(!w.unmounted&&id===w.check)setChecking(false);}
    },300);
    return()=>{clearTimeout(w.timer);w.check++;};
  },[text,revision,loading,importError,enabled]);
  function dirty() {
    const w=work.current;w.read++;
    if(loading)setImportError({message:'配置读取已中断，请重新加载、恢复或停用配置。'});
    setLoading(false);invalidateDraft();setSource('');setModified(true);
    setMessage('已修改；需重新检查，报告将记录当前有效配置。');
  }
  function changeLimit(key,value) {dirty();setBase(p=>p||{profile_version:1});setLimits(old=>({...old,[key]:value}));}
  function clear() {
    work.current.read++;setLoading(false);setImportError(null);invalidateDraft();
    setBase(null);setLimits({});setSource('');setModified(false);
    setMessage('已停用配置；保留当前手工选项，数量限制已清除。请重新检查。');
  }
  function applyLoaded(result,restored=false) {
    setBase(result.profile);setSource(result.encoded);setImportError(null);setModified(false);
    const {common,review,compare}=result.profile;
    applyFlags(mode==='review'?{compat:common.allow_missing_version,legacySpaces:common.legacy_dn_spaces,denyDelete:review.deny_delete,denyClear:review.deny_clear,denyRename:review.deny_rename}:{compat:common.allow_missing_version,legacySpaces:common.legacy_dn_spaces});
    if(mode==='review')setLimits(Object.fromEntries(Object.entries(review.limits).map(([k,v])=>[k,String(v)])));
    else applyIgnored(compare.ignored_attributes.join(', '));
    setMessage(restored?'已恢复最近成功加载的配置；请重新检查。':'已加载配置；仅应用当前模式对应规则，请重新检查。');
  }
  async function load(file) {
    if(!file)return;
    const w=work.current,id=++w.read;invalidateDraft();setChecking(false);setLoading(true);setImportError(null);
    try {
      if(file.size>65536)throw new Error('配置最多 64 KiB。');
      const bytes=await file.arrayBuffer();
      let decoded;
      try {decoded=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new Error('配置必须使用有效 UTF-8 编码。');}
      const result=await validateProfile(decoded);
      if(w.unmounted||id!==w.read)return;
      w.loaded=result;applyLoaded(result);
    } catch(error){if(!w.unmounted&&id===w.read){setImportError(problem(error));setMessage('配置未应用。重新加载、恢复或停用后才能检查。');}}
    finally{if(!w.unmounted&&id===w.read)setLoading(false);}
  }
  function restore() {
    const w=work.current;if(!w.loaded)return;
    w.read++;setLoading(false);invalidateDraft();applyLoaded(w.loaded,true);
  }
  const error=importError?.message||draftError?.message||'';
  const issue=importError?.issue||draftError?.issue||null;
  const blocked=loading||checking||Boolean(error)||!enabled;
  function payload() {
    if(blocked)throw new Error(error||'配置仍在读取或校验中。');
    if(!base)return {};
    const valid=work.current.validated;
    if(valid?.text!==text)throw new Error('配置已更改，请等待校验。');
    return {profileEncoded:valid.result.encoded,profileSourceEncoded:source};
  }
  async function save() {
    if(blocked)return;
    const w=work.current,id=w.check,current=text;
    try {
      const result=w.validated?.text===current?w.validated.result:await validateProfile(current);
      if(w.unmounted||id!==w.check||current!==latest.current)return;
      downloadBlob(new Blob([result.canonical],{type:'application/json;charset=utf-8'}),'moonldif-profile.json');
    }catch(e){if(!w.unmounted&&id===w.check){invalidate();setDraftError(problem(e));}}
  }
  function cancelPending() {
    const w=work.current;w.read++;w.check++;clearTimeout(w.timer);setLoading(false);setChecking(false);
    if(loading)setImportError({message:'配置读取已停止，请重新加载、恢复或停用配置。'});
    setRevision(r=>r+1);
  }
  return {cancelPending,active:Boolean(base),modified,limits,error,issue,fieldIssue:draftError?.issue,loading,checking,blocked,message,load,save,clear,restore,canRestore:Boolean(work.current.loaded),dirty,changeLimit,payload,flags,ignoredText};
}
