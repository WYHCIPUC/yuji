import eras from './content/eras.json';
import places from './content/places.json';
import storytellers from './content/storytellers.json';
import sources from './content/sources.json';
import './styles/tokens.css';
import './styles/global.css';
import './styles/responsive.css';

type Era = (typeof eras)[number];
type Place = (typeof places)[number];

// 示意地图上的可点按地名；名字必须能在 places.json 中查到（由 scripts/lint-content.mjs 校验）。
const mapPlaces = [
  { name: '洛阳', x: 454, y: 238 },
  { name: '建康', x: 520, y: 280 },
  { name: '临安', x: 600, y: 315 },
  { name: '燕京', x: 715, y: 260 },
];

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

const lastEra = Number(localStorage.getItem('yuji-era') ?? 0);
let currentEra = Number.isFinite(lastEra) && lastEra >= 0 && lastEra < eras.length ? lastEra : 0;
let overlayOpacity = 0.55;
let hasStarted = false;
let searchTerm = '';

app.innerHTML = `
  <div class="app-shell" data-era="${eras[currentEra].id}">
    <div class="grain" aria-hidden="true"></div>
    <header class="topbar">
      <a class="brand" href="#" aria-label="禹迹首页"><span class="brand-mark">禹</span><span>禹迹</span></a>
      <div class="topbar-meta"><span class="eyebrow">历史地理交互叙事 · 原型 0.1</span><button class="text-button" id="open-sources">来源与说明</button></div>
    </header>

    <main>
      <section class="intro-screen" id="intro-screen" aria-labelledby="intro-title">
        <div class="mist-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="kicker">从想象到测量 · 公元前 11 世纪—1602 年</p>
        <h1 id="intro-title">何谓天下？</h1>
        <p class="intro-copy">拖动时间轴，看古人眼中的世界<br class="mobile-only" />如何一点点长成地球。</p>
        <button class="primary-button" id="start-button"><span>开始探索</span><span class="arrow">↗</span></button>
        <button class="resume-button" id="resume-button" hidden>继续上次看到的时代</button>
        <button class="skip-button" id="skip-intro">跳过开场动画</button>
      </section>

      <section class="experience" id="experience" aria-label="时间轴探索">
        <div class="scene-header">
          <div>
            <p class="kicker">当前时代 · <span id="era-short-year">${eras[currentEra].shortYear}</span></p>
            <h2 id="era-title" aria-live="polite">${eras[currentEra].title}</h2>
            <p id="era-description" aria-live="polite">${eras[currentEra].description}</p>
            <p class="scene-source" id="era-source">内容状态：${eras[currentEra].certainty} · ${eras[currentEra].source}</p>
          </div>
          <div class="scene-actions">
            <button class="quiet-button" id="toggle-play" aria-label="播放时间轴"><span class="play-icon">▶</span><span>播放</span></button>
            <button class="quiet-button" id="reset-timeline" aria-label="重置时间轴"><span class="reset-icon">↺</span><span>重置</span></button>
            <button class="quiet-button" id="open-search"><span class="search-icon">⌕</span><span>查地名</span></button>
          </div>
        </div>

        <div class="map-stage" id="map-stage">
          <div class="map-label map-label-north">北</div>
          <svg class="map-svg" viewBox="0 0 1000 600" role="img" aria-label="随时代变化的示意地图">
            <defs>
              <filter id="soft-glow"><feGaussianBlur stdDeviation="8"/></filter>
              <linearGradient id="paper-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8c29a" stop-opacity=".94"/><stop offset="1" stop-color="#ad8b5c" stop-opacity=".72"/></linearGradient>
              <clipPath id="map-clip"><rect x="86" y="42" width="828" height="500" rx="8"/></clipPath>
            </defs>
            <rect x="86" y="42" width="828" height="500" rx="8" class="map-paper"/>
            <g clip-path="url(#map-clip)">
              <path class="mountain-haze haze-1" d="M40 430 C180 310 260 360 360 280 S570 180 720 300 S920 250 1050 360"/>
              <path class="mountain-haze haze-2" d="M60 500 C220 400 290 470 440 355 S670 270 940 430"/>
              <path class="grid-lines" d="M160 56V530 M240 56V530 M320 56V530 M400 56V530 M480 56V530 M560 56V530 M640 56V530 M720 56V530 M800 56V530 M880 56V530 M100 130H900 M100 210H900 M100 290H900 M100 370H900 M100 450H900"/>
              <path class="territory territory-west" d="M125 190 C190 100 315 120 372 185 C410 230 360 292 300 312 C235 334 156 295 125 250Z"/>
              <path class="territory territory-east" d="M405 156 C490 90 650 115 762 160 C833 188 870 285 830 344 C782 418 625 430 530 372 C460 330 376 248 405 156Z"/>
              <path class="river river-yellow" d="M185 150 C280 168 305 224 380 220 C465 215 510 160 602 184 C665 201 715 238 805 220"/>
              <path class="river river-yangtze" d="M195 300 C295 278 370 330 455 318 C545 305 604 350 680 337 C745 326 784 286 850 305"/>
              <path class="river river-future" d="M620 95 C690 150 718 188 720 235 C721 280 790 320 862 394"/>
              <g class="constellation"><circle cx="250" cy="160" r="4"/><circle cx="345" cy="118" r="3"/><circle cx="438" cy="110" r="4"/><circle cx="760" cy="130" r="3"/><path d="M250 160L345 118L438 110 M438 110L760 130"/></g>
              <g class="map-places">${mapPlaces.map((place) => `<g class="map-place" data-place="${place.name}" role="button" tabindex="0" aria-label="查询地名：${place.name}"><circle class="place-hit" cx="${place.x}" cy="${place.y}" r="17"/><circle class="place-dot" cx="${place.x}" cy="${place.y}" r="7"/><text class="place-label" x="${place.x - 16}" y="${place.y - 14}">${place.name}</text></g>`).join('')}</g>
              <g class="ancient-overlay" id="ancient-overlay"><rect x="86" y="42" width="828" height="500" fill="url(#paper-gradient)"/><path d="M142 140 Q310 62 480 142 T860 128 M110 360 Q270 280 450 370 T900 340" class="overlay-brush"/><path d="M170 100V480 M280 74V500 M390 72V500 M500 72V500 M610 72V500 M720 72V500 M830 72V500" class="overlay-grid"/><text x="150" y="115" class="overlay-title">禹迹示意叠层</text></g>
            </g>
            <rect x="86" y="42" width="828" height="500" rx="8" class="map-frame"/>
          </svg>
          <div class="map-annotation annotation-1"><span></span><strong>河流</strong><small>随时代逐渐清晰</small></div>
          <div class="map-annotation annotation-2"><span></span><strong>地名</strong><small>点墨浮现 · 点按查前世</small></div>
          <div class="map-stamp">示意重绘<br />不代表现实边界</div>
          <button class="compare-button" id="compare-button"><span class="compare-icon">◐</span><span>掀开古今对照</span></button>
        </div>

        <div class="timeline-wrap">
          <div class="timeline-heading"><span>时间轴</span><span class="timeline-hint" id="timeline-hint">向右拖动，观察世界变得可测</span></div>
          <div class="timeline" id="timeline" role="slider" aria-label="时代时间轴" aria-valuemin="0" aria-valuemax="${eras.length - 1}" aria-valuenow="${currentEra}" tabindex="0">
            <div class="timeline-track"><div class="timeline-progress" id="timeline-progress"></div></div>
            ${eras.map((era, index) => `<button class="timeline-node ${index === currentEra ? 'is-active' : ''}" data-index="${index}" style="--node-accent:${era.accent}" aria-label="${era.year}：${era.title}"><span class="node-dot"></span><span class="node-year">${era.year}</span><span class="node-caption">${era.shortYear}</span></button>`).join('')}
          </div>
        </div>

        <div class="bottom-grid">
          <article class="story-card" id="story-card">
            <div class="card-label">制图者引路</div>
            <div class="story-content"><div class="story-avatar">朱</div><div><h3>${storytellers[0].name}</h3><p>${storytellers[0].text}</p><small>${storytellers[0].source}</small></div></div>
          </article>
          <article class="model-card"><div class="card-label">天下模型 · 示意</div><div class="model-switch" role="tablist"><button class="model-tab is-active" data-model="服制" role="tab" aria-selected="true">五服</button><button class="model-tab" data-model="郡县" role="tab" aria-selected="false">郡县</button></div><p id="model-copy">以中心向外层层展开，天下首先是一种关系秩序。</p></article>
        </div>
      </section>
    </main>

    <div class="overlay-control" id="overlay-control" aria-hidden="true"><div class="overlay-panel"><div class="panel-heading"><div><p class="card-label">古今叠层</p><h3>拖动滑杆，掀开一张古图</h3></div><button class="close-button" id="close-overlay" aria-label="关闭古今叠层">×</button></div><p>古图叠层为预配准示意。差异会受到比例、投影和控制点选择影响。</p><label for="opacity-range">古图透明度 <output id="opacity-output">55%</output></label><input id="opacity-range" type="range" min="0" max="100" value="55"/><div class="panel-foot"><span>现代灰模</span><span>古图纸色</span></div></div></div>

    <div class="search-drawer" id="search-drawer" aria-hidden="true"><div class="drawer-inner"><div class="panel-heading"><div><p class="card-label">名物对照</p><h3>查一个地名的前世</h3></div><button class="close-button" id="close-search" aria-label="关闭地名查询">×</button></div><label class="search-field"><span>输入古今名称</span><input id="place-search" type="search" placeholder="例如：燕京 / 北京" autocomplete="off"/><span class="search-key">⌘ K</span></label><div class="search-suggestions" id="search-suggestions"></div><div class="search-results" id="search-results"></div></div></div>

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
const progress = document.querySelector<HTMLElement>('#timeline-progress')!;
const timeline = document.querySelector<HTMLElement>('#timeline')!;
const ancientOverlay = document.querySelector<HTMLElement>('#ancient-overlay')!;
const overlayControl = document.querySelector<HTMLElement>('#overlay-control')!;
const searchDrawer = document.querySelector<HTMLElement>('#search-drawer')!;
const sourcesDrawer = document.querySelector<HTMLElement>('#sources-drawer')!;
const placeSearch = document.querySelector<HTMLInputElement>('#place-search')!;
const searchResults = document.querySelector<HTMLElement>('#search-results')!;
const searchSuggestions = document.querySelector<HTMLElement>('#search-suggestions')!;

function renderEra(index: number) {
  currentEra = Math.max(0, Math.min(eras.length - 1, index));
  const era: Era = eras[currentEra];
  shell.dataset.era = era.id;
  title.textContent = era.title;
  description.textContent = era.description;
  shortYear.textContent = era.shortYear;
  eraSource.textContent = `内容状态：${era.certainty} · ${era.source}`;
  const eraOverlayFactor = currentEra === 0 ? 0.25 : currentEra === 1 ? 1 : 0.7;
  ancientOverlay.style.opacity = String(overlayOpacity * eraOverlayFactor);
  progress.style.width = `${(currentEra / (eras.length - 1)) * 100}%`;
  timeline.setAttribute('aria-valuenow', String(currentEra));
  document.querySelectorAll<HTMLButtonElement>('.timeline-node').forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === currentEra));
  document.querySelector<HTMLElement>('#timeline-hint')!.textContent = currentEra === 1 ? '拖动滑杆，看看古图与今图如何相遇' : currentEra === 2 ? '世界打开了，地球开始有了弧度' : '向右拖动，观察世界变得可测';
  localStorage.setItem('yuji-era', String(currentEra));
}

function startExperience() {
  hasStarted = true;
  intro.classList.add('is-hidden');
  experience.classList.add('is-visible');
  setTimeout(() => document.querySelector<HTMLButtonElement>('.timeline-node.is-active')?.focus(), 500);
}

function setDrawer(drawer: HTMLElement, open: boolean) {
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('drawer-open', open);
}

function renderResults(term = '') {
  const normalized = term.trim().toLowerCase();
  const matches = places.filter((place: Place) => !normalized || `${place.name}${place.modern}${place.chain.join('')}`.toLowerCase().includes(normalized)).slice(0, 8);
  searchSuggestions.innerHTML = normalized ? '' : '<span>试试</span>' + places.slice(0, 5).map((place: Place) => `<button class="suggestion" data-place="${place.name}">${place.name}</button>`).join('');
  searchResults.innerHTML = matches.length ? matches.map((place: Place) => `<article class="place-result" tabindex="0"><div class="place-heading"><h4>${place.name}</h4><span>${place.modern}</span></div><div class="place-chain">${place.chain.map((name, index) => `<span class="chain-item ${index === place.chain.length - 1 ? 'is-current' : ''}">${name}</span>`).join('<i>→</i>')}</div><p>${place.note}</p><div class="place-meta"><span>${place.certainty}</span><span>${place.era}</span></div><small>来源：${place.source}</small></article>`).join('') : '<div class="empty-state"><span class="empty-mark">⌁</span><strong>还没有找到这个地名</strong><p>首版只收录 20 条示例地名。你可以试试“燕京”或“临安”。</p></div>';
}

document.querySelector<HTMLButtonElement>('#start-button')!.addEventListener('click', startExperience);
document.querySelector<HTMLButtonElement>('#skip-intro')!.addEventListener('click', startExperience);
const resumeButton = document.querySelector<HTMLButtonElement>('#resume-button')!;
if (lastEra > 0) {
  resumeButton.hidden = false;
  resumeButton.textContent = `继续上次看到的 ${eras[lastEra].year}`;
}
resumeButton.addEventListener('click', () => { renderEra(currentEra); startExperience(); });
document.querySelector<HTMLButtonElement>('#compare-button')!.addEventListener('click', () => { overlayControl.classList.add('is-open'); overlayControl.setAttribute('aria-hidden', 'false'); });
document.querySelector<HTMLButtonElement>('#close-overlay')!.addEventListener('click', () => { overlayControl.classList.remove('is-open'); overlayControl.setAttribute('aria-hidden', 'true'); });
document.querySelector<HTMLInputElement>('#opacity-range')!.addEventListener('input', (event) => { overlayOpacity = Number((event.target as HTMLInputElement).value) / 100; const eraOverlayFactor = currentEra === 0 ? 0.25 : currentEra === 1 ? 1 : 0.7; ancientOverlay.style.opacity = String(overlayOpacity * eraOverlayFactor); document.querySelector<HTMLOutputElement>('#opacity-output')!.textContent = `${Math.round(overlayOpacity * 100)}%`; });
document.querySelector<HTMLButtonElement>('#open-search')!.addEventListener('click', () => { setDrawer(searchDrawer, true); placeSearch.focus(); renderResults(); });
document.querySelector<HTMLButtonElement>('#close-search')!.addEventListener('click', () => setDrawer(searchDrawer, false));
document.querySelector<HTMLButtonElement>('#open-sources')!.addEventListener('click', () => setDrawer(sourcesDrawer, true));
document.querySelector<HTMLButtonElement>('#close-sources')!.addEventListener('click', () => setDrawer(sourcesDrawer, false));
placeSearch.addEventListener('input', () => { searchTerm = placeSearch.value; renderResults(searchTerm); });
searchSuggestions.addEventListener('click', (event) => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-place]'); if (!target) return; placeSearch.value = target.dataset.place ?? ''; placeSearch.dispatchEvent(new Event('input')); });
document.querySelectorAll<SVGGElement>('.map-place').forEach((node) => {
  const lookup = () => {
    setDrawer(searchDrawer, true);
    placeSearch.value = node.dataset.place ?? '';
    placeSearch.dispatchEvent(new Event('input'));
    placeSearch.focus();
  };
  node.addEventListener('click', lookup);
  node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lookup(); } });
});
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
document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll<HTMLButtonElement>('.model-tab').forEach((item) => { item.classList.remove('is-active'); item.setAttribute('aria-selected', 'false'); }); tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true'); document.querySelector<HTMLElement>('#model-copy')!.textContent = tab.dataset.model === '郡县' ? '世界被分成可以管理、丈量和征调的地方单元。' : '以中心向外层层展开，天下首先是一种关系秩序。'; }));

timeline.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight') { event.preventDefault(); renderEra(currentEra + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); renderEra(currentEra - 1); } if (event.key === 'Home') { event.preventDefault(); renderEra(0); } if (event.key === 'End') { event.preventDefault(); renderEra(eras.length - 1); } });
let timelineDragging = false;
function updateEraFromPointer(clientX: number) {
  const bounds = timeline.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  renderEra(Math.round(ratio * (eras.length - 1)));
}
timeline.addEventListener('pointerdown', (event) => {
  timelineDragging = true;
  timeline.setPointerCapture(event.pointerId);
  updateEraFromPointer(event.clientX);
});
timeline.addEventListener('pointermove', (event) => {
  if (timelineDragging) updateEraFromPointer(event.clientX);
});
timeline.addEventListener('pointerup', (event) => {
  timelineDragging = false;
  timeline.releasePointerCapture(event.pointerId);
});
timeline.addEventListener('pointercancel', () => { timelineDragging = false; });
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setDrawer(searchDrawer, true); placeSearch.focus(); renderResults(); } if (event.key === 'Escape') { overlayControl.classList.remove('is-open'); sourcesDrawer.classList.remove('is-open'); searchDrawer.classList.remove('is-open'); document.body.classList.remove('drawer-open'); } });
document.querySelector<HTMLAnchorElement>('.brand')!.addEventListener('click', (event) => { event.preventDefault(); intro.classList.remove('is-hidden'); experience.classList.remove('is-visible'); hasStarted = false; });

renderEra(currentEra);
renderResults();

// 便于本地验收：访问 /?stage=experience 可直接进入核心交互场景。
if (new URLSearchParams(window.location.search).get('stage') === 'experience') startExperience();
