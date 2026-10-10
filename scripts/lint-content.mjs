import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const contentDir = join(root, 'src', 'content');
const failures = [];

function check(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
  } else {
    failures.push(message);
    console.error(`✗ ${message}`);
  }
}

function readJson(name) {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
}

function isFilled(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const CERTAINTY_LEVELS = ['可确定事实', '合理解释', '学术争议'];

// 时代数据
const eras = readJson('eras.json');
check(Array.isArray(eras) && eras.length > 0, 'eras.json 是非空数组');
const eraIds = new Set();
eras.forEach((era, index) => {
  const label = `eras.json 第 ${index + 1} 条`;
  ['id', 'year', 'shortYear', 'title', 'description', 'narrativeLine', 'certainty', 'source', 'accent'].forEach((field) => {
    check(isFilled(era?.[field]), `${label} 的 ${field} 为非空字符串`);
  });
  if (isFilled(era?.id)) {
    if (eraIds.has(era.id)) check(false, `${label} 的 id 重复：${era.id}`);
    eraIds.add(era.id);
  }
  check(/^#[0-9a-f]{6}$/i.test(era?.accent ?? ''), `${label} 的 accent 是六位十六进制颜色`);
});

// 地名数据
const places = readJson('places.json');
check(Array.isArray(places) && places.length >= 20, `places.json 至少收录 20 条地名（当前 ${Array.isArray(places) ? places.length : 0} 条）`);
const placeNames = new Set();
places.forEach((place, index) => {
  const label = `places.json 第 ${index + 1} 条（${place?.name ?? '?'}）`;
  ['name', 'modern', 'era', 'note', 'certainty', 'source'].forEach((field) => {
    check(isFilled(place?.[field]), `${label} 的 ${field} 为非空字符串`);
  });
  check(Array.isArray(place?.chain) && place.chain.length >= 2 && place.chain.every((item) => isFilled(item)), `${label} 的 chain 至少含两个非空称谓`);
  check(CERTAINTY_LEVELS.includes(place?.certainty), `${label} 的 certainty 属于 ${CERTAINTY_LEVELS.join(' / ')}`);
  if (isFilled(place?.name)) {
    if (placeNames.has(place.name)) check(false, `${label} 的 name 重复：${place.name}`);
    placeNames.add(place.name);
  }
});

// 制图者数据
const storytellers = readJson('storytellers.json');
check(Array.isArray(storytellers) && storytellers.length > 0, 'storytellers.json 是非空数组');
storytellers.forEach((person, index) => {
  const label = `storytellers.json 第 ${index + 1} 条`;
  ['name', 'role', 'text', 'source', 'years'].forEach((field) => {
    check(isFilled(person?.[field]), `${label} 的 ${field} 为非空字符串（years 为年代注记，用于防止时代错配）`);
  });
});

// 来源数据
const sources = readJson('sources.json');
check(Array.isArray(sources) && sources.length > 0, 'sources.json 是非空数组');
sources.forEach((source, index) => {
  const label = `sources.json 第 ${index + 1} 条`;
  ['type', 'title', 'status', 'detail'].forEach((field) => {
    check(isFilled(source?.[field]), `${label} 的 ${field} 为非空字符串`);
  });
});

// 数据层（CHGIS V6 派生、脚本生成）：条目量大，失败项聚合计数、只列前若干示例
const datasetPath = join(contentDir, 'places-dataset.json');
check(existsSync(datasetPath), 'places-dataset.json 存在（V2 数据层）');
if (existsSync(datasetPath)) {
  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
  const dsErrors = [];
  const dsCheck = (cond, msg) => { if (!cond) dsErrors.push(msg); };
  dsCheck((dataset?._generated ?? '').startsWith('scripts/expand-places.mjs'), 'places-dataset.json 带生成标记（生成物，禁止手改）');
  dsCheck(Array.isArray(dataset?.places) && dataset.places.length > 0, 'places-dataset.json 的 places 是非空数组');
  const seenSeat = new Set();
  (dataset?.places ?? []).forEach((p, index) => {
    const label = `places-dataset.json 第 ${index + 1} 条（${p?.name ?? '?'}）`;
    ['name', 'level', 'modern', 'certainty', 'source'].forEach((field) => {
      dsCheck(isFilled(p?.[field]), `${label} 的 ${field} 为非空字符串`);
    });
    dsCheck(['县', '府'].includes(p?.level), `${label} 的 level 属于 县 / 府`);
    dsCheck(CERTAINTY_LEVELS.includes(p?.certainty), `${label} 的 certainty 属于三级考订口径`);
    dsCheck((p?.source ?? '').startsWith('CHGIS V6'), `${label} 的 source 标注 CHGIS V6`);
    dsCheck(Number.isFinite(p?.lng) && p.lng >= 70 && p.lng <= 140, `${label} 的经度在粗框内`);
    dsCheck(Number.isFinite(p?.lat) && p.lat >= 15 && p.lat <= 52, `${label} 的纬度在粗框内`);
    dsCheck(Array.isArray(p?.presences) && p.presences.length > 0, `${label} 的 presences 非空`);
    (p?.presences ?? []).forEach((span, i) => {
      dsCheck(Number.isInteger(span?.from) && Number.isInteger(span?.to), `${label} 第 ${i + 1} 段存在期为整数年份`);
      dsCheck(span?.to <= 1602, `${label} 第 ${i + 1} 段存在期止于 1602（叙事红线）`);
      dsCheck(span?.from <= span?.to, `${label} 第 ${i + 1} 段存在期起止有序`);
    });
    if (isFilled(p?.name) && Number.isFinite(p?.lng) && Number.isFinite(p?.lat)) {
      const key = `${p.name}|${Math.round(p.lng * 100)}|${Math.round(p.lat * 100)}`;
      if (seenSeat.has(key)) dsCheck(false, `${label} 与其他条目同名同座（名称+坐标须可区分）`);
      seenSeat.add(key);
    }
  });
  if (dsErrors.length) {
    dsErrors.slice(0, 10).forEach((m) => console.error(`✗ ${m}`));
    if (dsErrors.length > 10) console.error(`… 另有 ${dsErrors.length - 10} 项未列出`);
    failures.push(`places-dataset.json 共 ${dsErrors.length} 项问题`);
  } else {
    console.log(`✓ places-dataset.json 数据层校验通过（${dataset.places.length} 条）`);
    if (dataset.places.length < 2000) console.log(`⚠ 数据层条目 ${dataset.places.length} < 2000 目标（数量以 expand-report.md 为准）`);
  }
  check(existsSync(join(root, 'docs', 'expand-report.md')), 'docs/expand-report.md 生成报告存在');
}

// 府界示意层（Voronoi 派生）：声明与红线校验（要素量大，聚合计数）
const histPrefPath = join(root, 'public', 'geo', 'hist-pref', 'pref-polygons.json');
check(existsSync(histPrefPath), 'geo/hist-pref/pref-polygons.json 府界示意层存在');
if (existsSync(histPrefPath)) {
  const hist = JSON.parse(readFileSync(histPrefPath, 'utf8'));
  const hpErrors = [];
  const hpCheck = (cond, msg) => { if (!cond) hpErrors.push(msg); };
  hpCheck((hist?.disclaimer ?? '').includes('示意') && (hist?.disclaimer ?? '').includes('不代表任何现实主张'), '府界示意层带「示意重绘、不代表任何现实主张」声明');
  hpCheck(Array.isArray(hist?.features) && hist.features.length > 0, '府界示意层要素非空');
  (hist?.features ?? []).forEach((f, index) => {
    const label = `pref-polygons.json 第 ${index + 1} 要素（${f?.properties?.name ?? '?'}）`;
    const props = f?.properties ?? {};
    hpCheck(isFilled(props.name), `${label} 的 name 非空`);
    hpCheck(Number.isInteger(props.from) && Number.isInteger(props.to) && props.to <= 1602, `${label} 的年份区间合法且止于 1602`);
  });
  if (hpErrors.length) {
    hpErrors.slice(0, 10).forEach((m) => console.error(`✗ ${m}`));
    failures.push(`pref-polygons.json 共 ${hpErrors.length} 项问题`);
  } else {
    console.log(`✓ pref-polygons.json 府界示意层校验通过（${hist.features.length} 要素）`);
  }
}

// 示意地图上的可点按地名必须能被查到
const mainSource = readFileSync(join(root, 'src', 'main.ts'), 'utf8');
const mapPlacesBlock = mainSource.match(/const mapPlaces = \[([\s\S]*?)\];/);
check(Boolean(mapPlacesBlock), 'main.ts 保留了 mapPlaces 定义');
if (mapPlacesBlock) {
  const mapPlaceNames = [...mapPlacesBlock[1].matchAll(/name: '([^']+)'/g)].map((match) => match[1]);
  check(mapPlaceNames.length > 0, 'mapPlaces 至少声明一个地名');
  mapPlaceNames.forEach((name) => {
    check(placeNames.has(name), `地图地名「${name}」在 places.json 中可以查到`);
  });
}

// 真实古图素材必须随版本存在（eraOverlayImage 引用）
const overlayBlock = mainSource.match(/const eraOverlayImage[^=]*=\s*\{([\s\S]*?)\n\};/);
check(Boolean(overlayBlock), 'main.ts 保留了 eraOverlayImage 定义');
if (overlayBlock) {
  const overlaySrcs = [...overlayBlock[1].matchAll(/src: '([^']+)'/g)].map((match) => match[1]);
  check(overlaySrcs.length > 0, 'eraOverlayImage 至少声明一幅真实古图');
  overlaySrcs.forEach((src) => check(existsSync(join(root, 'public', src)), `古图素材存在：${src}`));
}

// 地图引擎 GeoJSON（MapLibre 数据源）必须存在且非空
for (const geoName of ['land', 'rivers', 'coast', 'grow-rivers', 'lakes']) {
  const geoPath = join(root, 'public', 'geo', `${geoName}.json`);
  check(existsSync(geoPath), `地图数据存在：geo/${geoName}.json`);
  if (existsSync(geoPath)) {
    const fc = JSON.parse(readFileSync(geoPath, 'utf8'));
    check(Array.isArray(fc.features) && fc.features.length > 0, `地图数据非空：geo/${geoName}.json`);
  }
}
check(existsSync(join(root, 'public', 'assets', 'maps', 'yujitu-1136-loc.jpg')), '禹迹图配准用图存在');

// 历代图卷：字段完整、素材存在、许可在白名单内
const atlasData = JSON.parse(readFileSync(join(contentDir, 'atlas.json'), 'utf8'));
const ATLAS_LICENSES = ['Public domain', 'CC0', 'CC BY 3.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0'];
check(Array.isArray(atlasData) && atlasData.length >= 45, `atlas.json 收录至少 45 幅历代地图（当前 ${Array.isArray(atlasData) ? atlasData.length : 0} 幅）`);
const atlasIds = new Set();
atlasData.forEach((item, index) => {
  const label = `atlas.json 第 ${index + 1} 条（${item?.id ?? '?'}）`;
  ['id', 'period', 'years', 'type', 'file', 'author', 'license', 'source'].forEach((field) => {
    check(isFilled(item?.[field]), `${label} 的 ${field} 为非空字符串`);
  });
  if (isFilled(item?.id)) {
    if (atlasIds.has(item.id)) check(false, `${label} 的 id 重复`);
    atlasIds.add(item.id);
  }
  check(ATLAS_LICENSES.includes(item?.license), `${label} 的许可在白名单内（${ATLAS_LICENSES.join(' / ')}）`);
  check(/^https:\/\/commons\.wikimedia\.org\//.test(item?.source ?? ''), `${label} 的 source 指向维基共享资源`);
  check(['存世图件', '重绘形势图', '近代出版图件'].includes(item?.type), `${label} 的 type 属于三类之一`);
  check(existsSync(join(root, 'public', item?.file ?? '/nonexistent')), `图卷素材存在：${item?.file}`);
});

if (failures.length) {
  console.error(`\n内容数据校验失败：${failures.length} 项`);
  process.exit(1);
}

console.log('\n内容数据校验通过。');
