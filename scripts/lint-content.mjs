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

// 真实地理底图数据必须存在且非空
const basemapPath = join(root, 'src', 'content', 'basemap.json');
check(existsSync(basemapPath), 'basemap.json 存在');
if (existsSync(basemapPath)) {
  const basemap = JSON.parse(readFileSync(basemapPath, 'utf8'));
  check(Array.isArray(basemap.coast) && basemap.coast.length > 0, 'basemap 海岸线数据非空');
  check(Array.isArray(basemap.rivers) && basemap.rivers.length > 0, 'basemap 河流数据非空');
  check(Array.isArray(basemap.lakes) && basemap.lakes.length > 0, 'basemap 湖泊数据非空');
  check(typeof basemap.projection?.scale === 'number' && basemap.projection.scale > 0, 'basemap 投影参数有效');
}

if (failures.length) {
  console.error(`\n内容数据校验失败：${failures.length} 项`);
  process.exit(1);
}

console.log('\n内容数据校验通过。');
