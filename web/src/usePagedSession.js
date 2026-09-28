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
  const current = useRef({generation:0, request:0, worker:null, timer:null, bootTimer:null, pending:null, started:false});
  const stop = useCallback(() => {
    const c = current.current;
    c.generation++; c.request++;
    dispose(c.worker); c.worker = null; c.pending = null; c.started = false;
    clearTimeout(c.timer);
    clearTimeout(c.bootTimer);
    downloads.clear();
    if (releaseOwner === c.release) releaseOwner = null;
  }, []);
  const invalidate = useCallback(() => {stop(); setResult({phase:'stale',report:null});}, [stop]);
  const arm = useCallback(() => {
    const c = current.current;
    clearTimeout(c.timer);
    c.timer = setTimeout(() => {
      const message=c.started?'处理超过 20 秒，已停止。请减小文件或使用 CLI。':'分析程序未能启动，已停止。请重新检查；若仍失败，请刷新页面或使用 CLI。';
      stop(); setResult({phase:'error',report:null,message});
    }, 20000);
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
    setResult({phase:'running',report:null,message:'正在启动分析程序…'});
    try {
      const reproduction = captureReproduction(kind,payload);
      let retries = 0, accepted = false;
      const start = () => {
        if (generation !== c.generation) return;
        clearTimeout(c.bootTimer);
        dispose(c.worker); c.worker = null;
        // Both modes use the same cached bundle; changing modes needs no second download.
        const worker = new Worker(new URL('./analysis.worker.js', import.meta.url), {type:'module'});
        c.worker = worker;
        let posted = false;
        const live = () => generation === c.generation && c.worker === worker;
        const retry = message => {
          if (!live()) return;
          if (!accepted && retries++ === 0) {
            setResult({phase:'running',report:null,message:'分析线程启动失败，正在重试一次…'});
            try {start();} catch {fail('无法启动分析线程。请重新检查；若仍失败，请刷新页面或使用 CLI。');}
          } else fail(message);
        };
        // Retry once after 4 seconds; the second attempt may use the remaining total budget.
        if(retries===0)c.bootTimer = setTimeout(() => retry('分析程序未能启动，已停止。请重新检查；若仍失败，请刷新页面或使用 CLI。'),4000);
        worker.onerror = event => {
          if (!live()) return;
          event.preventDefault();
          retry('分析线程发生错误。旧结果已失效，请重新检查；若仍失败，请刷新页面或使用 CLI。');
        };
        worker.onmessageerror = () => {if(live())fail('分析线程通信失败。旧结果已失效，请重新检查。');};
        worker.onmessage = ({data}) => {
          if (!live()) return;
          if (data.type === 'ready') {
            if (posted) return;
            posted = true;
            try {worker.postMessage({...payload,command:kind,request:++c.request});}
            catch {fail('无法发送分析内容。旧结果已失效，请重新检查。');}
            return;
          }
          if (data.request !== c.request) return;
          accepted = true;
          clearTimeout(c.bootTimer);
          if (data.type === 'started') {
            c.started = true;
            setResult({phase:'running',report:null,message:'正在分析当前内容…'});
            return;
          }
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
