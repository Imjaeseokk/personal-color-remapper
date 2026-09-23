import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdtemp, cp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(tmpdir(), 'pcr-browser-'));
const extension = path.join(temp, 'extension');
const errors = [];
let context;
const server = createServer(async (req, res) => {
  try {
    const name = path.basename(new URL(req.url, 'http://localhost').pathname) || 'color-test.html';
    if (!['color-test.html', 'fixture.css', 'fixture.js'].includes(name)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(await readFile(path.join(root, 'test', name)));
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/color-test.html`;
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
try {
  // A disposable copy grants only the local fixture host. Production manifest remains optional-only.
  await cp(process.env.PCR_EXTENSION_DIR ? path.resolve(process.env.PCR_EXTENSION_DIR) : root, extension, { recursive: true, filter: source => !['node_modules', '.git', 'test-results', 'dist', 'store', 'scripts'].includes(path.basename(source)) && !source.endsWith('.zip') });
  const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json')));
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined);
  manifest.host_permissions = ['http://127.0.0.1/*', 'https://127.0.0.1/*'];
  await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), { channel: process.env.PCR_CHROME_CHANNEL || (process.platform === 'win32' ? 'chrome' : 'chromium'), headless: true,
    ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging'] });
  const cdp = await context.browser().newBrowserCDPSession();
  await cdp.send('Extensions.loadUnpacked', { path: extension });
  context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const options = await context.newPage(); await options.goto(`chrome-extension://${id}/options/options.html`);
  await options.waitForFunction(() => document.querySelector('#profiles').options.length > 0);
  await worker.evaluate(() => syncSites());
  const page = await context.newPage(); await page.goto(url);
  const evaluate = fn => worker.evaluate(fn);
  const setState = async state => { await worker.evaluate(state => PCR.Storage.write(state), state); };
  let baseline = await page.locator('#named').evaluate(el => el.getAttribute('style'));
  let state = await evaluate(() => { const s = PCR.Model.defaults(); s.profiles['127.0.0.1'] = { ...PCR.Model.profile('Fixture'), rules: [{ ...PCR.Model.rule('#FF0000'), target: '#0000FF', threshold: 0 }, { ...PCR.Model.rule('#0000FF'), target: '#800080', threshold: 0 }] }; return s; });
  const color = (selector, property = 'color') => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  const waitColor = (selector, value, property = 'color') => page.waitForFunction(({ selector, value, property }) => getComputedStyle(document.querySelector(selector)).getPropertyValue(property) === value, { selector, value, property });
  await check('registered content script + real storage change applies original-based rules', async () => {
    await setState(state); await waitColor('#named', 'rgb(0, 0, 255)');
    assert.equal(await color('#original-blue'), 'rgb(128, 0, 128)');
    assert.equal(await color('#inherited'), 'rgb(0, 0, 255)');
    assert.equal(await page.locator('#named').getAttribute('style'), baseline);
  });
  await check('alpha, background, borders, decoration, SVG and inline-important boundary', async () => {
    assert.equal(await color('#alpha'), 'rgba(0, 0, 255, 0.5)');
    assert.equal(await color('#modern'), 'rgba(0, 0, 255, 0.5)');
    for (const property of ['background-color', 'border-top-color', 'outline-color', 'text-decoration-color']) assert.equal(await color('#box', property), 'rgb(0, 0, 255)');
    assert.equal(await color('#svg', 'fill'), 'rgb(0, 0, 255)');
    assert.equal(await color('#important'), 'rgb(255, 0, 0)');
  });
  await check('dynamic descendants, author changes and detached-element cleanup', async () => {
    await page.click('#add'); await waitColor('#dynamic span:nth-child(2)', 'rgb(0, 0, 255)');
    await page.click('#theme'); await waitColor('#named', 'rgb(0, 128, 0)');
    await page.click('#remove');
    await page.waitForFunction(() => document.querySelectorAll('#dynamic span').length === 0);
    await page.click('#theme'); await waitColor('#named', 'rgb(0, 0, 255)');
    baseline = await page.locator('#named').getAttribute('style');
  });
  await check('threshold and target updates re-evaluate existing elements', async () => {
    state.profiles['127.0.0.1'].rules[0].threshold = 10;
    state.profiles['127.0.0.1'].rules[0].target = '#2979FF';
    await setState(state); await waitColor('.swatch:nth-child(2)', 'rgb(41, 121, 255)', 'background-color');
    assert.equal(await color('#oklch'), 'rgb(41, 121, 255)');
  });
  await check('large insertions batch correctly; a small insertion does not rescan the document', async () => {
    await page.evaluate(() => {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 2000; i++) { const span = document.createElement('span'); span.style.color = 'red'; span.textContent = 'batch'; fragment.append(span); }
      document.getElementById('dynamic').append(fragment);
    });
    await waitColor('#dynamic span:last-child', 'rgb(41, 121, 255)');
    const stats = () => worker.evaluate(async () => { const tab = (await chrome.tabs.query({})).find(t => t.url?.includes('color-test.html')); return (await chrome.tabs.sendMessage(tab.id, { type: PCR.C.MSG.GET })).stats; });
    const before = await stats();
    await page.evaluate(() => { const span = document.createElement('span'); span.style.color = 'red'; span.id = 'one-more'; document.getElementById('dynamic').append(span); });
    await waitColor('#one-more', 'rgb(41, 121, 255)');
    const after = await stats(); assert.ok(after.scanned - before.scanned < 10, `Scanned ${after.scanned - before.scanned} for one element`);
    await page.evaluate(() => document.getElementById('dynamic').replaceChildren());
  });

  await check('generated before/after colors are independent and reversible', async () => {
    await page.evaluate(() => {
      const style = document.createElement('style'); style.id = 'pcr-pseudo-test';
      style.textContent = '.pseudo::before{content:"before";color:blue;background:red}';
      document.head.append(style);
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pseudo'), '::after').color === 'rgb(41, 121, 255)' &&
      getComputedStyle(document.querySelector('.pseudo'), '::before').color === 'rgb(128, 0, 128)' &&
      getComputedStyle(document.querySelector('.pseudo'), '::before').backgroundColor === 'rgb(41, 121, 255)');
    await page.evaluate(() => document.getElementById('pcr-pseudo-test').remove());
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pseudo'), '::before').content === 'none');
    assert.equal(await page.locator('.pseudo').evaluate(el => getComputedStyle(el).color), 'rgb(23, 35, 50)');
  });
  await check('stylesheet removal and text-driven :empty changes are re-evaluated', async () => {
    await page.evaluate(() => {
      const style = document.createElement('style'); style.id = 'pcr-style-test';
      style.textContent = '#named{color:green!important} #empty-test:empty{color:red} #empty-test{color:green}';
      document.head.append(style);
      const span = document.createElement('span'); span.id = 'empty-test'; document.body.append(span);
    });
    await waitColor('#named', 'rgb(0, 128, 0)'); await waitColor('#empty-test', 'rgb(41, 121, 255)');
    await page.evaluate(() => document.getElementById('empty-test').append(document.createTextNode('not empty')));
    await waitColor('#empty-test', 'rgb(0, 128, 0)');
    await page.evaluate(() => { document.getElementById('pcr-style-test').remove(); document.getElementById('empty-test').remove(); });
    await waitColor('#named', 'rgb(41, 121, 255)');
  });
  await check('60-second repeated SPA updates drain references and reuse CSS slots', async () => {
    const stats = () => worker.evaluate(async () => {
      const tab = (await chrome.tabs.query({})).find(t => t.url?.includes('color-test.html'));
      return (await chrome.tabs.sendMessage(tab.id, { type: PCR.C.MSG.GET })).stats;
    });
    const waitIdle = async () => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) { const s = await stats(); if (!s.pending) return s; await new Promise(resolve => setTimeout(resolve, 25)); }
      throw Error('Scanner did not become idle');
    };
    const baseline = await waitIdle(); const start = Date.now(); let round = 0, peakSlots = baseline.cssRuleSlots;
    const duration = Number(process.env.PCR_SOAK_MS || 60000);
    assert.ok(Number.isFinite(duration) && duration >= 1000);
    while (Date.now() - start < duration) {
      await page.evaluate(round => {
        const area = document.getElementById('dynamic'); area.replaceChildren();
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 80; i++) { const span = document.createElement('span'); span.style.color = 'red'; span.textContent = String(i); fragment.append(span); }
        area.append(fragment); history.replaceState({}, '', '?soak=' + round);
      }, round);
      await waitColor('#dynamic span:last-child', 'rgb(41, 121, 255)');
      const busy = await waitIdle(); peakSlots = Math.max(peakSlots, busy.cssRuleSlots);
      await page.evaluate(() => document.getElementById('dynamic').replaceChildren());
      // Drain the removal microtask through a message round trip.
      const cleaned = await waitIdle();
      assert.equal(cleaned.retainedElements, baseline.retainedElements);
      assert.ok(cleaned.cssRuleSlots <= baseline.cssRuleSlots + 240, 'Unbounded stylesheet growth');
      round++;
    }
    const final = await stats();
    const report = { durationMs: Date.now() - start, rounds: round, peakSlots, baseline, final };
    await mkdir(path.join(root, 'test-results'), { recursive: true });
    await writeFile(path.join(root, 'test-results/soak.json'), JSON.stringify(report, null, 2));
    console.log('SOAK ' + round + ' cycles / ' + report.durationMs + ' ms; baseline/final retained ' + baseline.retainedElements + '/' + final.retainedElements);
  });

  await check('preview port disconnect restores saved rules', async () => {
    const tabId = await worker.evaluate(async () => (await chrome.tabs.query({})).find(t => t.url?.includes('/color-test.html')).id);
    await options.evaluate(({ tabId }) => {
      globalThis.testPort = chrome.tabs.connect(tabId, { name: PCR.C.PORT });
      testPort.postMessage({ type: PCR.C.MSG.PREVIEW, profile: { ...PCR.Model.profile('Preview'), rules: [{ ...PCR.Model.rule('#FF0000'), target: '#FFFF00', threshold: 10 }] } });
    }, { tabId });
    await waitColor('#named', 'rgb(255, 255, 0)');
    await options.evaluate(() => testPort.disconnect()); await waitColor('#named', 'rgb(41, 121, 255)');
  });
  await check('site OFF blocks global, master OFF restores attributes and current author styles', async () => {
    state.globalProfile.enabled = true; state.globalProfile.rules = [state.profiles['127.0.0.1'].rules[0]];
    state.profiles['127.0.0.1'].enabled = false; await setState(state); await waitColor('#named', 'rgb(255, 0, 0)');
    state.profiles['127.0.0.1'].enabled = true; state.settings.enabled = false; await setState(state);
    await waitColor('#named', 'rgb(255, 0, 0)');
    assert.equal(await page.locator('#named').getAttribute('style'), baseline);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('*')].some(el => [...el.attributes].some(a => a.name.startsWith('data-pcr-')))), false);
    state.settings.enabled = true; await setState(state); await waitColor('#named', 'rgb(41, 121, 255)');
  });
  await check('saved profile survives reload and SPA navigation', async () => {
    await page.reload(); await waitColor('#named', 'rgb(41, 121, 255)'); await page.click('#spa'); assert.equal(await color('#named'), 'rgb(41, 121, 255)');
  });
  await check('Options editor validation, profile save, and JSON export', async () => {
    await options.reload(); await options.selectOption('#profiles', '127.0.0.1');
    await options.getByRole('textbox', { name: 'Rule 1 Source HEX', exact: true }).fill('#NOPE');
    assert.equal(await options.locator('#save').isDisabled(), true);
    await options.getByRole('textbox', { name: 'Rule 1 Source HEX', exact: true }).fill('#FF0000');
    await options.locator('#name').fill('Verified palette'); await options.click('#save');
    await options.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Palette saved'), { }, { timeout: 5000 }).catch(async error => { throw new Error(`${error.message}; Options status: ${await options.locator('#status').textContent()}`); });
    assert.equal(await evaluate(async () => (await PCR.Storage.read()).profiles['127.0.0.1'].name), 'Verified palette');
    const downloadPromise = options.waitForEvent('download'); await options.click('#export'); const download = await downloadPromise;
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(exported.schemaVersion, 1); assert.equal(exported.profiles['127.0.0.1'].name, 'Verified palette');
  });
  await mkdir(path.join(root, 'test-results'), { recursive: true });
  await options.screenshot({ path: path.join(root, 'test-results/options.png'), fullPage: true });
  await check('JSON import rejects invalid input and confirms valid replacement', async () => {
    await options.locator('#import').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":99}') });
    await options.waitForFunction(() => document.querySelector('#status').textContent.includes('Unsupported'));
    assert.equal(await evaluate(async () => (await PCR.Storage.read()).profiles['127.0.0.1'].name), 'Verified palette');
    const exportText = await evaluate(async () => PCR.Model.exportJSON(await PCR.Storage.read()));
    const canceled = new Promise(resolve => options.once('dialog', async dialog => { await dialog.dismiss(); resolve(); }));
    await options.locator('#import').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(exportText) });
    await canceled;
    const accepted = new Promise(resolve => options.once('dialog', async dialog => { await dialog.accept(); resolve(); }));
    await options.locator('#import').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(exportText) });
    await accepted;
    await options.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Imported.'));
  });
  const pageCdp = await context.newCDPSession(page);
  const startPicker = async () => {
    await worker.evaluate(async () => { const tab = (await chrome.tabs.query({})).find(t => t.url?.includes('color-test.html')); return chrome.tabs.sendMessage(tab.id, { type: PCR.C.MSG.PICK }); });
    await page.waitForSelector('[data-pcr-ui]'); await page.click('#named');
  };
  // CDP can inspect closed shadow DOM, without changing the product's panel isolation.
  const panel = async (selector, fn, args = []) => {
    const { root: dom } = await pageCdp.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) { if (node.attributes?.includes('data-pcr-ui')) return node; for (const child of node.children || []) { const result = find(child); if (result) return result; } }
    const hostNode = find(dom);
    const { nodeId } = await pageCdp.send('DOM.querySelector', { nodeId: hostNode.shadowRoots[0].nodeId, selector });
    const { object } = await pageCdp.send('DOM.resolveNode', { nodeId });
    const { result, exceptionDetails } = await pageCdp.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: fn, arguments: args.map(value => ({ value })), returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.text); return result.value;
  };
  const fillPanel = (selector, value) => panel(selector, 'function(value) { this.value=value; this.dispatchEvent(new Event("input",{bubbles:true})); }', [value]);
  const clickPanel = selector => panel(selector, 'function() { this.click(); }');
  await check('DOM picker original color, live preview, cancel and actual profile save', async () => {
    state.profiles['127.0.0.1'].rules = []; await setState(state); await waitColor('#named', 'rgb(41, 121, 255)');
    await startPicker();
    assert.equal(await panel('#source', 'function() { return this.value; }'), '#FF0000');
    assert.equal(await panel('#name', 'function() { return this.value; }'), 'rule_1_127.0.0.1');
    await page.waitForTimeout(250);
    assert.match(await panel('#suggestions', 'function() { return this.textContent; }'), /#FF0000|No strong confusion pairs/);
    await clickPanel('#recommend');
    assert.notEqual(await panel('#hex', 'function() { return this.value; }'), '#2979FF');
    await fillPanel('#hex', '#00FFFF'); await clickPanel('#preview'); await waitColor('#named', 'rgb(0, 255, 255)');
    await page.screenshot({ path: path.join(root, 'test-results/picker.png') });
    await page.keyboard.press('Escape'); await page.waitForSelector('[data-pcr-ui]', { state: 'detached' }); await waitColor('#named', 'rgb(41, 121, 255)');
    await startPicker(); await fillPanel('#hex', '#FF9800'); await clickPanel('#save');
    await page.waitForSelector('[data-pcr-ui]', { state: 'detached' }); await waitColor('#named', 'rgb(255, 152, 0)');
    assert.equal(await evaluate(async () => (await PCR.Storage.read()).profiles['127.0.0.1'].rules[0].target), '#FF9800');
  });
  await check('Popup UI binds to the current tab, previews, cancels and saves', async () => {
    await page.bringToFront();
    await worker.evaluate(async () => { const tab = (await chrome.tabs.query({})).find(t => t.url?.includes('color-test.html')); await chrome.tabs.update(tab.id, { active: true }); });
    // Load the unmodified popup document in an inactive tab of the fixture window.
    // Chrome toolbar popup surfaces are not exposed as Playwright Page targets.
    const popupPromise = context.waitForEvent('page', { timeout: 5000 });
    await worker.evaluate(() => chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html'), active: false }));
    const popup = await popupPromise;
    await popup.setViewportSize({ width: 390, height: 600 });
    await popup.waitForSelector('#name:enabled');
    assert.equal(await popup.locator('#domain').textContent(), '127.0.0.1');
    assert.equal(await popup.getByRole('textbox', { name: 'Rule 1 name', exact: true }).inputValue(), 'rule_1_127.0.0.1');
    await popup.getByRole('button', { name: 'Rename', exact: true }).click();
    await popup.getByRole('textbox', { name: 'Rule 1 name', exact: true }).fill('Fixture red');
    await popup.getByRole('textbox', { name: 'Rule 1 Target HEX', exact: true }).fill('#00FFFF'); await waitColor('#named', 'rgb(0, 255, 255)');
    await popup.click('#cancel'); await waitColor('#named', 'rgb(255, 152, 0)');
    await popup.getByRole('button', { name: 'Rename', exact: true }).click();
    await popup.getByRole('textbox', { name: 'Rule 1 name', exact: true }).fill('Fixture red');
    await popup.getByRole('textbox', { name: 'Rule 1 Target HEX', exact: true }).fill('#2979FF'); await popup.click('#save');
    await popup.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Saved for'));
    await waitColor('#named', 'rgb(41, 121, 255)');
    assert.equal(await evaluate(async () => (await PCR.Storage.read()).profiles['127.0.0.1'].rules[0].name), 'Fixture red');
    await popup.screenshot({ path: path.join(root, 'test-results/popup.png'), fullPage: true });
    await popup.close();
  });
  await page.screenshot({ path: path.join(root, 'test-results/fixture.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('All browser integration checks passed. Screenshots: test-results/');
} finally {
  await context?.close(); await new Promise(resolve => server.close(resolve));
  // temp is created by mkdtemp above, never a user project directory.
  if (path.dirname(temp) !== tmpdir() || !path.basename(temp).startsWith('pcr-browser-')) throw new Error('Unexpected temporary directory');
  await rm(temp, { recursive: true, force: true });
}
