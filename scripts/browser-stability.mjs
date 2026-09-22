import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export async function verifyStability(context, url, output, browser) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const Original = window.Worker;
    const probe = window.__workerProbe = { active: 0, maxActive: 0, queued: 0, delay: 0, last: null };
    window.Worker = class extends Original {
      constructor(...args) { super(...args); this.alive = true; probe.active++; probe.maxActive = Math.max(probe.active, probe.maxActive); }
      terminate() { if (this.alive) { probe.active--; this.alive = false; } super.terminate(); }
      set onmessage(handler) {
        super.onmessage = event => {
          const data = event.data;
          probe.queued++;
          probe.last = { keys: Object.keys(data).sort(), sha256: data.report?.source?.sha256, exit: data.exit_code };
          // Fault injection intentionally delivers queued callbacks after termination.
          setTimeout(() => handler(event), probe.delay);
        };
      }
    };
  });
  const ready = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('下载完整审阅报告') && !b.disabled));
  const records = [];
  try {
    await page.goto(url); await ready();
    for (let i = 0; i < 50; i++) {
      const text = `version: 1\n# synthetic cycle ${i}\ndn: cn=Demo\ncn: Demo\n`;
      const start = performance.now();
      await page.getByLabel('LDIF 源文件内容').fill(text);
      await page.evaluate(() => { window.__workerProbe.delay = 0; });
      await page.getByRole('button', { name: '重新检查', exact: true }).click();
      await ready();
      const complete = await page.evaluate(() => window.__workerProbe);
      assert.equal(complete.active, 1);
      assert.equal(complete.last.sha256, createHash('sha256').update(text).digest('hex'));
      assert.deepEqual(complete.last.keys, ['exit_code', 'report', 'request', 'type', 'written']);
      assert.equal(complete.last.exit, 0);
      const completedMs = performance.now() - start;
      const queuedBefore = await page.evaluate(() => { window.__workerProbe.delay = 200; return window.__workerProbe.queued; });
      await page.getByRole('button', { name: '重新检查', exact: true }).click();
      await page.waitForFunction(n => window.__workerProbe.queued > n, queuedBefore);
      await page.getByLabel('LDIF 源文件内容').fill(text + '# edited before delivery\n');
      await page.waitForTimeout(250);
      assert.equal(await page.getByRole('button', { name: '下载完整审阅报告', exact: true }).isEnabled(), false);
      assert.equal(await page.getByRole('button', { name: '导出新文件', exact: true }).isEnabled(), false);
      const state = await page.evaluate(() => ({ active: window.__workerProbe.active, maxActive: window.__workerProbe.maxActive,
        main_realm_heap_bytes: performance.memory?.usedJSHeapSize ?? null }));
      assert.equal(state.active, 0); assert.equal(state.maxActive, 1);
      records.push({ cycle: i + 1, completed_ms: completedMs, cycle_ms: performance.now() - start, ...state });
    }
    assert.deepEqual(errors, []);
    writeFileSync(resolve(output, browser + '-stability.json'), JSON.stringify({ status: 'passed', cycles: records.length,
      method: '50 real analyses plus 50 edit cancellations with delayed queued replies. Main-realm browser heap when available, excludes Worker memory and is not process RSS or a leak proof. No forced GC. Delays are fault injection, not throughput measurements.', records, errors }, null, 2) + '\n');
  } finally { await page.close(); }
}
