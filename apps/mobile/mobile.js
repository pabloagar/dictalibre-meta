import { $, RelayClient, status, clock } from '/shared/client.js';
import { encodeChunk, sha256 } from '/shared/protocol.js';

let client, stream, context, source, worklet, silent, wakeLock;
let paired = false, prepared = false, preparing = false, epoch = 0, recording = null, counter = 0, heldPointer = null;
let mode = 'hold';
let synthetic = false;
const initialCode = location.hash.slice(1);
if (/^[a-f0-9]{10}$/i.test(initialCode)) $('join-code').value = initialCode;
history.replaceState(null, '', location.pathname);
function refresh() {
  $('join').disabled = !$('consent').checked || !!client;
  $('record').disabled = !prepared || !paired || (recording && !['starting', 'recording'].includes(recording.state));
  $('prepare').hidden = prepared; $('prepare').disabled = preparing;
  $('test-signal').hidden = prepared; $('test-signal').disabled = preparing;
  $('modes').disabled = !!recording;
  $('record').classList.toggle('recording', !!recording && ['starting', 'recording'].includes(recording.state));
  $('record-label').textContent = recording ? (recording.state === 'finishing' ? 'Comprobando entrega…' : mode === 'hold' ? 'Suelta para detener' : 'Pulsa para detener') : mode === 'hold' ? 'Mantén pulsado para hablar' : 'Pulsa para empezar';
}
function releaseMicrophone() {
  epoch++; prepared = false; preparing = false;
  stream?.getTracks().forEach(track => track.stop()); stream = null;
  source?.disconnect(); worklet?.disconnect(); silent?.disconnect();
  if (context && context.state !== 'closed') void context.close();
  context = null; worklet = null; source = null; silent = null;
  void wakeLock?.release(); wakeLock = null; $('level').value = 0; refresh();
}
function abort(reason, notify = true) {
  if (recording && notify) client?.send({ type: 'abort' });
  worklet?.port.postMessage({ type: 'abort' }); recording = null; heldPointer = null;
  $('level').value = 0; $('verified').textContent = ''; status(reason, 'error'); refresh();
}
async function stopped(m) {
  const r = recording;
  if (!r || r.id !== m.id) return;
  r.state = 'finishing'; refresh(); $('level').value = 0;
  if (m.limit) status('Límite de 3 minutos alcanzado. Comprobando el audio capturado.');
  try {
    const hash = await sha256(r.parts);
    if (recording !== r) return;
    if (m.samples !== r.samples) throw new Error('Faltan muestras antes del envío.');
    if (!client.send({ type: 'end', id: r.id, samples: r.samples, frames: r.sequence, hash })) throw new Error('Se perdió la conexión.');
    r.parts = [];
  } catch (error) { abort(error.message); }
}
async function prepare(useSynthetic = false) {
  if (preparing || prepared || !paired) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { status('Abre el enlace HTTPS del servidor para usar el micrófono.', 'error'); return; }
  preparing = true; synthetic = useSynthetic; const generation = ++epoch; refresh(); status(synthetic ? 'Preparando tono sintético…' : 'Solicitando acceso al micrófono…');
  let obtained;
  try {
    if (!synthetic) obtained = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: { ideal: 1 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
    if (generation !== epoch || !paired || document.hidden) { obtained?.getTracks().forEach(t => t.stop()); return; }
    stream = obtained; context = new AudioContext({ latencyHint: 'interactive' });
    await context.resume(); await context.audioWorklet.addModule('/capture-worklet.js');
    if (generation !== epoch || !context) return;
    if (synthetic) {
      source = context.createGain(); source.gain.value = .15;
      const oscillator = context.createOscillator(); oscillator.frequency.value = 440; oscillator.connect(source); oscillator.start();
    } else source = context.createMediaStreamSource(stream);
    worklet = new AudioWorkletNode(context, 'dicta-capture');
    worklet.onprocessorerror = () => { abort('Falló la captura de audio. Prepara de nuevo el micrófono.'); releaseMicrophone(); };
    silent = context.createGain(); silent.gain.value = 0; source.connect(worklet).connect(silent).connect(context.destination);
    worklet.port.onmessage = ({ data: m }) => {
      const r = recording;
      if (!r || m.id !== r.id) return;
      if (m.type === 'started') { if (r.state === 'starting') r.state = 'recording'; refresh(); return; }
      if (m.type === 'stopped') { void stopped(m); return; }
      if (m.type !== 'chunk') return;
      if (client.buffered > 524288) { abort('La conexión está saturada. La toma se detuvo.'); return; }
      const encoded = encodeChunk(r.id, r.sequence++, m.pcm);
      r.parts.push(new Uint8Array(encoded, 16).slice()); r.samples += m.pcm.length;
      let sum = 0; for (const sample of m.pcm) sum += (sample / 32768) ** 2;
      $('level').value = Math.min(1, Math.sqrt(sum / m.pcm.length) * 4);
      $('duration').textContent = clock(r.samples, context.sampleRate);
      if (!client.send(encoded)) abort('Se perdió la conexión. La toma se detuvo.');
    };
    if (stream) stream.getAudioTracks()[0].onended = () => { abort('El sistema interrumpió el micrófono.'); releaseMicrophone(); };
    context.onstatechange = () => {
      if (prepared && context && context.state !== 'running') { abort('La captura se suspendió. Prepara de nuevo el micrófono.'); releaseMicrophone(); }
    };
    prepared = true; preparing = false;
    const settings = stream?.getAudioTracks()[0].getSettings() ?? {};
    const flag = value => value === undefined ? 'no informado' : value ? 'sí' : 'no';
    $('capture-info').textContent = synthetic ? `TONO SINTÉTICO 440 Hz · sin micrófono · ${context.sampleRate / 1000} kHz` : `${context.sampleRate / 1000} kHz · PCM 16 bits · mono · máx. 3 min. Procesado del navegador: eco ${flag(settings.echoCancellation)}, ruido ${flag(settings.noiseSuppression)}, ganancia automática ${flag(settings.autoGainControl)}.`;
    status(synthetic ? 'Tono sintético preparado. Usa los controles para probar el envío.' : 'Micrófono preparado. Fuera de cada toma, el audio se descarta.', 'success'); refresh();
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* screen must remain on manually */ }
  } catch (error) {
    obtained?.getTracks().forEach(t => t.stop());
    if (generation !== epoch) return;
    releaseMicrophone(); status(error.name === 'NotAllowedError' ? 'Permiso denegado. Habilita el micrófono para este sitio y vuelve a prepararlo.' : `No se pudo preparar el micrófono: ${error.message}`, 'error');
  }
}
function start() {
  if (!prepared || !paired || recording || context?.state !== 'running') return;
  $('verified').textContent = ''; $('received').textContent = '0'; $('duration').textContent = '00:00';
  recording = { id: ++counter, sequence: 0, samples: 0, parts: [], state: 'starting' };
  if (!client.send({ type: 'start', id: recording.id, rate: context.sampleRate, mode, source: synthetic ? 'tone' : 'microphone' })) { abort('No hay conexión con el PC.'); return; }
  worklet.port.postMessage({ type: 'start', id: recording.id }); status('Grabando y enviando al computador.'); refresh();
}
function stop() {
  if (!recording || !['starting', 'recording'].includes(recording.state)) return;
  recording.state = 'finishing'; worklet?.port.postMessage({ type: 'stop' });
  status('Captura detenida. Entregando el último bloque…'); refresh();
}
function onMessage(m) {
  switch (m.type) {
    case 'pending': $('join-panel').hidden = true; $('confirm-panel').hidden = false; $('confirm-code').textContent = m.confirm; status('Espera la confirmación en el computador.'); break;
    case 'paired': paired = true; $('confirm-panel').hidden = true; $('controls').hidden = false; status('Conectado. Prepara el micrófono para empezar.', 'success'); refresh(); break;
    case 'receipt': if (recording?.id === m.id) $('received').textContent = m.sequence + 1; break;
    case 'verified':
      if (recording?.id !== m.id) return;
      recording = null; $('level').value = 0; refresh();
      $('verified').textContent = m.samples ? '✓ El PC recibió exactamente el mismo audio. Puedes escucharlo allí.' : 'La toma quedó vacía. Prueba de nuevo.';
      status(synthetic ? 'Tono sintético preparado para otra toma.' : 'Micrófono preparado para otra toma.', 'success'); break;
    case 'aborted': abort(m.reason, false); break;
    case 'error': status(m.message, 'error'); if (!paired) client?.close(); break;
    case 'closed': abort(m.reason, false); releaseMicrophone(); break;
  }
}
$('consent').onchange = refresh;
$('join').onclick = () => {
  if (client || !$('consent').checked) return;
  if (!/^[a-f0-9]{10}$/i.test($('join-code').value.replace(/[\s-]/g, ''))) { status('Introduce los 10 caracteres del código.', 'error'); return; }
  client = new RelayClient(onMessage, () => {
    paired = false; abort('Conexión cerrada. Crea una sesión nueva en el PC.', false); releaseMicrophone();
    client = null; $('join-panel').hidden = false; $('confirm-panel').hidden = true; $('controls').hidden = true; refresh();
  });
  client.connect({ type: 'join', code: $('join-code').value }); refresh(); status('Conectando…');
};
$('prepare').onclick = () => prepare(false);
$('test-signal').onclick = () => prepare(true);
document.querySelectorAll('[name="mode"]').forEach(input => { input.onchange = () => { if (!recording) { mode = input.value; refresh(); } }; });
const button = $('record');
button.addEventListener('pointerdown', event => {
  if (mode !== 'hold' || button.disabled || heldPointer !== null || !event.isPrimary) return;
  event.preventDefault(); heldPointer = event.pointerId; button.setPointerCapture(event.pointerId); start();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => {
  if (mode === 'hold' && event.pointerId === heldPointer) { heldPointer = null; stop(); }
});
button.addEventListener('click', () => { if (mode === 'toggle') recording ? stop() : start(); });
button.addEventListener('contextmenu', event => event.preventDefault());
button.addEventListener('keydown', event => { if (mode === 'hold' && [' ', 'Enter'].includes(event.key)) { event.preventDefault(); if (!event.repeat) start(); } });
button.addEventListener('keyup', event => { if (mode === 'hold' && [' ', 'Enter'].includes(event.key)) { event.preventDefault(); stop(); } });
button.addEventListener('blur', () => { if (mode === 'hold') stop(); });
$('close').onclick = () => { if (recording) abort('Sesión finalizada.'); releaseMicrophone(); client?.send({ type: 'close' }); client?.close(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (recording) abort('La interfaz dejó de estar visible. Toma interrumpida.'); releaseMicrophone(); } });
window.addEventListener('pagehide', () => { if (recording) client?.send({ type: 'abort' }); releaseMicrophone(); client?.close(); });
refresh();
