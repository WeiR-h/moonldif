// One live download per workbench. Keep its URL until replaced or invalidated,
// so a browser that blocks the automatic click can use a real user gesture.
export function createDownloads(urls) {
  let current = null;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => current,
    clear() {
      if (!current) return;
      urls.revokeObjectURL(current.url); current = null; notify();
    },
    prepare(blob, name) {
      const url = urls.createObjectURL(blob);
      if (current) urls.revokeObjectURL(current.url);
      current = {blob,name,url}; notify();
      return current;
    },
  };
}
export const downloads = createDownloads(URL);
export function downloadBlob(blob, name) {
  const item = downloads.prepare(blob,name);
  const link = document.createElement('a');
  link.href = item.url; link.download = item.name;
  document.body.append(link);
  try { link.click(); } finally { link.remove(); }
}
