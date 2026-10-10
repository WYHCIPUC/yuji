// V2 地名库扩容流水线：CHGIS V6 时序数据（县点 + 府点 [+ 府界]）→ 禹迹数据层。
//
// 输入（均不入库，放 release/_tmp/yuji-m2/，见 docs/v2-place-expansion.md §6）：
//   cnty/v6_time_cnty_pts_utf_wgs84.{shp,dbf}     县级治所点（doi:10.7910/DVN/Q9VOF5）
//   prefpts/v6_time_pref_pts_utf_wgs84.{shp,dbf}  府级治所点（doi:10.7910/DVN/WW1PD6）
//   prefpoly/v6_time_pref_pgn_utf_wgs84.{shp,dbf} 府级政区多边形（doi:10.7910/DVN/I0Q7SM，可选）
//   ne_admin1_10m/ne_10m_admin_1_states_provinces.{shp,dbf}  Natural Earth 10m 今行政区（仅反查省名，公版；50m 版不含中国省界，勿用）
//
// 输出：
//   src/content/places-dataset.json      数据层（生成物，禁止手改）
//   public/geo/hist-pref/pref-polygons.json  政区格局示意层（Voronoi 示意边界，必须带声明）
//   docs/expand-report.md                生成报告（数量/分布/口径如实记录）
//
// 用法：node scripts/expand-places.mjs [--no-polygons]
// 红线：叙事止于 1602 —— 所有年份在此硬过滤/截断，lint 会再校验一次。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const tmpDir = join(root, 'release', '_tmp', 'yuji-m2');
const withPolygons = !process.argv.includes('--no-polygons');

const CUTOFF = 1602; // 叙事红线
const BBOX = [70, 15, 140, 52]; // 经纬粗框（覆盖历史中国及朝鲜半岛/越南北部治所）

const SOURCES = {
  county: 'CHGIS V6 时序县级治所点',
  prefecture: 'CHGIS V6 时序府级治所点',
};
const SOURCE_DOIS = {
  county: 'doi:10.7910/DVN/Q9VOF5',
  prefecture: 'doi:10.7910/DVN/WW1PD6',
};
// 七幕锚点（年份数字，负数为公元前；各段按锚点首尾相接，用于报告分段统计）
const ERA_ANCHORS = [
  ['shangzhou', -1600], ['zhanguo', -475], ['qinhan', -221],
  ['suitang', 581], ['yujitu', 1136], ['mingchu', 1405], ['kunyu', 1602],
];
const CITATION =
  'CHGIS, Version 6. (c) Fairbank Center for Chinese Studies and the Institute for Chinese Historical Geography at Fudan University, Dec 2016.';
const DISCLAIMER =
  '本层由 CHGIS V6 府级治所点经 Voronoi 邻近分配派生，为示意重绘，非历史政区实边界，不代表任何现实主张。';

// ---------- shapefile / dbf 最小解析（仅实现本项目用到的图形类型） ----------

function parseDbf(path) {
  const buf = readFileSync(path);
  const nRec = buf.readUInt32LE(4);
  const hLen = buf.readUInt16LE(8);
  const rLen = buf.readUInt16LE(10);
  const fields = [];
  let p = 32;
  while (buf[p] !== 0x0d) {
    const name = buf.toString('ascii', p, p + 11).split('\u0000')[0].trim();
    fields.push({ name, len: buf[p + 16] });
    p += 32;
  }
  const rows = [];
  for (let i = 0; i < nRec; i += 1) {
    const base = hLen + i * rLen;
    if (buf[base] !== 0x20) continue; // 已删除记录
    const row = {};
    let off = base + 1;
    for (const f of fields) {
      row[f.name] = buf.toString('utf8', off, off + f.len).replace(/\u0000/g, '').trim();
      off += f.len;
    }
    rows.push(row);
  }
  return rows;
}

function parseShp(path) {
  const buf = readFileSync(path);
  const geoms = [];
  let p = 100;
  while (p + 8 <= buf.length) {
    const contentWords = buf.readUInt32BE(p + 4);
    const len = contentWords * 2;
    const content = buf.subarray(p + 8, p + 8 + len);
    const type = content.length >= 4 ? content.readInt32LE(0) : 0;
    if (type === 1) {
      // Point
      geoms.push({ type: 'Point', x: content.readDoubleLE(4), y: content.readDoubleLE(12) });
    } else if (type === 5 || type === 15) {
      // Polygon / MultiPolygon。单个多边形布局：shapeType(4)+box(32)+numParts(4)+numPoints(4)+parts+points
      const polys = [];
      const readPolygon = (c) => {
        const numParts = c.readInt32LE(36);
        const numPts = c.readInt32LE(40);
        const parts = [];
        for (let i = 0; i < numParts; i += 1) parts.push(c.readInt32LE(44 + i * 4));
        const ptsBase = 44 + numParts * 4;
        const rings = parts.map((start, i) => {
          const end = i + 1 < numParts ? parts[i + 1] : numPts;
          const ring = [];
          for (let j = start; j < end; j += 1) {
            ring.push([c.readDoubleLE(ptsBase + j * 16), c.readDoubleLE(ptsBase + j * 16 + 8)]);
          }
          return ring;
        });
        return rings.filter((r) => r.length >= 4);
      };
      if (type === 5) polys.push(readPolygon(content));
      else {
        const n = content.readInt32LE(4);
        let off = 8;
        for (let i = 0; i < n; i += 1) {
          const sub = content.subarray(off);
          const numParts = sub.readInt32LE(36);
          const numPts = sub.readInt32LE(40);
          polys.push(readPolygon(sub));
          off += 44 + numParts * 4 + numPts * 16;
        }
      }
      geoms.push(polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys });
    } else if (type === 0) {
      geoms.push(null);
    } else {
      throw new Error(`未支持的 shape 类型 ${type}（${path}）`);
    }
    p += 8 + len;
  }
  return geoms;
}

// ---------- 今地反查（Natural Earth admin1，点在多边形内判定） ----------

const EN2ZH = {
  Shanxi: '山西省', Shaanxi: '陕西省', Hebei: '河北省', Henan: '河南省', Shandong: '山东省',
  Jiangsu: '江苏省', Anhui: '安徽省', Zhejiang: '浙江省', Jiangxi: '江西省', Fujian: '福建省',
  Guangdong: '广东省', Guangxi: '广西壮族自治区', Hainan: '海南省', Hubei: '湖北省', Hunan: '湖南省',
  Sichuan: '四川省', Chongqing: '重庆市', Guizhou: '贵州省', Yunnan: '云南省', Gansu: '甘肃省',
  Qinghai: '青海省', 'Ningxia Hui': '宁夏回族自治区', 'Inner Mongolia': '内蒙古自治区', Xinjiang: '新疆维吾尔自治区',
  Tibet: '西藏自治区', 'Xizang': '西藏自治区', Liaoning: '辽宁省', Jilin: '吉林省', Heilongjiang: '黑龙江省',
  Beijing: '北京市', Tianjin: '天津市', Shanghai: '上海市', Taiwan: '台湾省',
  'Hong Kong': '香港特别行政区', Macau: '澳门特别行政区',
};
const COUNTRY2ZH = {
  China: null, Mongolia: '蒙古国', Russia: '俄罗斯', 'North Korea': '朝鲜', 'South Korea': '韩国',
  Vietnam: '越南', Myanmar: '缅甸', Laos: '老挝', Thailand: '泰国', Cambodia: '柬埔寨',
  Kazakhstan: '哈萨克斯坦', Kyrgyzstan: '吉尔吉斯斯坦', Tajikistan: '塔吉克斯坦', Afghanistan: '阿富汗',
  Pakistan: '巴基斯坦', India: '印度', Nepal: '尼泊尔', Bhutan: '不丹', Japan: '日本',
};

function buildRegionIndex() {
  const base = join(tmpDir, 'ne_admin1_10m');
  if (!existsSync(join(base, 'ne_10m_admin_1_states_provinces.shp'))) return null;
  const rows = parseDbf(join(base, 'ne_10m_admin_1_states_provinces.dbf'));
  const geoms = parseShp(join(base, 'ne_10m_admin_1_states_provinces.shp'));
  const regions = [];
  rows.forEach((row, i) => {
    const g = geoms[i];
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return;
    if (!COUNTRY2ZH.hasOwnProperty(row.admin ?? '')) return;
    const rings = [];
    const collect = (coords) => {
      for (const ring of coords) {
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        rings.push({ bbox: [minX, minY, maxX, maxY], ring });
      }
    };
    if (g.type === 'Polygon') collect(g.coordinates);
    else g.coordinates.forEach((poly) => collect(poly));
    regions.push({ name: row.name ?? '', admin: row.admin, rings });
  });
  return regions;
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function lookupModern(regions, lng, lat, presLoc) {
  if (regions) {
    for (const r of regions) {
      for (const { bbox, ring } of r.rings) {
        if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
        if (pointInRing(lng, lat, ring)) {
          if (r.admin === 'China') return EN2ZH[r.name] ?? `中国${r.name}`;
          return `（今属${COUNTRY2ZH[r.admin]}）`;
        }
      }
    }
  }
  // 反查失败：用 CHGIS 官方今地描述的首段省级信息兜底
  const m = (presLoc ?? '').replace(/^今/, '').match(/^(黑龙江|吉林|辽宁|内蒙古|河北|山西|山东|河南|陕西|甘肃|青海|宁夏|新疆|四川|重庆|云南|贵州|湖北|湖南|广西|广东|海南|福建|江西|浙江|安徽|江苏|上海|台湾|蒙古|俄罗斯|朝鲜|韩国|越南|缅甸|老挝)/);
  if (m) return `${m[1]}（据CHGIS今地注记）`;
  return '（今地待考）';
}

// ---------- 点位数据层 ----------

function parseInt10(v) {
  if (v == null || v === '' || v === '*') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function loadSeats(sub, level, sourceLabel) {
  const rows = parseDbf(join(tmpDir, sub, `v6_time_${sub === 'cnty' ? 'cnty' : 'pref'}_pts_utf_wgs84.dbf`));
  const geoms = parseShp(join(tmpDir, sub, `v6_time_${sub === 'cnty' ? 'cnty' : 'pref'}_pts_utf_wgs84.shp`));
  const stats = { total: rows.length, noGeom: 0, outOfBbox: 0, badYears: 0, after1602: 0, kept: 0 };
  const seats = new Map(); // key -> entry（同名且坐标 <0.5° 合并）
  rows.forEach((row, i) => {
    const g = geoms[i];
    const name = row.NAME_CH ?? '';
    if (!g || g.type !== 'Point') { stats.noGeom += 1; return; }
    const lng = g.x;
    const lat = g.y;
    if (lng < BBOX[0] || lng > BBOX[2] || lat < BBOX[1] || lat > BBOX[3]) { stats.outOfBbox += 1; return; }
    if (!name) { stats.badYears += 1; return; }
    const beg = parseInt10(row.BEG_YR);
    let end = parseInt10(row.END_YR);
    if (beg == null) { stats.badYears += 1; return; }
    if (beg > CUTOFF) { stats.after1602 += 1; return; }
    if (end == null || end === 0 || end > CUTOFF) end = CUTOFF; // 截断/未知结束年 → 红线截断
    if (end < beg) end = beg;

    // 同名且坐标 0.5° 内 → 同一治所，合并存在期
    let entry = null;
    for (const [key, cand] of seats) {
      if (cand.name !== name) continue;
      if (Math.abs(cand.lng - lng) < 0.5 && Math.abs(cand.lat - lat) < 0.5) { entry = cand; void key; break; }
    }
    if (!entry) {
      entry = {
        name,
        pinyin: row.NAME_PY ?? '',
        ft: row.NAME_FT && row.NAME_FT !== name ? row.NAME_FT : undefined,
        level,
        kind: row.TYPE_CH ?? '',
        presLoc: (row.PRES_LOC ?? '').replace(/^今/, '') || undefined,
        lng: Math.round(lng * 10000) / 10000,
        lat: Math.round(lat * 10000) / 10000,
        presences: [],
        source: sourceLabel,
        certainty: '合理解释',
      };
      seats.set(`${level}|${name}|${entry.lng}|${entry.lat}`, entry);
    }
    entry.presences.push({ from: beg, to: end });
    stats.kept += 1;
  });
  return { seats: [...seats.values()], stats };
}

function mergePresences(entry) {
  const sorted = entry.presences.sort((a, b) => a.from - b.from || a.to - b.to);
  const merged = [];
  for (const p of sorted) {
    const last = merged[merged.length - 1];
    if (last && p.from <= last.to + 1) {
      if (p.to > last.to) last.to = p.to;
    } else merged.push({ ...p });
  }
  entry.presences = merged;
  return entry;
}

// ---------- 府界多边形（Voronoi 示意层） ----------

function simplifyRing(ring, eps) {
  if (ring.length < 5) return ring;
  // 闭合环（首尾同点）会造成 RDP 起始弦长为零 → 先断开成开放链，锚定 0 与最远点，最后再闭合
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const open = closed ? ring.slice(0, -1) : ring;
  const keep = new Array(open.length).fill(false);
  keep[0] = keep[open.length - 1] = true;
  let far = 1;
  let farD = -1;
  for (let i = 1; i < open.length - 1; i += 1) {
    const d = Math.hypot(open[i][0] - open[0][0], open[i][1] - open[0][1]);
    if (d > farD) { farD = d; far = i; }
  }
  keep[far] = true;
  const stack = [[0, far], [far, open.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = -1;
    let idx = -1;
    const [ax, ay] = open[a];
    const [bx, by] = open[b];
    const dx = bx - ax;
    const dy = by - ay;
    const norm = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i += 1) {
      const d = Math.abs((open[i][0] - ax) * dy - (open[i][1] - ay) * dx) / norm;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  let out = open.filter((_, i) => keep[i]);
  if (closed) out = [...out, out[0]];
  return out.length >= 4 ? out : ring;
}

function buildPolygons() {
  const base = join(tmpDir, 'prefpoly');
  if (!existsSync(join(base, 'v6_time_pref_pgn_utf_wgs84.shp'))) return null;
  const rows = parseDbf(join(base, 'v6_time_pref_pgn_utf_wgs84.dbf'));
  const geoms = parseShp(join(base, 'v6_time_pref_pgn_utf_wgs84.shp'));
  const features = [];
  let dropped = 0;
  rows.forEach((row, i) => {
    const beg = parseInt10(row.BEG_YR);
    if (beg == null || beg > CUTOFF) { dropped += 1; return; }
    let end = parseInt10(row.END_YR);
    if (end == null || end === 0 || end > CUTOFF) end = CUTOFF;
    if (end < beg) end = beg;
    const g = geoms[i];
    if (!g) { dropped += 1; return; }
    const simplify = (coords) => coords.map((ring) =>
      simplifyRing(ring, 0.03).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
    );
    const geometry = g.type === 'Polygon'
      ? { type: 'Polygon', coordinates: simplify(g.coordinates) }
      : { type: 'MultiPolygon', coordinates: g.coordinates.map(simplify) };
    features.push({
      type: 'Feature',
      properties: { name: row.NAME_CH ?? '', from: beg, to: end, kind: row.TYPE_CH ?? '' },
      geometry,
    });
  });
  return { type: 'FeatureCollection', disclaimer: DISCLAIMER, citation: CITATION, features, _dropped: dropped };
}

// ---------- 主流程 ----------

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

['cnty', 'prefpts'].forEach((sub) => {
  for (const ext of ['shp', 'dbf']) {
    if (!existsSync(join(tmpDir, sub, `v6_time_${sub === 'cnty' ? 'cnty' : 'pref'}_pts_utf_wgs84.${ext}`))) {
      fail(`缺少输入文件 release/_tmp/yuji-m2/${sub}/（下载说明见 docs/v2-place-expansion.md §6）`);
    }
  }
});

const eras = JSON.parse(readFileSync(join(root, 'src', 'content', 'eras.json'), 'utf8'));
const eraById = new Map(eras.map((e) => [e.id, e]));
const narrativeNames = new Set(
  JSON.parse(readFileSync(join(root, 'src', 'content', 'places.json'), 'utf8')).map((p) => p.name)
);

const regions = buildRegionIndex();
const county = loadSeats('cnty', '县', SOURCES.county);
const prefecture = loadSeats('prefpts', '府', SOURCES.prefecture);

// 跨文件去重：同名且坐标 <0.2° 时，县条目让位给府条目
const prefSeats = prefecture.seats;
let crossDropped = 0;
const countySeats = county.seats.filter((c) => {
  for (const p of prefSeats) {
    if (p.name === c.name && Math.abs(p.lng - c.lng) < 0.2 && Math.abs(p.lat - c.lat) < 0.2) {
      crossDropped += 1;
      return false;
    }
  }
  return true;
});

// 叙事层已有的名称不重复入库
const beforeSkip = countySeats.length + prefSeats.length;
const all = [...prefSeats, ...countySeats]
  .filter((e) => !narrativeNames.has(e.name))
  .map(mergePresences);
const narrativeSkipped = beforeSkip - all.length;

// 今地反查
for (const e of all) e.modern = lookupModern(regions, e.lng, e.lat, e.presLoc);

all.sort((a, b) => a.level.localeCompare(b.level, 'zh') || a.pinyin.localeCompare(b.pinyin) || a.name.localeCompare(b.name, 'zh'));

const meta = {
  _generated: 'scripts/expand-places.mjs — 生成物，禁止手改；重新生成见 docs/v2-place-expansion.md',
  cutoff: CUTOFF,
  citation: CITATION,
  sources: {
    'CHGIS V6 时序县级治所点': SOURCE_DOIS.county,
    'CHGIS V6 时序府级治所点': SOURCE_DOIS.prefecture,
    'CHGIS V6 府级政区多边形': 'doi:10.7910/DVN/I0Q7SM',
  },
  license: 'CHGIS V6 EULA：学术研究与教育用途、非商业、不得再分发原始数据（doi:10.7910/DVN/FDLFJ3）',
  count: all.length,
};
mkdirSync(join(root, 'src', 'content'), { recursive: true });
writeFileSync(join(root, 'src', 'content', 'places-dataset.json'), `${JSON.stringify({ ...meta, places: all })}\n`);

// 府界示意层
let polygonInfo = '未找到府界输入，跳过（--no-polygons 可显式关闭）';
if (withPolygons) {
  const fc = buildPolygons();
  if (fc) {
    const { _dropped, ...out } = fc;
    mkdirSync(join(root, 'public', 'geo', 'hist-pref'), { recursive: true });
    const text = JSON.stringify(out);
    writeFileSync(join(root, 'public', 'geo', 'hist-pref', 'pref-polygons.json'), `${text}\n`);
    polygonInfo = `${out.features.length} 个要素（过滤 ${_dropped}），${(text.length / 1024).toFixed(0)} KB${text.length > 3 * 1024 * 1024 ? '（⚠ 超过 3MB，考虑加大简化阈值）' : ''}`;
  }
}

// 报告
const eraBuckets = ERA_ANCHORS.map(([id, from], i) => {
  const to = i + 1 < ERA_ANCHORS.length ? ERA_ANCHORS[i + 1][1] - 1 : CUTOFF;
  const count = all.filter((e) => e.presences.some((p) => p.from <= to && p.to >= from)).length;
  const title = eraById.get(id)?.title ?? id;
  return { title, span: `${from}–${to}`, count };
});
const kindDist = {};
all.forEach((e) => { kindDist[e.kind || '未注'] = (kindDist[e.kind || '未注'] ?? 0) + 1; });
const modernUnknown = all.filter((e) => e.modern === '（今地待考）').length;
const multiPresence = all.filter((e) => e.presences.length > 1).length;

const report = `# 地名数据层生成报告

- 生成时间：${new Date().toISOString()}
- 生成脚本：scripts/expand-places.mjs（可复现，输入清单见脚本头注释）
- 数据来源与引用：${CITATION}

## 总量

| 指标 | 数值 |
|---|---|
| 数据层条目 | **${all.length}** |
| 原始存在记录（县+府） | ${county.stats.total + prefecture.stats.total} |
| 保留记录 / 合并前 | ${county.stats.kept + prefecture.stats.kept} |
| 1602 后开始的存在（剔除） | ${county.stats.after1602 + prefecture.stats.after1602} |
| 越出粗框 / 无坐标 / 年份异常（剔除） | ${county.stats.outOfBbox + prefecture.stats.outOfBbox} / ${county.stats.noGeom + prefecture.stats.noGeom} / ${county.stats.badYears + prefecture.stats.badYears} |
| 跨文件同名同座，县让位给府 | ${crossDropped} |
| 叙事层已有名称（跳过） | ${narrativeSkipped} |
| 存在期断续（多区间）条目 | ${multiPresence} |
| 今地待考 | ${modernUnknown} |

## 层级

- 县级：${all.filter((e) => e.level === '县').length} 条
- 府级：${all.filter((e) => e.level === '府').length} 条

## 分段覆盖（按七幕锚点首尾相接切分；条目存在期与该段有交集即计入）

${eraBuckets.map((b) => `| ${b.title}（${b.span}） | ${b.count} |`).join('\n')}

## 类型分布（TYPE_CH）

${Object.entries(kindDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}：${v}`).join('，')}

## 府界示意层

${polygonInfo}

## 口径说明（如实记录）

1. **红线截断**：END_YR 缺失或晚于 1602 的存在期一律截断至 1602；BEG_YR 晚于 1602 的整条剔除。
2. **合并口径**：同名且坐标相距 <0.5° 的存在记录并为同一治所，存在期相接（间隔 ≤1 年）则合并为一段；断续期保留多段。
3. **跨文件去重**：同名且坐标 <0.2° 同时出现于县/府文件时，保留府级条目。
4. **今地对照**：优先以 Natural Earth（公版）省界点包含判定；未命中时用 CHGIS 官方今地注记（PRES_LOC）的省级前缀兜底；仍无则「今地待考」。境外治所标注「今属某国」。
5. **坐标精度**：取自 shapefile 双精度坐标，保留 4 位小数（约 ±10m），治所点位为 CHGIS 概化位置，UI 须注明「示意精度」。
6. **考订口径**：certainty 统一为「合理解释」（CHGIS 单源转引）；与叙事层发生分歧时以叙事层两说并存口径为准。
7. **府界覆盖差异**：府界数据集仅含 3830 个存在期（点文件为 5226）——CHGIS 只为其中一部分生成了 Voronoi 面；本层示意覆盖不到的存在期，示意层留白即可，不代表该时期无建置。
`;

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'expand-report.md'), report);

console.log(`✓ 数据层 ${all.length} 条（县 ${all.filter((e) => e.level === '县').length} / 府 ${all.filter((e) => e.level === '府').length}）`);
console.log(`✓ 今地待考 ${modernUnknown} 条；报告已写入 docs/expand-report.md`);
console.log(`✓ 府界：${polygonInfo}`);
if (all.length < 2000) console.log(`⚠ 条目 ${all.length} < 2000 目标，已在报告如实记录`);
