import { $, RelayClient, status, clock } from '/shared/client.js';
import { decodeChunk, sha256, wavBlob } from '/shared/protocol.js';
import { RecordingMetrics, arrivalEstimate, round, exportBatch } from '/shared/metrics.js';
let mobileOrigin=location.origin;
if(location.pathname==='/live'){
  $('create').disabled=true;
  try{const response=await fetch('/api/live-info');if(!response.ok)throw Error();mobileOrigin=(await response.json()).mobileOrigin;await import('/live.js');$('create').disabled=false;}
  catch{status('No se pudo preparar dictado local. Inicia la demo y el laboratorio.','error');}
}

let client, current, sessionEpoch = 0, pairingTimer, clipCount = 0;
const clipURLs = [];
const traces = new Map();
let latestTrace, pendingTiming, previousArrival, pairingMetrics = null;
function showPairing(metrics) {
  if (!metrics) return;
  pairingMetrics = metrics;
  $('pairing-times').textContent = `Emparejamiento ${metrics.method === 'qr' ? 'QR directo' : 'código manual'} · crear → conectado: ${ms(metrics.createdToPairedMs)} · solicitud → autorización: ${ms(metrics.requestToPairedMs)} · conexión desde celular: ${ms(metrics.mobileConnectToPairedMs)}`;
  $('pairing-export').disabled = false;
}
$('pairing-export').onclick = () => {
  if (!pairingMetrics) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify({schema:'dicta-libre.pairing.v1', exportedAt:new Date().toISOString(), ...pairingMetrics},null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='dicta-emparejamiento.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const ms = value => value == null ? '—' : `${round(value)} ms`;
function renderMetrics() {
  if (!latestTrace) return;
  const s = latestTrace.summary();
  $('arrival').textContent = s.sendToPcEstimateMs.n ? `≈ ${ms(s.sendToPcEstimateMs.p50)}` : 'Sin calibración';
  $('ack').textContent = ms(s.ackRoundTripMs.p50);
  $('buffer').textContent = ms(s.bufferMs.p50);
  $('metrics-export').disabled = false;
  $('metrics-export').textContent = `Exportar métricas · ${traces.size} toma(s), hasta 5 · JSON`;
  const rows = [
    ['Envío → PC estimado', s.sendToPcEstimateMs], ['Resolución orientativa del reloj', s.uncertaintyMs],
    ['Envío → confirmación PC → celular', s.ackRoundTripMs], ['Audio por bloque', s.bufferMs],
    ['Procesado del bloque en servidor', s.relayMs], ['Intervalo entre llegadas', s.interarrivalMs]
  ];
  $('timing-rows').replaceChildren();
  for (const [label, stat] of rows) {
    const tr = document.createElement('tr');
    for (const value of [label, ms(stat.p50), ms(stat.p95), stat.n]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
    $('timing-rows').append(tr);
  }
  const labels = { prepareMs:'Preparar micrófono (incluye permiso)', startControlMs:'Orden de inicio → captura', stopFlushMs:'Detener → último bloque capturado', senderHashMs:'Verificar hash en celular', pcHashMs:'Verificar hash en PC', stopToVerifiedMs:'Detener → entrega confirmada',asrQueueMs:'Cola ASR',asrRunMs:'Petición ASR',receiveEndToTextMs:'Fin recibido en PC → texto',stopToTextEstimateMs:'Detener → texto estimado',clockUncertaintyMs:'Resolución orientativa parada → texto' };
  $('stage-times').textContent = Object.entries(labels).map(([key,label]) => `${label}: ${ms(latestTrace.stages[key])}`).join(' · ');
  $('transport-counts').textContent = `${s.blocks} bloques · ${s.bytes} bytes de audio y cabecera · cola máxima ${s.queueBytes.max ?? '—'} bytes · duplicados ${latestTrace.counters.duplicates} · errores de secuencia ${latestTrace.counters.sequenceErrors} · sin estimación ${s.unestimatedBlocks}`;
}
$('metrics-export').onclick = () => {
  if (!latestTrace) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(exportBatch(traces.values(), pairingMetrics), null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `dicta-metricas-ultimas-5.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function displayIdle() {
  document.body.classList.remove('receiving'); $('record-state').textContent = 'EN ESPERA';
  $('record-state').classList.remove('active'); $('level').value = 0;
}
function addClip(record, complete, hash = '') {
  if (!record.parts.length) return;
  $('empty')?.remove();
  const url = URL.createObjectURL(wavBlob(record.parts, record.rate));
  const article = document.createElement('article'); article.className = 'clip';
  const title = document.createElement('div'); title.className = 'clip-title';
  const name = document.createElement('strong'); name.textContent = `Toma ${++clipCount} · ${clock(record.samples, record.rate)} · ${record.mode === 'hold' ? 'Mantener pulsado' : 'Inicio / parada'}${record.source === 'tone' ? ' · Tono sintético' : ''}`;
  const badge = document.createElement('span'); badge.textContent = complete ? '✓ Integridad verificada' : '⚠ Incompleta'; badge.className = complete ? '' : 'bad';
  title.append(name, badge);
  const audio = document.createElement('audio'); audio.controls = true; audio.src = url; audio.preload = 'metadata';
  const detail = document.createElement('p'); detail.textContent = complete ? `${record.frames} bloques · ${record.samples.toLocaleString('es-CL')} muestras · SHA-256 ${hash}` : 'Hubo una interrupción. Esta toma no cuenta como prueba de transporte aprobada.';
  article.append(title, audio, detail);
  if (complete) {
    const download = document.createElement('a'); download.href = url; download.download = `dicta-libre-toma-${clipCount}.wav`; download.textContent = 'Descargar WAV sintético'; article.append(download);
  }
  $('recordings').prepend(article); clipURLs.push({ url, article });
  while (clipURLs.length > 5) { const old = clipURLs.shift(); old.article.remove(); URL.revokeObjectURL(old.url); }
}
function interrupted(reason) {
  if (current) { latestTrace.status = 'incomplete'; latestTrace.reason = reason; renderMetrics(); addClip(current, false); current = null; }
  displayIdle(); status(reason, 'error'); $('record-help').textContent = 'La toma se interrumpió. Inicia otra desde el teléfono.';
}
async function complete(m) {
  const receivedEnd=performance.now();
  const recording = current, epoch = sessionEpoch;
  if (!recording || recording.id !== m.id) return;
  $('record-state').textContent = 'VERIFICANDO';
  try {
    const hashStart = performance.now();
    const hash = await sha256(recording.parts);
    if (epoch !== sessionEpoch || current !== recording) return;
    if (recording.frames !== m.frames || recording.samples !== m.samples || hash !== m.hash) throw new Error('El audio recibido no coincide con el original.');
    latestTrace.stage('pcHashMs', performance.now() - hashStart); latestTrace.status = 'verified'; Object.assign(latestTrace.counters, m.counters); renderMetrics();
    client.send({ type: 'verified', id: recording.id, hash });
    addClip(recording, true, hash); current = null; displayIdle();
    if(recording.samples&&location.pathname==='/live')window.dispatchEvent(new CustomEvent('dicta-take',{detail:{recordingId:recording.id,blob:wavBlob(recording.parts,recording.rate),stopStamp:m.stopStamp,receivedEnd,trace:latestTrace,stamp:()=>client?.clock.stamp(),renderMetrics}}));
    status(m.samples ? 'Audio recibido completo. Escucha la toma y comprueba el inicio y el final.' : 'La toma quedó vacía. Mantén pulsado mientras hablas.', m.samples ? 'success' : '');
    $('record-help').textContent = 'Listo para recibir la siguiente toma.';
  } catch (error) { client?.send({ type: 'abort' }); interrupted(error.message); }
}
function onMessage(m) {
  if (m instanceof ArrayBuffer) {
    const arrivedAt = performance.now(), receivedStamp = client.clock.stamp();
    if (!current) throw new Error('Audio inesperado.');
    const frame = decodeChunk(m);
    if (frame.recordingId !== current.id || frame.sequence !== current.frames) throw new Error('Secuencia incorrecta.');
    const bytes = frame.pcm.slice(); current.parts.push(bytes); current.frames++; current.samples += frame.samples;
    const timing = pendingTiming?.sequence === frame.sequence ? pendingTiming : null; pendingTiming = null;
    const estimate = arrivalEstimate(timing?.sent, receivedStamp);
    latestTrace.block(frame.sequence, { bytes: m.byteLength, bufferMs: frame.samples / current.rate * 1000,
      relayMs: timing?.relayMs, queueBytes: timing?.queueBytes, rawEstimateMs: estimate?.ms ?? null,
      sendToPcEstimateMs: estimate?.usable ? estimate.ms : null, uncertaintyMs: estimate?.uncertaintyMs ?? null,
      interarrivalMs: previousArrival == null ? null : arrivedAt - previousArrival });
    previousArrival = arrivedAt; renderMetrics();
    const view = new DataView(bytes.buffer); let power = 0;
    for (let i = 0; i < frame.samples; i++) power += (view.getInt16(i * 2, true) / 32768) ** 2;
    $('level').value = Math.min(1, Math.sqrt(power / frame.samples) * 4);
    $('duration').textContent = clock(current.samples, current.rate); $('frames').textContent = current.frames;
    client.send({ type: 'receipt', id: current.id, sequence: frame.sequence }); return;
  }
  switch (m.type) {
    case 'block_timing': if (current?.id === m.id) pendingTiming = m; break;
    case 'sender_metrics': {
      const trace = traces.get(m.id); if (!trace) break;
      for (const [key, value] of Object.entries(m.stages)) trace.stage(key, value);
      if (m.sequence != null) trace.block(m.sequence, { ackRoundTripMs: m.ackRoundTripMs });
      renderMetrics(); break;
    }
    case 'created': {
      $('pairing').hidden = false; $('close').hidden = false; $('code').textContent = m.code;
      const link = m.token ? `${mobileOrigin}/mobile#qr=${m.token}` : `${mobileOrigin}/mobile#${m.code}`;
      const qr = window.qrcode(0, 'M'); qr.addData(link); qr.make(); $('qr').innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
      $('phone-link').href = link;
      $('copy-link').onclick = async () => {
        try { await navigator.clipboard.writeText(link); status('Enlace copiado. Ábrelo en el teléfono.'); }
        catch { status('No se pudo copiar. Usa el QR o el código de la sesión.', 'error'); }
      };
      const update = () => { $('expiry').textContent = `Vence en ${Math.max(0, Math.ceil((m.expires - Date.now()) / 1000))} s`; };
      update(); pairingTimer = setInterval(update, 1000);
      status(m.token ? 'Escanea el QR para conectar directamente. Con el código manual confirmarás el número.' : 'Servidor anterior: el QR aún requiere confirmación hasta reiniciar la demo.'); break;
    }
    case 'pending': clearInterval(pairingTimer); $('pairing').hidden = true; $('confirm-panel').hidden = false; $('confirm-code').textContent = m.confirm; status('Un teléfono solicita conexión. Comprueba el número antes de confirmar.'); break;
    case 'pairing_metrics': showPairing(m.pairing); break;
    case 'paired': showPairing(m.pairing); clearInterval(pairingTimer); $('pairing').hidden = true; $('confirm-panel').hidden = true; $('paired').hidden = false; status('Conectados. Prepara el micrófono en el teléfono.', 'success'); break;
    case 'start':
      latestTrace = new RecordingMetrics(m.id, m.rate, m.source, m.mode); traces.set(m.id, latestTrace);
      while (traces.size > 5) traces.delete(traces.keys().next().value);
      previousArrival = null; pendingTiming = null; renderMetrics();
      current = { id: m.id, rate: m.rate, mode: m.mode, source: m.source, parts: [], samples: 0, frames: 0 };
      document.body.classList.add('receiving'); $('record-state').textContent = 'RECIBIENDO'; $('record-state').classList.add('active');
      $('duration').textContent = '00:00'; $('frames').textContent = '0'; $('format').textContent = `${m.rate / 1000} kHz · mono`;
      $('record-help').textContent = 'Recibiendo audio mientras dictas. Reproducción disponible al detener.'; status('Grabación en curso.'); break;
    case 'end': void complete(m); break;
    case 'aborted': if (latestTrace && m.id === latestTrace.id) Object.assign(latestTrace.counters, m.counters); interrupted(m.reason); break;
    case 'error': status(m.message, 'error'); break;
    case 'closed': interrupted(m.reason); break;
  }
}
$('create').onclick = () => {
  if (client) return;
  window.dispatchEvent(new Event('dicta-new-session'));
  for (const clip of clipURLs.splice(0)) { clip.article.remove(); URL.revokeObjectURL(clip.url); }
  clipCount = 0; traces.clear(); latestTrace = null; $('metrics-export').disabled = true; pairingMetrics = null; $('pairing-export').disabled = true; $('pairing-times').textContent = 'Emparejamiento pendiente.';
  sessionEpoch++; $('create').disabled = true; status('Creando sesión…');
  client = new RelayClient(onMessage, () => {
    sessionEpoch++; clearInterval(pairingTimer);
    if (current) interrupted('Conexión cerrada. La grabación quedó incompleta.');
    else status('Sesión cerrada. Puedes crear una nueva.');
    client = null; $('create').disabled = false;
    for (const id of ['pairing', 'confirm-panel', 'paired', 'close']) $(id).hidden = true;
  });
  client.connect({ type: 'create' });
};
$('approve').onclick = () => client?.send({ type: 'approve' });
$('close').onclick = () => { client?.send({ type: 'close' }); client?.close(); };
window.addEventListener('pagehide', () => client?.close());
