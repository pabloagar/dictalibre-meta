import { $, RelayClient, status, clock } from '/shared/client.js';
import { encodeChunk, sha256 } from '/shared/protocol.js';

let resumeToken=null, resumeUntil=0, retryTimer=null;
let client, stream, context, source, worklet, silent, wakeLock;
let paired = false, prepared = false, preparing = false, epoch = 0, recording = null, counter = 0, heldPointer = null;
let mode = 'hold';
let synthetic = false;
let prepareMs = null, connectStarted = null;
const lifecycle=[];let hiddenAt=null;
function lifecycleEvent(type,extra={}){lifecycle.push({type,atMs:performance.now(),recordingId:recording?.id??null,paired,...extra});if(lifecycle.length>100)lifecycle.shift();}
const HAPTIC_MS = 12, HAPTIC_KEY = 'dicta-haptics-v1';
const CAPTURE_FEEDBACK_VERSION = 'first-input-v2';
let hapticsEnabled = true;
try { hapticsEnabled = localStorage.getItem(HAPTIC_KEY) !== 'false'; } catch { /* optional storage */ }
$('haptics').checked = hapticsEnabled;
if (typeof globalThis.navigator?.vibrate !== 'function') $('haptics-note').textContent = 'Este navegador no ofrece vibración; puedes grabar normalmente.';
$('haptics').onchange = () => {
  hapticsEnabled = $('haptics').checked;
  let saved = false;
  try { localStorage.setItem(HAPTIC_KEY, String(hapticsEnabled)); saved = true; } catch { /* keep session preference */ }
  $('haptics-note').textContent = saved ? 'Preferencia guardada para este enlace en este navegador.' : 'Preferencia activa solo en esta página: no se pudo guardar.';
  lifecycleEvent('haptics-preference', { enabled: hapticsEnabled, saved });
};
function haptic(r, edge) {
  if (!r.hapticsEnabled || r[`haptic_${edge}`] || document.hidden) return;
  r[`haptic_${edge}`] = true;
  const began = performance.now();
  let accepted = null, outcome = 'unsupported';
  try {
    if (typeof globalThis.navigator?.vibrate === 'function') {
      accepted = navigator.vibrate(HAPTIC_MS); outcome = accepted ? 'requested' : 'rejected';
    }
  } catch { outcome = 'error'; }
  const callMs = performance.now() - began;
  lifecycleEvent('haptic', { recordingId: r.id, edge, requestedMs: HAPTIC_MS, accepted, outcome, callMs, actualDurationMs: null, audibleInRecording: null });
  return outcome;
}
$('test-haptics').onclick = () => {
  if (recording) return;
  const outcome = haptic({ id: null, hapticsEnabled: true }, 'test');
  $('haptics-note').textContent = outcome === 'requested'
    ? 'Pulso de 12 ms solicitado. ¿Lo sentiste? La aceptación del navegador no confirma vibración física. Si no se siente, comprueba que el teléfono no esté en silencio y revisa sus ajustes de vibración.'
    : outcome === 'unsupported' ? 'Este navegador no ofrece vibración.' : 'El navegador no aceptó la vibración. Puedes seguir grabando normalmente.';
};
function captureStarted(r, confirmation = 'worklet-start') {
  if (r.state !== 'starting') return;
  r.state = 'recording'; lifecycleEvent('capture-started', { confirmation }); haptic(r, 'start');
  status('Grabando y enviando al computador.');
}
$('export-lifecycle').onclick=()=>{const blob=new Blob([JSON.stringify({schema:'mobile-lifecycle.v1',captureFeedbackVersion:CAPTURE_FEEDBACK_VERSION,clock:'performance.now; ms desde navegación',browser:navigator.userAgent,network:null,events:lifecycle},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dicta-interrupciones.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('restart').onclick=()=>{forgetResume();lifecycleEvent('reset');if(recording)abort('Sesión reiniciada.');releaseMicrophone();client?.send({type:'close'});client?.close();qrToken=null;$('join-code').value='';$('duration').textContent='00:00';$('received').textContent='0';$('verified').textContent='';$('capture-info').textContent='Micrófono liberado.';status('Crea una sesión nueva en el PC y escanea el nuevo QR.');};
function report(r, stages = {}, extra = {}) { client?.send({ type: 'sender_metrics', id: r.id, stages, ...extra }); }
const initialCode = location.hash.slice(1);
let qrToken = /^qr=[a-f0-9]{64}$/.test(initialCode) ? initialCode.slice(3) : null;
if (/^[a-f0-9]{10}$/i.test(initialCode)) $('join-code').value = initialCode;
history.replaceState(null, '', location.pathname);
function refresh() {
  $('join').disabled = !!client;
  $('record').disabled = !prepared || !paired || (recording && !['starting', 'recording'].includes(recording.state));
  $('prepare').hidden = prepared; $('prepare').disabled = preparing;
  $('test-signal').hidden = prepared; $('test-signal').disabled = preparing;
  $('modes').disabled = !!recording;
  $('haptics').disabled = !!recording;
  $('test-haptics').disabled = !!recording;
  $('record').classList.toggle('recording', recording?.state === 'recording');
  $('record-label').textContent = recording ? ({starting:'Iniciando…',stopping:'Deteniendo…',finishing:'Comprobando entrega…'}[recording.state] ?? (mode === 'hold' ? 'Suelta para detener' : 'Pulsa para detener')) : mode === 'hold' ? 'Mantén pulsado para hablar' : 'Pulsa para empezar';
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
  if (r.state === 'finishing') return;
  lifecycleEvent('capture-stopped', { samples: m.samples, limit: !!m.limit });
  if (m.samples > 0) haptic(r, 'stop');
  r.state = 'finishing'; refresh(); $('level').value = 0;
  const flushedAt = performance.now();
  const stopFlushMs = r.stopAt == null ? null : flushedAt - r.stopAt;
  r.stopAt ??= flushedAt;
  status(m.limit ? 'Límite de 3 minutos alcanzado. Comprobando el audio capturado.' : 'Captura detenida. Comprobando entrega al computador…');
  try {
    const hash = await sha256(r.parts);
    report(r, { stopFlushMs, senderHashMs: performance.now() - flushedAt });
    if (recording !== r) return;
    if (m.samples !== r.samples) throw new Error('Faltan muestras antes del envío.');
    const stopStamp=client.clock.stamp(performance.timeOrigin+r.stopAt);
    if (!client.send({ type: 'end', id: r.id, samples: r.samples, frames: r.sequence, hash, stopStamp })) throw new Error('Se perdió la conexión.');
    r.parts = [];
  } catch (error) { abort(error.message); }
}
async function prepare(useSynthetic = false) {
  const prepareStart = performance.now();
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
      if (m.type === 'started') { report(r, { prepareMs, startControlMs: performance.now() - r.startAt }); captureStarted(r, m.confirmation); refresh(); return; }
      if (m.type === 'stopped') { void stopped(m); return; }
      if (m.type !== 'chunk') return;
      if (client.buffered > 524288) { abort('La conexión está saturada. La toma se detuvo.'); return; }
      const sequence = r.sequence++;
      const encoded = encodeChunk(r.id, sequence, m.pcm);
      client.send({ type: 'block_timing', id: r.id, sequence, sent: client.clock.stamp(), queueBytes: client.buffered });
      r.sentTimes.set(sequence, performance.now());
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
    prepared = true; preparing = false;lifecycleEvent('microphone-ready',{prepareMs:performance.now()-prepareStart});$('prepare').textContent='Preparar micrófono';
    prepareMs = performance.now() - prepareStart;
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
  recording = { id: ++counter, sequence: 0, samples: 0, parts: [], state: 'starting', startAt: performance.now(), sentTimes: new Map(), hapticsEnabled };
  lifecycleEvent('capture-request', { captureFeedbackVersion: CAPTURE_FEEDBACK_VERSION, hapticsEnabled, requestedPulseMs: hapticsEnabled ? HAPTIC_MS : 0, source: synthetic ? 'tone' : 'microphone', mode });
  if (!client.send({ type: 'start', id: recording.id, rate: context.sampleRate, mode, source: synthetic ? 'tone' : 'microphone' })) { abort('No hay conexión con el PC.'); return; }
  worklet.port.postMessage({ type: 'start', id: recording.id }); status('Iniciando captura… Espera la confirmación para hablar.'); refresh();
}
function stop() {
  if (!recording || !['starting', 'recording'].includes(recording.state)) return;
  recording.stopAt = performance.now(); recording.state = 'stopping'; worklet?.port.postMessage({ type: 'stop' });
  status('Deteniendo captura…'); refresh();
}
function onMessage(m) {
  switch (m.type) {
    case 'pending': $('join-panel').hidden = true; $('confirm-panel').hidden = false; $('confirm-code').textContent = m.confirm; status('Espera la confirmación en el computador.'); break;
    case 'paired': if(m.resumeToken){resumeToken=m.resumeToken;resumeUntil=0;}lifecycleEvent('connection-ready',{resumed:!!m.resumed});client.send({ type: 'pairing_metrics', connectToPairedMs: performance.now() - connectStarted }); $('join-panel').hidden = true; paired = true; $('confirm-panel').hidden = true; $('controls').hidden = false; status('Conectado. Prepara el micrófono para empezar.', 'success'); refresh(); break;
    case 'receipt':
      if (recording?.id === m.id) {
        $('received').textContent = m.sequence + 1;
        const sentAt = recording.sentTimes.get(m.sequence);
        if (sentAt != null) report(recording, {}, { sequence: m.sequence, ackRoundTripMs: performance.now() - sentAt });
        recording.sentTimes.delete(m.sequence);
      } break;
    case 'verified':
      if (recording?.id !== m.id) return;
      if (recording.stopAt != null) report(recording, { stopToVerifiedMs: performance.now() - recording.stopAt });
      recording = null; $('level').value = 0; refresh();
      $('verified').textContent = m.samples ? '✓ El PC recibió exactamente el mismo audio. Puedes escucharlo allí.' : 'La toma quedó vacía. Prueba de nuevo.';
      status(synthetic ? 'Tono sintético preparado para otra toma.' : 'Micrófono preparado para otra toma.', 'success'); break;
    case 'aborted': if (recording && m.id !== recording.id) break; abort(m.reason, false); break;
    case 'error': if(!paired)forgetResume();status(m.message, 'error'); if (!paired) client?.close(); break;
    case 'closed': forgetResume();paired=false;abort(m.reason, false); releaseMicrophone();client?.close();break;
  }
}
function forgetResume(){resumeToken=null;resumeUntil=0;clearTimeout(retryTimer);}
function reconnect(){
  if(client||document.hidden||!resumeToken)return;
  if(Date.now()>=resumeUntil){forgetResume();status('La pausa superó cinco minutos. Crea una sesión en el PC y escanea el nuevo QR.');return;}
  lifecycleEvent('resume-attempt');openConnection({type:'resume',token:resumeToken});
}
function openConnection(request){
  connectStarted=performance.now();
  client=new RelayClient(onMessage,()=>{
    lifecycleEvent('connection-closed');paired=false;releaseMicrophone();
    if(resumeToken&&!resumeUntil)resumeUntil=Date.now()+300000;
    abort(resumeToken?'Conexión en pausa. Vuelve a Chrome antes de cinco minutos.':'Conexión cerrada. Crea una sesión en el PC y escanea el QR.',false);
    client=null;$('join-panel').hidden=false;$('confirm-panel').hidden=true;$('controls').hidden=true;refresh();
    if(resumeToken&&!document.hidden)retryTimer=setTimeout(reconnect,1000);
  });
  client.connect(request);refresh();status(request.type==='resume'?'Recuperando conexión…':'Conectando…');
}
$('join').onclick=()=>{
  if(client)return;
  if(resumeToken){reconnect();return;}
  if(!qrToken&&!/^[a-f0-9]{10}$/i.test($('join-code').value.replace(/[\s-]/g,''))){status('Introduce los 10 caracteres del código.','error');return;}
  const request=qrToken?{type:'join_qr',token:qrToken}:{type:'join',code:$('join-code').value};qrToken=null;openConnection(request);
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
$('close').onclick = () => { forgetResume(); if (recording) abort('Sesión finalizada.'); releaseMicrophone(); client?.send({ type: 'close' }); client?.close(); };
document.addEventListener('visibilitychange', () => {
 if(document.hidden){hiddenAt=performance.now();lifecycleEvent('hidden',{duringTake:!!recording});if(recording)abort('Pantalla oculta o bloqueada: toma interrumpida, no completada.');releaseMicrophone();if(paired&&client&&resumeToken){resumeUntil=Date.now()+300000;client.send({type:'suspend'});client.close();}}
 else {lifecycleEvent('visible',{hiddenDurationMs:hiddenAt===null?null:performance.now()-hiddenAt});hiddenAt=null;
  if(paired&&client){$('prepare').textContent='Reactivar micrófono';status('Volviste a la pantalla. Pulsa Reactivar micrófono para volver a dictar.');}
  else if(resumeToken)reconnect();else status('La conexión terminó. Crea una sesión en el PC y escanea el nuevo QR.');refresh();}
});
window.addEventListener('pagehide', () => { if (recording) client?.send({ type: 'abort' }); releaseMicrophone(); client?.close(); });
refresh();

if (qrToken) $('join').click();
