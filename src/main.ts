import eras from './content/eras.json';
import places from './content/places.json';
import storytellers from './content/storytellers.json';
import sources from './content/sources.json';
import atlas from './content/atlas.json';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/responsive.css';

// Vite 打包下把 worker 作为静态资源发出，避免 import.meta.url 推导失效。
maplibregl.config.WORKER_URL = workerUrl;

type Era = (typeof eras)[number];
type Place = (typeof places)[number];
type Storyteller = (typeof storytellers)[number];

// 可点按地名：真实经纬度；名字必须能在 places.json 中查到（由 scripts/lint-content.mjs 校验）。
const mapPlaces = [
  { name: '敦煌', lng: 94.66, lat: 40.14 },
  { name: '长安', lng: 108.94, lat: 34.34 },
  { name: '洛阳', lng: 112.45, lat: 34.62 },
  { name: '建康', lng: 118.78, lat: 32.06 },
  { name: '临安', lng: 120.16, lat: 30.25 },
  { name: '燕京', lng: 116.4, lat: 39.9 },
  { name: '广州', lng: 113.26, lat: 23.13 },
];

// 天下模型与时代的默认对应；用户仍可手动切换。
const modelByEra: Record<string, string> = { shangzhou: '服制', zhanguo: '九州', qinhan: '郡县', suitang: '画方', yujitu: '画方', mingchu: '针路', kunyu: '地圆' };
const modelCopy: Record<string, string> = {
  服制: '以王畿为中心层层向外，天下首先是一种关系秩序。地图上显示五服同心圆的范围。',
  九州: '《禹贡》划分九州：冀、兖、青、徐、扬、荆、豫、梁、雍。点击地图上的色块看各州。',
  郡县: '世界被分成可以管理、丈量和征调的地方单元。地图上显示 CHGIS 府级政区示意（邻近分配，非历史实边界）。',
  画方: '计里画方，每方折地百里——比例成为地图的语言。地图上显示经纬网格。',
  针路: '以罗盘方位与更数记程，海图上每一段航线都有针字为凭。地图上显示郑和航线。',
  地圆: '大地不再有边缘，而是一个可以绕行一周的球体。缩小地图看看。',
};

const eraChar: Record<string, string> = { shangzhou: '商', zhanguo: '海', qinhan: '秦', suitang: '唐', yujitu: '宋', mingchu: '航', kunyu: '明' };

// 每一幕的真迹/图件（对照面板与放大查看用；禹迹图另做地理配准叠加）。
const eraOverlayImage: Record<string, { src: string; caption: string }> = {
  qinhan: { src: 'assets/maps/atlas/qin.jpg', caption: '秦疆域图（前 221 年）· 重绘 · CC BY-SA' },
  suitang: { src: 'assets/maps/atlas/tang660.jpg', caption: '唐帝国与都护府（约 660 年）· 重绘 · CC0' },
  yujitu: { src: 'assets/maps/yujitu-1136-loc.jpg', caption: '《禹迹图》1136 年石刻拓本（已按真实位置叠加）' },
  mingchu: { src: 'assets/maps/atlas/maokun-sumatra.jpg', caption: '《郑和航海图》苏门答腊段 · 《武备志》· 公有领域' },
  kunyu: { src: 'assets/maps/kunyu-wanguo-1602.jpg', caption: '《坤舆万国全图》 · 1602 · 公有领域' },
};

// 七幕「生长」强度：拖动时间轴时相邻两幕连续插值——想象淡出、实测淡入。
interface EraIntensity { rings: number; stars: number; geo: number; places: number; overlay: number; routes: number }
const eraIntensity: Record<string, EraIntensity> = {
  shangzhou: { rings: 0.9, stars: 0.25, geo: 0.06, places: 0.14, overlay: 0, routes: 0 },
  zhanguo: { rings: 0.2, stars: 0.85, geo: 0.08, places: 0.16, overlay: 0, routes: 0 },
  qinhan: { rings: 0, stars: 0.06, geo: 0.45, places: 0.55, overlay: 1, routes: 0 },
  suitang: { rings: 0, stars: 0, geo: 0.6, places: 0.7, overlay: 1, routes: 0 },
  yujitu: { rings: 0, stars: 0, geo: 0.6, places: 0.85, overlay: 1, routes: 0 },
  mingchu: { rings: 0, stars: 0, geo: 0.75, places: 0.8, overlay: 1, routes: 1 },
  kunyu: { rings: 0, stars: 0, geo: 0.85, places: 0.9, overlay: 1, routes: 0.15 },
};

// 禹迹图（BEFEO 摹绘本，方形计里画方图）粗配准四角：按黄河河套/海岸线目测定标，可继续微调。
const YUJITU_COORDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [97.5, 42.5],   // 左上（西北）
  [126.5, 42.5],  // 右上（东北）
  [126.5, 17.5],  // 右下（东南，含南海）
  [97.5, 17.5],   // 左下（西南）
];

// 五服同心圆（王畿居洛阳，五百里一服，取 1 里≈0.5km）
function wufuRingsGeojson() {
  const center: [number, number] = [112.45, 34.62];
  const radiiKm = [125, 250, 375, 500, 625, 750]; // 王畿 + 甸侯绥要荒
  const features = radiiKm.map((km, i) => {
    const dLat = km / 111;
    const dLon = km / (111 * Math.cos((center[1] * Math.PI) / 180));
    const ring: [number, number][] = [];
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      ring.push([center[0] + dLon * Math.cos(t), center[1] + dLat * Math.sin(t)]);
    }
    return { type: 'Feature' as const, properties: { ring: i }, geometry: { type: 'Polygon' as const, coordinates: [ring] } };
  });
  return { type: 'FeatureCollection' as const, features };
}

// 经纬网格（画方意象）
function graticuleGeojson() {
  const features = [];
  for (let lon = 70; lon <= 140; lon += 5) features.push({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: Array.from({ length: 33 }, (_, i) => [lon, 14 + i]) } });
  for (let lat = 15; lat <= 45; lat += 5) features.push({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: Array.from({ length: 71 }, (_, i) => [69 + i, lat]) } });
  return { type: 'FeatureCollection' as const, features };
}

// 郑和针路（示意航段：龙江关—泉州—占城，出图后标注去向）
const ZHENGE_ROUTE = {
  type: 'FeatureCollection' as const,
  features: [{
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: [[118.78, 32.06], [119.0, 26.0], [114.0, 22.2], [109.2, 16.2], [108.0, 11.5], [105.8, 10.3]] },
  }],
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

const lastEra = Number(localStorage.getItem('yuji-era') ?? 0);
let currentEra = Number.isFinite(lastEra) && lastEra >= 0 && lastEra < eras.length ? lastEra : 0;
let overlayOpacity = 0;
let hasStarted = false;
let searchTerm = '';
function storytellerOf(eraId: string): Storyteller {
  return storytellers.find((item: Storyteller) => item.era === eraId) ?? storytellers[0];
}
function sealChar(name: string): string {
  return name.replace(/[《》]/g, '').charAt(0);
}
const initialStory = storytellerOf(eras[currentEra].id);

// 历代图卷条目（atlas.json）；note 为可选项。
type AtlasItem = { id: string; period: string; years: string; type: string; file: string; author: string; license: string; source: string; note?: string };
function atlasCard(item: AtlasItem): string {
  const badge = item.type === '存世图件' ? 'is-artifact' : item.type === '近代出版图件' ? 'is-early' : 'is-redraw';
  return `<figure class="atlas-item"><img loading="lazy" src="${item.file}" alt="${item.period}时期历史地图"/><figcaption><span class="atlas-years">${item.years}</span><strong>${item.period}</strong><em class="atlas-type ${badge}">${item.type}</em>${item.note ? `<p>${item.note}</p>` : ''}<small>${item.author} · ${item.license}</small><a href="${item.source}" target="_blank" rel="noreferrer">图源 ↗</a></figcaption></figure>`;
}

app.innerHTML = `
  <div class="app-shell" data-era="${eras[currentEra].id}">
    <div class="grain" aria-hidden="true"></div>
    <header class="topbar">
      <a class="brand" href="#" aria-label="禹迹首页"><span class="brand-mark">禹</span><span>禹迹</span></a>
      <div class="topbar-meta"><span class="eyebrow">历史地理交互叙事</span><button class="text-button" id="open-atlas">历代图卷</button><button class="text-button" id="open-sources">来源与说明</button></div>
    </header>

    <main>
      <section class="intro-screen" id="intro-screen" aria-labelledby="intro-title">
        <div class="intro-rings" aria-hidden="true">
          <span style="--ring: 1; --lx: 61%; --ly: 39%"><i>甸</i></span>
          <span style="--ring: 2; --lx: 67%; --ly: 33%"><i>侯</i></span>
          <span style="--ring: 3; --lx: 73%; --ly: 27%"><i>绥</i></span>
          <span style="--ring: 4; --lx: 79%; --ly: 21%"><i>要</i></span>
          <span style="--ring: 5; --lx: 85%; --ly: 15%"><i>荒</i></span>
        </div>
        <p class="kicker">从想象到测量 · 约公元前 1600—公元 1602</p>
        <h1 id="intro-title">何谓天下？</h1>
        <p class="intro-copy">拖动时间轴，看古人眼中的世界<br class="mobile-only" />如何一点点长成地球。</p>
        <button class="primary-button" id="start-button"><span>开始探索</span><span class="arrow">→</span></button>
        <button class="resume-button" id="resume-button" hidden>继续上次看到的时代</button>
        <button class="skip-button" id="skip-intro">跳过开场动画</button>
      </section>

      <section class="experience" id="experience" aria-label="时间轴探索">
        <div class="scene-header">
          <div>
            <p class="kicker"><i class="era-accent-dot" id="era-accent-dot"></i>当前时代 · <span id="era-short-year">${eras[currentEra].shortYear}</span></p>
            <h2 id="era-title" aria-live="polite">${eras[currentEra].title}</h2>
            <p id="era-description" aria-live="polite">${eras[currentEra].description}</p>
            <p class="scene-source" id="era-source">内容状态：${eras[currentEra].certainty} · ${eras[currentEra].source}</p>
          </div>
          <div class="scene-actions">
            <button class="quiet-button" id="toggle-play" aria-label="播放时间轴" title="自动播放七幕演变"><span class="play-icon">▶</span><span>播放</span></button>
            <button class="quiet-button" id="reset-timeline" aria-label="重置时间轴" title="回到商周起点"><span class="reset-icon">↺</span><span>重置</span></button>
            <button class="quiet-button" id="open-search" title="按古今名称查询地名"><span class="search-icon">⌕</span><span>查地名</span></button>
          </div>
        </div>

        <div class="map-stage" id="map-stage">
          <div id="map"></div>
          <div class="map-overlay-ui" aria-hidden="false">
            <div class="map-label map-label-north">北</div>
            <div class="map-era-char" id="map-era-char" aria-hidden="true">${eraChar[eras[currentEra].id] ?? ''}</div>
            <p class="map-quote" id="map-quote">${eras[currentEra].narrativeLine}</p>
            <svg class="shanhai-layer" id="shanhai-layer" viewBox="0 0 1000 600" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
              <path class="shanhai-path" d="M214 132 Q320 86 452 104 Q560 118 668 96 Q780 76 862 128"/>
              <circle class="shanhai-star" cx="214" cy="132" r="4"/><circle class="shanhai-star" cx="452" cy="104" r="3"/><circle class="shanhai-star" cx="668" cy="96" r="4"/><circle class="shanhai-star" cx="862" cy="128" r="3"/>
              <circle class="shanhai-star" cx="560" cy="428" r="3.5"/><circle class="shanhai-star" cx="806" cy="392" r="3"/>
              <text class="shanhai-label" x="196" y="116">昆仑</text>
              <text class="shanhai-label" x="430" y="88">流沙</text>
              <text class="shanhai-label" x="540" y="448">羽民国</text>
              <text class="shanhai-label" x="786" y="412">烛龙</text>
            </svg>
            <div class="map-stamp">古今图对照 · 不作现实边界主张</div>
            <button class="compare-button" id="compare-button"><span class="compare-icon">◐</span><span>掀开古今对照</span></button>
          </div>
          <div class="overlay-control" id="overlay-control" aria-hidden="true"><div class="overlay-panel"><div class="panel-heading"><div><p class="card-label">古今叠层</p><h3>把这一幕的真迹叠上来</h3></div><button class="close-button" id="close-overlay" aria-label="关闭古今叠层">×</button></div><p id="overlay-desc">古图为已核验的公版原图，与今图未做严格配准，仅作视觉叠合；方位与比例的真实差异本身就是历史。</p><label for="opacity-range">古图浓度 <output id="opacity-output">60%</output></label><input id="opacity-range" type="range" min="0" max="100" value="60"/><div class="panel-foot"><span>今图 · Natural Earth 实测地理</span><span>古图 · 传世原图</span></div></div></div>
        </div>

        <div class="timeline-wrap">
          <div class="timeline-heading"><span>时间轴 <i class="heading-seal" title="圭尺：古代量天之尺，此处喻指度量三千年时间的标尺">圭尺</i></span><span class="timeline-hint" id="timeline-hint">向右拖动，看世界从想象中长出来</span></div>
          <div class="timeline" id="timeline" role="slider" aria-label="时代时间轴" aria-valuemin="0" aria-valuemax="${eras.length - 1}" aria-valuenow="${currentEra}" tabindex="0">
            <div class="timeline-track"><div class="timeline-progress" id="timeline-progress"></div></div>
            <div class="timeline-cursor" id="timeline-cursor" aria-hidden="true"><span class="cursor-knob"></span><span class="cursor-needle"></span></div>
            ${eras.map((era, index) => `<button class="timeline-node ${index === currentEra ? 'is-active' : ''}" data-index="${index}" style="--node-accent:${era.accent}" aria-label="${era.year}：${era.title}"><span class="node-dot"></span><span class="node-year">${era.year}</span><span class="node-caption">${era.shortYear}</span></button>`).join('')}
          </div>
        </div>

        <div class="bottom-grid">
          <article class="story-card" id="story-card">
            <div class="card-label">制图者引路</div>
            <div class="story-content"><div class="story-avatar">${sealChar(initialStory.name)}</div><div><h3>${initialStory.name}<small class="story-role">${initialStory.role}</small></h3><p>${initialStory.text}</p><small class="story-years">${initialStory.years}</small><small class="story-source">${initialStory.source}</small></div></div>
          </article>
          <article class="model-card"><div class="card-label">天下模型 · 空间视图</div><div class="model-switch" role="tablist">${['服制', '九州', '郡县', '画方', '针路', '地圆'].map((model, index) => `<button class="model-tab ${index === 0 ? 'is-active' : ''}" data-model="${model}" role="tab" aria-selected="${index === 0}">${model}</button>`).join('')}</div><p id="model-copy">以中心向外层层展开，天下首先是一种关系秩序。点标签切换空间视图。</p></article>
          <article class="atlas-pick-card" id="atlas-pick-card">
            <div class="card-label">本幕图卷 <button class="text-button atlas-all" id="atlas-all-btn">全部 49 幅 ↗</button></div>
            <div class="atlas-picks" id="atlas-picks"></div>
          </article>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <span>禹迹 · 历史地理交互叙事</span>
      <span class="footer-note">底图与古图均为核验过的公有领域数据</span>
    </footer>

    <div class="map-lightbox" id="map-lightbox" aria-hidden="true"><button class="close-button lightbox-close" id="close-lightbox" aria-label="关闭放大地图">×</button><p class="lightbox-hint">点按空白处关闭 · 本幕图件</p><div class="lightbox-body" id="lightbox-body"></div></div>

    <div class="atlas-drawer" id="atlas-drawer" aria-hidden="true"><div class="drawer-inner atlas-inner"><div class="panel-heading"><div><p class="card-label">历代图卷</p><h3>中国历代历史地图 · ${atlas.length} 幅</h3></div><button class="close-button" id="close-atlas" aria-label="关闭历代图卷">×</button></div><p class="drawer-intro">按时期先后排列。标注「存世图件」为传世古地图原件；「重绘形势图」为今人依据公开历史地理研究重绘；「近代出版图件」为二十世纪初出版之历史地图集。图件均取自维基共享资源，逐幅标注作者与许可；古往今来的边界画法存在学术争议，本卷不作任何现实边界主张。</p><div class="atlas-grid">${atlas.map((item) => atlasCard(item as AtlasItem)).join('')}</div></div></div>

    <div class="search-drawer" id="search-drawer" aria-hidden="true"><div class="drawer-inner"><div class="panel-heading"><div><p class="card-label">名物对照</p><h3>查一个地名的前世</h3></div><button class="close-button" id="close-search" aria-label="关闭地名查询">×</button></div><label class="search-field"><span>输入古今名称</span><input id="place-search" type="search" placeholder="例如：燕京 / 北京" autocomplete="off"/><span class="search-key">${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}</span></label><div class="search-suggestions" id="search-suggestions"></div><div class="search-results" id="search-results"></div></div></div>

    <div class="sources-drawer" id="sources-drawer" aria-hidden="true"><div class="drawer-inner"><div class="panel-heading"><div><p class="card-label">来源与说明</p><h3>每一条线，都有来处</h3></div><button class="close-button" id="close-sources" aria-label="关闭来源与说明">×</button></div><p class="drawer-intro">地图引擎：MapLibre GL（开源）。现代地理：Natural Earth（公有领域）。古图与历代图卷见「历代图卷」页逐幅标注。</p><div class="source-list">${sources.map((source) => `<article class="source-item"><div class="source-type">${source.type}</div><div><h4>${source.title}</h4><p>${source.detail}</p><span class="source-status">${source.status}</span></div></article>`).join('')}</div><div class="source-note"><strong>说明</strong><p>历史边界、地名对应和人物独白可能存在争议。产品会把确定事实、合理解释、学术争议和产品化演绎分开标记。</p></div></div></div>
  </div>
`;

const shell = document.querySelector<HTMLElement>('.app-shell')!;
const intro = document.querySelector<HTMLElement>('#intro-screen')!;
const experience = document.querySelector<HTMLElement>('#experience')!;
const title = document.querySelector<HTMLElement>('#era-title')!;
const description = document.querySelector<HTMLElement>('#era-description')!;
const shortYear = document.querySelector<HTMLElement>('#era-short-year')!;
const eraSource = document.querySelector<HTMLElement>('#era-source')!;
const mapQuote = document.querySelector<HTMLElement>('#map-quote')!;
const storyAvatar = document.querySelector<HTMLElement>('.story-avatar')!;
const storyName = document.querySelector<HTMLElement>('.story-content h3')!;
const storyText = document.querySelector<HTMLElement>('.story-content p')!;
const storySource = document.querySelector<HTMLElement>('.story-source')!;
const storyYears = document.querySelector<HTMLElement>('.story-years')!;
const progress = document.querySelector<HTMLElement>('#timeline-progress')!;
const cursor = document.querySelector<HTMLElement>('#timeline-cursor')!;
const timeline = document.querySelector<HTMLElement>('#timeline')!;
const starsLayer = document.querySelector<HTMLElement>('#shanhai-layer')!;
const overlayControl = document.querySelector<HTMLElement>('#overlay-control')!;
const searchDrawer = document.querySelector<HTMLElement>('#search-drawer')!;
const sourcesDrawer = document.querySelector<HTMLElement>('#sources-drawer')!;
const atlasDrawer = document.querySelector<HTMLElement>('#atlas-drawer')!;
const placeSearch = document.querySelector<HTMLInputElement>('#place-search')!;
const searchResults = document.querySelector<HTMLElement>('#search-results')!;
const searchSuggestions = document.querySelector<HTMLElement>('#search-suggestions')!;
const lightboxBody = document.querySelector<HTMLElement>('#lightbox-body')!;

// ── 真地图引擎（MapLibre，离线 GeoJSON，无外部瓦片服务）──
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      land: { type: 'geojson', data: 'geo/land.json' },
      lakes: { type: 'geojson', data: 'geo/lakes.json' },
      rivers: { type: 'geojson', data: 'geo/rivers.json' },
      coast: { type: 'geojson', data: 'geo/coast.json' },
      grow: { type: 'geojson', data: 'geo/grow-rivers.json', lineMetrics: true },
      rings: { type: 'geojson', data: wufuRingsGeojson() },
      grid: { type: 'geojson', data: graticuleGeojson() },
      route: { type: 'geojson', data: ZHENGE_ROUTE },
      jiuzhou: { type: 'geojson', data: 'geo/jiuzhou.json' },
      yujitu: { type: 'image', url: 'assets/maps/yujitu-1136-loc.jpg', coordinates: YUJITU_COORDS },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#141311' } },
      { id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': '#d8c29a', 'fill-opacity': 0.08 } },
      { id: 'rings-fill', type: 'fill', source: 'rings', paint: { 'fill-color': '#c5a45b', 'fill-opacity': 0.04 } },
      { id: 'rings-line', type: 'line', source: 'rings', paint: { 'line-color': '#c5a45b', 'line-opacity': 0.5, 'line-width': 1 } },
      { id: 'lakes-fill', type: 'fill', source: 'lakes', paint: { 'fill-color': '#7eaaa3', 'fill-opacity': 0.12 } },
      { id: 'grid-line', type: 'line', source: 'grid', paint: { 'line-color': '#b54832', 'line-opacity': 0, 'line-width': 0.7 } },
      { id: 'rivers-line', type: 'line', source: 'rivers', paint: { 'line-color': '#7eaaa3', 'line-opacity': 0.35, 'line-width': 0.8 } },
      { id: 'grow-rivers', type: 'line', source: 'grow', paint: { 'line-color': '#7eaaa3', 'line-width': 1.8, 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(126,170,163,0)', 0.001, '#7eaaa3', 1, '#7eaaa3'] } },
      { id: 'coast-line', type: 'line', source: 'coast', paint: { 'line-color': '#f0e8d7', 'line-opacity': 0.4, 'line-width': 1 } },
      { id: 'yujitu-raster', type: 'raster', source: 'yujitu', paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } },
      { id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#4f97a8', 'line-opacity': 0, 'line-width': 2.2, 'line-dasharray': [3, 2] } },
      { id: 'jiuzhou-fill', type: 'fill', source: 'jiuzhou', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0 } },
      { id: 'jiuzhou-line', type: 'line', source: 'jiuzhou', paint: { 'line-color': '#c5a45b', 'line-opacity': 0, 'line-width': 1.5 } },
    ],
  },
  center: [107, 34],
  zoom: 3.4,
  minZoom: 2.2,
  maxZoom: 8,
  attributionControl: false,
});
(window as unknown as { __yujiMap?: maplibregl.Map }).__yujiMap = map;

// 地名标记（自定义 DOM，点按即查询）
const markerEls = new Map<string, HTMLElement>();
mapPlaces.forEach((place) => {
  const el = document.createElement('div');
  el.className = 'map-place';
  el.dataset.place = place.name;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `查询地名：${place.name}`);
  el.innerHTML = `<span class="place-dot"></span><span class="place-label">${place.name}</span>`;
  markerEls.set(place.name, el);
  new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([place.lng, place.lat]).addTo(map);
});
function lookupPlace(name: string) {
  setDrawer(searchDrawer, true);
  placeSearch.value = name;
  placeSearch.dispatchEvent(new Event('input'));
  placeSearch.focus();
}
markerEls.forEach((el) => {
  const go = () => lookupPlace(el.dataset.place ?? '');
  el.addEventListener('click', (event) => { event.stopPropagation(); go(); });
  el.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(); } });
});

// ── 七幕连续「生长」渲染 ──
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function intensityAt(pos: number): EraIntensity {
  const clamped = Math.max(0, Math.min(eras.length - 1, pos));
  const lo = Math.floor(clamped);
  const hi = Math.min(eras.length - 1, lo + 1);
  const f = clamped - lo;
  const a = eraIntensity[eras[lo].id] ?? eraIntensity.shangzhou;
  const b = eraIntensity[eras[hi].id] ?? a;
  return { rings: lerp(a.rings, b.rings, f), stars: lerp(a.stars, b.stars, f), geo: lerp(a.geo, b.geo, f), places: lerp(a.places, b.places, f), overlay: lerp(a.overlay, b.overlay, f), routes: lerp(a.routes, b.routes, f) };
}

function gradientFor(growth: number): maplibregl.ExpressionSpecification {
  const cut = Math.max(0.001, Math.min(0.999, growth));
  return ['interpolate', ['linear'], ['line-progress'], 0, '#7eaaa3', cut, '#7eaaa3', Math.min(cut + 0.001, 1), 'rgba(126,170,163,0)', 1, 'rgba(126,170,163,0)'] as maplibregl.ExpressionSpecification;
}

let styleReady = false;
map.on('style.load', () => { styleReady = true; applyIntensities(intensityAt(continuousPos)); });

// ── CHGIS 数据层（按需加载，不进 bundle）──
// 县/府治所点：拖动时间轴按年份过滤，「地名像落墨一样浮现」由真实数据密度驱动；
// 府界示意层：Voronoi 邻近分配派生，UI 强制标注非历史实边界。
const ERA_YEAR: Record<string, number> = { shangzhou: -1600, zhanguo: -475, qinhan: 2, suitang: 713, yujitu: 1136, mingchu: 1425, kunyu: 1602 };
function yearAt(pos: number): number {
  const clamped = Math.max(0, Math.min(eras.length - 1, pos));
  const lo = Math.floor(clamped);
  const hi = Math.min(eras.length - 1, lo + 1);
  const a = ERA_YEAR[eras[lo].id] ?? -1600;
  const b = ERA_YEAR[eras[hi].id] ?? a;
  return Math.round(lerp(a, b, clamped - lo));
}
type DatasetPlace = { name: string; pinyin: string; level: string; kind: string; modern: string; lng: number; lat: number; presences: { from: number; to: number }[]; source: string; certainty: string; presLoc?: string };
let datasetPlaces: DatasetPlace[] = [];
let datasetYearFilter = -99999;
const yearFilter = (year: number): maplibregl.ExpressionSpecification => ['all', ['<=', ['get', 'from'], year], ['>=', ['get', 'to'], year]] as unknown as maplibregl.ExpressionSpecification;

fetch('data/places-dataset.json').then((r) => r.json()).then((data: { places: DatasetPlace[] }) => {
  datasetPlaces = data.places;
  // 展平 presence 区间为点要素（每治所每存在期一个 feature）
  const features: { type: 'Feature'; properties: { name: string; level: string; from: number; to: number }; geometry: { type: 'Point'; coordinates: [number, number] } }[] = [];
  for (const p of datasetPlaces) {
    for (const span of p.presences) {
      features.push({ type: 'Feature', properties: { name: p.name, level: p.level, from: span.from, to: span.to }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } });
    }
  }
  // 等待样式就绪后添加图层（style.load 可能已在 fetch 期间触发过，故轮询）
  const waitForStyle = () => {
    if (map.isStyleLoaded()) {
      if (!map.getSource('chgis-points')) {
        map.addSource('chgis-points', { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.addSource('chgis-pref', { type: 'geojson', data: 'geo/hist-pref/pref-polygons.json' });
        map.addLayer({ id: 'pref-fill', type: 'fill', source: 'chgis-pref', filter: yearFilter(datasetYearFilter), paint: { 'fill-color': '#c5a45b', 'fill-opacity': 0.05, 'fill-outline-color': 'rgba(197,164,91,.18)' } }, 'rings-line');
        map.addLayer({ id: 'cnty-points', type: 'circle', source: 'chgis-points', filter: yearFilter(datasetYearFilter), paint: { 'circle-color': '#e8d9a0', 'circle-opacity': 0.5, 'circle-radius': 1.7 } });
        map.addLayer({ id: 'pref-points', type: 'circle', source: 'chgis-points', filter: yearFilter(datasetYearFilter), paint: { 'circle-color': '#cf5a41', 'circle-opacity': 0.55, 'circle-radius': 3 } });
        applyIntensities(intensityAt(continuousPos));
      }
    } else {
      window.setTimeout(waitForStyle, 400);
    }
  };
  waitForStyle();
  // CHGIS 治所点可点按：弹窗显示地名、层级与存在期
  map.on('click', 'cnty-points', (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const props = f.properties as { name: string; level: string; from: number; to: number };
    showSeatPopup(e.lngLat, props);
  });
  map.on('click', 'pref-points', (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const props = f.properties as { name: string; level: string; from: number; to: number };
    showSeatPopup(e.lngLat, props);
  });
  map.getCanvas().style.cursor = 'pointer';
}).catch(() => { console.warn('CHGIS 数据层未加载（离线或网络受限）'); });

function showSeatPopup(lngLat: maplibregl.LngLat, props: { name: string; level: string; from: number; to: number }) {
  const span = props.from < 0 ? `前 ${-props.from}` : `${props.from}` + '—' + (props.to < 0 ? `前 ${-props.to}` : `${props.to}`);
  const el = document.createElement('div');
  el.className = 'seat-popup';
  el.innerHTML = `<strong>${props.name}</strong><span>${props.level}级治所</span><small>存在期 ${span} 年</small>`;
  new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lngLat).addTo(map);
  window.setTimeout(() => { el.style.opacity = '0'; window.setTimeout(() => el.remove(), 400); }, 2600);
  el.style.opacity = '1';
}

function applyDatasetYear(year: number) {
  if (year === datasetYearFilter || !map.getSource('chgis-points')) return;
  datasetYearFilter = year;
  const f = yearFilter(year);
  map.setFilter('cnty-points', f);
  map.setFilter('pref-points', f);
  if (map.getLayer('pref-fill')) map.setFilter('pref-fill', f);
}

function applyIntensities(v: EraIntensity) {
  starsLayer.style.opacity = String(v.stars);
  markerEls.forEach((el) => { el.style.opacity = String(v.places); el.style.pointerEvents = v.places > 0.3 ? 'auto' : 'none'; });
  if (!styleReady) return;
  const growth = Math.max(0, Math.min(1, (continuousPos - 1.7) / 3.6)); // 自战国末向东拖动，大河从源头长到入海
  map.setPaintProperty('land-fill', 'fill-opacity', 0.12 * v.geo);
  map.setPaintProperty('coast-line', 'line-opacity', 0.55 * v.geo);
  map.setPaintProperty('rivers-line', 'line-opacity', 0.4 * v.geo);
  map.setPaintProperty('lakes-fill', 'fill-opacity', 0.14 * v.geo);
  map.setPaintProperty('rings-fill', 'fill-opacity', 0.05 * v.rings);
  map.setPaintProperty('rings-line', 'line-opacity', 0.55 * v.rings);
  map.setPaintProperty('grid-line', 'line-opacity', 0.35 * v.geo);
  map.setPaintProperty('route-line', 'line-opacity', 0.9 * v.routes);
  map.setPaintProperty('grow-rivers', 'line-opacity', Math.min(1, v.geo * 1.6));
  map.setPaintProperty('grow-rivers', 'line-gradient', gradientFor(growth));
  map.setPaintProperty('yujitu-raster', 'raster-opacity', overlayOpacity * v.overlay);
  applyDatasetYear(yearAt(continuousPos));
  if (map.getLayer('cnty-points')) map.setPaintProperty('cnty-points', 'circle-opacity', 0.55 * v.places);
  if (map.getLayer('pref-points')) map.setPaintProperty('pref-points', 'circle-opacity', 0.6 * v.places);
  if (map.getLayer('pref-fill')) map.setPaintProperty('pref-fill', 'fill-opacity', 0.07 * v.geo);
}

// 各节点圆心在轨道上的百分比（视口实测），用于游标/进度条的连续定位。
function nodeCenters(): number[] {
  const trackRect = timeline.getBoundingClientRect();
  const centers: number[] = [];
  document.querySelectorAll<HTMLElement>('.timeline-node').forEach((node) => {
    const dot = node.querySelector<HTMLElement>('.node-dot');
    if (trackRect.width > 0 && dot) {
      const r = dot.getBoundingClientRect();
      centers.push(((r.left + r.width / 2 - trackRect.left) / trackRect.width) * 100);
    } else centers.push(0);
  });
  return centers.length ? centers : [0, 50, 100];
}
function alignedAt(pos: number): number {
  const centers = nodeCenters();
  const lo = Math.max(0, Math.min(centers.length - 1, Math.floor(pos)));
  const hi = Math.min(centers.length - 1, lo + 1);
  return lerp(centers[lo], centers[hi], Math.max(0, Math.min(1, pos - lo)));
}

let continuousPos = currentEra;

function applyEraTexts(index: number) {
  currentEra = index;
  const era: Era = eras[index];
  const story = storytellerOf(era.id);
  shell.dataset.era = era.id;
  title.textContent = era.title;
  description.textContent = era.description;
  shortYear.textContent = era.shortYear;
  eraSource.textContent = `内容状态：${era.certainty} · ${era.source}`;
  mapQuote.textContent = era.narrativeLine;
  document.querySelector<HTMLElement>('#map-era-char')!.textContent = eraChar[era.id] ?? '';
  document.querySelector<HTMLElement>('#era-accent-dot')!.style.background = era.accent;
  document.querySelector<HTMLElement>('#era-accent-dot')!.style.boxShadow = `0 0 10px ${era.accent}66`;
  storyAvatar.textContent = sealChar(story.name);
  storyName.innerHTML = `${story.name}<small class="story-role">${story.role}</small>`;
  storyText.textContent = story.text;
  storySource.textContent = story.source;
  storyYears.textContent = story.years ?? '';
  timeline.setAttribute('aria-valuenow', String(index));
  document.querySelectorAll<HTMLButtonElement>('.timeline-node').forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === index));
  const hints: Record<string, string> = { shangzhou: '向右拖动，看世界从想象中长出来', zhanguo: '昆仑与奇国：先被想象的世界', qinhan: '郡县成网，大河开始生长', suitang: '一寸折百里，山河更细了', yujitu: '计里画方——点「掀开古今对照」看真迹叠加', mingchu: '针路通四海，看航线驶向占城', kunyu: '地球张开弧度——点「掀开古今对照」看世界地图' };
  document.querySelector<HTMLElement>('#timeline-hint')!.textContent = hints[era.id] ?? '向右拖动，观察世界变得可测';
  const eraModel = modelByEra[era.id] ?? '服制';
  document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((tab) => {
    const active = tab.dataset.model === eraModel;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelector<HTMLElement>('#model-copy')!.textContent = modelCopy[eraModel];
  localStorage.setItem('yuji-era', String(index));
  renderAtlasPicks(era.id);
}

// ── 本幕图卷：按时代自动筛选 atlas.json 中的相关图件，展示在地图下方 ──
const ERA_ATLAS_IDS: Record<string, string[]> = {
  shangzhou: ['shang', 'zhou'],
  zhanguo: ['zhanguo', 'zhaoyutu'],
  qinhan: ['qin', 'mawangdui-topo', 'mawangdui-mil', 'xihan'],
  suitang: ['tang660', 'tang', 'tang-cn', 'dunhuang-star'],
  yujitu: ['yujitu-artifact', 'huayitu-artifact', 'dilitu', 'pingjiang', 'nansong'],
  mingchu: ['maokun-malacca', 'maokun-ceylon', 'maokun-sumatra', 'daminghunyi', 'kangnido'],
  kunyu: ['kunyu-artifact', 'guangyu', 'guangyu-fujian', 'homann1735', 'qing', 'kangxi-zhili'],
};
function renderAtlasPicks(eraId: string) {
  const picksEl = document.querySelector<HTMLElement>('#atlas-picks');
  if (!picksEl) return;
  const ids = ERA_ATLAS_IDS[eraId] ?? [];
  const picks = (atlas as AtlasItem[]).filter((item) => ids.includes(item.id));
  picksEl.innerHTML = picks.length ? picks.map((item) => {
    const badge = item.type === '存世图件' ? 'is-artifact' : item.type === '近代出版图件' ? 'is-early' : '';
    return `<button class="atlas-pick" data-atlas="${item.id}" title="${item.note ?? item.period}">
      <img src="${item.file}" alt="${item.period}" loading="lazy"/>
      <span class="atlas-pick-caption"><b>${item.years}</b> ${item.period}<em class="atlas-type ${badge}">${item.type}</em></span>
    </button>`;
  }).join('') : '';
}
document.addEventListener('click', (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-atlas]');
  if (!btn) return;
  const id = btn.dataset.atlas;
  const item = (atlas as AtlasItem[]).find((a) => a.id === id);
  if (!item) return;
  lightboxBody.innerHTML = `<figure class="lightbox-figure"><img src="${item.file}" alt="${item.period} ${item.years}"/><figcaption><strong>${item.period}</strong> · ${item.years} · ${item.type}<br/>${item.note ?? ''}<br/><small>${item.author} · ${item.license}</small></figcaption></figure>`;
  mapLightbox.classList.add('is-open');
  mapLightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
});
document.querySelector<HTMLButtonElement>('#atlas-all-btn')?.addEventListener('click', () => setDrawer(atlasDrawer, true));

function setTimelineCursor(pos: number) {
  const aligned = alignedAt(pos);
  progress.style.width = `${aligned}%`;
  cursor.style.left = `${aligned}%`;
}

function renderEra(index: number) {
  const idx = Math.max(0, Math.min(eras.length - 1, index));
  continuousPos = idx;
  applyEraTexts(idx);
  applyIntensities(intensityAt(idx));
  setTimelineCursor(idx);
}

function renderContinuous(pos: number) {
  continuousPos = Math.max(0, Math.min(eras.length - 1, pos));
  applyIntensities(intensityAt(continuousPos));
  setTimelineCursor(continuousPos);
  const idx = Math.round(continuousPos);
  if (idx !== currentEra) applyEraTexts(idx);
}

function startExperience() {
  hasStarted = true;
  intro.classList.add('is-hidden');
  experience.classList.add('is-visible');
  // 导演分镜：①地图以五服环开场（雾中浮现）→ ②时间轴升起 → ③可交互
  // 注意：不改 currentEra（继续入口依赖已保存的时代）
  const wrap = document.querySelector<HTMLElement>('.timeline-wrap');
  const sceneHeader = document.querySelector<HTMLElement>('.scene-header');
  const bottomGrid = document.querySelector<HTMLElement>('.bottom-grid');
  if (wrap) { wrap.style.opacity = '0'; wrap.style.transform = 'translateY(28px)'; wrap.style.transition = 'opacity .8s ease, transform .8s ease'; }
  if (sceneHeader) { sceneHeader.style.opacity = '0'; sceneHeader.style.transition = 'opacity .6s ease'; }
  if (bottomGrid) { bottomGrid.style.opacity = '0'; bottomGrid.style.transition = 'opacity .6s ease .3s'; }
  // 第 1 幕：地图上五服环从雾中浮现（800ms）
  setTimeout(() => {
    if (styleReady) {
      map.setPaintProperty('rings-fill', 'fill-opacity', 0.1);
      map.setPaintProperty('rings-line', 'line-opacity', 0.7);
    }
  }, 300);
  // 第 2 幕：时间轴升起（1500ms）
  setTimeout(() => {
    if (sceneHeader) sceneHeader.style.opacity = '1';
    if (wrap) { wrap.style.opacity = '1'; wrap.style.transform = 'translateY(0)'; }
  }, 1200);
  // 第 3 幕：底部卡片淡入（2200ms），聚焦时间轴
  setTimeout(() => {
    if (bottomGrid) bottomGrid.style.opacity = '1';
    timeline.focus({ preventScroll: true });
  }, 2000);
}

function setDrawer(drawer: HTMLElement, open: boolean) {
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('drawer-open', open);
}

function renderResults(term = '') {
  const normalized = term.trim().toLowerCase();
  const scored = places
    .filter((place: Place) => !normalized || `${place.name}${place.modern}${place.chain.join('')}`.toLowerCase().includes(normalized))
    .map((place: Place) => ({ place, rank: `${place.name}${place.modern}`.toLowerCase().includes(normalized) ? 0 : 1, exact: place.name === term.trim() }))
    .sort((a, b) => Number(b.exact) - Number(a.exact) || a.rank - b.rank);
  const seen = new Set<string>();
  const matches: Place[] = [];
  for (const item of scored) {
    const key = `${item.place.modern}|${item.place.chain.join('→')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(item.place);
    if (matches.length >= 8) break;
  }
  // 数据层补充（CHGIS）：排除叙事层同名，最多再给 12 条精简卡
  const narrativeNames = new Set(places.map((p: Place) => p.name));
  const datasetMatches: DatasetPlace[] = normalized
    ? datasetPlaces.filter((p) => `${p.name}${p.pinyin}${p.modern}`.toLowerCase().includes(normalized) && !narrativeNames.has(p.name)).slice(0, 12)
    : [];
  searchSuggestions.innerHTML = normalized ? '' : '<span>试试</span>' + places.slice(0, 5).map((place: Place) => `<button class="suggestion" data-place="${place.name}">${place.name}</button>`).join('');
  const locatable = new Set(mapPlaces.map((item) => item.name));
  const narrativeHtml = matches.map((place: Place) => `<article class="place-result" tabindex="0"><div class="place-heading"><h4>${place.name}</h4><span>${place.modern}</span></div><div class="place-chain">${place.chain.map((name) => `<span class="chain-item ${name === place.name ? 'is-current' : ''}">${name}</span>`).join('<i>→</i>')}</div><p>${place.note}</p><div class="place-meta"><span>${place.certainty}</span><span>${place.era}</span></div>${locatable.has(place.name) ? `<button class="locate-button" data-locate="${place.name}"><span>◎</span>在图上定位</button>` : ''}<small>来源：${place.source}</small></article>`).join('');
  const spans = (p: DatasetPlace) => p.presences.map((s) => (s.from < 0 ? `前 ${-s.from}` : `${s.from}`) + '—' + (s.to < 0 ? `前 ${-s.to}` : `${s.to}`)).join('、');
  const datasetHtml = datasetMatches.map((p) => `<article class="place-result is-dataset" tabindex="0"><div class="place-heading"><h4>${p.name}</h4><span>${p.modern}</span></div><div class="place-meta"><span>${p.level} · ${p.kind}</span><span>存在期：${spans(p)}</span></div><button class="locate-button" data-locate="${p.name}"><span>◎</span>在图上定位</button><small>来源：${p.source}（治所点位为示意精度）</small></article>`).join('');
  const datasetNote = datasetMatches.length ? `<p class="dataset-note">另有 ${datasetMatches.length} 条来自 CHGIS V6 数据层（县级/府级治所沿革，前 221—1602）</p>` : '';
  searchResults.innerHTML = narrativeHtml || datasetHtml
    ? narrativeHtml + datasetNote + datasetHtml
    : '<div class="empty-state"><span class="empty-mark">⌁</span><strong>还没有找到这个地名</strong><p>叙事层收录 20 条精选考订，数据层收录 CHGIS 治所沿革 9440 条。你可以试试“燕京”“临安”或任一古县名。</p></div>';
}

document.querySelector<HTMLButtonElement>('#start-button')!.addEventListener('click', startExperience);
document.querySelector<HTMLButtonElement>('#skip-intro')!.addEventListener('click', startExperience);
const resumeButton = document.querySelector<HTMLButtonElement>('#resume-button')!;
if (lastEra > 0) {
  resumeButton.hidden = false;
  resumeButton.textContent = `继续上次看到的 ${eras[lastEra].year}`;
}
resumeButton.addEventListener('click', () => { renderEra(currentEra); startExperience(); });
document.querySelector<HTMLButtonElement>('#compare-button')!.addEventListener('click', () => {
  overlayControl.classList.add('is-open');
  overlayControl.setAttribute('aria-hidden', 'false');
  const eraId = eras[currentEra].id;
  const hasRealMap = Boolean(eraOverlayImage[eraId]);
  const desc = document.querySelector<HTMLElement>('#overlay-desc')!;
  if (eraId === 'yujitu') {
    desc.innerHTML = '<img src="assets/maps/yujitu-1136-loc.jpg" alt="禹迹图拓本" class="overlay-thumb"/><br/>《禹迹图》拓本已按真实地理位置叠加到现代地图上（粗配准）。拖动滑杆看古今长江、黄河的走向差异——宋人的海岸线与现代实测相差之处，本身就是历史。';
  } else if (hasRealMap) {
    const img = eraOverlayImage[eraId];
    desc.innerHTML = `<img src="${img.src}" alt="${img.caption}" class="overlay-thumb"/><br/><strong>${img.caption}</strong><br/>此图件未做地理配准（与底图坐标系不同），在地图上做整体视觉对照。点「在图上定位」任意治所可回到精确位置。`;
  } else {
    desc.textContent = '这个时代还没有传世地图。天下以《禹贡》五服的观念呈现——在地图诞生之前，世界是一种秩序想象，而不是被测量的地面。';
  }
  const range = document.querySelector<HTMLInputElement>('#opacity-range')!;
  range.disabled = false;
  if (eraId === 'yujitu' && overlayOpacity < 0.6) {
    overlayOpacity = 0.6;
    range.value = '60';
    applyIntensities(intensityAt(continuousPos));
    document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = '60%';
  }
});
function closeOverlay() {
  overlayControl.classList.remove('is-open');
  overlayControl.setAttribute('aria-hidden', 'true');
  if (eras[currentEra].id === 'yujitu') {
    overlayOpacity = 0;
    const range = document.querySelector<HTMLInputElement>('#opacity-range')!;
    range.value = '0';
    document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = '0%';
    applyIntensities(intensityAt(continuousPos));
  }
}
document.querySelector<HTMLButtonElement>('#close-overlay')!.addEventListener('click', closeOverlay);
overlayControl.addEventListener('click', (event) => { if (event.target === overlayControl) closeOverlay(); });
document.querySelector<HTMLInputElement>('#opacity-range')!.addEventListener('input', (event) => {
  const value = Number((event.target as HTMLInputElement).value);
  overlayOpacity = value / 100;
  if (eras[currentEra].id !== 'yujitu') overlayOpacity = 0; // 仅禹迹图做配准叠加
  applyIntensities(intensityAt(continuousPos));
  document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = `${value}%`;
});
document.querySelector<HTMLButtonElement>('#open-search')!.addEventListener('click', () => { setDrawer(searchDrawer, true); placeSearch.focus(); renderResults(); });
document.querySelector<HTMLButtonElement>('#close-search')!.addEventListener('click', () => setDrawer(searchDrawer, false));
document.querySelector<HTMLButtonElement>('#open-sources')!.addEventListener('click', () => setDrawer(sourcesDrawer, true));
document.querySelector<HTMLButtonElement>('#close-sources')!.addEventListener('click', () => setDrawer(sourcesDrawer, false));
const atlasBtnOpen = document.querySelector<HTMLButtonElement>('#open-atlas')!;
const atlasBtnClose = document.querySelector<HTMLButtonElement>('#close-atlas')!;
atlasBtnOpen.addEventListener('click', () => setDrawer(atlasDrawer, true));
atlasBtnClose.addEventListener('click', () => setDrawer(atlasDrawer, false));
atlasDrawer.addEventListener('click', (event) => { if (event.target === atlasDrawer) setDrawer(atlasDrawer, false); });
placeSearch.addEventListener('input', () => { searchTerm = placeSearch.value; renderResults(searchTerm); });
searchSuggestions.addEventListener('click', (event) => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-place]'); if (!target) return; placeSearch.value = target.dataset.place ?? ''; placeSearch.dispatchEvent(new Event('input')); });

// 搜索定位：地图飞到该地并脉冲高亮
searchResults.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-locate]');
  if (!target) return;
  const name = target.dataset.locate ?? '';
  setDrawer(searchDrawer, false);
  const place = mapPlaces.find((item) => item.name === name);
  const dataset = place ? undefined : datasetPlaces.find((p) => p.name === name);
  const lng = place ? place.lng : dataset?.lng;
  const lat = place ? place.lat : dataset?.lat;
  if (lng === undefined || lat === undefined) return;
  map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 5.4), duration: 2200, essential: true });
  const el = markerEls.get(name);
  if (el) {
    el.classList.remove('is-pulse');
    void (el as unknown as HTMLElement).offsetWidth;
    el.classList.add('is-pulse');
    window.setTimeout(() => el.classList.remove('is-pulse'), 3600);
  }
});

// 放大查看：显示本幕真迹原图
const mapLightbox = document.querySelector<HTMLElement>('#map-lightbox')!;
function openLightbox() {
  const real = eraOverlayImage[eras[currentEra].id];
  lightboxBody.innerHTML = real ? `<figure class="lightbox-figure"><img src="${real.src}" alt="${real.caption}"/><figcaption>${real.caption}</figcaption></figure>` : '<p class="lightbox-empty">这一幕没有传世图件——想象时代的世界尚未成图。</p>';
  mapLightbox.classList.add('is-open');
  mapLightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
}
function closeLightbox() {
  mapLightbox.classList.remove('is-open');
  mapLightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
}
document.querySelector<HTMLElement>('#map-stage')!.addEventListener('dblclick', openLightbox);
document.querySelector<HTMLButtonElement>('#close-lightbox')!.addEventListener('click', closeLightbox);
mapLightbox.addEventListener('click', (event) => { if (event.target === mapLightbox || event.target === lightboxBody) closeLightbox(); });

document.querySelectorAll<HTMLButtonElement>('.timeline-node').forEach((node) => node.addEventListener('click', () => { renderEra(Number(node.dataset.index)); if (!hasStarted) startExperience(); }));
document.querySelector<HTMLButtonElement>('#toggle-play')!.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const playing = button.dataset.playing === 'true';
  button.dataset.playing = String(!playing);
  button.innerHTML = playing ? '<span class="play-icon">▶</span><span>播放</span>' : '<span class="play-icon">Ⅱ</span><span>暂停</span>';
  if (!playing) {
    const timer = window.setInterval(() => {
      if (button.dataset.playing !== 'true' || currentEra >= eras.length - 1) { window.clearInterval(timer); button.dataset.playing = 'false'; button.innerHTML = '<span class="play-icon">▶</span><span>播放</span>'; return; }
      renderEra(Math.round(continuousPos) + 1);
    }, 2400);
  }
});
document.querySelector<HTMLButtonElement>('#reset-timeline')!.addEventListener('click', () => {
  const playButton = document.querySelector<HTMLButtonElement>('#toggle-play')!;
  playButton.dataset.playing = 'false';
  playButton.innerHTML = '<span class="play-icon">▶</span><span>播放</span>';
  map.flyTo({ center: [107, 34], zoom: 3.4, duration: 1600 });
  renderEra(0);
});
// 天下模型空间视图：每个标签切换地图的视觉重心（飞行+图层强调），不只是改文字。
function applyModelView(model: string) {
  document.querySelector<HTMLElement>('#model-copy')!.textContent = modelCopy[model];
  if (!styleReady) return;
  const hasLayer = (id: string) => Boolean(map.getLayer(id));
  const setOp = (id: string, v: number) => { const layer = map.getLayer(id); if (layer) { const prop = layer.type === 'fill' ? 'fill-opacity' : layer.type === 'line' ? 'line-opacity' : 'circle-opacity'; map.setPaintProperty(id, prop, v); } };
  // 先归零所有模型专属强调
  if (hasLayer('jiuzhou-fill')) setOp('jiuzhou-fill', 0);
  if (hasLayer('jiuzhou-line')) setOp('jiuzhou-line', 0);
  if (hasLayer('jiuzhou-label')) return; // symbol layer 跳过
  switch (model) {
    case '服制':
      map.flyTo({ center: [112.45, 34.62], zoom: 4.2, duration: 1600 });
      map.setPaintProperty('rings-fill', 'fill-opacity', 0.12);
      map.setPaintProperty('rings-line', 'line-opacity', 0.8);
      break;
    case '九州':
      map.flyTo({ center: [110, 34], zoom: 3.6, duration: 1600 });
      if (hasLayer('jiuzhou-fill')) map.setPaintProperty('jiuzhou-fill', 'fill-opacity', 0.28);
      if (hasLayer('jiuzhou-line')) map.setPaintProperty('jiuzhou-line', 'line-opacity', 0.6);
      break;
    case '郡县':
      map.flyTo({ center: [107, 34], zoom: 3.8, duration: 1600 });
      if (hasLayer('pref-fill')) map.setPaintProperty('pref-fill', 'fill-opacity', 0.18);
      break;
    case '画方':
      map.flyTo({ center: [110, 33], zoom: 4.0, duration: 1600 });
      map.setPaintProperty('grid-line', 'line-opacity', 0.7);
      map.setPaintProperty('grid-line', 'line-color', '#b54832');
      break;
    case '针路':
      map.flyTo({ center: [112, 22], zoom: 3.8, duration: 1800 });
      map.setPaintProperty('route-line', 'line-opacity', 1);
      map.setPaintProperty('route-line', 'line-width', 3);
      break;
    case '地圆':
      map.flyTo({ center: [107, 30], zoom: 2.5, duration: 1800 });
      break;
  }
}

document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((item) => { item.classList.remove('is-active'); item.setAttribute('aria-selected', 'false'); });
  tab.classList.add('is-active');
  tab.setAttribute('aria-selected', 'true');
  const model = tab.dataset.model ?? '服制';
  applyModelView(model);
}));

timeline.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight') { event.preventDefault(); renderEra(Math.round(continuousPos) + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); renderEra(Math.round(continuousPos) - 1); } if (event.key === 'Home') { event.preventDefault(); renderEra(0); } if (event.key === 'End') { event.preventDefault(); renderEra(eras.length - 1); } });
let timelineDragging = false;
function updateEraFromPointer(clientX: number) {
  const bounds = timeline.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  renderContinuous(ratio * (eras.length - 1));
}
timeline.addEventListener('pointerdown', (event) => {
  timelineDragging = true;
  timeline.classList.add('is-dragging');
  timeline.setPointerCapture(event.pointerId);
  updateEraFromPointer(event.clientX);
});
timeline.addEventListener('pointermove', (event) => {
  if (timelineDragging) updateEraFromPointer(event.clientX);
});
timeline.addEventListener('pointerup', (event) => {
  timelineDragging = false;
  timeline.classList.remove('is-dragging');
  timeline.releasePointerCapture(event.pointerId);
});
timeline.addEventListener('pointercancel', () => { timelineDragging = false; timeline.classList.remove('is-dragging'); });
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setDrawer(searchDrawer, true); placeSearch.focus(); renderResults(); } if (event.key === 'Escape') { overlayControl.classList.remove('is-open'); overlayControl.setAttribute('aria-hidden', 'true'); sourcesDrawer.classList.remove('is-open'); atlasDrawer.classList.remove('is-open'); searchDrawer.classList.remove('is-open'); document.body.classList.remove('drawer-open'); closeLightbox(); } });
document.querySelector<HTMLAnchorElement>('.brand')!.addEventListener('click', (event) => { event.preventDefault(); intro.classList.remove('is-hidden'); experience.classList.remove('is-visible'); hasStarted = false; });
window.addEventListener('resize', () => setTimelineCursor(continuousPos));

renderEra(currentEra);
renderResults();
map.on('load', () => { applyIntensities(intensityAt(continuousPos)); });

// 便于本地验收：访问 /?stage=experience 可直接进入核心交互场景。
if (new URLSearchParams(window.location.search).get('stage') === 'experience') startExperience();
