import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { randomBytes, randomInt, randomUUID, createHash } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { decodeChunk, MAX_SECONDS } from '../apps/shared/protocol.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = new Map([
  ['/', 'apps/desktop/index.html'], ['/mobile', 'apps/mobile/index.html'],
  ['/desktop.js', 'apps/desktop/desktop.js'], ['/mobile.js', 'apps/mobile/mobile.js'],
  ['/capture-worklet.js', 'apps/mobile/capture-worklet.js'],
  ['/shared/protocol.js', 'apps/shared/protocol.js'], ['/shared/client.js', 'apps/shared/client.js'],
  ['/style.css', 'apps/shared/style.css'], ['/qr.js', 'node_modules/qrcode-generator/dist/qrcode.js'],
]);
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8' };
const ready = ws => ws?.readyState === WebSocket.OPEN;
const send = (ws, data) => { if (ready(ws)) ws.send(JSON.stringify(data)); };
const fingerprint = data => createHash('sha256').update(data).digest('hex');

export function createRelay({ publicOrigin = process.env.PUBLIC_ORIGIN, pairTTL = 120_000,
  sessionTTL = 30 * 60_000, maxSessions = 30 } = {}) {
  const sessions = new Map(), codes = new Map(), attempts = new Map();
  const headers = {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'microphone=(self), camera=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') { res.writeHead(405, headers).end(); return; }
    if (url.pathname === '/health') {
      res.writeHead(200, { ...headers, 'Content-Type': 'application/json' }).end('{"status":"ok","phase":"capture-transport"}'); return;
    }
    const file = paths.get(url.pathname);
    if (!file) { res.writeHead(404, headers).end('No encontrado'); return; }
    try {
      const content = await readFile(resolve(ROOT, file));
      res.writeHead(200, { ...headers, 'Content-Type': MIME[file.split('.').pop()] }).end(content);
    } catch { res.writeHead(500, headers).end('Recurso no disponible. Revisa la instalación.'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32768, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { socket.destroy(); return; }
    const allowed = publicOrigin ? origin.origin === publicOrigin :
      ['localhost', '127.0.0.1'].includes(origin.hostname) && origin.host === req.headers.host && origin.protocol === 'http:';
    if (!allowed || req.url !== '/ws' || wss.clients.size >= 90) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });

  function finishSession(session, reason = 'Sesión cerrada.') {
    if (!session || !sessions.has(session.id)) return;
    sessions.delete(session.id); codes.delete(session.code);
    for (const ws of [session.desktop, session.mobile]) {
      send(ws, { type: 'closed', reason });
      if (ready(ws)) ws.close(1000, 'session-ended');
    }
  }
  function abort(session, reason) {
    if (!session.recording) return;
    const id = session.recording.id;
    session.recording = null;
    for (const ws of [session.desktop, session.mobile]) send(ws, { type: 'aborted', id, reason });
  }
  function relay(session, target, payload, binary = false) {
    if (!ready(target) || target.bufferedAmount > 1_048_576) {
      abort(session, 'El receptor no puede seguir el ritmo. Grabación incompleta.'); return false;
    }
    target.send(binary ? payload : JSON.stringify(payload)); return true;
  }
  function limit(ip) {
    const now = Date.now(); let bucket = attempts.get(ip);
    if (!bucket || now - bucket.start > 60_000) attempts.set(ip, bucket = { start: now, count: 0 });
    return ++bucket.count <= 20;
  }
  wss.on('connection', (ws, req) => {
    ws.alive = true; ws.created = Date.now(); ws.messages = 0; ws.window = Date.now();
    ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('message', (data, isBinary) => {
      const session = ws.session;
      try {
        if (isBinary) {
          if (ws.role !== 'mobile' || !session?.approved || !session.recording || session.recording.ended) throw new Error('Audio fuera de una grabación activa.');
          const r = session.recording, frame = decodeChunk(data);
          if (frame.recordingId !== r.id || frame.samples > r.rate / 4) throw new Error('Formato o grabación incorrectos.');
          const hash = fingerprint(data);
          if (frame.sequence < r.next) {
            if (r.hashes.get(frame.sequence) !== hash) throw new Error('Bloque duplicado con contenido diferente.');
            send(ws, { type: 'ack', id: r.id, sequence: frame.sequence, duplicate: true }); return;
          }
          if (frame.sequence !== r.next) throw new Error('Falta un bloque o llegó fuera de orden.');
          if (r.samples + frame.samples > r.rate * MAX_SECONDS) throw new Error('Límite de tres minutos alcanzado.');
          if (r.samples + frame.samples > r.rate * (2 + (Date.now() - r.started) / 1000 * 1.5)) throw new Error('Flujo de audio demasiado rápido.');
          r.hashes.set(r.next, hash); r.next++; r.samples += frame.samples; r.digest.update(frame.pcm); r.last = Date.now();
          if (relay(session, session.desktop, data, true)) send(ws, { type: 'ack', id: r.id, sequence: frame.sequence });
          return;
        }
        if (Date.now() - ws.window > 1000) { ws.window = Date.now(); ws.messages = 0; }
        if (++ws.messages > 80 || data.byteLength > 4096) throw new Error('Demasiados mensajes.');
        const m = JSON.parse(data.toString());
        if (!m || typeof m.type !== 'string') throw new Error('Mensaje inválido.');
        if (m.type === 'ping') { send(ws, { type: 'pong', echo: m.echo }); return; }
        if (!session) {
          if (!limit(req.socket.remoteAddress)) throw new Error('Demasiados intentos. Espera un minuto.');
          if (m.type === 'create') {
            if (sessions.size >= maxSessions) throw new Error('Servidor ocupado.');
            let code;
            do { code = randomBytes(5).toString('hex').toUpperCase(); } while (codes.has(code));
            const s = { id: randomUUID(), code, desktop: ws, mobile: null, approved: false, recording: null,
              pairExpires: Date.now() + pairTTL, expires: Date.now() + sessionTTL, usedIds: new Set() };
            ws.session = s; ws.role = 'desktop'; sessions.set(s.id, s); codes.set(code, s);
            send(ws, { type: 'created', code, expires: s.pairExpires, maxSeconds: MAX_SECONDS }); return;
          }
          if (m.type === 'join') {
            const s = codes.get(String(m.code).replace(/[\s-]/g, '').toUpperCase());
            if (!s || Date.now() > s.pairExpires || s.mobile) throw new Error('Código inválido, vencido o ya utilizado.');
            codes.delete(s.code); s.mobile = ws; ws.session = s; ws.role = 'mobile';
            s.confirm = String(randomInt(1000, 10000));
            send(ws, { type: 'pending', confirm: s.confirm });
            send(s.desktop, { type: 'pending', confirm: s.confirm }); return;
          }
          throw new Error('Primero crea o une una sesión.');
        }
        if (m.type === 'close') { finishSession(session); return; }
        if (m.type === 'approve' && ws.role === 'desktop' && session.mobile && !session.approved) {
          if (Date.now() > session.pairExpires) throw new Error('Emparejamiento vencido.');
          session.approved = true;
          for (const target of [session.desktop, session.mobile]) send(target, { type: 'paired', maxSeconds: MAX_SECONDS });
          return;
        }
        if (!session.approved) throw new Error('Falta confirmación en el computador.');
        if (m.type === 'abort') { abort(session, 'Grabación interrumpida. Inicia otra explícitamente.'); return; }
        if (m.type === 'start' && ws.role === 'mobile') {
          if (session.recording) throw new Error('La grabación anterior aún no terminó.');
          if (!Number.isInteger(m.id) || m.id < 1 || m.id > 0xffffffff || session.usedIds.has(m.id) ||
              !Number.isInteger(m.rate) || m.rate < 8000 || m.rate > 96000) throw new Error('Configuración de audio inválida.');
          if (session.usedIds.size >= 100) throw new Error('Crea una sesión nueva para continuar.');
          session.usedIds.add(m.id);
          session.recording = { id: m.id, rate: m.rate, samples: 0, next: 0, hashes: new Map(),
            digest: createHash('sha256'), started: Date.now(), last: Date.now(), ended: false };
          relay(session, session.desktop, { type: 'start', id: m.id, rate: m.rate, mode: m.mode === 'hold' ? 'hold' : 'toggle', source: m.source === 'tone' ? 'tone' : 'microphone' });
          return;
        }
        const r = session.recording;
        if (m.type === 'receipt' && ws.role === 'desktop' && r && m.id === r.id) {
          if (!Number.isInteger(m.sequence) || m.sequence < 0 || m.sequence >= r.next) throw new Error('Confirmación de bloque inválida.');
          send(session.mobile, { type: 'receipt', id: r.id, sequence: m.sequence }); return;
        }
        if (m.type === 'end' && ws.role === 'mobile' && r && m.id === r.id && !r.ended) {
          r.hash = r.digest.digest('hex');
          if (m.frames !== r.next || m.samples !== r.samples || m.hash !== r.hash) throw new Error('No coincide la integridad del audio enviado.');
          r.ended = true; r.last = Date.now();
          relay(session, session.desktop, { type: 'end', id: r.id, rate: r.rate, frames: r.next, samples: r.samples, hash: r.hash }); return;
        }
        if (m.type === 'verified' && ws.role === 'desktop' && r?.ended && m.id === r.id) {
          if (m.hash !== r.hash) throw new Error('El audio del PC no coincide con el del teléfono.');
          send(session.mobile, { type: 'verified', id: r.id, samples: r.samples, hash: r.hash });
          session.recording = null; return;
        }
        throw new Error('Operación no permitida en este estado.');
      } catch (error) {
        if (session?.recording) abort(session, error.message);
        send(ws, { type: 'error', message: error.message });
      }
    });
    ws.on('close', () => { if (ws.session) finishSession(ws.session, 'Se perdió la conexión. Vuelve a emparejar los dispositivos.'); });
  });
  const timer = setInterval(() => {
    const now = Date.now();
    for (const s of sessions.values()) {
      if (now > s.expires || (!s.approved && now > s.pairExpires)) finishSession(s, 'La sesión venció. Crea una nueva.');
      else if (s.recording && now - s.recording.last > 15_000) abort(s, 'No llegó audio o confirmación a tiempo. Grabación incompleta.');
    }
    for (const [key, value] of attempts) if (now - value.start > 60_000) attempts.delete(key);
    for (const ws of wss.clients) {
      if (!ws.alive || (!ws.session && now - ws.created > 30_000)) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 10_000);
  timer.unref();
  return { server, sessions, async close() {
    clearInterval(timer);
    for (const ws of wss.clients) ws.terminate();
    await new Promise(r => wss.close(r));
    await new Promise(r => server.close(r));
  } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787), host = process.env.HOST || '127.0.0.1';
  const relay = createRelay();
  relay.server.listen(port, host, () => console.log(`Dicta Libre: ${process.env.PUBLIC_ORIGIN || `http://${host}:${port}`} · solo audio sintético`));
}
