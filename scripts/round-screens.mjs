import { chromium } from 'playwright-core';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = process.env.YUJI_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.env.YUJI_PREVIEW_URL ?? 'http://127.0.0.1:4173/';
const round = process.env.YUJI_ROUND ?? 'round1';
const outDir = join(process.cwd(), 'artifacts', 'design', round);
mkdirSync(outDir, { recursive: true });

const profileDir = mkdtempSync(join(tmpdir(), 'yuji-shots-'));
const context = await chromium.launchPersistentContext(profileDir, {
  executablePath: edgePath,
  headless: true,
  args: ['--no-sandbox'],
  viewport: { width: 1440, height: 900 },
});

const consoleErrors = [];
async function newShotPage(width, height) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  return page;
}

async function shot(page, name, options = {}) {
  await page.waitForTimeout(options.settle ?? 900);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: !!options.full });
  console.log(`✓ ${name}.png`);
}

try {
  const desktop = await newShotPage(1440, 900);
  await desktop.goto(url, { waitUntil: 'networkidle' });
  await shot(desktop, '01-intro-desktop');

  await desktop.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await shot(desktop, '02-era0-shangzhou-desktop');
  await desktop.locator('.timeline-node[data-index="1"]').click();
  await shot(desktop, '03-era1-yujitu-desktop');
  await desktop.locator('.timeline-node[data-index="2"]').click();
  await shot(desktop, '04-era2-kunyu-desktop');

  await desktop.locator('#compare-button').click();
  await shot(desktop, '05-overlay-panel-desktop');
  await desktop.locator('#close-overlay').click();

  await desktop.locator('#open-search').click();
  await desktop.locator('#place-search').fill('燕京');
  await shot(desktop, '06-search-drawer-desktop');
  await desktop.locator('#close-search').click();

  // 逐帧：1136 → 1602 的落墨过渡（0/250/500/900/1400/1900ms）
  await desktop.locator('.timeline-node[data-index="1"]').click();
  await desktop.waitForTimeout(1900);
  const framesDir = join(outDir, 'frames-era1-to-era2');
  mkdirSync(framesDir, { recursive: true });
  await desktop.locator('.timeline-node[data-index="2"]').click();
  const frameTimes = [0, 250, 500, 900, 1400, 1900];
  let prev = 0;
  const layoutHeights = [];
  for (const t of frameTimes) {
    await desktop.waitForTimeout(t - prev);
    prev = t;
    layoutHeights.push(await desktop.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, mapH: document.querySelector('#map-stage').clientHeight, svgH: document.querySelector('.map-svg').getBoundingClientRect().height })));
    await desktop.screenshot({ path: join(framesDir, `frame-${String(t).padStart(4, '0')}ms.png`) });
  }
  const stable = layoutHeights.every((h) => h.scrollH === layoutHeights[0].scrollH && h.mapH === layoutHeights[0].mapH);
  console.log(stable ? '✓ 逐帧检查：过渡期间无布局抖动' : `✗ 逐帧检查：布局抖动 ${JSON.stringify(layoutHeights)}`);
  await desktop.close();

  const full = await newShotPage(1440, 900);
  await full.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await shot(full, '08-experience-fullpage-desktop', { full: true, settle: 1200 });
  await full.close();

  const mobile = await newShotPage(390, 844);
  await mobile.goto(url, { waitUntil: 'networkidle' });
  // 桌面端流程会写入 yuji-era，清掉后从商周开始截移动端。
  await mobile.evaluate(() => localStorage.removeItem('yuji-era'));
  await mobile.goto(url, { waitUntil: 'networkidle' });
  await shot(mobile, '10-intro-mobile');
  await mobile.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await shot(mobile, '11-experience-mobile-era0', { full: true });
  await mobile.locator('.timeline-node[data-index="1"]').click();
  await shot(mobile, '12-experience-mobile-era1');
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await mobile.close();

  console.log(`移动端横向溢出: ${mobileOverflow}px`);
  if (consoleErrors.length) { console.log('控制台错误:'); consoleErrors.forEach((e) => console.log(`  ✗ ${e}`)); }
  else console.log('控制台无错误。');
} finally {
  await context.close();
  rmSync(profileDir, { recursive: true, force: true });
}
