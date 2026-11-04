// SPDX-License-Identifier: MIT
import { SOUNDS, DEFAULTS, ENGINE_VERSION, validateConfig, createPulse } from './synth.js';

export function mountGenerator({ document: d = document, window: w = window,
  makeWorker = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }),
  makeAudioContext = () => new AudioContext() } = {}) {
  const $ = id => d.getElementById(id), storageKey = 'bilateral-presets-v1';
  let config = { ...DEFAULTS }, presets = [], context, source, gain, startedAt = 0;
  let state = 'idle', serial = 0, cancelRender, animation, playingConfig, playbackDuration;
  const objectUrls = new Set(); let lastExport = [];
  const status = text => { $('status').textContent = text; };
  const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const blobUrl = (data, type) => { const url = w.URL.createObjectURL(new Blob([data], { type })); objectUrls.add(url); return url; };
  const download = (url, name) => { const link = d.createElement('a'); link.href = url; link.download = name; link.click(); };
  const json = value => blobUrl(JSON.stringify(value, null, 2), 'application/json');
  function clearExport() {
    for (const url of lastExport) { w.URL.revokeObjectURL(url); objectUrls.delete(url); }
    lastExport = []; $('export-result').replaceChildren();
  }
  function buttons() {
    $('play').textContent = { idle: 'Escuchar', loading: 'Cancelar', playing: 'Pausar', paused: 'Continuar', exporting: 'Cancelar' }[state];
    $('stop').disabled = state === 'idle'; $('test').disabled = state === 'exporting' || state === 'loading';
    $('wav').disabled = state === 'exporting' || state === 'loading';
  }
  function paint(seconds = 0) {
    $('clock').textContent = time(seconds); $('progress').max = playbackDuration || config.durationSec;
    $('progress').value = seconds;
    const c = playingConfig || config, side = Math.floor(seconds / c.intervalSec) % 2;
    const left = (side === 0) === (c.firstSide === 'left');
    $('left').classList.toggle('active', state === 'playing' && (left || c.separation === 0));
    $('right').classList.toggle('active', state === 'playing' && (!left || c.separation === 0));
  }
  function frame() {
    if (state !== 'playing') return;
    paint(Math.min(playbackDuration, Math.max(0, context.currentTime - startedAt)));
    animation = w.requestAnimationFrame(frame);
  }
  function stop(message) {
    serial++; cancelRender?.(); cancelRender = null;
    w.cancelAnimationFrame(animation);
    const oldSource = source, oldGain = gain;
    source = gain = null;
    if (oldSource) {
      oldSource.onended = null;
      if (context.state === 'running') {
        oldGain.gain.cancelScheduledValues(context.currentTime);
        oldGain.gain.setTargetAtTime(0, context.currentTime, 0.005);
        oldSource.stop(context.currentTime + 0.03);
      } else oldSource.stop();
      oldSource.onended = () => { oldSource.disconnect(); oldGain.disconnect(); };
    }
    state = 'idle'; playbackDuration = null; playingConfig = null; buttons(); paint();
    $('duration-label').textContent = '/ ' + time(config.durationSec);
    if (message) status(message);
  }
  function generate(mode, cfg) {
    return new Promise((resolve, reject) => {
      const worker = makeWorker();
      const finish = () => { worker.terminate(); cancelRender = null; };
      cancelRender = () => { finish(); reject(Error('cancelled')); };
      worker.onmessage = ({ data }) => { finish(); data.error ? reject(Error(data.error)) : resolve(data); };
      worker.onerror = () => { finish(); reject(Error('No se pudo generar el audio.')); };
      worker.postMessage({ id: serial, mode, config: cfg });
    });
  }
  function playBuffer(buffer, cfg, duration) {
    gain = context.createGain(); gain.gain.value = config.volume / 0.5; gain.connect(context.destination);
    source = context.createBufferSource(); source.buffer = buffer; source.connect(gain);
    playingConfig = cfg; playbackDuration = duration; startedAt = context.currentTime + 0.06;
    const ownSource = source;
    source.onended = () => {
      if (source !== ownSource) return;
      ownSource.disconnect(); gain.disconnect(); source = gain = null;
      state = 'idle'; buttons(); paint(duration); status('Listo. Puedes repetir o cambiar el sonido.');
    };
    source.start(startedAt); state = 'playing'; buttons(); frame();
  }
  async function start(test = false) {
    stop(); const token = serial;
    try {
      context ??= makeAudioContext(); await context.resume();
      if (serial !== token || d.hidden) return;
      state = 'loading'; buttons(); status('Preparando sonido…');
      const cfg = validateConfig({ ...config, volume: 0.5 });
      if (test) {
        const buffer = context.createBuffer(2, 2 * 44100, 44100);
        const pulse = createPulse({ ...cfg, sound: 'tone', intervalSec: 1 }, 44100, 0);
        buffer.copyToChannel(pulse, 0, Math.round(0.15 * 44100));
        buffer.copyToChannel(pulse, 1, Math.round(1.15 * 44100));
        playBuffer(buffer, { ...cfg, intervalSec: 1, firstSide: 'left', separation: 1 }, 2);
        $('duration-label').textContent = '/ 00:02'; status('Primero izquierda; después derecha.');
      } else {
        const result = await generate('play', cfg);
        if (serial !== token || d.hidden) return;
        const buffer = context.createBuffer(2, result.left.length, result.sampleRate);
        buffer.copyToChannel(result.left, 0); buffer.copyToChannel(result.right, 1);
        playBuffer(buffer, cfg, cfg.durationSec); status('Alternancia activa · puedes pausar en cualquier momento.');
      }
    } catch (error) { if (serial === token) { stop(); status('No se inició el audio: ' + error.message); } }
  }
  async function pause() {
    if (state !== 'playing') return;
    state = 'paused'; w.cancelAnimationFrame(animation); buttons(); paint(Math.max(0, context.currentTime - startedAt));
    try { await context.suspend(); status('En pausa.'); } catch { stop('Se detuvo el audio.'); }
  }
  $('play').onclick = async () => {
    if (state === 'loading' || state === 'exporting') return stop('Generación cancelada.');
    if (state === 'playing') return pause();
    if (state === 'paused') {
      const token = serial;
      try { await context.resume(); if (token !== serial || d.hidden) return; state = 'playing'; buttons(); frame(); status('Alternancia activa.'); }
      catch { stop('No se pudo continuar el audio.'); }
      return;
    }
    await start();
  };
  $('stop').onclick = () => stop('Detenido.'); $('test').onclick = () => start(true);
  d.addEventListener('visibilitychange', () => { if (d.hidden) {
    if (state === 'playing') void pause();
    if (state === 'loading') stop('Preparación cancelada al salir de la pestaña.');
  } });
  w.addEventListener('pagehide', () => { stop(); for (const url of objectUrls) w.URL.revokeObjectURL(url); });
  d.addEventListener('keydown', e => { if (e.key === 'Escape' && state !== 'idle') stop('Detenido.'); });

  function reflect() {
    for (const button of $('sounds').children) button.setAttribute('aria-pressed', String(button.dataset.sound === config.sound));
    for (const [id, value] of [['interval', config.intervalSec], ['volume', config.volume * 200],
      ['separation', config.separation * 100], ['duration', config.durationSec], ['frequency', config.frequencyHz],
      ['seed', config.seed], ['first-side', config.firstSide]]) $(id).value = String(value);
    $('interval-label').textContent = config.intervalSec.toLocaleString('es-CL', { minimumFractionDigits: 2 }) + ' s';
    $('volume-label').textContent = Math.round(config.volume * 200) + ' %';
    $('separation-label').textContent = Math.round(config.separation * 100) + ' %';
    $('frequency-label').textContent = config.frequencyHz + ' Hz';
    $('frequency').disabled = !['tone', 'bell', 'wood'].includes(config.sound);
    $('duration-label').textContent = '/ ' + time(config.durationSec);
  }
  function change(patch) {
    try {
      const next = validateConfig({ ...config, ...patch });
      clearExport();
      if (Object.keys(patch).length === 1 && 'volume' in patch && gain && ['playing', 'paused'].includes(state)) {
        config = next; gain.gain.setTargetAtTime(config.volume / 0.5, context.currentTime, 0.015);
      } else { stop('Ajuste cambiado. Pulsa Escuchar.'); config = next; }
      reflect();
    } catch (error) { status(error.message); reflect(); }
  }
  for (const sound of SOUNDS) {
    const b = d.createElement('button'); b.className = 'sound'; b.dataset.sound = sound.id;
    b.innerHTML = '<span class="mark" aria-hidden="true"></span><strong></strong><small></small>';
    b.querySelector('.mark').textContent = sound.mark; b.querySelector('strong').textContent = sound.name;
    b.querySelector('small').textContent = sound.detail; b.onclick = () => change({ sound: sound.id }); $('sounds').append(b);
  }
  for (const [id, key, factor] of [['interval', 'intervalSec', 1], ['volume', 'volume', 0.005],
    ['separation', 'separation', 0.01], ['duration', 'durationSec', 1], ['frequency', 'frequencyHz', 1], ['seed', 'seed', 1]]) {
    $(id).addEventListener(id === 'duration' || id === 'seed' ? 'change' : 'input', () => change({ [key]: Number($(id).value) * factor }));
  }
  $('first-side').onchange = () => change({ firstSide: $('first-side').value });
  function presetOptions() {
    $('presets').replaceChildren(); const placeholder = d.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Mis presets'; $('presets').append(placeholder);
    presets.forEach((p, i) => { const option = d.createElement('option'); option.value = i; option.textContent = p.name; $('presets').append(option); });
  }
  try {
    const stored = JSON.parse(w.localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) presets = stored.slice(0, 50).map(p => ({ name: String(p.name).slice(0, 48), config: validateConfig(p.config) }));
  } catch { status('No se pudieron recuperar los presets. Puedes generar audio igualmente.'); }
  $('save').onclick = () => {
    const name = $('preset-name').value.trim(); if (!name) return status('Escribe un nombre para el preset.');
    try {
      const next = [...presets.filter(p => p.name !== name), { name, config: { ...config } }].slice(-50);
      w.localStorage.setItem(storageKey, JSON.stringify(next)); presets = next; presetOptions(); status('Preset guardado en este navegador.');
    } catch { status('No se pudo guardar el preset en este navegador. Descarga el JSON para conservarlo.'); }
  };
  $('presets').onchange = () => { if ($('presets').value !== '') change(presets[Number($('presets').value)].config); };
  $('import').onclick = () => $('import-file').click();
  $('import-file').onchange = async () => {
    try {
      const file = $('import-file').files[0]; if (!file) return;
      if (file.size > 65536) throw Error('El JSON supera 64 KB.');
      const data = JSON.parse(await file.text()); change(validateConfig(data.config || data));
    } catch (error) { status('No se importó: ' + error.message); }
    $('import-file').value = '';
  };
  $('json').onclick = () => download(json({ schema: 'bilateral-config-v1', engine: ENGINE_VERSION, config,
    source: 'procedural-synthesis-only', codeLicense: 'MIT', outputLicense: 'OUTPUT-LICENSE.txt',
    commercialUsePermitted: true }), 'bilateral-config.json');
  $('wav').onclick = async () => {
    stop(); const token = serial, cfg = { ...config }; state = 'exporting'; buttons();
    clearExport();
    status('Generando WAV estéreo…'); $('export-result').replaceChildren();
    try {
      const { wav, manifest } = await generate('wav', cfg); if (serial !== token) return;
      const name = `bilateral-${cfg.sound}-${cfg.seed}`;
      const wavUrl = blobUrl(wav, 'audio/wav'); download(wavUrl, name + '.wav');
      const wavLink = d.createElement('a'); wavLink.href = wavUrl; wavLink.download = name + '.wav'; wavLink.textContent = 'WAV';
      const manifestLink = d.createElement('a'); manifestLink.href = json(manifest); manifestLink.download = name + '.json'; manifestLink.textContent = 'Ficha JSON y hashes';
      lastExport = [wavUrl, manifestLink.href];
      $('export-result').append('Descarga lista: ', wavLink, ' · ', manifestLink);
      status('WAV generado. Conserva también su ficha de procedencia.');
    } catch (error) { if (serial === token) status('No se exportó: ' + error.message); }
    finally { if (serial === token) { state = 'idle'; buttons(); } }
  };
  reflect(); presetOptions(); buttons();
  return { getConfig: () => ({ ...config }), getState: () => state, stop, change };
}
if (typeof document !== 'undefined') mountGenerator();
