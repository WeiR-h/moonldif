import React, { useEffect, useMemo, useRef } from 'react';
import { samples } from './samples.js';

export function Editor({ document, edit, loadSample, loadFile, selection }) {
  const input = useRef(null);
  const gutter = useRef(null);
  const highlight = useRef(null);
  const lines = useMemo(() => document.text.split('\n'), [document.text]);
  const numbers = useMemo(() => Array.from({ length: Math.min(lines.length, 10000) }, (_, i) => i + 1).join('\n'), [lines.length]);
  const syncScroll = () => {
    if (!input.current) return;
    gutter.current.scrollTop = input.current.scrollTop;
    if (highlight.current) highlight.current.style.transform = `translateY(${-input.current.scrollTop}px)`;
  };
  useEffect(() => {
    if (!selection || !input.current) return;
    // Textareas normalise CRLF for display. Selection offsets must use DOM text,
    // while the original document bytes remain untouched for analysis/hash.
    const displayLines = input.current.value.split('\n');
    const start = displayLines.slice(0, selection.line - 1).join('\n').length + (selection.line > 1 ? 1 : 0);
    const end = displayLines.slice(0, selection.end_line).join('\n').length;
    if (selection.focus) {
      input.current.focus({ preventScroll: true });
      input.current.setSelectionRange(start, end);
      input.current.scrollTop = Math.max(0, (selection.line - 3) * 26);
    }
    syncScroll();
  }, [selection, lines]);
  return <section className="editor-panel panel" aria-labelledby="editor-title" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }}>
    <div className="editor-toolbar">
      <h2 id="editor-title">源文件</h2>
      <select aria-label="选择演示场景" value={document.id} onChange={e => loadSample(e.target.value)}>
        <option value="" disabled>正在编辑本地内容</option>
        {samples.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <span className="filename" title={document.filename}>{document.filename}</span>
    </div>
    <div className="editor-body">
      <pre ref={gutter} className="gutter" aria-hidden="true">{numbers}</pre>
      <div className="code-area">
        {selection && <div className="line-highlight" ref={highlight} style={{ top: 14 + (selection.line - 1) * 26, height: (selection.end_line - selection.line + 1) * 26 }} />}
        <textarea ref={input} aria-label="LDIF 源文件内容" value={document.text} onChange={e => edit(e.target.value)} onScroll={syncScroll} spellCheck="false" autoCapitalize="off" autoCorrect="off" wrap="off" />
      </div>
    </div>
    <div className="panel-footer">UTF-8 · 编辑后需重新检查<span title="更大文件请使用 CLI">本地工作台上限 1 MiB / 10,000 行</span></div>
  </section>;
}
