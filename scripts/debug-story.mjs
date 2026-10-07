import { chromium } from 'playwright-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = mkdtempSync(join(tmpdir(), 'dbg-'));
const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.YUJI_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
  args: ['--no-sandbox'],
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });
await page.goto('http://127.0.0.1:4173/?stage=experience', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const cardText = () => page.locator('.story-content').innerText().then((t) => t.slice(0, 130).replace(/\n/g, ' | '));
console.log('era0 card:', await cardText());
await page.locator('.timeline-node[data-index="1"]').click();
await page.waitForTimeout(500);
console.log('era1 card:', await cardText());
console.log('era1 h3 html:', await page.evaluate(() => document.querySelector('.story-content h3')?.outerHTML));
console.log('era1 p text:', await page.evaluate(() => document.querySelector('.story-content p')?.textContent?.slice(0, 40)));
console.log('data-era:', await page.locator('.app-shell').getAttribute('data-era'));
await ctx.close();
rmSync(profile, { recursive: true, force: true });
