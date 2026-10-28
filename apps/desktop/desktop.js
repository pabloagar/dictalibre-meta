import { $, RelayClient, status, clock } from '/shared/client.js';
import { decodeChunk, sha256, wavBlob } from '/shared/protocol.js';

let client, current, sessionEpoch = 0, pairingTimer, clipCount = 0;
const clipURLs = [];
$('consent').onchange = () => { $('create').disabled = !$('consent').checked || !!client; };
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
  while (clipURLs.length > 3) { const old = clipURLs.shift(); old.article.remove(); URL.revokeObjectURL(old.url); }
}
function interrupted(reason) {
  if (current) { addClip(current, false); current = null; }
  displayIdle(); status(reason, 'error'); $('record-help').textContent = 'La toma se interrumpió. Inicia otra desde el teléfono.';
}
async function complete(m) {
  const recording = current, epoch = sessionEpoch;
  if (!recording || recording.id !== m.id) return;
  $('record-state').textContent = 'VERIFICANDO';
  try {
    const hash = await sha256(recording.parts);
    if (epoch !== sessionEpoch || current !== recording) return;
    if (recording.frames !== m.frames || recording.samples !== m.samples || hash !== m.hash) throw new Error('El audio recibido no coincide con el original.');
    client.send({ type: 'verified', id: recording.id, hash });
    addClip(recording, true, hash); current = null; displayIdle();
    status(m.samples ? 'Audio recibido completo. Escucha la toma y comprueba el inicio y el final.' : 'La toma quedó vacía. Mantén pulsado mientras hablas.', m.samples ? 'success' : '');
    $('record-help').textContent = 'Listo para recibir la siguiente toma.';
  } catch (error) { client?.send({ type: 'abort' }); interrupted(error.message); }
}
function onMessage(m) {
  if (m instanceof ArrayBuffer) {
    if (!current) throw new Error('Audio inesperado.');
    const frame = decodeChunk(m);
    if (frame.recordingId !== current.id || frame.sequence !== current.frames) throw new Error('Secuencia incorrecta.');
    const bytes = frame.pcm.slice(); current.parts.push(bytes); current.frames++; current.samples += frame.samples;
    const view = new DataView(bytes.buffer); let power = 0;
    for (let i = 0; i < frame.samples; i++) power += (view.getInt16(i * 2, true) / 32768) ** 2;
    $('level').value = Math.min(1, Math.sqrt(power / frame.samples) * 4);
    $('duration').textContent = clock(current.samples, current.rate); $('frames').textContent = current.frames;
    client.send({ type: 'receipt', id: current.id, sequence: frame.sequence }); return;
  }
  switch (m.type) {
    case 'created': {
      $('pairing').hidden = false; $('close').hidden = false; $('code').textContent = m.code;
      const link = `${location.origin}/mobile#${m.code}`;
      const qr = window.qrcode(0, 'M'); qr.addData(link); qr.make(); $('qr').innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
      $('phone-link').href = link;
      $('copy-link').onclick = async () => {
        try { await navigator.clipboard.writeText(link); status('Enlace copiado. Ábrelo en el teléfono.'); }
        catch { status('No se pudo copiar. Usa el QR o el código de la sesión.', 'error'); }
      };
      const update = () => { $('expiry').textContent = `Vence en ${Math.max(0, Math.ceil((m.expires - Date.now()) / 1000))} s`; };
      update(); pairingTimer = setInterval(update, 1000);
      status('Escanea el QR con tu teléfono o abre el enlace e introduce el código.'); break;
    }
    case 'pending': clearInterval(pairingTimer); $('pairing').hidden = true; $('confirm-panel').hidden = false; $('confirm-code').textContent = m.confirm; status('Un teléfono solicita conexión. Comprueba el número antes de confirmar.'); break;
    case 'paired': $('confirm-panel').hidden = true; $('paired').hidden = false; status('Conectados. Prepara el micrófono en el teléfono.', 'success'); break;
    case 'start':
      current = { id: m.id, rate: m.rate, mode: m.mode, source: m.source, parts: [], samples: 0, frames: 0 };
      document.body.classList.add('receiving'); $('record-state').textContent = 'RECIBIENDO'; $('record-state').classList.add('active');
      $('duration').textContent = '00:00'; $('frames').textContent = '0'; $('format').textContent = `${m.rate / 1000} kHz · mono`;
      $('record-help').textContent = 'Recibiendo audio mientras dictas. Reproducción disponible al detener.'; status('Grabación en curso.'); break;
    case 'end': void complete(m); break;
    case 'aborted': interrupted(m.reason); break;
    case 'error': status(m.message, 'error'); break;
    case 'closed': interrupted(m.reason); break;
  }
}
$('create').onclick = () => {
  if (client || !$('consent').checked) return;
  for (const clip of clipURLs.splice(0)) { clip.article.remove(); URL.revokeObjectURL(clip.url); }
  clipCount = 0;
  sessionEpoch++; $('create').disabled = true; status('Creando sesión…');
  client = new RelayClient(onMessage, () => {
    sessionEpoch++; clearInterval(pairingTimer);
    if (current) interrupted('Conexión cerrada. La grabación quedó incompleta.');
    else status('Sesión cerrada. Puedes crear una nueva.');
    client = null; $('create').disabled = !$('consent').checked;
    for (const id of ['pairing', 'confirm-panel', 'paired', 'close']) $(id).hidden = true;
  });
  client.connect({ type: 'create' });
};
$('approve').onclick = () => client?.send({ type: 'approve' });
$('close').onclick = () => { client?.send({ type: 'close' }); client?.close(); };
window.addEventListener('pagehide', () => client?.close());
