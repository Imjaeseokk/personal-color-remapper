import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'store', 'screenshots');
const profile = await mkdtemp(path.join(tmpdir(), 'pcr-store-shots-'));
const runtime = path.join(root, 'dist', 'chrome-unpacked');
const extension = path.join(profile, 'extension');
const fixtureFiles = new Set(['color-test.html', 'fixture.css', 'fixture.js']);
const server = createServer(async (request, response) => {
  const name = path.basename(new URL(request.url, 'http://127.0.0.1').pathname) || 'color-test.html';
  if (!fixtureFiles.has(name)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8');
  response.end(await readFile(path.join(root, 'test', name)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const fixtureUrl = `http://127.0.0.1:${server.address().port}/color-test.html`;
let context;
const shot = async (page, filename) => {
  await page.screenshot({ path: path.join(out, filename), type: 'png', omitBackground: false });
  console.log(filename);
};
try {
  await mkdir(out, { recursive: true });
  await cp(runtime, extension, { recursive: true });
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  await writeFile(manifestPath, JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(profile, {
    channel: process.env.PCR_CHROME_CHANNEL || (process.platform === 'win32' ? 'chrome' : 'chromium'),
    headless: true, viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging']
  });
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: extension });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(() => syncSites());
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, fixtureUrl);
  const state = await worker.evaluate(host => {
    const value = PCR.Model.defaults();
    value.globalProfile.enabled = true;
    value.globalProfile.rules = [{ ...PCR.Model.rule('#0000FF'), target: '#800080', threshold: 5 }];
    value.profiles[host] = { ...PCR.Model.profile('Color test palette'), rules: [
      { ...PCR.Model.rule('#FF0000'), target: '#2979FF', threshold: 15 },
      { ...PCR.Model.rule('#28A745'), target: '#7B2CBF', threshold: 12 }
    ] };
    return value;
  }, '127.0.0.1');
  await worker.evaluate(state => PCR.Storage.write(state), state);
  await page.reload();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#named')).color === 'rgb(41, 121, 255)');
  await page.evaluate(() => scrollTo(0, 0));
  await shot(page, '01-live-remapping-1280x800.png');

  await page.evaluate(() => scrollTo(0, document.querySelector('#box').offsetTop - 80));
  await shot(page, '02-css-svg-dynamic-1280x800.png');

  const pickerState = structuredClone(state);
  pickerState.globalProfile.enabled = false; pickerState.profiles['127.0.0.1'].rules = [];
  await worker.evaluate(value => PCR.Storage.write(value), pickerState);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#named')).color === 'rgb(255, 0, 0)');
  await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: PCR.C.MSG.PICK }), tabId);
  await page.waitForSelector('[data-pcr-ui]');
  await page.click('#named');
  const pageCdp = await context.newCDPSession(page);
  const { root: dom } = await pageCdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const findHost = node => node.attributes?.includes('data-pcr-ui') ? node : (node.children || []).map(findHost).find(Boolean);
  const host = findHost(dom);
  const query = async selector => {
    const { nodeId } = await pageCdp.send('DOM.querySelector', { nodeId: host.shadowRoots[0].nodeId, selector });
    return (await pageCdp.send('DOM.resolveNode', { nodeId })).object.objectId;
  };
  const fill = async (selector, value) => pageCdp.send('Runtime.callFunctionOn', {
    objectId: await query(selector), functionDeclaration: 'function(value){this.value=value;this.dispatchEvent(new Event("input",{bubbles:true}))}', arguments: [{ value }]
  });
  await fill('#hex', '#00B8D9');
  await pageCdp.send('Runtime.callFunctionOn', { objectId: await query('#preview'), functionDeclaration: 'function(){this.click()}' });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#named')).color === 'rgb(0, 184, 217)');
  await shot(page, '03-page-color-picker-1280x800.png');
  await page.keyboard.press('Escape');
  await worker.evaluate(value => PCR.Storage.write(value), state);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#named')).color === 'rgb(41, 121, 255)');

  await page.bringToFront();
  await worker.evaluate(async tabId => chrome.tabs.update(tabId, { active: true }), tabId);
  const popupPromise = context.waitForEvent('page');
  await worker.evaluate(() => chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html'), active: false }));
  const popup = await popupPromise;
  await popup.setViewportSize({ width: 1280, height: 800 });
  await popup.waitForSelector('#name:enabled');
  await popup.addStyleTag({ content: 'html{background:#dfe6ef}body{margin:70px auto!important;box-shadow:0 22px 60px #18283d55;border-radius:18px;overflow:hidden}' });
  await shot(popup, '04-popup-rule-editor-1280x800.png');

  const options = await context.newPage();
  await options.setViewportSize({ width: 1280, height: 800 });
  await options.goto(`chrome-extension://${id}/options/options.html`);
  await options.waitForFunction(() => document.querySelector('#profiles').options.length >= 2);
  await options.selectOption('#profiles', '127.0.0.1');
  await shot(options, '05-profile-management-1280x800.png');
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  assert.equal(path.dirname(profile), tmpdir());
  assert.ok(path.basename(profile).startsWith('pcr-store-shots-'));
  await rm(profile, { recursive: true, force: true });
}


