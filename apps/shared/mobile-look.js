/*
 * dicta · micrófono del teléfono · capa visual v2
 * -------------------------------------------------
 * Cárgalo en /mobile ANTES de /mobile.js:
 *   <link rel="stylesheet" href="/shared/mobile-look.css">
 *   <script type="module" src="/shared/mobile-look.js"></script>
 *   <script type="module" src="/mobile.js"></script>
 *
 * Qué hace (sin tocar la lógica de audio ni de conexión de mobile.js):
 *  - Marca <body> con data-look / data-theme / data-mic / data-grab.
 *  - Cambia el logo por el wordmark oficial «dicta.» y agrega el indicador de conexión.
 *  - Reorganiza el botón #record (mismo nodo, mismos eventos) para dibujar el micrófono.
 *  - Lee #level (lo actualiza mobile.js) y lo pasa a la variable CSS --m-level.
 *  - Convierte <details class="more-options"> en la hoja «Ajustes» (mueve los mismos nodos).
 *
 * Parámetros de prueba en la URL (se leen antes de que mobile.js limpie la URL):
 *   ?tema=dia|penumbra|ambar|sala|negatoscopio|contraste   ?mic=punto|halo|tecla|onda   ?grab=rec|acento|ia
 * Preferencias guardadas en localStorage (clave dicta-mobile-look). Consola: window.dictaLook
 */

const STORE_KEY = 'dicta-mobile-look';
const THEMES = ['dia', 'penumbra', 'ambar', 'sala', 'negatoscopio', 'contraste'];
const MICS = ['punto', 'halo', 'tecla', 'onda'];
const GRABS = ['rec', 'acento', 'ia'];
/* Estilo de micrófono por defecto: el mismo en los tres temas («misma geometría»). */
const DEFAULT_MIC = 'punto';
/* Color de grabación por defecto en cada tema (se puede cambiar aquí o con ?grab=).
 * Sala y Contraste graban en su rojo para que «grabando» y «conectado» (azul petróleo) se distingan
 * con daltonismo. Negatoscopio graba con «luz»: el micrófono se enciende como un negatoscopio. */
const DEFAULT_GRAB = { penumbra: 'rec', dia: 'acento', ambar: 'acento', sala: 'rec', negatoscopio: 'acento', contraste: 'rec' };
/* Color de la barra del navegador en el teléfono (= barra superior del tema). */
const BAR_COLOR = { dia: '#E5E1D7', penumbra: '#181A1E', ambar: '#14110D', sala: '#1B1C1D', negatoscopio: '#1D1E20', contraste: '#E2E5E8' };

const TEXT = {
  settings: ['Ajustes', 'Settings'],
  micStyle:['Micrófono','Microphone'], punto:['Punto','Dot'], halo:['Halo','Halo'], tecla:['Tecla','Key'], onda:['Onda','Wave'],
  grabColor:['Color al grabar','Recording colour'], recColor:['Color del tema','Theme colour'], accentColor:['Acento','Accent'], actionColor:['Acción','Action'],
  close: ['Cerrar', 'Close'],
  secConn: ['CONEXIÓN', 'CONNECTION'],
  secRec: ['GRABACIÓN', 'RECORDING'],
  secLook: ['APARIENCIA', 'APPEARANCE'],
  theme: ['Tema', 'Theme'],
  dia: ['Día', 'Day'],
  penumbra: ['Penumbra', 'Dim'],
  ambar: ['Ámbar', 'Amber'],
  sala: ['Sala', 'Reading room'],
  negatoscopio: ['Negatoscopio', 'Lightbox'],
  contraste: ['Contraste', 'High contrast'],
  idle: ['EN ESPERA', 'STANDBY'],
  rec: ['GRABANDO', 'RECORDING'],
  subIdle: ['Tú decides cuándo grabar', 'You decide when to record'],
  subRec: ['Máximo 3 min por toma', 'Up to 3 min per take'],
  connOff: ['Sin conectar', 'Not connected'],
  connWait: ['Conectando…', 'Connecting…'],
  connOn: ['Conectado', 'Connected'],
};

const LOGO_LETTERS = 'M243 14Q184 14 138.0 -16.5Q92 -47 66.0 -104.0Q40 -161 40 -241Q40 -323 68.5 -381.5Q97 -440 145.5 -471.5Q194 -503 252 -503Q287 -503 312.5 -492.5Q338 -482 359.0 -462.0Q380 -442 398 -414H431L424 -349Q388 -390 358.5 -408.5Q329 -427 294 -427Q259 -427 231.0 -408.0Q203 -389 186.5 -348.0Q170 -307 170 -244Q170 -183 186.0 -143.0Q202 -103 230.0 -83.5Q258 -64 294 -64Q333 -64 363.0 -86.0Q393 -108 424 -150L431 -85H399Q381 -55 359.5 -33.0Q338 -11 309.5 1.5Q281 14 243 14ZM404 9 392 -92 391 -93V-399L396 -407L393 -634L314 -648V-691L490 -730L516 -724L514 -589V-60L583 -47V0ZM625 0V-49L730 -62H781L884 -49V0ZM692 0Q693 -28 693.0 -65.0Q693 -102 693.5 -141.5Q694 -181 694 -213V-263Q694 -302 693.5 -331.0Q693 -360 692 -391L618 -397V-441L793 -499L820 -492L818 -358V-213Q818 -181 818.0 -141.5Q818 -102 818.5 -65.0Q819 -28 820 0ZM752 -586Q720 -586 698.0 -606.5Q676 -627 676 -659Q676 -691 698.0 -711.5Q720 -732 752 -732Q785 -732 807.0 -711.0Q829 -690 829 -659Q829 -627 807.0 -606.5Q785 -586 752 -586ZM1181 14Q1106 14 1050.5 -17.0Q995 -48 965.0 -104.5Q935 -161 935 -239Q935 -321 968.0 -380.0Q1001 -439 1058.0 -471.0Q1115 -503 1186 -503Q1240 -503 1281.5 -485.5Q1323 -468 1348.5 -438.5Q1374 -409 1381 -374Q1376 -349 1362.0 -335.5Q1348 -322 1323 -322Q1295 -322 1278.0 -340.0Q1261 -358 1256 -391L1238 -475L1301 -429Q1279 -440 1255.0 -445.5Q1231 -451 1204 -451Q1165 -451 1133.0 -429.0Q1101 -407 1082.5 -363.5Q1064 -320 1064 -255Q1064 -192 1084.0 -150.5Q1104 -109 1138.5 -88.5Q1173 -68 1217 -68Q1245 -68 1268.0 -75.0Q1291 -82 1310.5 -96.0Q1330 -110 1348 -130L1383 -100Q1364 -67 1337.0 -41.5Q1310 -16 1272.0 -1.0Q1234 14 1181 14ZM1547 -424V-488H1732V-424ZM1618 13Q1556 13 1520.0 -19.0Q1484 -51 1484 -121Q1484 -142 1484.5 -162.5Q1485 -183 1485 -209V-424H1408V-478L1530 -493L1485 -459L1534 -628H1614L1606 -462L1608 -449V-131Q1608 -93 1623.5 -76.5Q1639 -60 1666 -60Q1682 -60 1696.5 -65.5Q1711 -71 1725 -80L1749 -45Q1737 -29 1718.5 -15.5Q1700 -2 1675.0 5.5Q1650 13 1618 13ZM1909 15Q1851 15 1812.0 -18.5Q1773 -52 1773 -114Q1773 -150 1789.0 -179.0Q1805 -208 1843.5 -231.0Q1882 -254 1951 -273Q1978 -281 2005.0 -288.0Q2032 -295 2058.5 -302.5Q2085 -310 2112 -316V-276Q2079 -266 2045.5 -255.5Q2012 -245 1981 -235Q1945 -224 1926.0 -208.5Q1907 -193 1899.5 -175.0Q1892 -157 1892 -137Q1892 -101 1913.0 -82.5Q1934 -64 1968 -64Q1987 -64 2004.0 -70.5Q2021 -77 2041.5 -91.0Q2062 -105 2091 -128L2099 -74H2061Q2039 -48 2018.0 -28.0Q1997 -8 1971.5 3.5Q1946 15 1909 15ZM2169 12Q2122 12 2094.5 -15.0Q2067 -42 2063 -91L2060 -94V-335Q2060 -380 2050.5 -405.0Q2041 -430 2020.5 -440.5Q2000 -451 1967 -451Q1945 -451 1922.5 -447.0Q1900 -443 1874 -434L1924 -475L1911 -393Q1907 -354 1889.5 -336.5Q1872 -319 1847 -319Q1821 -319 1806.5 -332.0Q1792 -345 1787 -366Q1798 -429 1854.5 -466.0Q1911 -503 2004 -503Q2063 -503 2102.5 -485.0Q2142 -467 2162.0 -427.5Q2182 -388 2182 -324V-104Q2182 -80 2191.0 -69.0Q2200 -58 2216 -58Q2227 -58 2236.0 -62.0Q2245 -66 2253 -75L2272 -44Q2255 -16 2230.0 -2.0Q2205 12 2169 12Z';
const LOGO_DOT = 'M2408 13Q2374 13 2350.5 -10.5Q2327 -34 2327 -67Q2327 -102 2350.5 -125.5Q2374 -149 2408 -149Q2443 -149 2466.0 -125.5Q2489 -102 2489 -67Q2489 -34 2466.0 -10.5Q2443 13 2408 13Z';
const SETTINGS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h3M13 17h7"></path><circle cx="16" cy="7" r="2.5"></circle><circle cx="10" cy="17" r="2.5"></circle></svg>';

const doc = document;
const body = doc.body;
const $ = id => doc.getElementById(id);
const pick = (value, list) => (list.includes(value) ? value : null);
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

/* ---------- Idioma (el selector de idioma recarga la página) ---------- */
function isEnglish() {
  const fromSwitch = doc.querySelector('.language-switch select')?.value;
  const fromUrl = new URLSearchParams(location.search).get('lang');
  const value = fromSwitch || fromUrl || doc.documentElement.lang || 'es';
  return String(value).toLowerCase().startsWith('en');
}
const t = key => TEXT[key][isEnglish() ? 1 : 0];

/* ---------- Preferencias ---------- */
function loadPrefs() {
  try { const saved=JSON.parse(localStorage.getItem(STORE_KEY)); return saved && typeof saved==='object' && !Array.isArray(saved) ? saved : {}; } catch { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch { /* almacenamiento opcional */ }
}
const params = new URLSearchParams(location.search); // se lee antes de que mobile.js reescriba la URL
const prefs = loadPrefs();
const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;
const look = {
  theme: pick(params.get('tema'), THEMES) || pick(prefs.theme, THEMES) || (prefersDark ? 'penumbra' : 'dia'),
  mic: pick(params.get('mic'), MICS) || pick(prefs.mic, MICS) || DEFAULT_MIC,
  grab: null,
};
look.grab = pick(params.get('grab'), GRABS) || pick(prefs.grab?.[look.theme], GRABS) || DEFAULT_GRAB[look.theme];
if (params.get('tema') || params.get('mic') || params.get('grab')) {
  prefs.theme = look.theme; prefs.mic = look.mic; prefs.grab = { ...(prefs.grab || {}), [look.theme]: look.grab }; savePrefs();
}

function applyLook() {
  body.dataset.look = 'v3';
  body.dataset.theme = look.theme;
  body.dataset.mic = look.mic;
  body.dataset.grab = look.grab;
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = doc.createElement('meta'); meta.name = 'theme-color'; doc.head.append(meta); }
  meta.content = BAR_COLOR[look.theme];
  for(const key of ['theme','mic','grab'])doc.querySelectorAll('input[name="m-'+key+'"]').forEach(input=>{input.checked=input.value===look[key];});
}

function setLook(next = {}) {
  if (pick(next.theme, THEMES)) {
    look.theme = next.theme;
    look.grab = pick(prefs.grab?.[look.theme], GRABS) || DEFAULT_GRAB[look.theme];
    prefs.theme = look.theme;
  }
  if (pick(next.mic, MICS)) { look.mic = next.mic; prefs.mic = look.mic; }
  if (pick(next.grab, GRABS)) { look.grab = next.grab; prefs.grab = { ...(prefs.grab || {}), [look.theme]: look.grab }; }
  savePrefs(); applyLook();
}

/* ---------- Construcción ---------- */
function el(tag, className, html) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function buildHeader() {
  const brand = doc.querySelector('header .brand');
  if (brand) {
    brand.innerHTML = `<svg viewBox="40 -732 2449 747" role="img" aria-label="dicta"><path fill="currentColor" d="${LOGO_LETTERS}"></path><path class="m-logo-dot" d="${LOGO_DOT}"></path></svg>`;
  }
  const header = doc.querySelector('header');
  if (header && !header.querySelector('.m-conn')) header.append(el('span', 'm-conn'));
}

function buildVisor() {
  const live = doc.querySelector('.visor-live');
  if (live && !live.querySelector('.m-state')) live.prepend(el('span', 'm-state'));
}

function buildRecord() {
  const record = $('record');
  if (!record || record.querySelector('.m-viz')) return;
  const icon = record.querySelector('svg');
  const label = $('record-label');

  const viz = el('span', 'm-viz');
  viz.setAttribute('aria-hidden', 'true');
  viz.append(el('span', 'm-ring r3'), el('span', 'm-ring r2'));
  for (let i = 0; i < 48; i++) {
    const tick = el('span', 'm-tick');
    const weight = Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37));
    tick.style.setProperty('--a', `${i * 7.5}deg`);
    tick.style.setProperty('--w', (0.35 + weight * 0.65).toFixed(2));
    viz.append(tick);
  }
  const grill = el('span', 'm-grill');
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      const dot = el('span');
      dot.style.setProperty('--d', (Math.hypot(r - 5, c - 5) / 7.07).toFixed(3));
      grill.append(dot);
    }
  }
  viz.append(grill);
  const core = el('span', 'm-core');
  const inline = el('span', 'm-inline');
  inline.setAttribute('aria-hidden', 'true');
  if (icon) { inline.append(icon.cloneNode(true)); core.append(icon); }
  viz.append(core);

  const sub = el('span', 'm-sub');
  record.prepend(viz, inline);
  if (label) label.after(sub); else record.append(sub);

  const wave = el('div', 'm-wave');
  wave.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 56; i++) wave.append(el('span'));
  record.before(wave);
}

function section(titleKey, extraClass = '') {
  const node = el('section', `m-section ${extraClass}`.trim());
  const title = el('h3');
  title.dataset.mText = titleKey;
  node.append(title);
  return node;
}

function buildSheet() {
  const details = doc.querySelector('details.more-options');
  if (!details || details.querySelector('.m-sheet')) return;
  const summary = details.querySelector('summary');
  summary.removeAttribute('data-i18n'); // el texto lo pone este archivo, no i18n.js
  summary.innerHTML = `${SETTINGS_ICON}<span data-m-text="settings"></span>`;

  const sheet = el('div', 'm-sheet');
  sheet.setAttribute('role', 'dialog');sheet.setAttribute('aria-modal','true');
  sheet.setAttribute('aria-labelledby', 'm-sheet-title');
  const head = el('div', 'm-sheet-head');
  const title = el('h2'); title.id = 'm-sheet-title'; title.dataset.mText = 'settings';
  const closeBtn = el('button'); closeBtn.type = 'button'; closeBtn.dataset.mText = 'close';
  closeBtn.addEventListener('click', () => { details.open = false; summary.focus(); });
  head.append(title, closeBtn);
  sheet.append(el('span', 'm-grabber'), head);

  const conn = section('secConn', 'm-paired-only');
  const metrics = details.querySelector('.phone-metrics');
  if (metrics) conn.append(metrics);

  const rec = section('secRec', 'm-paired-only');
  for (const node of [doc.querySelector('.more-options .check-row'), $('haptics-note'), $('test-haptics'), $('test-signal'), $('capture-info')]) {
    if (node) rec.append(node);
  }

  const lookSec = section('secLook');
  const row = el('div', 'm-seg-row');
  const rowLabel = el('span'); rowLabel.dataset.mText = 'theme'; rowLabel.id = 'm-theme-label';
  const seg = el('div', 'm-seg');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-labelledby', 'm-theme-label');
  for (const value of THEMES) {
    const option = el('label');
    const input = el('input'); input.type = 'radio'; input.name = 'm-theme'; input.value = value;
    input.addEventListener('change', () => { if (input.checked) setLook({ theme: value }); });
    const text = el('span'); text.dataset.mText = value;
    option.append(input, text);
    seg.append(option);
  }
  row.append(rowLabel, seg);
  lookSec.append(row);
  for(const [key,titleKey,values] of [['mic','micStyle',MICS.map(v=>[v,v])],['grab','grabColor',[['rec','recColor'],['acento','accentColor'],['ia','actionColor']]]]){
    const row=el('div','m-seg-row'),label=el('span');label.dataset.mText=titleKey;label.id='m-'+key+'-label';
    const group=el('div','m-seg');group.setAttribute('role','radiogroup');group.setAttribute('aria-labelledby',label.id);
    for(const [value,textKey] of values){const option=el('label'),input=el('input'),text=el('span');input.type='radio';input.name='m-'+key;input.value=value;text.dataset.mText=textKey;input.onchange=()=>{if(input.checked)setLook({[key]:value});};option.append(input,text);group.append(option);}
    row.append(label,group);lookSec.append(row);
  }

  const foot = el('div', 'm-foot');
  const actions = el('div', 'm-actions');
  const restart = $('restart');
  const close = $('close');
  if (close) close.classList.add('m-paired-only');
  for (const node of [$('export-lifecycle'), doc.querySelector('.more-options .privacy-note')]) if (node) foot.append(node);
  if (restart) actions.append(restart);
  if (close) actions.append(close);
  foot.append(actions);

  sheet.append(conn, rec, lookSec, foot);
  details.querySelector('.paired-only')?.remove();
  details.append(sheet);

  const blocked=[...doc.querySelectorAll('.phone-shell>header, .phone-shell>main>*')].filter(n=>n!==details).map(node=>({node,inert:node.inert}));
  details.addEventListener('toggle', () => {
    for(const item of blocked)item.node.inert=details.open||item.inert;
    body.toggleAttribute('data-sheet', details.open);
    if (details.open) closeBtn.focus();
  });
  doc.addEventListener('click',event=>{if(details.open&&!sheet.contains(event.target)&&!summary.contains(event.target)){details.open=false;summary.focus();}});
  sheet.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const items=[...sheet.querySelectorAll('button,input,a[href]')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects().length);
    const first=items[0],last=items.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
  });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && details.open) { details.open = false; summary.focus(); }
  });
}

/* ---------- Estado y textos ---------- */
function updateState() {
  const record = $('record');
  const recording = !!record?.classList.contains('recording');
  const paired = !!$('controls') && !$('controls').hidden;
  const waiting = !!$('confirm-panel') && !$('confirm-panel').hidden;

  body.dataset.state = recording ? 'rec' : 'idle';
  body.toggleAttribute('data-paired', paired);
  body.dataset.conn = paired ? 'on' : waiting ? 'wait' : 'off';

  const conn = doc.querySelector('.m-conn');
  if (conn) conn.textContent = t(paired ? 'connOn' : waiting ? 'connWait' : 'connOff');
  const state = doc.querySelector('.m-state');
  if (state) state.textContent = t(recording ? 'rec' : 'idle');
  const sub = doc.querySelector('#record .m-sub');
  if (sub) sub.textContent = t(recording ? 'subRec' : 'subIdle');
  doc.querySelectorAll('[data-m-text]').forEach(node => { node.textContent = t(node.dataset.mText); });
  // Idioma compacto en la cabecera (ES / EN); el valor de cada opción no cambia.
  doc.querySelectorAll('.language-switch option').forEach(option => {
    const short = String(option.value).slice(0, 2).toUpperCase();
    if (option.textContent !== short) option.textContent = short;
  });

  if(recording){const settings=doc.querySelector('details.more-options');if(settings?.open)settings.open=false;}
  if (recording&&!doc.hidden) startLevelLoop(); else stopLevelLoop();
}

/* ---------- Nivel de voz → --m-level ---------- */
let frame = 0;
let smooth = 0;
let lastPush = 0,lastPaint=0;
const visualMetrics={version:'mobile-look-v3',frames:0,totalPaintMs:0,maxPaintMs:0};
const levelHistory = new Array(56).fill(0);

function renderWave() {
  const bars = doc.querySelectorAll('.m-wave > span');
  const recording = body.dataset.state === 'rec';
  bars.forEach((bar, i) => {
    const value = recording ? levelHistory[i] : 0;
    bar.style.height = recording ? `${4 + Math.round(value * 112)}px` : '';
    bar.classList.toggle('now', recording && i >= bars.length - 22);
  });
}

function tick(now) {
  if(doc.hidden||body.dataset.state!=='rec'){stopLevelLoop();return;}
  if(now-lastPaint<33){frame=requestAnimationFrame(tick);return;}lastPaint=now;const started=performance.now();
  const meter = $('level');
  const raw = Math.max(0, Math.min(1, Number(meter?.value) || 0));
  smooth = reducedMotion?.matches ? 0.6 : smooth + (raw - smooth) * 0.35;
  body.style.setProperty('--m-level', smooth.toFixed(3));
  if (look.mic === 'onda' && now - lastPush > 70) {
    levelHistory.shift(); levelHistory.push(reducedMotion?.matches ? 0.5 : raw);
    lastPush = now; renderWave();
  }
  const elapsed=performance.now()-started;visualMetrics.frames++;visualMetrics.totalPaintMs+=elapsed;visualMetrics.maxPaintMs=Math.max(visualMetrics.maxPaintMs,elapsed);
  frame = reducedMotion?.matches ? 0 : requestAnimationFrame(tick);
}
function startLevelLoop() { if (!frame) frame = requestAnimationFrame(tick); }
function stopLevelLoop() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0; smooth = 0; levelHistory.fill(0);
  body.style.setProperty('--m-level', '0');
  renderWave();
}

/* ---------- Arranque ---------- */
applyLook();
buildHeader();
buildVisor();
buildRecord();
buildSheet();
applyLook(); // de nuevo: marca el tema actual en la hoja recién creada
updateState();

const observer = new MutationObserver(updateState);
for (const id of ['record', 'controls', 'confirm-panel', 'join-panel']) {
  const node = $(id);
  if (node) observer.observe(node, { attributes: true, attributeFilter: ['class', 'hidden', 'disabled'] });
}
// mobile.js monta el selector de idioma después: refresca textos cuando aparece.
const header = doc.querySelector('header');
if (header) new MutationObserver(updateState).observe(header, { childList: true });
setTimeout(updateState, 0);

doc.addEventListener('visibilitychange',updateState);
window.addEventListener('pagehide',stopLevelLoop);
reducedMotion?.addEventListener?.('change',()=>{stopLevelLoop();updateState();});
globalThis.dictaLook = { get: () => ({ ...look }), metrics:()=>({...visualMetrics}), set: setLook, refresh: updateState };
