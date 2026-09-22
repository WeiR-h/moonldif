import { useCallback, useEffect, useRef, useState } from 'react';

let releaseOwner = null;
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function usePagedSession(kind) {
  const [result, setResult] = useState({phase:'stale', report:null});
  const current = useRef({generation:0, request:0, worker:null, timer:null, pending:null});
  const stop = useCallback(() => {
    const c = current.current;
    c.generation++; c.request++;
    c.worker?.terminate(); c.worker = null; c.pending = null;
    clearTimeout(c.timer);
    if (releaseOwner === c.release) releaseOwner = null;
  }, []);
  const invalidate = useCallback(() => {stop(); setResult({phase:'stale',report:null});}, [stop]);
  const arm = useCallback(() => {
    const c = current.current;
    clearTimeout(c.timer);
    c.timer = setTimeout(() => {stop(); setResult({phase:'error',report:null,message:'处理超过 20 秒，已停止。请减小文件或使用 CLI。'});}, 20000);
  }, [stop]);
  const run = useCallback((payload, onWritten) => {
    invalidate();
    releaseOwner?.();
    const c = current.current, generation = c.generation;
    const fail = message => {
      if (generation !== c.generation) return;
      stop(); setResult({phase:'error',report:null,message});
    };
    c.release = invalidate; releaseOwner = invalidate;
    setResult({phase:'running',report:null,message:'正在分析当前内容…'});
    try {
      c.worker = kind === 'review'
        ? new Worker(new URL('./analysis.worker.js', import.meta.url), {type:'module'})
        : new Worker(new URL('./snapshot.worker.js', import.meta.url), {type:'module'});
      c.worker.onerror = () => fail('分析线程发生错误，请重新检查或使用 CLI。');
      c.worker.onmessage = ({data}) => {
        if (generation !== c.generation || data.request !== c.request) return;
        if (data.error) {fail(data.error); return;}
        clearTimeout(c.timer);
        if (data.type === 'export') {
          if (!c.pending || !(data.blob instanceof Blob)) {fail('报告生成失败，请重新检查。'); return;}
          downloadBlob(data.blob, c.pending.name); c.pending = null;
          setResult(previous => ({...previous,busy:false,exporting:false,message:'完整报告已生成。'}));
        } else {
          if (data.type === 'analysis' && data.exit_code === 0 && typeof data.written === 'string') onWritten?.(data.written);
          setResult({phase:'ready',report:data.report,busy:false,message:''});
        }
      };
      c.worker.postMessage({...payload,request:++c.request}); arm();
    } catch {fail('无法启动分析线程，请重新加载或使用 CLI。');}
  }, [arm, invalidate, kind, stop]);
  const queryPage = useCallback(query => {
    const c = current.current;
    if (!c.worker || c.pending) return;
    setResult(previous => ({...previous,busy:true}));
    c.worker.postMessage({type:'page',request:++c.request,query}); arm();
  }, [arm]);
  const exportReport = (format, name) => {
    const c = current.current;
    if (result.phase !== 'ready' || result.busy || !c.worker || !['json','markdown'].includes(format)) return;
    c.pending = {name:name + (format === 'json' ? '.json' : '.md')};
    setResult(previous => ({...previous,busy:true,exporting:true}));
    c.worker.postMessage({type:'export',request:++c.request,format}); arm();
  };
  useEffect(() => stop, [stop]);
  return {result,setResult,run,invalidate,queryPage,exportReport};
}
