import { useCallback, useEffect, useRef, useState } from 'react';
import { samples } from './samples.js';

const initialOptions = { denyDelete: true, denyClear: false, denyRename: false, compat: false, legacySpaces: false };
export function useWorkbench() {
  const [document, setDocument] = useState(samples[0]);
  const [options, setOptions] = useState(initialOptions);
  const [analysis, setAnalysis] = useState({ phase: 'stale', report: null, message: '' });
  const [selection, setSelection] = useState(null);
  const active = useRef({ serial: 0, fileSerial: 0, worker: null, timer: null });

  const stop = useCallback(() => {
    active.current.serial++;
    active.current.worker?.terminate();
    active.current.worker = null;
    clearTimeout(active.current.timer);
  }, []);
  const invalidate = useCallback(() => {
    stop(); active.current.fileSerial++;
    setSelection(null);
    setAnalysis({ phase: 'stale', report: null, message: '' });
  }, [stop]);

  const run = useCallback((doc, flags, write = false) => {
    stop();
    const id = active.current.serial;
    setAnalysis({ phase: 'running', report: null, message: write ? '正在重新检查并生成新文件…' : '正在检查文件…' });
    const fail = message => {
      if (id !== active.current.serial) return;
      stop(); setAnalysis({ phase: 'error', report: null, message });
    };
    let worker;
    try { worker = new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' }); }
    catch { fail('无法启动分析线程。请重新加载工作台或使用 CLI。'); return; }
    active.current.worker = worker;
    active.current.timer = setTimeout(() => fail('分析超过 20 秒，已停止。请减小文件或使用 CLI。'), 20000);
    worker.onerror = () => fail('分析线程发生错误，未生成文件。请重新检查或使用 CLI。');
    worker.onmessage = ({ data }) => {
      if (id !== active.current.serial) return;
      if (data.error) { fail(data.error); return; }
      stop();
      let message = '';
      if (write && data.exit_code === 0 && typeof data.written === 'string') {
        const url = URL.createObjectURL(new Blob([data.written], { type: 'application/ldif;charset=utf-8' }));
        const link = window.document.createElement('a');
        link.href = url;
        link.download = doc.filename.replace(/\.[^.]*$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') + '-normalized.ldif';
        window.document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        message = '已生成新文件，原文未修改。请在浏览器下载记录中查看。';
      }
      setAnalysis({ phase: 'ready', report: data.report, markdown: data.markdown, message });
      const deletion = data.report.diagnostics?.find(d => d.severity === 'policy');
      setSelection(deletion?.span || null);
    };
    worker.postMessage({ text: doc.text, options: flags, write });
  }, [stop]);

  useEffect(() => { run(samples[0], initialOptions); return stop; }, [run, stop]);
  const edit = text => { invalidate(); setDocument(doc => ({ ...doc, id: '', text })); };
  const setOption = (name, checked) => { invalidate(); setOptions(flags => ({ ...flags, [name]: checked })); };
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
  const canExport = analysis.phase === 'ready' && analysis.report?.exit_code === 0;
  const exportFile = () => { if (canExport) run(document, options, true); };
  const canExportReport = analysis.phase === 'ready' && Boolean(analysis.report?.source?.sha256) && typeof analysis.markdown === 'string';
  const exportReport = format => {
    if (!canExportReport || !['json', 'markdown'].includes(format)) return;
    const content = format === 'json' ? JSON.stringify(analysis.report, null, 2) + '\n' : analysis.markdown;
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url; link.download = 'moonldif-review.' + (format === 'json' ? 'json' : 'md');
    window.document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return { canExportReport, exportReport, document, options, analysis, selection, setSelection, edit, setOption, loadSample, loadFile, recheck, canExport, exportFile };
}
