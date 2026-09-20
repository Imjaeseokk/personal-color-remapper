import { chromium } from 'playwright';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(tmpdir(), 'pcr-sites-'));
const extension = path.join(temp, 'extension');
const sites = [
  { host: 'github.com', url: 'https://github.com/microsoft/vscode' },
  { host: 'play.grafana.org', url: 'https://play.grafana.org/' }
];
const report = { startedAt: new Date().toISOString(), sites: [] };
let context;
try {
  await cp(path.join(root, 'dist/chrome-unpacked'), extension, { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json')));
  manifest.host_permissions = sites.map(s => 'https://' + s.host + '/*');
  await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    channel: process.env.PCR_CHROME_CHANNEL || (process.platform === 'win32' ? 'chrome' : 'chromium'),
    headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging']
  });
  report.browser = context.browser().version();
  const cdp = await context.browser().newBrowserCDPSession();
  await cdp.send('Extensions.loadUnpacked', { path: extension });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(() => syncSites());
  for (const site of sites) {
    const result = { ...site, status: 'running' }; report.sites.push(result);
    const page = await context.newPage();
    try {
      const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      result.httpStatus = response?.status(); result.title = await page.title();
      if (!response?.ok()) throw new Error('HTTP ' + result.httpStatus);
      await page.waitForFunction(() => document.body.innerText.length > 500, { }, { timeout: 20000 });
      const tabId = await worker.evaluate(async host => (await chrome.tabs.query({})).find(t => t.url?.startsWith('https://' + host + '/')).id, site.host);
      const stats = () => worker.evaluate(async id => (await chrome.tabs.sendMessage(id, { type: PCR.C.MSG.GET })).stats, tabId);
      await stats();
      const sample = await page.evaluate(() => {
        const properties = ['color', 'background-color', 'border-top-color', 'fill', 'stroke'];
        for (const el of document.querySelectorAll('main *, [role=main] *, button, a')) {
          if (!el.getBoundingClientRect().width) continue;
          for (const property of properties) {
            const value = getComputedStyle(el).getPropertyValue(property);
            const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(value);
            if (!m || Math.max(...m.slice(1).map(Number)) - Math.min(...m.slice(1).map(Number)) < 40) continue;
            el.setAttribute('data-pcr-test-sample', '');
            return { property, original: value, hex: '#' + m.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('') };
          }
        }
        throw Error('No colored CSS element found on this page');
      });
      result.sample = sample;
      const before = await stats();
      const start = Date.now();
      await worker.evaluate(async ({ host, source }) => {
        const state = PCR.Model.defaults();
        state.profiles[host] = { ...PCR.Model.profile(host), rules: [{ ...PCR.Model.rule(source), threshold: 0, target: '#A020F0' }] };
        await PCR.Storage.write(state);
      }, { host: site.host, source: sample.hex });
      await page.waitForFunction(property => getComputedStyle(document.querySelector('[data-pcr-test-sample]')).getPropertyValue(property) === 'rgb(160, 32, 240)', sample.property);
      result.applyWallMs = Date.now() - start;
      // Let the full initial queue settle before recording steady-state statistics.
      const settleDeadline = Date.now() + 5000;
      let applied = await stats();
      while (applied.pending && Date.now() < settleDeadline) {
        await new Promise(resolve => setTimeout(resolve, 100)); applied = await stats();
      }
      result.finalUrl = page.url(); result.appliedStats = applied;
      result.queueSettled = applied.pending === 0;
      assert.ok(applied.matched > 0);
      // Read-only public-page smoke test: browser-local scrolling; no forms or account actions.
      await page.evaluate(() => scrollBy(0, 600));
      await page.screenshot({ path: path.join(root, 'test-results', site.host + '-remapped.png') });
      await worker.evaluate(async () => { const s = await PCR.Storage.read(); s.settings.enabled = false; await PCR.Storage.write(s); });
      await page.waitForFunction(({ property, original }) => getComputedStyle(document.querySelector('[data-pcr-test-sample]')).getPropertyValue(property) === original, sample);
      const off = await stats();
      assert.equal(off.retainedElements, 0); assert.equal(off.cssRuleSlots, 0);
      result.scanned = applied.scanned - before.scanned;
      result.status = 'passed';
      console.log('PASS public site ' + site.host + ' apply/restore, ' + result.scanned + ' elements');
    } catch (error) {
      result.status = 'failed'; result.error = error.message;
      console.log('FAIL public site ' + site.host + ': ' + error.message);
    } finally { await page.close(); }
  }
} finally {
  await mkdir(path.join(root, 'test-results'), { recursive: true });
  await writeFile(path.join(root, 'test-results/sites.json'), JSON.stringify(report, null, 2));
  await context?.close();
  assert.equal(path.dirname(temp), tmpdir()); assert.ok(path.basename(temp).startsWith('pcr-sites-'));
  await rm(temp, { recursive: true, force: true });
}
if (report.sites.some(s => s.status !== 'passed')) process.exitCode = 1;
