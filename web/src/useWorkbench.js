import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from './useProfile.js';
import { samples } from './samples.js';
import { usePagedSession, downloadBlob } from './usePagedSession.js';

const initialOptions = { denyDelete: true, denyClear: false, denyRename: false, compat: false, legacySpaces: false };
export function useWorkbench() {
  const [document, setDocument] = useState(samples[0]);
  const [options, setOptions] = useState(initialOptions);
  const session = usePagedSession('review');
  const analysis = session.result;
  const [selection,setSelection] = useState(null);
  const active = useRef({fileSerial:0});
  const invalidate = useCallback(() => {active.current.fileSerial++;setSelection(null);session.invalidate();},[session.invalidate]);
  const profile = useProfile('review',invalidate,options,setOptions);
  const profileRef=useRef(profile);profileRef.current=profile;
  const run = useCallback((doc, flags, write=false) => {
    let configuration;
    try {configuration=profileRef.current.payload();} catch(error){session.setResult({phase:'error',report:null,message:error.message});return;}
    session.run({text:doc.text,options:flags,write,...configuration}, written => {
      downloadBlob(new Blob([written],{type:'application/ldif;charset=utf-8'}),doc.filename.replace(/\.[^.]*$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')+'-normalized.ldif');
    });
  },[session.run]);
  const setAnalysis = session.setResult;
  const stop = session.invalidate;
  useEffect(() => {if(analysis.phase==='ready')setSelection(analysis.report.diagnostics?.find(d=>d.severity==='policy')?.span || null);},[analysis.phase,analysis.report?.source?.sha256]);

  useEffect(() => { run(samples[0], initialOptions); return stop; }, [run, stop]);
  const edit = text => { invalidate(); setDocument(doc => ({ ...doc, id: '', text })); };
  const setOption = (name, checked) => { profile.dirty(); setOptions(flags => ({ ...flags, [name]: checked })); };
  const loadSample = id => { const sample = samples.find(s => s.id === id); if (!sample) return; invalidate(); setDocument(sample); run(sample, options); };
  const loadFile = async file => {
    if (!file) return;
    invalidate();
    const id = active.current.fileSerial;
    setAnalysis({ phase: 'loading', report: null, message: '正在读取本地文件…' });
    try {
      if (file.size > 1024 * 1024) throw new Error('所选文件超过 1 MiB，请使用 CLI。当前编辑内容未替换。');
      const bytes = await file.arrayBuffer();
      if (id !== active.current.fileSerial) return;
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw new Error('所选文件不是有效 UTF-8，当前编辑内容未替换；未用替代字符改写原始字节。'); }
      if (text.split('\n').length > 10000) throw new Error('所选文件超过 10,000 行，请使用 CLI。当前编辑内容未替换。');
      const next = { id: '', filename: file.name, text };
      setDocument(next); run(next, options);
    } catch (error) {
      if (id === active.current.fileSerial) setAnalysis({ phase: 'error', report: null, message: error.message });
    }
  };
  const recheck = () => { active.current.fileSerial++; run(document, options); };
  const canExport = analysis.phase === 'ready' && !analysis.busy && analysis.report?.exit_code === 0;
  const exportFile = () => { if (canExport) run(document, options, true); };
  const canExportReport = analysis.phase === 'ready' && !analysis.busy && Boolean(analysis.report?.source?.sha256);
  const exportReport = format => session.exportReport(format,'moonldif-review');
  return {profile,canExportReport,exportReport,document,options,analysis,selection,setSelection,edit,setOption,loadSample,loadFile,recheck,canExport,exportFile,invalidate,queryPage:session.queryPage};
}
