import eras from './content/eras.json';
import places from './content/places.json';
import storytellers from './content/storytellers.json';
import sources from './content/sources.json';
import atlas from './content/atlas.json';
import basemap from './content/basemap.json';
import './styles/tokens.css';
import './styles/global.css';
import './styles/responsive.css';

type Era = (typeof eras)[number];
type Place = (typeof places)[number];
type Storyteller = (typeof storytellers)[number];

// 底图与地名共用同一投影（参数由 scripts/build-basemap.mjs 从 Natural Earth 数据生成）。
const proj = basemap.projection;
function project(lng: number, lat: number) {
  return { x: proj.offX + (lng - proj.lon0) * proj.scale, y: proj.offY + (proj.lat1 - lat) * proj.scale * proj.cosMid };
}

// 可点按地名：按真实经纬度定位，名字必须能在 places.json 中查到（由 scripts/lint-content.mjs 校验）。
const mapPlaces = [
  { name: '敦煌', lng: 94.66, lat: 40.14 },
  { name: '长安', lng: 108.94, lat: 34.34 },
  { name: '洛阳', lng: 112.45, lat: 34.62 },
  { name: '建康', lng: 118.78, lat: 32.06 },
  { name: '临安', lng: 120.16, lat: 30.25 },
  { name: '燕京', lng: 116.4, lat: 39.9 },
  { name: '广州', lng: 113.26, lat: 23.13 },
].map((place) => { const p = project(place.lng, place.lat); return { ...place, x: Math.round(p.x), y: Math.round(p.y), hit: 26 }; });

// 真实地理底图（Natural Earth 公有领域数据）：陆地、海岸线、河流、湖泊，几何真实、非示意绘制。
const geoLayer = `<g class="geo-layer"><g class="geo-land">${basemap.land.map((d: string) => `<path d="${d}"/>`).join('')}</g><g class="geo-coast">${basemap.coast.map((d: string) => `<path d="${d}"/>`).join('')}</g><g class="geo-lakes">${basemap.lakes.map((lake: { d: string }) => `<path d="${lake.d}"/>`).join('')}</g><g class="geo-rivers">${basemap.rivers.map((river: { name: string; d: string }) => `<path d="${river.d}" data-river="${river.name}"/>`).join('')}</g></g>`;

// 天下模型与时代的默认对应；用户仍可手动切换。
const modelByEra: Record<string, string> = { shangzhou: '服制', zhanguo: '想象', qinhan: '郡县', suitang: '画方', yujitu: '画方', mingchu: '针路', kunyu: '地圆' };
const modelCopy: Record<string, string> = {
  服制: '以中心向外层层展开，天下首先是一种关系秩序。',
  想象: '昆仑居中，四海之外皆是奇国——世界先被想象，再被丈量。',
  郡县: '世界被分成可以管理、丈量和征调的地方单元。',
  画方: '计里画方，每方折地百里——比例成为地图的语言。',
  针路: '以罗盘方位与更数记程，海图上每一段航线都有针字为凭。',
  地圆: '大地不再有边缘，而是一个可以绕行一周的球体。',
};

// 时代单字水印：填充地图卡左侧留白，与右侧竖排引文对称。
const eraChar: Record<string, string> = { shangzhou: '商', zhanguo: '海', qinhan: '秦', suitang: '唐', yujitu: '宋', mingchu: '航', kunyu: '明' };

// 真实古图层：已核验公有领域素材（许可与出处见 NOTICE.md 和来源抽屉），素材文件由 scripts/lint-content.mjs 校验存在。
// 图幅统一为地图内框，preserveAspectRatio=meet 自动等比适配。
const eraOverlayImage: Record<string, { src: string; caption: string }> = {
  qinhan: { src: 'assets/maps/atlas/qin.jpg', caption: '秦疆域图（前 221 年）· 重绘 · CC BY-SA' },
  suitang: { src: 'assets/maps/atlas/tang660.jpg', caption: '唐帝国与都护府（约 660 年）· 重绘 · CC0' },
  yujitu: { src: 'assets/maps/yujitu-1136-loc.jpg', caption: '《禹迹图》1136 年石刻 · 美国国会图书馆藏拓 · 公有领域' },
  mingchu: { src: 'assets/maps/atlas/maokun-sumatra.jpg', caption: '《郑和航海图》苏门答腊段 · 《武备志》· 公有领域' },
  kunyu: { src: 'assets/maps/kunyu-wanguo-1602.jpg', caption: '《坤舆万国全图》 · 1602 · 公有领域' },
};

// 七幕「生长」强度向量：拖动时间轴时相邻两幕连续插值——神话淡出、实测淡入。
// 字段：rings 五服环 / stars 山海星野 / geo 实测地理 / places 地名 / overlay 古图 / routes 针路。
interface EraIntensity { rings: number; stars: number; geo: number; places: number; overlay: number; routes: number }
// 主角是「会生长的矢量世界」；真实古图默认收起（overlay=可用性 0/1），点「掀开对照」才由滑杆叠上来。
const eraIntensity: Record<string, EraIntensity> = {
  shangzhou: { rings: 0.95, stars: 0.25, geo: 0.08, places: 0.14, overlay: 0, routes: 0 },
  zhanguo: { rings: 0.2, stars: 0.9, geo: 0.12, places: 0.16, overlay: 0, routes: 0 },
  qinhan: { rings: 0, stars: 0.08, geo: 0.55, places: 0.6, overlay: 1, routes: 0 },
  suitang: { rings: 0, stars: 0, geo: 0.6, places: 0.72, overlay: 1, routes: 0 },
  yujitu: { rings: 0, stars: 0, geo: 0.5, places: 0.85, overlay: 1, routes: 0 },
  mingchu: { rings: 0, stars: 0, geo: 0.8, places: 0.8, overlay: 1, routes: 1 },
  kunyu: { rings: 0, stars: 0, geo: 0.85, places: 0.9, overlay: 1, routes: 0.12 },
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
      <div class="topbar-meta"><span class="eyebrow">历史地理交互叙事 · 原型 0.3</span><button class="text-button" id="open-atlas">历代图卷</button><button class="text-button" id="open-sources">来源与说明</button></div>
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
            <button class="quiet-button" id="toggle-play" aria-label="播放时间轴" title="自动播放三幕时代演变"><span class="play-icon">▶</span><span>播放</span></button>
            <button class="quiet-button" id="reset-timeline" aria-label="重置时间轴" title="回到商周起点"><span class="reset-icon">↺</span><span>重置</span></button>
            <button class="quiet-button" id="open-search" title="按古今名称查询地名"><span class="search-icon">⌕</span><span>查地名</span></button>
          </div>
        </div>

        <div class="map-stage" id="map-stage">
          <div class="map-label map-label-north">北</div>
          <div class="map-seal" aria-hidden="true"><span>禹</span><span>跡</span></div>
          <div class="map-era-char" id="map-era-char" aria-hidden="true">${eraChar[eras[currentEra].id] ?? ''}</div>
          <p class="map-quote" id="map-quote">${eras[currentEra].narrativeLine}</p>
          <svg class="map-svg" viewBox="0 0 1000 600" role="img" aria-label="随时代变化的示意地图">
            <defs>
              <filter id="soft-glow"><feGaussianBlur stdDeviation="8"/></filter>
              <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" result="noise"/>
                <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.36  0 0 0 .05 0"/>
              </filter>
              <linearGradient id="paper-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6d0a4" stop-opacity=".97"/><stop offset="1" stop-color="#b8946a" stop-opacity=".88"/></linearGradient>
              <radialGradient id="paper-vignette" cx=".5" cy=".46" r=".75"><stop offset=".55" stop-color="#3b3a31"/><stop offset="1" stop-color="#26251f"/></radialGradient>
              <clipPath id="map-clip"><rect x="86" y="42" width="828" height="500" rx="8"/></clipPath>
            </defs>            <rect x="86" y="42" width="828" height="500" rx="8" class="map-paper" fill="url(#paper-vignette)"/>
            <g clip-path="url(#map-clip)">
              <rect x="86" y="42" width="828" height="500" filter="url(#paper-grain)"/>
              <rect class="ocean-wash" x="86" y="42" width="828" height="500"/>
              <path class="terra-incognita" d="M86 76 C146 56 186 104 168 168 C154 222 106 238 86 214 Z"/>
              <path class="terra-incognita" d="M820 448 C880 410 914 428 914 492 L914 542 L848 542 C822 512 802 476 820 448 Z"/>
              <path class="terra-incognita" d="M86 396 C132 380 164 416 154 470 C146 512 104 532 86 516 Z"/>
              <path class="terra-incognita" d="M560 42 C620 30 690 38 720 58 C688 78 610 84 566 70 C550 60 548 48 560 42 Z"/>
              ${geoLayer}
              <g class="shanhai-layer" id="shanhai-layer" aria-hidden="true">
                <path class="shanhai-path" d="M214 132 Q320 86 452 104 Q560 118 668 96 Q780 76 862 128"/>
                <circle class="shanhai-star" cx="214" cy="132" r="4"/><circle class="shanhai-star" cx="452" cy="104" r="3"/><circle class="shanhai-star" cx="668" cy="96" r="4"/><circle class="shanhai-star" cx="862" cy="128" r="3"/>
                <circle class="shanhai-star" cx="560" cy="428" r="3.5"/><circle class="shanhai-star" cx="806" cy="392" r="3"/>
                <text class="shanhai-label" x="196" y="116">昆仑</text>
                <text class="shanhai-label" x="430" y="88">流沙</text>
                <text class="shanhai-label" x="540" y="448">羽民国</text>
                <text class="shanhai-label" x="786" y="412">烛龙</text>
              </g>
              <g class="wufu-rings">
                <circle cx="480" cy="290" r="250" class="ring-fill fill-5"/>
                <circle cx="480" cy="290" r="205" class="ring-fill fill-4"/>
                <circle cx="480" cy="290" r="155" class="ring-fill fill-3"/>
                <circle cx="480" cy="290" r="105" class="ring-fill fill-2"/>
                <circle cx="480" cy="290" r="55" class="ring-fill fill-1"/>
                <line x1="480" y1="290" x2="480" y2="55" class="ring-axis"/>
                <line x1="480" y1="290" x2="735" y2="290" class="ring-axis"/>
                <line x1="480" y1="290" x2="480" y2="525" class="ring-axis"/>
                <line x1="480" y1="290" x2="225" y2="290" class="ring-axis"/>
                <circle cx="480" cy="290" r="250" class="ring ring-5"/>
                <circle cx="480" cy="290" r="205" class="ring ring-4"/>
                <circle cx="480" cy="290" r="155" class="ring ring-3"/>
                <circle cx="480" cy="290" r="105" class="ring ring-2"/>
                <circle cx="480" cy="290" r="55" class="ring ring-1"/>
                <circle cx="480" cy="290" r="9" class="ring-core"/>
                <text x="480" y="252" class="ring-label">甸服</text>
                <text x="480" y="202" class="ring-label">侯服</text>
                <text x="480" y="152" class="ring-label">绥服</text>
                <text x="480" y="102" class="ring-label">要服</text>
                <text x="480" y="70" class="ring-label">荒服</text>
                <text x="480" y="322" class="ring-label ring-core-label">王畿</text>
              </g>
              <path class="mountain-range" d="M128 246 l20 -30 l20 30 M158 216 l16 -24 l16 24 M480 210 l22 -32 l22 32 M522 178 l18 -26 l18 26 M770 250 l20 -30 l20 30 M800 220 l16 -24 l16 24"/>
              <path class="grid-lines" d="M160 56V530 M240 56V530 M320 56V530 M400 56V530 M480 56V530 M560 56V530 M640 56V530 M720 56V530 M800 56V530 M880 56V530 M100 130H900 M100 210H900 M100 290H900 M100 370H900 M100 450H900"/>
              <g class="globe-curvature">
                <path class="globe-arc" d="M86 480 Q500 356 914 480"/>
                <path class="globe-arc" d="M86 138 Q500 20 914 138"/>
                <path class="globe-line" d="M240 42 Q296 292 240 542"/>
                <path class="globe-line" d="M370 42 Q424 292 370 542"/>
                <path class="globe-line" d="M500 42 Q556 292 500 542"/>
                <path class="globe-line" d="M630 42 Q682 292 630 542"/>
                <path class="globe-line" d="M760 42 Q808 292 760 542"/>
                <path class="globe-line" d="M86 176 Q500 146 914 176"/>
                <path class="globe-line" d="M86 296 Q500 268 914 296"/>
                <path class="globe-line" d="M86 412 Q500 384 914 412"/>
              </g>
              <g class="compass" transform="translate(152 462)">
                <circle r="26" class="compass-ring"/>
                <path d="M0 -19 L4 0 L0 19 L-4 0 Z" class="compass-needle"/>
                <path d="M-19 0 L0 -4 L19 0 L0 4 Z" class="compass-cross"/>
                <text y="-32" class="compass-n">子</text>
                <text y="42" class="compass-n">午</text>
              </g>
              <g class="map-places">${mapPlaces.map((place) => `<g class="map-place" data-place="${place.name}" role="button" tabindex="0" aria-label="查询地名：${place.name}"><circle class="place-hit" cx="${place.x}" cy="${place.y}" r="${place.hit}"/><circle class="place-dot" cx="${place.x}" cy="${place.y}" r="8"/><text class="place-label" x="${place.x - 16}" y="${place.y - 16}">${place.name}</text></g>`).join('')}</g>
              <g class="ancient-overlay" id="ancient-overlay"><g class="overlay-real"><image id="overlay-image" class="overlay-image" x="86" y="42" width="828" height="500" preserveAspectRatio="xMidYMid meet" href="assets/maps/yujitu-1136-loc.jpg"/><text id="overlay-caption" x="94" y="536" class="overlay-caption">《禹迹图》1136 年石刻 · 美国国会图书馆藏拓 · 公有领域</text></g></g>
              <g class="route-layer" id="route-layer" aria-hidden="true">
                <path id="zhenghe-route" class="route-line" d="M738 296 Q716 336 668 366 Q636 392 618 424 Q606 470 604 540"/>
                <circle class="route-port" cx="738" cy="296" r="5"/>
                <circle class="route-port" cx="668" cy="366" r="4"/>
                <circle class="route-port" cx="618" cy="424" r="4"/>
                <text class="route-label" x="712" y="290">龙江关 · 刘家港</text>
                <text class="route-label" x="640" y="384">占城 · 满剌加 →</text>
                <text class="route-label" x="612" y="520">往锡兰 · 忽鲁谟斯 · 东非</text>
                <circle class="route-ship" r="5"><animateMotion dur="7s" repeatCount="indefinite" path="M738 296 Q716 336 668 366 Q636 392 618 424 Q606 470 604 540"/></circle>
              </g>
            </g>
            <rect x="86" y="42" width="828" height="500" rx="8" class="map-frame"/>
          </svg>
          <div class="map-stamp">古今图对照<br />不作现实边界主张</div>
          <button class="expand-button" id="expand-map" aria-label="放大查看地图" title="放大查看地图">⤢</button>
          <button class="compare-button" id="compare-button"><span class="compare-icon">◐</span><span>掀开古今对照</span></button>
          <div class="overlay-control" id="overlay-control" aria-hidden="true"><div class="overlay-panel"><div class="panel-heading"><div><p class="card-label">古今叠层</p><h3>把这一幕的真迹叠上来</h3></div><button class="close-button" id="close-overlay" aria-label="关闭古今叠层">×</button></div><p id="overlay-desc">古图为已核验的公版原图（禹迹图 / 坤舆万国全图），与今图未做严格配准，仅作视觉叠合；方位与比例的真实差异本身就是历史。</p><label for="opacity-range">古图浓度 <output id="opacity-output">60%</output></label><input id="opacity-range" type="range" min="0" max="100" value="60"/><div class="panel-foot"><span>今图 · Natural Earth 实测地理</span><span>古图 · 传世原图</span></div></div></div>
        </div>

        <div class="timeline-wrap">
          <div class="timeline-heading"><span>时间轴 <i class="heading-seal" title="圭尺：古代量天之尺，此处喻指度量三千年时间的标尺">圭尺</i></span><span class="timeline-hint" id="timeline-hint">向右拖动，观察世界变得可测</span></div>
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
          <article class="model-card"><div class="card-label">天下模型 · 示意</div><div class="model-switch" role="tablist">${['服制', '想象', '郡县', '画方', '针路', '地圆'].map((model, index) => `<button class="model-tab ${index === 0 ? 'is-active' : ''}" data-model="${model}" role="tab" aria-selected="${index === 0}">${model}</button>`).join('')}</div><p id="model-copy">以中心向外层层展开，天下首先是一种关系秩序。</p></article>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <span>禹迹 · 历史地理交互叙事原型 0.3</span>
      <span class="footer-note">底图与古图均为核验过的公有领域数据</span>
    </footer>

    <div class="map-lightbox" id="map-lightbox" aria-hidden="true"><button class="close-button lightbox-close" id="close-lightbox" aria-label="关闭放大地图">×</button><p class="lightbox-hint">点按空白处关闭 · 古今图对照，不作现实边界主张</p><div class="lightbox-body" id="lightbox-body"></div></div>

    <div class="search-drawer" id="search-drawer" aria-hidden="true"><div class="drawer-inner"><div class="panel-heading"><div><p class="card-label">地名查询</p><h3>查一个地名的前世</h3></div><button class="close-button" id="close-search" aria-label="关闭地名查询">×</button></div><label class="search-field"><span>输入古今名称</span><input id="place-search" type="search" placeholder="例如：燕京 / 北京" autocomplete="off"/><span class="search-key">${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}</span></label><div class="search-suggestions" id="search-suggestions"></div><div class="search-results" id="search-results"></div></div></div>

    <div class="atlas-drawer" id="atlas-drawer" aria-hidden="true"><div class="drawer-inner atlas-inner"><div class="panel-heading"><div><p class="card-label">历代图卷</p><h3>中国历代历史地图 · ${atlas.length} 幅</h3></div><button class="close-button" id="close-atlas" aria-label="关闭历代图卷">×</button></div><p class="drawer-intro">按时期先后排列。标注「存世图件」为传世古地图原件；「重绘形势图」为今人依据公开历史地理研究重绘；「近代出版图件」为二十世纪初出版之历史地图集。图件均取自维基共享资源，逐幅标注作者与许可；古往今来的边界画法存在学术争议，本卷不作任何现实边界主张。</p><div class="atlas-grid">${atlas.map((item) => atlasCard(item as AtlasItem)).join('')}</div></div></div>

    <div class="sources-drawer" id="sources-drawer" aria-hidden="true"><div class="drawer-inner"><div class="panel-heading"><div><p class="card-label">来源与说明</p><h3>每一条线，都有来处</h3></div><button class="close-button" id="close-sources" aria-label="关闭来源与说明">×</button></div><p class="drawer-intro">当前为原型数据。正式发布前，所有图片、字体、文字和配准成果都需要再次核验许可。</p><div class="source-list">${sources.map((source) => `<article class="source-item"><div class="source-type">${source.type}</div><div><h4>${source.title}</h4><p>${source.detail}</p><span class="source-status">${source.status}</span></div></article>`).join('')}</div><div class="source-note"><strong>说明</strong><p>历史边界、地名对应和人物独白可能存在争议。产品会把确定事实、合理解释、学术争议和产品化演绎分开标记。</p></div></div></div>
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
const ancientOverlay = document.querySelector<HTMLElement>('#ancient-overlay')!;
const overlayImage = document.querySelector<SVGImageElement>('#overlay-image')!;
const overlayCaption = document.querySelector<SVGTextElement>('#overlay-caption')!;

const overlayControl = document.querySelector<HTMLElement>('#overlay-control')!;
const searchDrawer = document.querySelector<HTMLElement>('#search-drawer')!;
const sourcesDrawer = document.querySelector<HTMLElement>('#sources-drawer')!;
const placeSearch = document.querySelector<HTMLInputElement>('#place-search')!;
const searchResults = document.querySelector<HTMLElement>('#search-results')!;
const searchSuggestions = document.querySelector<HTMLElement>('#search-suggestions')!;

const ringsEl = document.querySelector<HTMLElement>('.wufu-rings')!;
const starsLayer = document.querySelector<HTMLElement>('#shanhai-layer')!;
const geoLayerEl = document.querySelector<HTMLElement>('.geo-layer')!;
const placesEl = document.querySelector<HTMLElement>('.map-places')!;
const routeLayer = document.querySelector<HTMLElement>('#route-layer')!;

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

// 「生长」核心：把强度向量实时应用到六个图层（掀开对照的滑杆浓度在 overlay 中生效）。
function applyIntensities(v: EraIntensity) {
  ringsEl.style.opacity = String(v.rings);
  starsLayer.style.opacity = String(v.stars);
  geoLayerEl.style.opacity = String(v.geo);
  placesEl.style.opacity = String(v.places);
  routeLayer.style.opacity = String(v.routes);
  ancientOverlay.style.opacity = String(overlayOpacity * v.overlay);
  ancientOverlay.classList.toggle('is-off', v.overlay <= 0.001);
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

// 文案层：标题、讲述者、模型、古图切换、节点激活。索引变化时才调用。
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
  const real = eraOverlayImage[era.id];
  if (real) {
    if (overlayImage.getAttribute('href') !== real.src) overlayImage.setAttribute('href', real.src);
    overlayCaption.textContent = real.caption;
  }
  timeline.setAttribute('aria-valuenow', String(index));
  document.querySelectorAll<HTMLButtonElement>('.timeline-node').forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === index));
  const hints: Record<string, string> = { shangzhou: '向右拖动，看世界从想象中长出来', zhanguo: '昆仑与奇国：先被想象的世界', qinhan: '郡县成网，海岸线开始清晰', suitang: '一寸折百里，山河更细了', yujitu: '计里画方——点「掀开古今对照」看真迹', mingchu: '针路通四海，看航线驶向非洲', kunyu: '地球张开弧度——点「掀开古今对照」看世界地图' };
  document.querySelector<HTMLElement>('#timeline-hint')!.textContent = hints[era.id] ?? '向右拖动，观察世界变得可测';
  const eraModel = modelByEra[era.id] ?? '服制';
  document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((tab) => {
    const active = tab.dataset.model === eraModel;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelector<HTMLElement>('#model-copy')!.textContent = modelCopy[eraModel];
  localStorage.setItem('yuji-era', String(index));
}

function renderEra(index: number) {
  const idx = Math.max(0, Math.min(eras.length - 1, index));
  continuousPos = idx;
  applyEraTexts(idx);
  applyIntensities(intensityAt(idx));
  const aligned = alignedAt(idx);
  progress.style.width = `${aligned}%`;
  cursor.style.left = `${aligned}%`;
}

// 连续渲染：拖动时在相邻两幕之间插值，文案在跨过中点时切换。
function renderContinuous(pos: number) {
  continuousPos = Math.max(0, Math.min(eras.length - 1, pos));
  applyIntensities(intensityAt(continuousPos));
  const aligned = alignedAt(continuousPos);
  progress.style.width = `${aligned}%`;
  cursor.style.left = `${aligned}%`;
  const idx = Math.round(continuousPos);
  if (idx !== currentEra) applyEraTexts(idx);
}

function startExperience() {
  hasStarted = true;
  intro.classList.add('is-hidden');
  experience.classList.add('is-visible');
  // 聚焦滑块本体而非时代节点：避免溢出容器为露出节点而横向滚动、裁掉起点。
  setTimeout(() => timeline.focus({ preventScroll: true }), 500);
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
  // 同一今地且同一条称谓链的条目只保留最相关的一条，避免一串重复卡片。
  const seen = new Set<string>();
  const matches: Place[] = [];
  for (const item of scored) {
    const key = `${item.place.modern}|${item.place.chain.join('→')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(item.place);
    if (matches.length >= 8) break;
  }
  searchSuggestions.innerHTML = normalized ? '' : '<span>试试</span>' + places.slice(0, 5).map((place: Place) => `<button class="suggestion" data-place="${place.name}">${place.name}</button>`).join('');
  const locatable = new Set(mapPlaces.map((item) => item.name));
  searchResults.innerHTML = matches.length ? matches.map((place: Place) => `<article class="place-result" tabindex="0"><div class="place-heading"><h4>${place.name}</h4><span>${place.modern}</span></div><div class="place-chain">${place.chain.map((name) => `<span class="chain-item ${name === place.name ? 'is-current' : ''}">${name}</span>`).join('<i>→</i>')}</div><p>${place.note}</p><div class="place-meta"><span>${place.certainty}</span><span>${place.era}</span></div>${locatable.has(place.name) ? `<button class="locate-button" data-locate="${place.name}"><span>◎</span>在图上定位</button>` : ''}<small>来源：${place.source}</small></article>`).join('') : `<div class="empty-state"><span class="empty-mark">⌁</span><strong>还没有找到这个地名</strong><p>首版只收录 20 条示例地名，试试这些：</p><div class="empty-suggestions">${['燕京', '临安', '长安', '大都'].map((name) => `<button class="suggestion" data-place="${name}">${name}</button>`).join('')}</div></div>`;
}

function fillPlaceSearch(name: string) {
  placeSearch.value = name;
  placeSearch.dispatchEvent(new Event('input'));
  placeSearch.focus();
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
  const hasRealMap = Boolean(eraOverlayImage[eras[currentEra].id]);
  document.querySelector<HTMLElement>('#overlay-desc')!.textContent = hasRealMap
    ? '这是本幕的传世真迹（或据公开研究重绘的形势图）。向上拖动滑杆把它叠到今图上对照——古今未做严格配准，方位与比例的真实差异本身就是历史。'
    : '这个时代还没有传世地图。天下以《禹贡》五服的观念图呈现——在地图诞生之前，世界是一种秩序想象，而不是被测量的地面。';
  const range = document.querySelector<HTMLInputElement>('#opacity-range')!;
  range.disabled = !hasRealMap;
  // 打开对照即把真迹叠到 60%：既看清古图，又透出下面的生长世界。
  if (hasRealMap && overlayOpacity < 0.6) {
    overlayOpacity = 0.6;
    range.value = '60';
    applyIntensities(intensityAt(continuousPos));
    document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = '60%';
  }
});
document.querySelector<HTMLButtonElement>('#close-overlay')!.addEventListener('click', () => { overlayControl.classList.remove('is-open'); overlayControl.setAttribute('aria-hidden', 'true'); overlayOpacity = 0; document.querySelector<HTMLInputElement>('#opacity-range')!.value = '0'; document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = '0%'; renderEra(currentEra); });
overlayControl.addEventListener('click', (event) => { if (event.target === overlayControl) { overlayControl.classList.remove('is-open'); overlayControl.setAttribute('aria-hidden', 'true'); overlayOpacity = 0; document.querySelector<HTMLInputElement>('#opacity-range')!.value = '0'; document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = '0%'; renderEra(currentEra); } });
document.querySelector<HTMLInputElement>('#opacity-range')!.addEventListener('input', (event) => {
  overlayOpacity = Number((event.target as HTMLInputElement).value) / 100;
  applyIntensities(intensityAt(continuousPos));
  document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = `${Math.round(overlayOpacity * 100)}%`;
});
document.querySelector<HTMLButtonElement>('#open-search')!.addEventListener('click', () => { setDrawer(searchDrawer, true); placeSearch.focus(); renderResults(); });
document.querySelector<HTMLButtonElement>('#close-search')!.addEventListener('click', () => setDrawer(searchDrawer, false));
document.querySelector<HTMLButtonElement>('#open-sources')!.addEventListener('click', () => setDrawer(sourcesDrawer, true));
document.querySelector<HTMLButtonElement>('#close-sources')!.addEventListener('click', () => setDrawer(sourcesDrawer, false));
const atlasDrawer = document.querySelector<HTMLElement>('#atlas-drawer')!;
document.querySelector<HTMLButtonElement>('#open-atlas')!.addEventListener('click', () => setDrawer(atlasDrawer, true));
document.querySelector<HTMLButtonElement>('#close-atlas')!.addEventListener('click', () => setDrawer(atlasDrawer, false));
atlasDrawer.addEventListener('click', (event) => { if (event.target === atlasDrawer) setDrawer(atlasDrawer, false); });
placeSearch.addEventListener('input', () => { searchTerm = placeSearch.value; renderResults(searchTerm); });
searchSuggestions.addEventListener('click', (event) => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-place]'); if (!target) return; placeSearch.value = target.dataset.place ?? ''; placeSearch.dispatchEvent(new Event('input')); });
document.querySelectorAll<SVGGElement>('.map-place').forEach((node) => {
  const lookup = () => {
    setDrawer(searchDrawer, true);
    placeSearch.value = node.dataset.place ?? '';
    placeSearch.dispatchEvent(new Event('input'));
    placeSearch.focus();
  };
  node.addEventListener('click', (event) => { event.stopPropagation(); lookup(); });
  node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lookup(); } });
});

// 点按地图底板（非地名点）放大查看：灯箱内可横向/纵向平移。
const mapSvg = document.querySelector<SVGElement>('.map-svg')!;
const mapLightbox = document.querySelector<HTMLElement>('#map-lightbox')!;
const lightboxBody = document.querySelector<HTMLElement>('#lightbox-body')!;
function openLightbox() {
  lightboxBody.innerHTML = '';
  const clone = mapSvg.cloneNode(true) as SVGElement;
  clone.removeAttribute('role');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('[tabindex]').forEach((item) => item.removeAttribute('tabindex'));
  lightboxBody.appendChild(clone);
  mapLightbox.classList.add('is-open');
  mapLightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
}
function closeLightbox() {
  mapLightbox.classList.remove('is-open');
  mapLightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
}
mapSvg.addEventListener('click', (event) => { if (!(event.target as Element).closest('.map-place')) openLightbox(); });
document.querySelector<HTMLButtonElement>('#expand-map')!.addEventListener('click', openLightbox);
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
      renderEra(currentEra + 1);
    }, 2200);
  }
});
document.querySelector<HTMLButtonElement>('#reset-timeline')!.addEventListener('click', () => {
  const playButton = document.querySelector<HTMLButtonElement>('#toggle-play')!;
  playButton.dataset.playing = 'false';
  playButton.innerHTML = '<span class="play-icon">▶</span><span>播放</span>';
  renderEra(0);
});
document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((item) => { item.classList.remove('is-active'); item.setAttribute('aria-selected', 'false'); }); tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true'); document.querySelector<HTMLElement>('#model-copy')!.textContent = modelCopy[tab.dataset.model ?? '服制']; }));

searchResults.addEventListener('click', (event) => {
  const suggest = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-place]');
  if (suggest) { fillPlaceSearch(suggest.dataset.place ?? ''); return; }
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-locate]');
  if (!target) return;
  const name = target.dataset.locate ?? '';
  setDrawer(searchDrawer, false);
  const dot = document.querySelector<SVGGElement>(`.map-place[data-place="${name}"]`);
  if (!dot) return;
  dot.classList.remove('is-pulse');
  void (dot as unknown as HTMLElement).offsetWidth;
  dot.classList.add('is-pulse');
  window.setTimeout(() => dot.classList.remove('is-pulse'), 3600);
});

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
window.addEventListener('resize', () => renderEra(currentEra));

renderEra(currentEra);
renderResults();

// 便于本地验收：访问 /?stage=experience 可直接进入核心交互场景。
if (new URLSearchParams(window.location.search).get('stage') === 'experience') startExperience();
