// Reproducible browser QA. Browser skill/plugin is not listed in this session;
// regular Playwright covers the explicitly requested Chromium/Firefox matrix.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { verifySnapshot, snapshotReady } from './snapshot-browser.mjs';
import { verifyPagination } from './pagination-browser.mjs';
import { verifyStability } from './browser-stability.mjs';
import { verifyProfiles } from './profile-browser.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(resolve(root, '.tools/browsers'))) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(root, '.tools/browsers');
const require = createRequire(new URL('../web/package.json', import.meta.url));
const { chromium, firefox } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4188/moonldif/';
const output = resolve(root, 'verification/local', url.startsWith('https:') ? 'browser-public' : 'browser-local');
mkdirSync(output, { recursive: true });
const evidence = { url, status: 'running', browser_path: 'Browser plugin not available; regular Playwright', cases: [] };
const expectedVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
evidence.expected_version = expectedVersion;
const sha = text => createHash('sha256').update(text).digest('hex');
const inspect = file => {
  const r = spawnSync(process.execPath, [resolve(root, 'dist/moonldif.js'), 'inspect', file, '--format', 'json'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return JSON.parse(r.stdout).document;
};
const source = 'version: 1\r\ndn: cn=[demo]&user\r\nchangetype: modify\r\nreplace: description\r\ndescription: synthetic-private-attribute\r\n-\r\nreplace: mail\r\n-\r\n';

async function ready(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('下载完整审阅报告') && !b.disabled), null, { timeout: 15000 });
}
async function disabled(page) {
  assert.equal(await page.getByRole('button', { name: '下载完整审阅报告', exact: true }).isEnabled(), false);
  assert.equal(await page.getByRole('button', { name: '导出新文件', exact: true }).isEnabled(), false);
}
async function downloadReport(page, format, file) {
  await page.getByLabel('审阅报告格式').selectOption(format);
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载完整审阅报告', exact: true }).click();
  const download = await wait;
  await download.saveAs(file);
  const text = readFileSync(file,'utf8');
  if(format !== 'json') return text;
  const all = JSON.parse(text);
  assert.equal(all.report_schema_version,2);assert.equal(all.page.selection,'all');
  assert.equal(all.items.length,all.page.total_items);assert.equal(all.page.has_more,false);
  return JSON.stringify({...all.summary,review:{...all.summary.review,items:all.items}});
}
const watchdog = setTimeout(() => { evidence.status = 'failed'; evidence.error = 'Browser QA exceeded 300 seconds'; writeFileSync(resolve(output, 'result.json'), JSON.stringify(evidence, null, 2)); process.exit(1); }, 300000);
try {
  for (const [name, engine] of [['chromium', chromium], ['firefox', firefox]]) {
    console.log('Browser start: ' + name);
    const browser = await engine.launch({ headless: true, timeout: 30000 });
    console.log('Browser launched: ' + name);
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
      const page = await context.newPage();
      const errors = [], warnings = [], requests = [], badResponses = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (!['error', 'warning'].includes(m.type())) return; const text=m.text(); if(name === 'firefox' && m.type() === 'warning' && text.includes('scroll-linked positioning effect')) warnings.push({text, explanation:'Line numbers and source highlight intentionally follow textarea scrolling; selection and visual alignment are verified.'}); else errors.push(text); });
      page.on('request', r => requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }));
      page.on('response', r => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status() }); });
      console.log('Navigate: ' + name);
      await page.goto(url, { timeout: 30000 });
      console.log('Loaded: ' + name);
      await ready(page);
      assert.match(await page.title(), /MoonLDIF/);
      assert.ok((await page.locator('footer').innerText()).includes('MoonLDIF ' + expectedVersion));
      assert.equal(await page.getByRole('heading', { name: '检查文件，再执行变更' }).count(), 1);
      assert.equal(await page.locator('vite-error-overlay').count(), 0);
      assert.equal(await page.getByRole('button', { name: '导出新文件', exact: true }).isEnabled(), false);
      await page.getByLabel('打开本地 LDIF 文件').setInputFiles({ name: '中文 空格.ldif', mimeType: 'text/plain', buffer: Buffer.from(source) });
      await ready(page);
      let report = JSON.parse(await downloadReport(page, 'json', resolve(output, name + '-initial.json')));
      assert.equal(report.source.sha256, sha(source));
      assert.equal(report.source.byte_length, Buffer.byteLength(source));
      assert.equal(report.exit_code, 0);
      await page.getByLabel('拦截属性清空', { exact: true }).check();
      await disabled(page);
      await page.getByRole('button', { name: '重新检查', exact: true }).click();
      await ready(page);
      report = JSON.parse(await downloadReport(page, 'json', resolve(output, name + '-blocked.json')));
      assert.equal(report.exit_code, 1);
      assert.equal(report.options.deny_clear, true);
      assert.equal(report.source.sha256, sha(source));
      assert.ok(report.diagnostics.some(d => d.code === 'clear-denied' && d.span.line === 7));
      assert.ok(!JSON.stringify(report).includes('synthetic-private-attribute'));
      const md = await downloadReport(page, 'markdown', resolve(output, name + '-blocked.md'));
      assert.ok(md.includes('&#91;demo&#93;&#38;user'));
      assert.ok(!md.includes('synthetic-private-attribute'));
      await page.getByRole('button', { name: '定位清空属性值', exact: false }).click();
      const selected = await page.getByLabel('LDIF 源文件内容').evaluate(e => e.value.slice(e.selectionStart, e.selectionEnd));
      assert.match(selected, /replace: mail/);
      await page.screenshot({ path: resolve(output, name + '-desktop.png'), fullPage: true });
      await page.getByLabel('选择演示场景').selectOption('incomplete');
      await ready(page);
      report = JSON.parse(await downloadReport(page, 'json', resolve(output, name + '-incomplete.json')));
      assert.equal(report.exit_code, 2);
      assert.equal(await page.getByRole('button', { name: '导出新文件', exact: true }).isEnabled(), false);
      await page.getByLabel('选择演示场景').selectOption('migration');
      await ready(page);
      await page.getByLabel('拦截改名与移动', { exact: true }).check();
      await disabled(page);
      await page.getByRole('button', { name: '重新检查', exact: true }).click();
      await ready(page);
      report = JSON.parse(await downloadReport(page, 'json', resolve(output, name + '-rename.json')));
      assert.equal(report.exit_code, 1);
      assert.ok(report.diagnostics.some(d => d.code === 'rename-denied'));
      const valid = 'version: 1\ndn: cn=Demo\ncn: Demo\nphoto:: /wBB\n';
      await page.getByLabel('LDIF 源文件内容').fill(valid);
      await disabled(page);
      await page.getByRole('button', { name: '重新检查', exact: true }).click();
      await ready(page);
      const waitDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: '导出新文件', exact: true }).click();
      const downloaded = await waitDownload;
      const normalized = resolve(output, name + '-normalized.ldif');
      await downloaded.saveAs(normalized);
      const original = resolve(output, name + '-original.ldif');
      writeFileSync(original, valid);
      assert.deepEqual(inspect(original), inspect(normalized));
      await ready(page);
      await page.getByLabel('打开本地 LDIF 文件').setInputFiles({ name: 'large.ldif', mimeType: 'text/plain', buffer: Buffer.alloc(1024 * 1024 + 1, 65) });
      await page.getByText('所选文件超过 1 MiB', { exact: false }).waitFor();
      await disabled(page);
      await page.getByLabel('打开本地 LDIF 文件').setInputFiles({ name: 'bad-encoding.ldif', mimeType: 'text/plain', buffer: Buffer.from([255, 254, 0]) });
      await page.getByText('所选文件不是有效 UTF-8', { exact: false }).waitFor();
      await disabled(page);
      await page.getByLabel('选择演示场景').selectOption('clear');
      await ready(page);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: resolve(output, name + '-mobile.png'), fullPage: true });
      await verifyPagination(page, output, name);
      await verifySnapshot(page, output, name);
      await verifyProfiles(page, output, name);
      assert.deepEqual(errors, []);
      assert.deepEqual(badResponses, []);
      assert.ok(requests.every(r => r.method === 'GET' && r.url.startsWith(new URL(url).origin)));
      evidence.cases.push({ browser: name, browser_version: browser.version(), status: 'passed', checks: ['identity', 'nonblank', 'no-overlay', 'no-console-errors', 'CRLF-source-hash', 'clear-policy', 'rename-policy', 'stale-invalidation', 'partial-report', 'markdown-escaping', 'private-attribute-omission', 'source-navigation', 'download-cli-roundtrip', 'oversize', 'bad-encoding', 'mobile-no-overflow', 'snapshot-0-1-2', 'snapshot-source-hashes', 'snapshot-locations', 'snapshot-report-privacy', 'snapshot-stale-inputs', 'snapshot-resource-limits'], requests, errors, warnings, badResponses });
      {
        const racePage = await context.newPage();
        await racePage.addInitScript(() => {
          const OriginalWorker = window.Worker;
          window.Worker = class extends OriginalWorker {
            addEventListener(...args) { return super.addEventListener(...args); }
            set onmessage(handler) { super.onmessage = event => setTimeout(() => handler(event), 300); }
          };
        });
        await racePage.goto(url); await ready(racePage);
        await racePage.getByLabel('LDIF 源文件内容').fill(valid);
        await racePage.getByRole('button', { name: '重新检查', exact: true }).click();
        await racePage.getByLabel('LDIF 源文件内容').fill('version: 1\n# changed before worker response\n');
        await racePage.waitForTimeout(650);
        await disabled(racePage);
        await racePage.getByRole('button', { name: '迁移前后核对', exact: true }).click();
        await racePage.getByRole('button', { name: '开始核对', exact: true }).click();
        await snapshotReady(racePage);
        await racePage.getByRole('button', { name: '开始核对', exact: true }).click();
        await racePage.getByLabel('迁移后快照内容').fill('version: 1\n# changed before response\n');
        await racePage.waitForTimeout(650);
        assert.equal(await racePage.getByRole('button', { name: '下载完整核对报告', exact: true }).isEnabled(), false);
        await racePage.getByRole('button', { name: '开始核对', exact: true }).click();
        await racePage.getByRole('button', { name: '停止核对', exact: true }).click();
        await racePage.waitForTimeout(650);
        await racePage.getByText('已停止，本次结果不可下载。', { exact: true }).waitFor();
        assert.equal(await racePage.getByRole('button', { name: '下载完整核对报告', exact: true }).isEnabled(), false);
        await racePage.close();
        const timed = await context.newPage();
        await timed.addInitScript(() => { window.Worker = class { postMessage() {} terminate() {} }; });
        await timed.goto(url);
        await timed.getByText('处理超过 20 秒', { exact: false }).waitFor({ timeout: 25000 });
        await disabled(timed);
        await timed.getByRole('button', { name: '迁移前后核对', exact: true }).click();
        await timed.getByRole('button', { name: '开始核对', exact: true }).click();
        await timed.getByText('处理超过 20 秒', { exact: false }).waitFor({ timeout: 25000 });
        assert.equal(await timed.getByRole('button', { name: '下载完整核对报告', exact: true }).isEnabled(), false);
        await timed.close();
        evidence.cases.push({ browser: name, browser_version: browser.version(), status: 'passed', checks: ['delayed-old-response', 'worker-timeout-no-stale-export', 'snapshot-delayed-response', 'snapshot-timeout'], fault_injection: true });
      }
      await context.close();
      const stabilityContext = await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});
      await verifyStability(stabilityContext, url, output, name);
      await stabilityContext.close();
      evidence.cases.push({ browser: name, status: 'passed', checks: ['50-analyses', '50-cancellations', 'no-duplicate-report-payload', 'one-live-worker', 'no-stale-exports'], memory: 'main-realm heap observation only; excludes workers and process RSS' });
      console.log('Checks passed: ' + name);
    } finally { await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))]); }
  }
  evidence.status = 'passed';
} catch (error) {
  evidence.status = 'failed'; evidence.error = error.stack; process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ status: evidence.status, cases: evidence.cases.length, error: evidence.error }));
}
