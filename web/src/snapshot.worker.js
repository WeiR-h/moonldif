import { compare_exports_v2 } from '../../dist/core.mjs';

async function source(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 1024 * 1024 || text.split('\n').length > 10000) throw new Error('每份快照最多 1 MiB、10,000 行，请使用 CLI 处理更大的文件。');
  const parts = [];
  for (let i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return { encoded: btoa(parts.join('')), sha: Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('') };
}
self.onmessage = async ({ data }) => {
  try {
    const [before, after] = await Promise.all([source(data.before), source(data.after)]);
    const envelope = JSON.parse(compare_exports_v2(before.encoded, after.encoded, before.sha, after.sha, data.compat, data.legacySpaces, 'json', JSON.stringify(data.ignoredAttributes || [])));
    self.postMessage({ report: JSON.parse(envelope.output), markdown: envelope.markdown });
  } catch {
    self.postMessage({ error: '核对失败：请确认每份内容不超过 1 MiB、10,000 行，或改用 CLI。' });
  }
};
