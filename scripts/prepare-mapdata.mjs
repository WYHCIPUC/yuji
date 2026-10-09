// 从 Natural Earth 原始数据（artifacts/geo/）生成地图引擎用的 GeoJSON，输出到 public/geo/。
// 裁剪到东亚视口范围；超出部分由地图视口自然裁剪，不做几何裁剪。
// 黄河/长江单独输出为自西向东排序的 LineString，供 line-gradient「生长」动画使用。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const geoDir = join(root, 'artifacts', 'geo');
const outDir = join(root, 'public', 'geo');
mkdirSync(outDir, { recursive: true });

const BBOX = [68, 12, 142, 46]; // [lon0, lat0, lon1, lat1]

const read = (name) => JSON.parse(readFileSync(join(geoDir, name), 'utf8'));

function inBBoxPoint(p) {
  return p[0] >= BBOX[0] && p[0] <= BBOX[2] && p[1] >= BBOX[1] && p[1] <= BBOX[3];
}
function featureTouches(f) {
  if (!f.geometry) return false;
  const g = f.geometry;
  if (g.type === 'MultiPolygon') return g.coordinates.flat(2).some(inBBoxPoint);
  if (g.type === 'Polygon' || g.type === 'MultiLineString') return g.coordinates.flat(1).some(inBBoxPoint);
  if (g.type === 'LineString') return g.coordinates.some(inBBoxPoint);
  return false;
}
function round2(coords) {
  return coords.map((c) => [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100]);
}
function simplifyGeom(g) {
  if (g.type === 'Polygon') return { type: 'Polygon', coordinates: g.coordinates.map(round2) };
  if (g.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: g.coordinates.map((p) => p.map(round2)) };
  if (g.type === 'LineString') return { type: 'LineString', coordinates: round2(g.coordinates) };
  if (g.type === 'MultiLineString') return { type: 'MultiLineString', coordinates: g.coordinates.map(round2) };
  return g;
}

function convert(dataset, filter = () => true) {
  const src = read(dataset);
  const features = [];
  for (const f of src.features) {
    if (!f.geometry || !featureTouches(f) || !filter(f)) continue;
    features.push({ type: 'Feature', properties: { name: f.properties?.name || '' }, geometry: simplifyGeom(f.geometry) });
  }
  return { type: 'FeatureCollection', features };
}

// 普通图层
const land = convert('ne_50m_land.json');
const lakes = convert('ne_50m_lakes.json');
const riversAll = convert('ne_50m_rivers_lake_centerlines.json');
const coast = convert('ne_50m_coastline.json');

// 黄河 / 长江：拆成 LineString、按经度升序（自西向东），供生长动画
const GROW_NAMES = new Set(['Huang He', 'Huanghe', 'Huang', 'Yellow River', 'Yangtze', 'Chang Jiang', 'Yangtze Kiang']);
const growFeatures = [];
for (const f of riversAll.features) {
  const name = f.properties?.name || '';
  if (!GROW_NAMES.has(name)) continue;
  const lines = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const line of lines) {
    if (line.length < 10) continue;
    const sorted = [...line].sort((a, b) => a[0] - b[0]); // 自西向东
    growFeatures.push({ type: 'Feature', properties: { name }, geometry: { type: 'LineString', coordinates: sorted } });
  }
}
const riversOther = { type: 'FeatureCollection', features: riversAll.features.filter((f) => !GROW_NAMES.has(f.properties?.name || '')) };

writeFileSync(join(outDir, 'land.json'), JSON.stringify(land));
writeFileSync(join(outDir, 'lakes.json'), JSON.stringify(lakes));
writeFileSync(join(outDir, 'rivers.json'), JSON.stringify(riversOther));
writeFileSync(join(outDir, 'coast.json'), JSON.stringify(coast));
writeFileSync(join(outDir, 'grow-rivers.json'), JSON.stringify({ type: 'FeatureCollection', features: growFeatures }));
console.log(`land ${land.features.length} / rivers ${riversOther.features.length} / grow ${growFeatures.length} 条 / lakes ${lakes.features.length} / coast ${coast.features.length}`);
growFeatures.forEach((f) => console.log('  生长河流:', f.properties.name, f.geometry.coordinates.length, '点'));
