import { useCallback, useEffect, useRef, useState } from 'react';
import { captureReproduction } from './reproduction.js';

import { downloads, downloadBlob } from './downloads.js';
export { downloadBlob } from './downloads.js';

let releaseOwner = null;
function dispose(worker) {
  if (!worker) return;
  worker.onmessage = worker.onerror = worker.onmessageerror = null;
  worker.terminate();
}

export function usePagedSession(kind) {
  const [result, setResult] = useState({phase:'stale', report:null});
  const current = useRef({generation:0, request:0, worker:null, timer:null, pending:null});
  const stop = useCallback(() => {
    const c = current.current;
    c.generation++; c.request++;
    dispose(c.worker); c.worker = null; c.pending = null;
    clearTimeout(c.timer);
    downloads.clear();
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
      const reproduction = captureReproduction(kind,payload);
      let retries = 0, accepted = false;
      const start = () => {
        if (generation !== c.generation) return;
        dispose(c.worker); c.worker = null;
        const worker = kind === 'review'
          ? new Worker(new URL('./analysis.worker.js', import.meta.url), {type:'module'})
          : new Worker(new URL('./snapshot.worker.js', import.meta.url), {type:'module'});
        c.worker = worker;
        const live = () => generation === c.generation && c.worker === worker;
        worker.onerror = event => {
          if (!live()) return;
          event.preventDefault();
          if (!accepted && retries++ === 0) {
            setResult({phase:'running',report:null,message:'分析线程启动失败，正在重试一次…'});
            try {start();} catch {fail('无法启动分析线程。请重新检查；若仍失败，请刷新页面或使用 CLI。');}
          } else fail('分析线程发生错误。旧结果已失效，请重新检查；若仍失败，请刷新页面或使用 CLI。');
        };
        worker.onmessageerror = () => {if(live())fail('分析线程通信失败。旧结果已失效，请重新检查。');};
        worker.onmessage = ({data}) => {
          if (!live() || data.request !== c.request) return;
          accepted = true;
          if (data.error) {fail(data.error); return;}
          clearTimeout(c.timer);
          try {
            if (data.type === 'export') {
              if (!c.pending || !(data.blob instanceof Blob)) {fail('报告生成失败，请重新检查。'); return;}
              downloadBlob(data.blob, c.pending.name); c.pending = null;
              setResult(previous => ({...previous,busy:false,exporting:false,message:'完整报告已准备，请在文件保存入口或浏览器下载列表确认。'}));
            } else {
              if (data.type === 'analysis' && data.exit_code === 0 && typeof data.written === 'string') onWritten?.(data.written);
              setResult({phase:'ready',report:data.report,reproduction,busy:false,message:''});
            }
          } catch {fail('接收结果或准备下载失败，请重新检查。');}
        };
        worker.postMessage({...payload,request:++c.request});
      };
      arm(); start();
    } catch {fail('无法启动分析线程，请重新加载或使用 CLI。');}
  }, [arm, invalidate, kind, stop]);
  const queryPage = useCallback(query => {
    const c = current.current;
    if (!c.worker || c.pending) return;
    setResult(previous => ({...previous,busy:true}));
    try {c.worker.postMessage({type:'page',request:++c.request,query}); arm();}
    catch {stop();setResult({phase:'error',report:null,message:'分页请求失败，请重新检查。'});}
  }, [arm,stop]);
  const exportReport = (format, name) => {
    const c = current.current;
    if (result.phase !== 'ready' || result.busy || !c.worker || !['json','markdown'].includes(format)) return;
    c.pending = {name:name + (format === 'json' ? '.json' : '.md')};
    setResult(previous => ({...previous,busy:true,exporting:true}));
    try {c.worker.postMessage({type:'export',request:++c.request,format}); arm();}
    catch {stop();setResult({phase:'error',report:null,message:'报告请求失败，请重新检查。'});}
  };
  useEffect(() => stop, [stop]);
  return {result,setResult,run,invalidate,queryPage,exportReport};
}
