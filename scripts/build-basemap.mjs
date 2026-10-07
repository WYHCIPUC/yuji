// 从 Natural Earth 50m 公有领域数据生成真实地理底图（src/content/basemap.json）。
// 数据缓存于 artifacts/geo/（gitignored），来源：
//   https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/
// 投影：等距圆柱（纬度按 cos(中纬度) 修正），框定中国及邻近区域，适配地图舞台 viewBox。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const geoDir = join(root, 'artifacts', 'geo');
const files = {
  coast: 'ne_50m_coastline.json',
  rivers: 'ne_50m_rivers_lake_centerlines.json',
  lakes: 'ne_50m_lakes.json',
};

for (const file of Object.values(files)) {
  if (!existsSync(join(geoDir, file))) {
    console.error(`缺少 ${join(geoDir, file)}。请先下载 Natural Earth 50m 数据放入该目录。`);
    process.exit(1);
  }
}

// 视觉框：地图舞台 clip 区（与 main.ts 的 map-clip 一致）。
const FRAME = { x: 86, y: 42, w: 828, h: 500 };
// 地理框：中国大陆及邻近（含台海、海南、朝鲜半岛一部、北越一部）。
const BBOX = { lon0: 73, lon1: 135.5, lat0: 15.5, lat1: 54.5 };
const MID_LAT = ((BBOX.lat0 + BBOX.lat1) / 2) * (Math.PI / 180);
const COS_MID = Math.cos(MID_LAT);
const LON_SPAN = BBOX.lon1 - BBOX.lon0;
const LAT_SPAN = (BBOX.lat1 - BBOX.lat0) * COS_MID;
const SCALE = Math.min(FRAME.w / LON_SPAN, FRAME.h / LAT_SPAN);
const DRAWN_W = LON_SPAN * SCALE;
const DRAWN_H = LAT_SPAN * SCALE;
const OFF_X = FRAME.x + (FRAME.w - DRAWN_W) / 2;
const OFF_Y = FRAME.y + (FRAME.h - DRAWN_H) / 2;

export function project(lon, lat) {
  return {
    x: Number((OFF_X + (lon - BBOX.lon0) * SCALE).toFixed(1)),
    y: Number((OFF_Y + (BBOX.lat1 - lat) * SCALE * COS_MID).toFixed(1)),
  };
}

function inBBox([lon, lat], pad = 2) {
  return lon >= BBOX.lon0 - pad && lon <= BBOX.lon1 + pad && lat >= BBOX.lat0 - pad && lat <= BBOX.lat1 + pad;
}

function eachPoint(geometry, cb) {
  if (!geometry) return;
  if (geometry.type === 'MultiPolygon') for (const p of geometry.coordinates.flat(2)) cb(p);
  else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') for (const p of geometry.coordinates.flat(1)) cb(p);
  else if (geometry.type === 'LineString') for (const p of geometry.coordinates) cb(p);
}

function featureIntersects(geometry, pad) {
  if (!geometry) return false;
  let hit = false;
  eachPoint(geometry, (point) => { if (!hit && inBBox(point, pad)) hit = true; });
  return hit;
}

// 线串/多边形 → SVG path，逐步抽稀（移动 < 1.5px 的点丢弃）并取整。
function ringToPath(ring) {
  let d = '';
  let last = null;
  for (const [lon, lat] of ring) {
    const p = project(lon, lat);
    if (last && Math.abs(p.x - last.x) < 1.5 && Math.abs(p.y - last.y) < 1.5) continue;
    d += `${d ? 'L' : 'M'}${p.x} ${p.y}`;
    last = p;
  }
  return d;
}

function geometryToPaths(geometry) {
  const out = [];
  const push = (rings, close) => {
    for (const ring of rings) {
      const d = ringToPath(ring);
      if (d.length > 24) out.push(close ? `${d}Z` : d);
    }
  };
  if (geometry.type === 'LineString') push([geometry.coordinates], false);
  else if (geometry.type === 'MultiLineString') push(geometry.coordinates, false);
  else if (geometry.type === 'Polygon') push(geometry.coordinates, true);
  else if (geometry.type === 'MultiPolygon') push(geometry.coordinates, true);
  return out;
}

const readGeo = (name) => JSON.parse(readFileSync(join(geoDir, files[name]), 'utf8'));

// 海岸线与国界以外的水系按“区域内”筛选；超界部分交给 SVG clipPath 裁剪。
const coast = [];
for (const f of readGeo('coast').features) {
  if (!featureIntersects(f.geometry, 1)) continue;
  coast.push(...geometryToPaths(f.geometry));
}

const rivers = [];
for (const f of readGeo('rivers').features) {
  if (!featureIntersects(f.geometry, 1)) continue;
  const name = f.properties?.name || '';
  for (const d of geometryToPaths(f.geometry)) rivers.push({ name, d });
}

const lakes = [];
for (const f of readGeo('lakes').features) {
  if (!featureIntersects(f.geometry, 1)) continue;
  for (const d of geometryToPaths(f.geometry)) lakes.push({ d });
}

const basemap = {
  source: 'Natural Earth 50m（公有领域，naturalearthdata.com）',
  projection: { lon0: BBOX.lon0, lat1: BBOX.lat1, scale: Number(SCALE.toFixed(4)), cosMid: Number(COS_MID.toFixed(4)), offX: Number(OFF_X.toFixed(1)), offY: Number(OFF_Y.toFixed(1)) },
  coast,
  rivers,
  lakes,
};

const outPath = join(root, 'src', 'content', 'basemap.json');
writeFileSync(outPath, JSON.stringify(basemap));
console.log(`coast ${coast.length} 段 / rivers ${rivers.length} 条 / lakes ${lakes.length} 个 → ${outPath}（${(JSON.stringify(basemap).length / 1024).toFixed(0)}KB）`);
