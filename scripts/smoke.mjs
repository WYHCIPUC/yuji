import { chromium } from 'playwright-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = process.env.YUJI_BROWSER ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.env.YUJI_PREVIEW_URL ?? 'http://127.0.0.1:4173/';
const profileDir = mkdtempSync(join(tmpdir(), 'yuji-smoke-'));
const context = await chromium.launchPersistentContext(profileDir, { executablePath: edgePath, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'], viewport: { width: 1280, height: 980 } });
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

  check(await page.locator('.timeline-node').count() === 7, '时间轴展示七个时代节点');

  // 真地图引擎（MapLibre WebGL）
  await page.waitForFunction(() => window.__yujiMap && window.__yujiMap.isStyleLoaded(), null, { timeout: 20000 }).catch(() => {});
  check(await page.evaluate(() => Boolean(window.__yujiMap && window.__yujiMap.isStyleLoaded())), '地图引擎样式已加载');
  check(await page.evaluate(() => Boolean(window.__yujiMap.getLayer('grow-rivers') && window.__yujiMap.getLayer('yujitu-raster') && window.__yujiMap.getLayer('rings-line') && window.__yujiMap.getLayer('route-line'))), '生长河流/禹迹图配准/五服环/针路图层都在');
  // CHGIS 数据层（9440 条治所点 + 府界示意层）
  await page.waitForFunction(() => Boolean(window.__yujiMap.getSource('chgis-points')), null, { timeout: 20000 }).catch(() => {});
  check(await page.evaluate(() => Boolean(window.__yujiMap.getSource('chgis-points'))), 'CHGIS 治所点数据层已加载');
  check(await page.evaluate(() => Boolean(window.__yujiMap.getSource('chgis-pref'))), 'CHGIS 府界示意层数据已加载');
  await page.locator('.timeline-node[data-index="6"]').click();
  await page.waitForTimeout(1200);
  const qingCount = await page.evaluate(() => window.__yujiMap.queryRenderedFeatures({ layers: ['cnty-points', 'pref-points'] }).length);
  check(qingCount > 100, `1602 年治所点大量可见（${qingCount} 个）`);
  await page.locator('.timeline-node[data-index="0"]').click();
  await page.waitForTimeout(1200);
  const shangCount = await page.evaluate(() => window.__yujiMap.queryRenderedFeatures({ layers: ['cnty-points', 'pref-points'] }).length);
  check(shangCount < qingCount, `商周治所点远少于 1602（前 ${shangCount} < 后 ${qingCount}，数据随时代增长）`);

  await page.locator('.timeline-node[data-index="1"]').click();
  check(await page.locator('.app-shell').getAttribute('data-era') === 'zhanguo', '点击战国后时代状态正确');
  check((await page.locator('#era-title').textContent()).includes('奇国'), '战国标题已更新');
  check(Number(await page.locator('#shanhai-layer').evaluate((n) => n.style.opacity)) > 0.5, '战国山海星野层可见');

  await page.locator('.timeline-node[data-index="2"]').click();
  check(await page.locator('.app-shell').getAttribute('data-era') === 'qinhan', '点击秦汉后时代状态正确');
  check((await page.locator('.story-content h3').textContent()).includes('无名绘者'), '秦汉幕讲述者为马王堆无名绘者');
  // 生长中的河流：line-gradient 的断点在 0~1 之间
  const grad = await page.evaluate(() => JSON.stringify(window.__yujiMap.getPaintProperty('grow-rivers', 'line-gradient')));
  check(/line-progress/.test(grad) && !/"1",\s*"1"/.test(grad), '黄河长江按 line-progress 生长');

  const markerPos = async (name) => page.evaluate((n) => { const el = document.querySelector(`.map-place[data-place="${n}"]`); const m = window.__yujiMarkers?.get?.(n) ?? window.__yujiMarkerLngLat?.[n]; return m ? [m.lng, m.lat] : null; }, name);
  await page.evaluate(() => { window.__yujiMarkerLngLat = {}; document.querySelectorAll('.map-place').forEach((el) => { const t = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/); if (t) window.__yujiMarkerLngLat[el.dataset.place] = { x: Number(t[1]), y: Number(t[2]) }; }); });
  const px = async (name) => (await page.evaluate((n) => window.__yujiMarkerLngLat[n]?.x ?? null, name));
  const py = async (name) => (await page.evaluate((n) => window.__yujiMarkerLngLat[n]?.y ?? null, name));
  check((await px('燕京')) > (await px('长安')), '地名方位正确：燕京在长安以东（屏幕坐标）');
  check((await px('敦煌')) < (await px('洛阳')), '地名方位正确：敦煌在洛阳以西');
  check((await py('临安')) > (await py('燕京')), '地名方位正确：临安在燕京以南');

  await page.locator('.timeline-node[data-index="5"]').click();
  check(await page.locator('.app-shell').getAttribute('data-era') === 'mingchu', '点击明初后时代状态正确');
  check(Number(await page.evaluate(() => window.__yujiMap.getPaintProperty('route-line', 'line-opacity'))) > 0.5, '明初郑和针路线已浮现');
  check((await page.locator('.story-content h3').textContent()).includes('郑和'), '明初幕讲述者为郑和');

  await page.locator('.timeline-node[data-index="4"]').click();
  check((await page.locator('#era-title').textContent()).includes('格子'), '1136 幕标题已更新');
  check(await page.evaluate(() => fetch('assets/maps/yujitu-1136-loc.jpg', { method: 'HEAD' }).then((response) => response.status)) === 200, '《禹迹图》素材文件可访问');
  // 掀开对照：滑杆控制配准叠层的透明度
  await page.locator('#compare-button').click();
  check(await page.locator('#overlay-control').evaluate((node) => node.classList.contains('is-open')), '古今对照面板打开');
  await page.locator('#opacity-range').fill('80');
  check((await page.locator('#opacity-output').textContent()).trim() === '80%', '透明度滑杆反馈正确');
  check(Math.abs(Number(await page.evaluate(() => window.__yujiMap.getPaintProperty('yujitu-raster', 'raster-opacity'))) - 0.8) < 0.01, '禹迹图按真实位置叠加（透明度 80%）');
  await page.locator('#close-overlay').click();

  const timeline = page.locator('#timeline');
  const bounds = await timeline.boundingBox();
  if (bounds) await timeline.click({ position: { x: bounds.width - 8, y: bounds.height / 2 } });
  check(await page.locator('.app-shell').getAttribute('data-era') === 'kunyu', '拖动/点击时间轴末端后进入 1602 年');

  await page.locator('#open-search').click();
  await page.locator('#place-search').fill('燕京');
  check((await page.locator('.place-result').first().textContent()).includes('北京'), '地名查询返回今地对应');
  check(await page.locator('.place-result').count() > 0, '地名卡已渲染');
  // CHGIS 数据层：古县名命中数据层条目
  await page.waitForFunction(() => document.querySelectorAll('.place-result').length > 0 || true, null, { timeout: 8000 }).catch(() => {});
  await page.locator('#place-search').fill('钱塘');
  await page.waitForTimeout(600);
  const datasetHit = await page.locator('.place-result.is-dataset').count();
  check(datasetHit > 0 || (await page.locator('.place-result').first().textContent()).includes('杭州'), '「钱塘」命中叙事层或 CHGIS 数据层');
  // 在图上定位：地图飞向该地
  const before = await page.evaluate(() => JSON.stringify(window.__yujiMap.getCenter()));
  await page.locator('.locate-button').first().click();
  await page.waitForTimeout(2600);
  const after = await page.evaluate(() => JSON.stringify(window.__yujiMap.getCenter()));
  check(before !== after, '「在图上定位」让地图飞向该地');
  await page.keyboard.press('Escape');
  // 重置视图（否则北京标记在视口外）
  await page.evaluate(() => window.__yujiMap.jumpTo({ center: [107, 34], zoom: 3.4 }));
  await page.waitForTimeout(600);

  await page.locator('.map-place[data-place="燕京"]').click();
  check(await page.locator('#search-drawer').evaluate((node) => node.classList.contains('is-open')), '点按地图地名可以打开查询抽屉');
  check((await page.locator('.place-result').first().textContent()).includes('北京'), '地图地名点按返回今地对应');
  await page.locator('#close-search').click();
  await page.locator('.map-place[data-place="临安"]').focus();
  await page.keyboard.press('Enter');
  check((await page.locator('#place-search').inputValue()) === '临安', '键盘 Enter 可以用地图地名发起查询');
  await page.locator('#close-search').click();

  await page.locator('.model-tab[data-model="服制"]').click();
  check((await page.locator('#model-copy').textContent()).includes('关系秩序'), '天下模型切换后说明更新');

  await page.locator('#reset-timeline').click();
  check(await page.locator('.app-shell').getAttribute('data-era') === 'shangzhou', '重置按钮可以回到时间轴起点');
  const ringsOpacity = await page.evaluate(() => window.__yujiMap.getPaintProperty('rings-line', 'line-opacity'));
  check(Number(ringsOpacity) > 0.3, '商周幕五服环可见');
  await page.locator('#compare-button').click();
  check((await page.locator('#overlay-desc').textContent()).includes('还没有传世地图'), '商周对照面板如实说明无传世地图');
  await page.keyboard.press('Escape');

  await page.locator('#timeline').focus();
  await page.keyboard.press('ArrowRight');
  check(await page.locator('.app-shell').getAttribute('data-era') === 'zhanguo', '时间轴方向键可以切换时代');
  await page.keyboard.press('Home');
  check(await page.locator('.app-shell').getAttribute('data-era') === 'shangzhou', '时间轴 Home 键可以回到起点');
  await page.locator('#open-sources').click();
  check(await page.locator('#sources-drawer').evaluate((node) => node.classList.contains('is-open')), '来源抽屉可打开');
  await page.keyboard.press('Escape');
  await page.locator('#open-atlas').click();
  check(await page.locator('#atlas-drawer').evaluate((node) => node.classList.contains('is-open')), '历代图卷抽屉可打开');
  check(await page.locator('.atlas-item').count() >= 20, '历代图卷收录不少于 20 幅');
  await page.waitForTimeout(1200);
  check(await page.locator('.atlas-item img').first().evaluate((img) => img.naturalWidth > 0), '图卷图片真实加载');
  await page.keyboard.press('Escape');
  check(!(await page.locator('#atlas-drawer').evaluate((node) => node.classList.contains('is-open'))), 'Escape 可关闭历代图卷');
  await page.keyboard.press('Control+KeyK');
  check(await page.locator('#search-drawer').evaluate((node) => node.classList.contains('is-open')), 'Ctrl+K 可以打开地名查询');
  await page.keyboard.press('Escape');

  // 地图可交互：拖动与缩放（真地图引擎的证据）
  const centerBefore = await page.evaluate(() => JSON.stringify(window.__yujiMap.getCenter()));
  await page.mouse.move(640, 450);
  await page.mouse.down();
  await page.mouse.move(560, 430, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const centerAfter = await page.evaluate(() => JSON.stringify(window.__yujiMap.getCenter()));
  check(centerBefore !== centerAfter, '地图可以用鼠标拖动平移');
  const zoomBefore = await page.evaluate(() => window.__yujiMap.getZoom());
  await page.evaluate(() => {
    const target = document.querySelector('#map canvas') ?? document.querySelector('#map');
    target.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: 640, clientY: 450, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(800);
  const zoomAfter = await page.evaluate(() => window.__yujiMap.getZoom());
  check(zoomAfter > zoomBefore, '地图可以用滚轮缩放');

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
  }), '移动端时间轴七个时代节点全部可见');
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '移动端页面没有整体横向溢出');
  check(await mobilePage.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), '减少动画媒体设置生效');
  await mobilePage.locator('#open-search').click();
  await mobilePage.locator('#place-search').fill('临安');
  check((await mobilePage.locator('.place-result').first().textContent()).includes('杭州'), '移动端地名查询可用');
  await mobilePage.close();

  const resumePage = await context.newPage();
  await resumePage.setViewportSize({ width: 1280, height: 980 });
  await resumePage.goto(`${url}?stage=experience`, { waitUntil: 'networkidle' });
  await resumePage.evaluate(() => localStorage.setItem('yuji-era', '4'));
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
