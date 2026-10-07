import { chromium } from 'playwright-core';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = process.env.YUJI_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.env.YUJI_PREVIEW_URL ?? 'http://127.0.0.1:4173/';
const outDir = join(process.cwd(), 'artifacts', 'design', 'baseline');
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
  // 桌面端：开场
  const desktop = await newShotPage(1440, 900);
  await desktop.goto(url, { waitUntil: 'networkidle' });
  const navStart = Date.now();
  await shot(desktop, '01-intro-desktop');

  // 桌面端：核心体验三个时代
  await desktop.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await shot(desktop, '02-era0-shangzhou-desktop');
  await desktop.locator('.timeline-node[data-index="1"]').click();
  await shot(desktop, '03-era1-yujitu-desktop');
  await desktop.locator('.timeline-node[data-index="2"]').click();
  await shot(desktop, '04-era2-kunyu-desktop');

  // 桌面端：古今对照面板
  await desktop.locator('#compare-button').click();
  await shot(desktop, '05-overlay-panel-desktop');
  await desktop.locator('#close-overlay').click();

  // 桌面端：地名查询抽屉
  await desktop.locator('#open-search').click();
  await desktop.locator('#place-search').fill('燕京');
  await shot(desktop, '06-search-drawer-desktop');
  await desktop.locator('#close-search').click();

  // 桌面端：来源抽屉
  await desktop.locator('#open-sources').click();
  await shot(desktop, '07-sources-drawer-desktop');
  await desktop.locator('#close-sources').click();
  await desktop.close();

  // 桌面整页滚动视图
  const full = await newShotPage(1440, 900);
  await full.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await shot(full, '08-experience-fullpage-desktop', { full: true, settle: 1200 });
  await full.close();

  // 笔记本宽度 1280
  const laptop = await newShotPage(1280, 800);
  await laptop.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await laptop.locator('.timeline-node[data-index="1"]').click();
  await shot(laptop, '09-laptop-1280-era1');
  const laptopOverflow = await laptop.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await laptop.close();

  // 移动端 390x844
  const mobile = await newShotPage(390, 844);
  await mobile.goto(url, { waitUntil: 'networkidle' });
  await shot(mobile, '10-intro-mobile');
  await mobile.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await shot(mobile, '11-experience-mobile-era0', { full: true });
  await mobile.locator('.timeline-node[data-index="1"]').click();
  await shot(mobile, '12-experience-mobile-era1');
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await mobile.locator('#open-search').click();
  await mobile.locator('#place-search').fill('临安');
  await shot(mobile, '13-search-mobile');
  await mobile.close();

  console.log(`\n笔记本横向溢出: ${laptopOverflow}px | 移动端横向溢出: ${mobileOverflow}px`);
  if (consoleErrors.length) {
    console.log('控制台错误:');
    consoleErrors.forEach((e) => console.log(`  ✗ ${e}`));
  } else {
    console.log('控制台无错误。');
  }
  console.log(`导航耗时(约): ${Date.now() - navStart}ms`);
} finally {
  await context.close();
  rmSync(profileDir, { recursive: true, force: true });
}
