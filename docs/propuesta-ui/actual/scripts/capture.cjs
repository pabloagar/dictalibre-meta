// Capturas UI/UX de Dicta Libre (estado actual). Solo lee el repo; escribe PNG/JSON en OUT_DIR o en un directorio temporal.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.env.OUT_DIR || fs.mkdtempSync(path.join(require('os').tmpdir(), 'dicta-capturas-'));
const RELAY = 'https://localhost:8443';
const LAB = 'http://127.0.0.1:8789';
const DESIGN = 'http://127.0.0.1:8793/';
require('http').createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); r.end(fs.readFileSync(require('path').join(__dirname,'../../../../design/dictation-workspace.html'))); }).listen(8793, '127.0.0.1').unref();
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const results = { started: new Date().toISOString(), shots: [], audits: {}, errors: [], log: [] };
const log = (...a) => { const s = a.join(' '); results.log.push(s); console.log(s); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// Auditoría en el contexto de la página: textos, tamaños, colores, contraste WCAG, ARIA, scroll horizontal.
async function audit(page, name, keySelectors = []) {
  const data = await page.evaluate((keys) => {
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    const effectiveBg = el => { const layers = []; let n = el; while (n && n.nodeType === 1) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } n = n.parentElement; } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base); return base; };
    const ratio = (fg, bg) => { const f = fg.a < 1 ? blend(fg, bg) : fg; const L1 = lum(f), L2 = lum(bg); return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); };
    const opacityChain = el => { let o = 1, n = el; while (n && n.nodeType === 1) { o *= Number(getComputedStyle(n).opacity); n = n.parentElement; } return o; };
    const hex = c => c ? '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('') : null;
    const describe = el => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect(), fg = parse(cs.color), bg = effectiveBg(el);
      return { tag: el.tagName.toLowerCase(), id: el.id || null, cls: el.className && typeof el.className === 'string' ? el.className : null,
        text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 140),
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden', disabled: !!el.disabled,
        box: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`, color: hex(fg), bg: hex(bg),
        contrast: fg ? ratio(fg, bg) : null, opacity: +opacityChain(el).toFixed(2),
        role: el.getAttribute('role'), ariaLive: el.getAttribute('aria-live'), ariaLabel: el.getAttribute('aria-label') };
    };
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden]'); };
    const bodyCs = getComputedStyle(document.body), rootCs = getComputedStyle(document.documentElement);
    const out = {
      url: location.href, title: document.title,
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight,
        horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth },
      prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      body: { font: `${bodyCs.fontWeight} ${bodyCs.fontSize} ${bodyCs.fontFamily}`, color: bodyCs.color, bg: bodyCs.backgroundColor, rootBg: rootCs.backgroundColor, colorScheme: rootCs.colorScheme },
      fontsResolved: null,
      headings: [...document.querySelectorAll('h1,h2,h3,legend,summary')].filter(vis).map(e => `${e.tagName}: ${e.innerText.trim().replace(/\s+/g, ' ').slice(0, 120)}`),
      buttons: [...document.querySelectorAll('button,a[href],input,select,summary,[contenteditable],[role=textbox]')].filter(vis).map(describe),
      live: [...document.querySelectorAll('[aria-live],[role=status],[role=alert],[role=log]')].map(e => ({ id: e.id || null, cls: typeof e.className === 'string' ? e.className : null, role: e.getAttribute('role'), ariaLive: e.getAttribute('aria-live'), visible: vis(e), text: e.innerText.trim().replace(/\s+/g, ' ').slice(0, 200) })),
      notices: [...document.querySelectorAll('p,span,div,small,strong,label')].filter(e => vis(e) && e.children.length < 3 && /privac|paciente|clínic|validac|precis|Meta|sintétic|guardan|envía|no se guarda|laboratorio|prototipo|pendiente|experimental/i.test(e.innerText)).map(e => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 260)).filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 40),
      key: {}, textSamples: [],
    };
    for (const [label, sel] of Object.entries(keys)) { const el = document.querySelector(sel); out.key[label] = el ? describe(el) : null; }
    // Muestras de contraste de texto (párrafos y etiquetas visibles)
    const seen = new Set();
    for (const e of document.querySelectorAll('h1,h2,p,.tiny,.muted,.tag,label,summary,footer,.status,.pill,.timer,strong,span')) {
      if (!vis(e) || !e.innerText.trim()) continue; const d = describe(e); const k = d.color + d.bg + d.font; if (seen.has(k)) continue; seen.add(k);
      out.textSamples.push({ sel: d.tag + (d.id ? '#' + d.id : '') + (d.cls ? '.' + d.cls.split(' ')[0] : ''), text: d.text.slice(0, 60), font: d.font, color: d.color, bg: d.bg, contrast: d.contrast, opacity: d.opacity });
      if (out.textSamples.length > 30) break;
    }
    return out;
  }, keySelectors);
  try { data.fontsResolved = await fontsUsed(page); } catch (e) { data.fontsResolved = 'n/d: ' + e.message; }
  results.audits[name] = data;
  return data;
}
// Fuente efectivamente renderizada (CDP) para body
async function fontsUsed(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const out = {};
  for (const sel of ['body', 'h1', 'button', '.report-editor']) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    if (!nodeId) continue;
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    out[sel] = fonts.map(f => `${f.familyName} (${f.glyphCount})`).join(', ');
  }
  await cdp.detach();
  return out;
}
async function shot(page, file, desc, opts = {}) {
  const p = path.join(OUT, file);
  await page.screenshot({ path: p, fullPage: opts.fullPage !== false, animations: 'disabled' });
  results.shots.push({ file: p, desc }); log('SHOT', file, '-', desc);
}
// Tabula n veces y registra el elemento con foco y su outline
async function tabFocus(page, n, name) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.mouse.click(2, 2).catch(() => {});
  const steps = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab'); await wait(120);
    steps.push(await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return { el: 'body' }; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''), text: (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 60), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, offset: cs.outlineOffset, boxShadow: cs.boxShadow, focusVisible: e.matches(':focus-visible') }; }));
  }
  results.audits[name + ':tab'] = steps;
  return steps;
}
const step = async (label, fn) => { try { await fn(); } catch (e) { results.errors.push(`${label}: ${e.message.split('\n')[0]}`); log('ERROR', label, e.message.split('\n')[0]); } };
const mobileKeys = { status: '#status', join: '#join', joinCode: '#join-code', prepare: '#prepare', testSignal: '#test-signal', record: '#record', modeHold: '#modes label:nth-of-type(1) span', modeToggle: '#modes label:nth-of-type(2) span', close: '#close', restart: '#restart', exportLifecycle: '#export-lifecycle', haptics: '#haptics', testHaptics: '#test-haptics', privacy: '.privacy-note', verified: '#verified', timer: '#duration', footer: 'footer' };
const desktopKeys = { status: '#status', create: '#create', restart: '#restart', copyLink: '#copy-link', phoneLink: '#phone-link', recordState: '#record-state', paper: '.transcript-paper', h1: 'h1', tag: 'header .tag', footer: 'footer' };
const liveKeys = { ...desktopKeys, editor: '.report-editor', copy: '.report-copy', templatePanel: '.template-library-panel > summary', settings: '.dictation-settings > summary', connection: '.connection-panel > summary', takes: '.takes-panel > summary', reportStatus: '.report-status', reportHelp: '.report-help', onboarding: '.connection-onboarding' };

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--host-resolver-rules=MAP dicta.test 127.0.0.1', '--ignore-certificate-errors', '--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] });
  results.browser = `${browser.browserType().name()} ${browser.version()}`;
  const mobileOpts = (scheme = 'light') => ({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, userAgent: UA_ANDROID, locale: 'es-CL', colorScheme: scheme, ignoreHTTPSErrors: true, permissions: ['microphone'] });
  const deskOpts = (w, h, scheme = 'light') => ({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'es-CL', colorScheme: scheme, ignoreHTTPSErrors: true, permissions: ['microphone', 'clipboard-read', 'clipboard-write'] });
  const consoleErrs = p => p.on('console', m => { if (m.type() === 'error') results.errors.push(`console(${p.url()}): ${m.text().slice(0, 200)}`); });

  // ---------- Relay: escritorio 1440 + móvil ----------
  const mctx = await browser.newContext(mobileOpts());
  const m = await mctx.newPage(); consoleErrs(m);
  const dctx = await browser.newContext(deskOpts(1440, 900));
  const d = await dctx.newPage(); consoleErrs(d);

  await step('mobile inicial', async () => {
    await m.goto(RELAY + '/mobile'); await wait(800);
    await audit(m, 'mobile-01-inicial', mobileKeys);
    await shot(m, 'mobile-01-inicial.png', 'Relay /mobile, estado inicial (sin código)');
    await shot(m, 'mobile-01b-inicial-viewport.png', 'Relay /mobile inicial, solo primera vista (915 px CSS)', { fullPage: false });
  });
  await step('mobile codigo vacio', async () => {
    await m.click('#join'); await wait(400);
    await audit(m, 'mobile-02-codigo-vacio', mobileKeys);
    await shot(m, 'mobile-02-codigo-vacio.png', 'Relay /mobile tras pulsar "Conectar con el PC" con el código vacío');
  });
  await step('mobile tab', async () => {
    await tabFocus(m, 4, 'mobile-03-foco');
    await shot(m, 'mobile-03-foco-tab.png', 'Relay /mobile tras 4 pulsaciones de Tab (foco visible)', { fullPage: false });
  });

  await step('desktop inicial 1440', async () => {
    await d.goto(RELAY + '/'); await wait(800);
    await audit(d, 'desktop-1440-relay-01-inicial', desktopKeys);
    await shot(d, 'desktop-1440-relay-01-inicial.png', 'Relay receptor (PC) 1440x900, antes de conectar');
    await tabFocus(d, 4, 'desktop-1440-relay-foco');
    await shot(d, 'desktop-1440-relay-01b-foco-tab.png', 'Relay receptor 1440x900 tras 4 Tab', { fullPage: false });
  });
  let link = null;
  await step('desktop qr 1440', async () => {
    await d.click('#create'); await d.waitForSelector('#pairing:not([hidden])', { timeout: 8000 }); await wait(600);
    link = await d.getAttribute('#phone-link', 'href');
    log('link (token oculto en notas):', link && link.replace(/#qr=.*/, '#qr=<token>'));
    await audit(d, 'desktop-1440-relay-02-qr', desktopKeys);
    await shot(d, 'desktop-1440-relay-02-qr.png', 'Relay receptor 1440x900 tras "Conectar teléfono": QR, código y enlace');
  });
  await step('mobile emparejado', async () => {
    if (!link) throw Error('sin enlace');
    await m.goto('about:blank'); await m.goto(link); await m.waitForSelector('#controls:not([hidden])', { timeout: 10000 }); await wait(600);
    await audit(m, 'mobile-04-emparejado', mobileKeys);
    await shot(m, 'mobile-04-emparejado.png', 'Relay /mobile tras abrir el enlace QR: conectado, micrófono sin preparar');
    await shot(m, 'mobile-04b-emparejado-viewport.png', 'Igual que anterior, solo primera vista', { fullPage: false });
    await wait(300);
    await audit(d, 'desktop-1440-relay-03-emparejado', desktopKeys);
    await shot(d, 'desktop-1440-relay-03-emparejado.png', 'Relay receptor 1440x900 con teléfono conectado');
  });
  await step('mobile preparado', async () => {
    await m.click('#prepare');
    await m.waitForFunction(() => /preparado/i.test(document.getElementById('status').innerText), null, { timeout: 10000 }); await wait(500);
    await audit(m, 'mobile-05-preparado', mobileKeys);
    await shot(m, 'mobile-05-preparado.png', 'Relay /mobile con micrófono (falso de Chromium) preparado, modo Mantener pulsado');
    await shot(m, 'mobile-05b-preparado-viewport.png', 'Preparado, primera vista', { fullPage: false });
  });
  await step('mobile hold', async () => {
    const btn = m.locator('#record'); await btn.scrollIntoViewIfNeeded(); const b = await btn.boundingBox();
    await m.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await m.mouse.down(); await wait(2200);
    await audit(m, 'mobile-06-grabando-mantener', mobileKeys);
    await shot(m, 'mobile-06-grabando-mantener.png', 'Relay /mobile durante grabación con "Mantener pulsado" (puntero presionado)', { fullPage: false });
    await audit(d, 'desktop-1440-relay-04-grabando', desktopKeys);
    await shot(d, 'desktop-1440-relay-04-grabando.png', 'Relay receptor 1440x900 durante la toma');
    await m.mouse.up(); await wait(300);
    await shot(m, 'mobile-07a-recien-soltado.png', 'Relay /mobile ~300 ms después de soltar (entregando/verificando)', { fullPage: false });
    await m.waitForFunction(() => /otra toma|verific/i.test(document.getElementById('status').innerText + document.getElementById('verified').innerText), null, { timeout: 15000 }); await wait(500);
    await audit(m, 'mobile-07-tras-soltar', mobileKeys);
    await shot(m, 'mobile-07-tras-soltar.png', 'Relay /mobile tras soltar y verificar la toma');
  });
  await step('desktop toma recibida', async () => {
    await wait(800);
    for (const s of await d.$$('details')) await s.evaluate(e => e.open = true);
    await wait(300);
    await audit(d, 'desktop-1440-relay-05-toma-recibida', desktopKeys);
    await shot(d, 'desktop-1440-relay-05-toma-recibida.png', 'Relay receptor 1440x900 con una toma recibida, desplegables "Audio recibido" y "Mediciones" abiertos');
  });
  await step('mobile toggle', async () => {
    await m.click('#modes label:nth-of-type(2)'); await wait(200);
    await m.click('#record'); await wait(2000);
    await audit(m, 'mobile-08-grabando-inicio-parada', mobileKeys);
    await shot(m, 'mobile-08-grabando-inicio-parada.png', 'Relay /mobile grabando en modo Inicio / parada', { fullPage: false });
    await m.click('#record');
    await m.waitForFunction(() => /otra toma/i.test(document.getElementById('status').innerText), null, { timeout: 15000 }); await wait(500);
    await audit(m, 'mobile-09-tras-parada', mobileKeys);
    await shot(m, 'mobile-09-tras-parada.png', 'Relay /mobile tras detener en modo Inicio / parada');
    await tabFocus(m, 4, 'mobile-09-foco');
    await shot(m, 'mobile-09b-foco-tab-emparejado.png', 'Relay /mobile emparejado tras 4 Tab', { fullPage: false });
  });
  await step('cerrar sesion relay', async () => { await m.click('#close'); await wait(800); await shot(m, 'mobile-10-sesion-finalizada.png', 'Relay /mobile tras "Finalizar sesión y liberar micrófono"', { fullPage: false }); await audit(m, 'mobile-10-sesion-finalizada', mobileKeys); await audit(d, 'desktop-1440-relay-06-cerrada', desktopKeys); await shot(d, 'desktop-1440-relay-06-sesion-cerrada.png', 'Relay receptor 1440x900 después de que el teléfono finaliza la sesión', { fullPage: false }); });
  await mctx.close(); await dctx.close();

  // ---------- Relay 1920 ----------
  await step('desktop 1920 relay', async () => {
    const c = await browser.newContext(deskOpts(1920, 1080)); const p = await c.newPage(); consoleErrs(p);
    await p.goto(RELAY + '/'); await wait(700);
    await audit(p, 'desktop-1920-relay-01-inicial', desktopKeys);
    await shot(p, 'desktop-1920-relay-01-inicial.png', 'Relay receptor 1920x1080, antes de conectar');
    await p.click('#create'); await p.waitForSelector('#pairing:not([hidden])'); await wait(500);
    await audit(p, 'desktop-1920-relay-02-qr', desktopKeys);
    await shot(p, 'desktop-1920-relay-02-qr.png', 'Relay receptor 1920x1080 con QR visible');
    await c.close();
  });

  // ---------- Oscuro: relay escritorio + móvil emparejado ----------
  await step('oscuro relay', async () => {
    const mc = await browser.newContext(mobileOpts('dark')); const mp = await mc.newPage(); consoleErrs(mp);
    const dc = await browser.newContext(deskOpts(1440, 900, 'dark')); const dp = await dc.newPage(); consoleErrs(dp);
    await mp.goto(RELAY + '/mobile'); await wait(500);
    await audit(mp, 'mobile-11-oscuro-inicial', mobileKeys);
    await shot(mp, 'mobile-11-oscuro-inicial.png', 'Relay /mobile inicial con colorScheme dark');
    await dp.goto(RELAY + '/'); await dp.click('#create'); await dp.waitForSelector('#pairing:not([hidden])'); await wait(400);
    const l = await dp.getAttribute('#phone-link', 'href');
    await mp.goto('about:blank'); await mp.goto(l); await mp.waitForSelector('#controls:not([hidden])'); await mp.click('#prepare');
    await mp.waitForFunction(() => /preparado/i.test(document.getElementById('status').innerText)); await wait(400);
    await audit(mp, 'mobile-12-oscuro-preparado', mobileKeys);
    await shot(mp, 'mobile-12-oscuro-preparado.png', 'Relay /mobile emparejado y preparado, colorScheme dark');
    await audit(dp, 'desktop-1440-relay-07-oscuro', desktopKeys);
    await shot(dp, 'desktop-1440-relay-07-oscuro-emparejado.png', 'Relay receptor 1440x900 emparejado, colorScheme dark');
    await mp.click('#close'); await wait(300); await mc.close(); await dc.close();
  });

  // ---------- /live del laboratorio ----------
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    await step(`live ${w}`, async () => {
      const c = await browser.newContext(deskOpts(w, h)); const p = await c.newPage(); consoleErrs(p);
      await p.goto(LAB + '/live'); await wait(1500);
      const tag = `desktop-${w}-live`;
      await audit(p, `${tag}-01-vacio`, liveKeys);
      await shot(p, `${tag}-01-vacio.png`, `/live ${w}x${h}, editor vacío, sin conectar`);
      if (w === 1440) { await tabFocus(p, 4, `${tag}-foco`); await shot(p, `${tag}-01b-foco-tab.png`, `/live ${w}x${h} tras 4 Tab`, { fullPage: false }); }
      // Escribir texto sintético en el editor
      await p.click('.report-editor'); await p.keyboard.type('Nódulo de cinco milímetros en lóbulo superior derecho.', { delay: 10 }); await wait(500);
      await audit(p, `${tag}-02-texto`, liveKeys);
      await shot(p, `${tag}-02-texto.png`, `/live ${w}x${h} con texto sintético escrito en el editor`);
      // Biblioteca de plantillas
      const tpl = p.locator('.template-library-panel > summary');
      if (await tpl.count()) { await tpl.click(); await wait(500); await audit(p, `${tag}-03-plantillas`, liveKeys); await shot(p, `${tag}-03-plantillas.png`, `/live ${w}x${h} con biblioteca de plantillas abierta (sin catálogo importado)`); await tpl.click(); }
      // Ajustes de dictado
      const st = p.locator('.dictation-settings > summary');
      if (await st.count()) { await st.click(); await wait(400); await audit(p, `${tag}-04-ajustes`, liveKeys); await shot(p, `${tag}-04-ajustes.png`, `/live ${w}x${h} con ajustes de dictado abiertos (motor, glosario, revisor)`); await st.click(); }
      // Panel de revisión / tomas
      const tk = p.locator('.takes-panel > summary');
      if (await tk.count()) { await tk.click(); await wait(400); await audit(p, `${tag}-05-panel-tomas`, liveKeys); await shot(p, `${tag}-05-panel-tomas.png`, `/live ${w}x${h} con panel lateral de tomas/revisión abierto`); await tk.click(); }
      // Revisión global del informe
      const rg = p.locator('.report-global-review');
      if (await rg.count()) { await rg.scrollIntoViewIfNeeded(); await audit(p, `${tag}-06-revision-global`, { box: '.report-global-review', ...liveKeys }); }
      results.audits[`${tag}-summaries`] = await p.$$eval('summary', s => s.map(e => ({ text: e.innerText.trim().replace(/\s+/g, ' '), parent: e.parentElement.className, open: e.parentElement.open })));
      if (w === 1440) {
        // Conectar teléfono desde /live y hacer una toma con micrófono falso
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.click('#create'); await p.waitForSelector('#pairing:not([hidden])', { timeout: 10000 }); await wait(600);
        await audit(p, `${tag}-07-qr`, liveKeys);
        await shot(p, `${tag}-07-qr.png`, `/live ${w}x${h} tras "Conectar teléfono" (QR a origen HTTPS local)`);
        const l = await p.getAttribute('#phone-link', 'href');
        const mc = await browser.newContext(mobileOpts()); const mp = await mc.newPage(); consoleErrs(mp);
        await mp.goto(l); await mp.waitForSelector('#controls:not([hidden])', { timeout: 10000 }); await mp.click('#prepare');
        await mp.waitForFunction(() => /preparado/i.test(document.getElementById('status').innerText)); await wait(500);
        await audit(p, `${tag}-08-emparejado`, liveKeys);
        await shot(p, `${tag}-08-emparejado.png`, `/live ${w}x${h} con teléfono emparejado`);
        await mp.click('#modes label:nth-of-type(2)'); await mp.click('#record'); await wait(2000);
        await shot(p, `${tag}-09-grabando.png`, `/live ${w}x${h} durante una toma (micrófono falso de Chromium)`, { fullPage: false });
        await mp.click('#record'); await wait(5000);
        await audit(p, `${tag}-10-tras-toma`, liveKeys);
        await shot(p, `${tag}-10-tras-toma.png`, `/live ${w}x${h} tras la toma: sin motor ASR disponible (sin modelo Whisper ni clave Meta)`);
        const tk2 = p.locator('.takes-panel > summary');
        if (await tk2.count()) { const open = await p.$eval('.takes-panel', e => e.open); if (!open) await tk2.click(); await wait(400); await audit(p, `${tag}-11-tomas-tras-toma`, liveKeys); await shot(p, `${tag}-11-panel-tomas-tras-toma.png`, `/live ${w}x${h} panel de tomas tras la toma fallida`); }
        await shot(mp, 'mobile-13-live-tras-toma.png', 'Móvil emparejado con /live del laboratorio, tras una toma', { fullPage: false });
        await mp.click('#close'); await wait(300); await mc.close();
      }
      await c.close();
    });
  }
  // /live oscuro
  await step('live oscuro', async () => {
    const c = await browser.newContext(deskOpts(1440, 900, 'dark')); const p = await c.newPage();
    await p.goto(LAB + '/live'); await wait(1200);
    await audit(p, 'desktop-1440-live-12-oscuro', liveKeys);
    await shot(p, 'desktop-1440-live-12-oscuro.png', '/live 1440x900 con colorScheme dark (informe persistido en localStorage de otro contexto no aplica: contexto nuevo)');
    await c.close();
  });
  // /live en móvil (no es objetivo, pero se registra si hay scroll horizontal)
  await step('live movil', async () => {
    const c = await browser.newContext(mobileOpts()); const p = await c.newPage();
    await p.goto(LAB + '/live'); await wait(1200);
    await audit(p, 'mobile-14-live-en-movil', liveKeys);
    await shot(p, 'mobile-14-live-en-movil.png', '/live del laboratorio abierto en viewport móvil (referencia; no es el flujo previsto)', { fullPage: false });
    await c.close();
  });
  // /lab
  for (const [w, h, scheme] of [[1440, 900, 'light'], [1920, 1080, 'light'], [1440, 900, 'dark']]) {
    await step(`lab ${w} ${scheme}`, async () => {
      const c = await browser.newContext(deskOpts(w, h, scheme)); const p = await c.newPage(); consoleErrs(p);
      await p.goto(LAB + '/'); await wait(1500);
      const n = `desktop-${w}-lab${scheme === 'dark' ? '-oscuro' : ''}`;
      await audit(p, n, { h1: 'h1', status: '#status', primary: '.primary', readiness: '#readiness', run: '#run', footer: 'footer' });
      await shot(p, n + '.png', `/ del laboratorio (lab) ${w}x${h}${scheme === 'dark' ? ' colorScheme dark' : ''}`);
      if (w === 1440 && scheme === 'light') { await tabFocus(p, 4, n + '-foco'); await shot(p, n + '-foco-tab.png', `/lab ${w}x${h} tras 4 Tab`, { fullPage: false }); }
      await c.close();
    });
  }
  // Maqueta de diseño
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    await step(`design ${w}`, async () => {
      const c = await browser.newContext(deskOpts(w, h)); const p = await c.newPage(); consoleErrs(p);
      await p.goto(DESIGN); await wait(800);
      await audit(p, `desktop-${w}-design-01`, { primary: '.primary', report: '.report', record: '.record', h1: 'h1' });
      await shot(p, `desktop-${w}-design-01-maqueta.png`, `Maqueta design/dictation-workspace.html ${w}x${h}, estado inicial`);
      if (w === 1440) {
        results.audits['design-buttons-text'] = await p.$$eval('button', b => b.map(e => e.innerText.trim()));
        // Intentar simulación y revisión lateral si existen botones
        const sim = p.locator('button', { hasText: /simul|dictar|iniciar/i }).first();
        if (await sim.count()) { await sim.click(); await wait(3500); await shot(p, `desktop-${w}-design-02-simulacion.png`, 'Maqueta tras iniciar simulación (~3,5 s)'); }
        const rev = p.locator('button', { hasText: /revis/i }).first();
        if (await rev.count()) { await rev.click(); await wait(500); await shot(p, `desktop-${w}-design-03-revision.png`, 'Maqueta con revisión lateral abierta'); }
        await tabFocus(p, 4, `desktop-${w}-design-foco`);
      }
      await c.close();
    });
  }
  await browser.close();
  results.finished = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'mediciones.json'), JSON.stringify(results, null, 2));
  log('done; errors:', results.errors.length);
})().catch(e => { console.error(e); results.fatal = e.message; fs.writeFileSync(path.join(OUT, 'mediciones.json'), JSON.stringify(results, null, 2)); process.exit(1); });
