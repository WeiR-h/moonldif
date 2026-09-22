import * as core from '../../dist/core.mjs';

export async function source(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 1024 * 1024 || text.split('\n').length > 10000) throw new Error('每份内容最多 1 MiB、10,000 行，请使用 CLI。');
  const parts = [];
  for (let i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return { encoded: btoa(parts.join('')), sha: Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('') };
}

// Only this worker's current analysis is retained. Its owner terminates it on invalidation.
export function workerHandler(command) {
  let session = null;
  return async ({data}) => {
    const request = data.request ?? 0;
    try {
      if (data.type === 'export') {
        if (!session) throw new Error('请重新检查后下载。');
        const cursor = core.paged_report_start(session, data.format);
        const chunks = [];
        let size = 0;
        for (;;) {
          const part = JSON.parse(core.paged_report_next(cursor));
          if (part.error) throw new Error('完整报告超过 32 MiB 或无法生成，未导出文件。');
          if (part.done) break;
          const bytes = new TextEncoder().encode(part.chunk);
          size += bytes.length;
          if (size > 32 * 1024 * 1024) throw new Error('完整报告超过 32 MiB，未导出文件。');
          chunks.push(bytes);
        }
        // Blob transfer avoids retaining an extra complete JSON string on the UI thread.
        self.postMessage({type:'export', request, blob:new Blob(chunks, {type:data.format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'}), format:data.format});
        return;
      }
      let written = null;
      if (data.type !== 'page') {
        const before = await source(command === 'compare' ? data.before : data.text);
        const after = command === 'compare' ? await source(data.after) : {encoded:'',sha:''};
        const f = data.options || data;
        const config = {compat:f.compat, legacy_dn_spaces:f.legacySpaces, deny_delete:f.denyDelete,
          deny_clear:f.denyClear, deny_rename:f.denyRename, ignored_attributes:data.ignoredAttributes || [],
          before_sha256:before.sha, after_sha256:after.sha};
        session = core.paged_start(command, before.encoded, after.encoded, JSON.stringify(config));
        if (data.write && command === 'review') {
          const result = JSON.parse(core.analyse_v2(before.encoded,'workbench-write','json',f.compat,f.denyDelete,f.legacySpaces,f.denyClear,f.denyRename,before.sha));
          if (result.exit_code !== core.paged_exit_code(session)) throw new Error('复检结果不一致，未导出文件。');
          written = result.written;
        }
      }
      if (!session) throw new Error('分析结果已失效，请重新检查。');
      const envelope = JSON.parse(core.paged_page(session, JSON.stringify(data.query || {}), 'json'));
      const page = JSON.parse(envelope.output);
      if (!page.summary) throw new Error('分页查询失败，请重新检查。');
      // Presentation adapter only: all matching, totals, ordering and risk decisions are MoonBit-owned.
      const report = command === 'compare'
        ? {...page.summary, changes:page.items, reported_changes:page.items.length, page:page.page}
        : {...page.summary, review:{...page.summary.review,items:page.items}, page:page.page};
      self.postMessage({type:data.type === 'page' ? 'page' : 'analysis', request, exit_code:envelope.exit_code, report, written});
    } catch (error) {
      session = null;
      self.postMessage({request, error:error instanceof Error ? error.message : '处理失败，请重新检查。'});
    }
  };
}
