// Sondas de solo lectura contra createRelay() en loopback. No modifica el repo.
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import WebSocket from 'ws';
import { createRelay } from '../../../backend/server.mjs';
import { encodeChunk } from '../../../apps/shared/protocol.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function env(opts) {
  const relay = createRelay(opts); relay.server.listen(0, '127.0.0.1'); await once(relay.server, 'listening');
  const origin = `http://127.0.0.1:${relay.server.address().port}`;
  async function peer(o = origin) {
    const ws = new WebSocket(origin.replace('http', 'ws') + '/ws', { origin: o });
    const log = [];
    ws.on('message', (d, b) => log.push(b ? { binary: d.length } : JSON.parse(d)));
    await once(ws, 'open');
    return { ws, log, send: m => ws.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)) };
  }
  async function pair() {
    const pc = await peer(); pc.send({ type: 'create' }); await sleep(30);
    const created = pc.log.find(m => m.type === 'created');
    const phone = await peer(); phone.send({ type: 'join_qr', token: created.token }); await sleep(30);
    return { pc, phone };
  }
  return { relay, origin, peer, pair };
}
const pcm = (n, v = 100) => Int16Array.from({ length: n }, () => v);
const types = log => log.map(m => m.binary ? 'BIN' : m.type + (m.message ? `(${m.message})` : m.reason ? `(${m.reason})` : '') + (m.id != null ? `#${m.id}` : ''));
const results = {};

// 1. 101.ª toma: start rechazado sin 'aborted'; bloques y end rechazados
{
  const e = await env(); const { pc, phone } = await e.pair();
  for (let id = 1; id <= 100; id++) {
    phone.send({ type: 'start', id, rate: 48000, mode: 'hold' }); 
    const h = createHash('sha256').digest('hex');
    phone.send({ type: 'end', id, frames: 0, samples: 0, hash: h });
    await sleep(2);
    pc.send({ type: 'verified', id, hash: h }); await sleep(2);
  }
  await sleep(100); phone.log.length = 0; pc.log.length = 0;
  phone.send({ type: 'start', id: 101, rate: 48000, mode: 'hold' });
  phone.send(encodeChunk(101, 0, pcm(4800)));
  phone.send({ type: 'end', id: 101, frames: 1, samples: 4800, hash: 'x' });
  await sleep(100);
  results.take101 = { phone: types(phone.log), pc: types(pc.log) };
  await e.relay.close();
}
// 2. Cubeta de intentos compartida: 20 joins fallidos desde loopback bloquean create legítimo de otro socket
{
  const e = await env(); const attacker = await e.peer();
  for (let i = 0; i < 20; i++) attacker.send({ type: 'join', code: '0000000000' });
  await sleep(100);
  const victim = await e.peer(); victim.send({ type: 'create' }); await sleep(100);
  results.sharedBucket = { attackerErrors: attacker.log.length, victim: types(victim.log) };
  await e.relay.close();
}
// 3. Ráfaga inicial >2 s (simula start retrasado por la red): aborta por "demasiado rápido"
{
  const e = await env(); const { pc, phone } = await e.pair();
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' });
  for (let s = 0; s < 25; s++) phone.send(encodeChunk(1, s, pcm(4800)));
  await sleep(150);
  results.initialBurst2500ms = { phone: [...new Set(types(phone.log).filter(t => t !== 'ack#1'))], acks: phone.log.filter(m => m.type === 'ack').length };
  await e.relay.close();
}
// 4. Abort del teléfono + start inmediato: el relay envía aborted#1 DESPUÉS de que el teléfono ya inició #2 localmente
{
  const e = await env(); const { pc, phone } = await e.pair(); phone.log.length = 0;
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' }); phone.send(encodeChunk(1, 0, pcm(4800)));
  phone.send({ type: 'abort' }); phone.send({ type: 'start', id: 2, rate: 48000, mode: 'hold' });
  await sleep(100);
  results.abortThenStart = { phoneReceives: types(phone.log), pc: types(pc.log), serverRecording: [...e.relay.sessions.values()][0].recording?.id ?? null };
  await e.relay.close();
}
// 5. Bloques tardíos tras abort del servidor (p. ej. timeout/backpressure): cada uno produce 'error' que pisa el motivo
{
  const e = await env(); const { pc, phone } = await e.pair(); phone.log.length = 0;
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' }); phone.send(encodeChunk(1, 0, pcm(4800)));
  pc.send({ type: 'abort' }); await sleep(20);
  for (let s = 1; s < 4; s++) phone.send(encodeChunk(1, s, pcm(4800)));
  await sleep(80);
  results.lateChunks = types(phone.log);
  await e.relay.close();
}
// 6. Vencimiento de sesión durante toma: sólo 'closed', sin aviso previo
{
  const e = await env({ sessionTTL: 300 }); const { pc, phone } = await e.pair(); phone.log.length = 0; pc.log.length = 0;
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' });
  results.sessionTTLNote = 'timer del relay corre cada 10 s; esperando hasta 10,5 s';
  const t0 = Date.now();
  while (Date.now() - t0 < 10500 && !pc.log.some(m => m.type === 'closed')) await sleep(100);
  results.sessionExpiry = { pc: types(pc.log), phone: types(phone.log), detectedAfterMs: Date.now() - t0 };
  await e.relay.close();
}
// 7. maxPayload: bloque binario > 32768 B
{
  const e = await env(); const { pc, phone } = await e.pair(); phone.log.length = 0;
  phone.send({ type: 'start', id: 1, rate: 96000, mode: 'hold' });
  const [code] = await Promise.all([new Promise(r => phone.ws.on('close', c => r(c))), Promise.resolve(phone.send(encodeChunk(1, 0, pcm(16400))))]);
  await sleep(50);
  results.maxPayload = { closeCode: code, pc: types(pc.log) };
  await e.relay.close();
}
// 8. HTTP: traversal, métodos, cabeceras
{
  const e = await env();
  const out = {};
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/apps/mobile/mobile.js', '/.env', '/mobile.js?x=1', '/mobile/']) {
    const r = await fetch(e.origin + p); out[p] = r.status;
  }
  const r = await fetch(e.origin + '/mobile');
  out.headers = Object.fromEntries([...r.headers].filter(([k]) => !['date', 'connection', 'keep-alive', 'transfer-encoding', 'content-length'].includes(k)));
  out.post = (await fetch(e.origin + '/ws', { method: 'POST' })).status;
  // origen externo
  const ws = new WebSocket(e.origin.replace('http', 'ws') + '/ws', { origin: 'https://evil.example' });
  out.foreignOrigin = await new Promise(r => { ws.on('open', () => r('open')); ws.on('error', er => r('rejected: ' + er.message)); });
  const ws2 = new WebSocket(e.origin.replace('http', 'ws') + '/ws');
  out.noOrigin = await new Promise(r => { ws2.on('open', () => r('open')); ws2.on('error', er => r('rejected: ' + er.message)); });
  results.http = out;
  await e.relay.close();
}
// 9. Sockets sin sesión: tope de 90 y retención
{
  const e = await env(); const socks = [];
  for (let i = 0; i < 90; i++) socks.push(await e.peer());
  const extra = new WebSocket(e.origin.replace('http', 'ws') + '/ws', { origin: e.origin });
  results.socketCap = await new Promise(r => { extra.on('open', () => r('open')); extra.on('error', er => r('rejected: ' + er.message)); });
  await e.relay.close();
}
console.log(JSON.stringify(results, null, 1));
process.exit(0);
