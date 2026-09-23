import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'site-assets', 'screenshots');
const profile = await mkdtemp(path.join(tmpdir(), 'pcr-site-shots-'));
const extension = path.join(profile, 'extension');
const runtime = path.join(root, 'dist', 'chrome-unpacked');

const server = createServer(async (_request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(await readFile(path.join(root, 'store', 'demo-page.html')));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const demoUrl = `http://127.0.0.1:${server.address().port}/`;

let context;
try {
  await mkdir(output, { recursive: true });
  await cp(runtime, extension, { recursive: true });
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  await writeFile(manifestPath, JSON.stringify(manifest));

  context = await chromium.launchPersistentContext(profile, {
    channel: process.env.PCR_CHROME_CHANNEL || (process.platform === 'win32' ? 'chrome' : 'chromium'),
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging']
  });
  const browserCdp = await context.browser().newBrowserCDPSession();
  const { id } = await browserCdp.send('Extensions.loadUnpacked', { path: extension });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(() => syncSites());

  const page = await context.newPage();
  await page.goto(demoUrl, { waitUntil: 'networkidle' });
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, demoUrl);
  const state = await worker.evaluate(host => {
    const value = PCR.Model.defaults();
    value.profiles[host] = { ...PCR.Model.profile('Monitor Desk'), rules: [
      { ...PCR.Model.rule('#D73A49'), name: 'Incident red', target: '#2979FF', threshold: 15 },
      { ...PCR.Model.rule('#28A745'), name: 'Healthy green', target: '#7B2CBF', threshold: 12 }
    ] };
    return value;
  }, '127.0.0.1');
  await worker.evaluate(value => PCR.Storage.write(value), state);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#named')).color === 'rgb(41, 121, 255)');
  await page.screenshot({ path: path.join(output, 'live-remapping.png'), type: 'png', omitBackground: false });

  const pickerState = structuredClone(state);
  pickerState.profiles['127.0.0.1'].rules = [];
  await worker.evaluate(value => PCR.Storage.write(value), pickerState);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#named')).color === 'rgb(215, 58, 73)');
  await worker.evaluate(async currentTabId => chrome.tabs.sendMessage(currentTabId, { type: PCR.C.MSG.PICK }), tabId);
  await page.waitForSelector('[data-pcr-ui]');
  await page.click('#named');
  await page.screenshot({ path: path.join(output, 'page-picker.png'), type: 'png', omitBackground: false });
  await page.keyboard.press('Escape');

  await worker.evaluate(value => PCR.Storage.write(value), state);
  await worker.evaluate(async currentTabId => chrome.tabs.update(currentTabId, { active: true }), tabId);
  const popupPromise = context.waitForEvent('page');
  await worker.evaluate(() => chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html'), active: false }));
  const popup = await popupPromise;
  await popup.setViewportSize({ width: 1280, height: 800 });
  await popup.waitForSelector('#name:enabled');
  await popup.addStyleTag({ content: 'html{background:#f4f6f8}body{margin:70px auto!important;box-shadow:0 22px 60px #18283d45;border-radius:14px;overflow:hidden}' });
  await popup.screenshot({ path: path.join(output, 'rule-editor.png'), type: 'png', omitBackground: false });

  const options = await context.newPage();
  await options.setViewportSize({ width: 1280, height: 800 });
  await options.goto(`chrome-extension://${id}/options/options.html`);
  await options.waitForFunction(() => document.querySelector('#profiles').options.length >= 2);
  await options.selectOption('#profiles', '127.0.0.1');
  await options.screenshot({ path: path.join(output, 'advanced-options.png'), type: 'png', omitBackground: false });
  console.log('Created 4 screenshots from the unpacked extension running in Chrome.');
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  assert.equal(path.dirname(profile), tmpdir());
  assert.ok(path.basename(profile).startsWith('pcr-site-shots-'));
  await rm(profile, { recursive: true, force: true });
}
