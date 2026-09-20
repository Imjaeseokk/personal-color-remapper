import { chromium } from 'playwright';
import { mkdir, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'store/assets');
const temp = await mkdtemp(path.join(tmpdir(), 'pcr-assets-'));
let context;
try {
  await mkdir(assets, { recursive: true });
  await copyFile(path.join(root, 'icons/icon-128.png'), path.join(assets, 'icon-128.png'));
  context = await chromium.launchPersistentContext(temp, {
    channel: process.env.PCR_CHROME_CHANNEL || (process.platform === 'win32' ? 'chrome' : 'chromium'),
    headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging']
  });
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: path.join(root, 'dist/chrome-unpacked') });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(async () => {
    const state = PCR.Model.defaults();
    state.profiles['example.com'] = { ...PCR.Model.profile('My accessible palette'), rules: [
      { ...PCR.Model.rule('#28A745'), target: '#2979FF', threshold: 15 },
      { ...PCR.Model.rule('#D73A49'), target: '#FF9800', threshold: 20 }
    ] };
    await PCR.Storage.write(state);
  });
  const page = await context.newPage(); await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('chrome-extension://' + id + '/options/options.html');
  await page.waitForFunction(() => document.querySelector('#profiles').options.length === 2);
  await page.selectOption('#profiles', 'example.com');
  await page.screenshot({ path: path.join(assets, 'options-1280x800.png') });
  await page.setViewportSize({ width: 440, height: 280 });
  await page.goto(pathToFileURL(path.join(root, 'store/promo.html')).href);
  await page.screenshot({ path: path.join(assets, 'promo-440x280.png') });
  console.log('Store images created in ' + assets);
} finally {
  await context?.close();
  assert.equal(path.dirname(temp), tmpdir()); assert.ok(path.basename(temp).startsWith('pcr-assets-'));
  await rm(temp, { recursive: true, force: true });
}
