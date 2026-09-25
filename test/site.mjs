import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.PCR_SITE_URL || 'http://127.0.0.1:8123/';
const routes = ['', 'guide/guide.html', 'updates/', 'updates/1.2.0.html', 'updates/1.1.0.html', 'updates/1.0.0.html', 'privacy.html', 'sitemap.xml'];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, route);
    if (!route.endsWith('.xml')) assert.ok((await page.title()).length >= 12, `Missing title: ${route}`);
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('pcr-site-language'));
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('[data-language-choice="en"]').getAttribute('aria-checked'), 'true');
  assert.equal(await page.locator('.brand img').first().getAttribute('src'), 'icons/new-icon.png');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).wordBreak), 'keep-all');
  assert.match(await page.evaluate(() => getComputedStyle(document.documentElement).fontFamily), /Pretendard/);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('a')].every(link => getComputedStyle(link).textDecorationLine === 'none')), true);
  assert.equal(await page.locator('figcaption').count(), 0);
  assert.equal(await page.locator('img[src*="popup-native.png"]').count() >= 1, true);
  await page.locator('.language-trigger').click();
  await page.locator('[data-language-choice="ko"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
  assert.match(await page.locator('h1').first().textContent(), /어떤 색/);
  await page.locator('.language-trigger').click();
  await page.locator('[data-language-choice="en"]').click();
  assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).length >= 80);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://imjaeseokk.github.io/personal-color-remapper/');
  for (const text of await page.locator('script[type="application/ld+json"]').allTextContents()) JSON.parse(text);
  assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
  const internal = await page.locator('a[href]').evaluateAll(links => [...new Set(links.map(link => link.href).filter(href => href.startsWith(location.origin))) ]);
  for (const url of internal) assert.ok((await page.request.get(url)).ok(), `Broken link: ${url}`);
  await mkdir(path.join(root, 'test-results'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'test-results/site-home-desktop.png'), fullPage: true });
  await page.goto(new URL('updates/1.2.0.html', base).href); await page.screenshot({ path: path.join(root, 'test-results/site-update-desktop.png'), fullPage: true });
  await page.locator('.language-trigger').click();
  await page.locator('[data-language-choice="en"]').click();
  assert.equal(await page.locator('[data-language="en"]').isVisible(), true);
  assert.equal(await page.locator('[data-language="ko"]').isHidden(), true);
  await page.goto(new URL('guide/guide.html', base).href, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.site-header').count(), 1);
  assert.equal(await page.locator('.guide-section:visible').count(), 7);
  assert.equal(await page.locator('.guide-step').first().evaluate(element => getComputedStyle(element).borderRadius), '0px');
  await page.locator('.language-trigger').click();
  await page.locator('[data-language-choice="ko"]').click();
  assert.match(await page.locator('h1').textContent(), /첫 색상 규칙/);
  assert.equal(await page.locator('[data-language="ko"]').isVisible(), true);
  for (const width of [390, 640, 1024, 1920]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto(base, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(element => {
      const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1;
    }).map(element => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right) })).slice(0, 10));
    assert.deepEqual(overflow, [], `${width}px horizontal overflow: ${JSON.stringify(overflow)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(root, 'test-results/site-home-mobile-fold.png') });
  await page.locator('.nav-toggle').click(); assert.equal(await page.locator('.nav-links').getAttribute('class'), 'nav-links open');
  await page.screenshot({ path: path.join(root, 'test-results/site-home-mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`Site checks passed: ${routes.length} routes, ${internal.length} home links, desktop + mobile.`);
} finally { await browser.close(); }
