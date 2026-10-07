import { chromium } from 'playwright-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = process.env.YUJI_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.env.YUJI_PREVIEW_URL ?? 'http://127.0.0.1:4173/';
const profileDir = mkdtempSync(join(tmpdir(), 'yuji-smoke-'));
const context = await chromium.launchPersistentContext(profileDir, { executablePath: edgePath, headless: true, args: ['--no-sandbox'], viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const failures = [];

function check(condition, message) {
  if (condition) console.log(`✓ ${message}`);
  else { failures.push(message); console.error(`✗ ${message}`); }
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  check(await page.title() === '禹迹 · 天下如何长成地球', '页面标题正确');
  check(await page.locator('#intro-screen').isVisible(), '开场页可见');

  await page.locator('#start-button').click();
  check(await page.locator('#experience').evaluate((node) => node.classList.contains('is-visible')), '点击开始后进入时间轴');

  await page.locator('.timeline-node[data-index="1"]').click();
  check(await page.locator('.app-shell').getAttribute('data-era') === 'yujitu', '点击 1136 年后时代状态正确');
  check((await page.locator('#era-title').textContent()).includes('格子'), '时代标题已更新');
  check(await page.locator('.geo-coast path').count() > 10, '真实地理底图海岸线已渲染');
  check(await page.locator('.geo-rivers path').count() > 10, '真实地理底图河流已渲染');
  const dotCx = async (name) => Number(await page.locator(`.map-place[data-place="${name}"] .place-dot`).getAttribute('cx'));
  const dotCy = async (name) => Number(await page.locator(`.map-place[data-place="${name}"] .place-dot`).getAttribute('cy'));
  check((await dotCx('燕京')) > (await dotCx('长安')), '地名方位正确：燕京在长安以东');
  check((await dotCx('敦煌')) < (await dotCx('洛阳')), '地名方位正确：敦煌在洛阳以西');
  check((await dotCy('临安')) > (await dotCy('燕京')), '地名方位正确：临安在燕京以南');
  check((await page.locator('#overlay-image').getAttribute('href')).includes('yujitu'), '1136 年叠层加载《禹迹图》原图');
  check(await page.evaluate(() => fetch('assets/maps/yujitu-1136-loc.jpg', { method: 'HEAD' }).then((response) => response.status)) === 200, '《禹迹图》素材文件可访问');

  const timeline = page.locator('#timeline');
  const bounds = await timeline.boundingBox();
  if (bounds) await page.mouse.click(bounds.x + bounds.width - 8, bounds.y + bounds.height / 2);
  check(await page.locator('.app-shell').getAttribute('data-era') === 'kunyu', '拖动/点击时间轴末端后进入 1602 年');
  check((await page.locator('#overlay-image').getAttribute('href')).includes('kunyu'), '1602 年叠层加载《坤舆万国全图》原图');
  check(await page.locator('#ancient-overlay').evaluate((node) => !node.classList.contains('is-off')), '有古图时代的叠层未被隐藏');

  await page.locator('#compare-button').click();
  check(await page.locator('#overlay-control').evaluate((node) => node.classList.contains('is-open')), '古今对照面板打开');
  await page.locator('#opacity-range').fill('80');
  check((await page.locator('#opacity-output').textContent()).trim() === '80%', '透明度滑杆反馈正确');
  await page.locator('#close-overlay').click();

  await page.locator('#open-search').click();
  await page.locator('#place-search').fill('燕京');
  check((await page.locator('.place-result').first().textContent()).includes('北京'), '地名查询返回今地对应');
  check(await page.locator('.place-result').count() > 0, '地名卡已渲染');
  await page.locator('#close-search').click();

  await page.locator('.map-place[data-place="燕京"]').click();
  check(await page.locator('#search-drawer').evaluate((node) => node.classList.contains('is-open')), '点按地图地名可以打开查询抽屉');
  check((await page.locator('.place-result').first().textContent()).includes('北京'), '地图地名点按返回今地对应');
  await page.locator('#close-search').click();
  await page.locator('.map-place[data-place="临安"]').focus();
  await page.keyboard.press('Enter');
  check((await page.locator('#place-search').inputValue()) === '临安', '键盘 Enter 可以用地图地名发起查询');
  await page.locator('#close-search').click();

  await page.locator('.model-tab[data-model="郡县"]').click();
  check((await page.locator('#model-copy').textContent()).includes('管理'), '天下模型切换后说明更新');

  await page.locator('#reset-timeline').click();
  check(await page.locator('.app-shell').getAttribute('data-era') === 'shangzhou', '重置按钮可以回到时间轴起点');
  await page.locator('#compare-button').click();
  check((await page.locator('#overlay-desc').textContent()).includes('还没有传世地图'), '商周对照面板如实说明无传世地图');
  await page.keyboard.press('Escape');

  await page.locator('#timeline').focus();
  await page.keyboard.press('ArrowRight');
  check(await page.locator('.app-shell').getAttribute('data-era') === 'yujitu', '时间轴方向键可以切换时代');
  await page.keyboard.press('Home');
  check(await page.locator('.app-shell').getAttribute('data-era') === 'shangzhou', '时间轴 Home 键可以回到起点');
  await page.locator('#open-sources').click();
  check(await page.locator('#sources-drawer').evaluate((node) => node.classList.contains('is-open')), '来源抽屉可打开');
  await page.keyboard.press('Escape');
  check(!(await page.locator('#sources-drawer').evaluate((node) => node.classList.contains('is-open'))), 'Escape 可以关闭来源抽屉');
  await page.keyboard.press('Control+KeyK');
  check(await page.locator('#search-drawer').evaluate((node) => node.classList.contains('is-open')), 'Ctrl+K 可以打开地名查询');
  await page.keyboard.press('Escape');

  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.emulateMedia({ reducedMotion: 'reduce' });
  await mobilePage.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  check(await mobilePage.locator('#experience').evaluate((node) => node.classList.contains('is-visible')), '移动端核心页面可见');
  check(await mobilePage.locator('.timeline-wrap').evaluate((node) => {
    const wrapRect = node.getBoundingClientRect();
    return [...node.querySelectorAll('.timeline-node')].every((item) => {
      const rect = item.getBoundingClientRect();
      return rect.left >= wrapRect.left - 1 && rect.right <= wrapRect.right + 1;
    });
  }), '移动端时间轴三个时代节点全部可见');
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '移动端页面没有整体横向溢出');
  check(await mobilePage.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), '减少动画媒体设置生效');
  await mobilePage.locator('#open-search').click();
  await mobilePage.locator('#place-search').fill('临安');
  check((await mobilePage.locator('.place-result').first().textContent()).includes('杭州'), '移动端地名查询可用');
  await mobilePage.close();

  const resumePage = await context.newPage();
  await resumePage.setViewportSize({ width: 1280, height: 900 });
  await resumePage.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await resumePage.evaluate(() => localStorage.setItem('yuji-era', '1'));
  await resumePage.goto(url, { waitUntil: 'networkidle' });
  check(await resumePage.locator('#resume-button').isVisible(), '重新打开时显示继续入口');
  check((await resumePage.locator('#resume-button').textContent()).includes('1136'), '继续入口显示上次时代');
  await resumePage.locator('#resume-button').click();
  check(await resumePage.locator('.app-shell').getAttribute('data-era') === 'yujitu', '继续入口恢复上次时代');
  await resumePage.close();
} finally {
  await context.close();
  rmSync(profileDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n冒烟测试失败：${failures.length} 项`);
  process.exit(1);
}

console.log('\n浏览器冒烟测试通过。');
