import { analyse_v2 } from '../../dist/core.mjs';

self.onmessage = async ({ data }) => {
  try {
    const bytes = new TextEncoder().encode(data.text);
    // The UI has a lower limit than the CLI to keep browser memory bounded.
    if (bytes.length > 1024 * 1024 || data.text.split('\n').length > 10000) throw new Error('浏览器工作台最多处理 1 MiB、10,000 行，请使用 CLI 处理更大的文件。');
    const chunks = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    const { compat, denyDelete, legacySpaces, denyClear, denyRename } = data.options;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
    const envelope = JSON.parse(analyse_v2(btoa(chunks.join('')), data.write ? 'workbench-write' : 'workbench', 'json', compat, denyDelete, legacySpaces, denyClear, denyRename, sha256));
    self.postMessage({ envelope, report: JSON.parse(envelope.output) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '分析失败，请重新检查。' });
  }
};
