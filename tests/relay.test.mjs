import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createRelay } from '../backend/server.mjs';
import { encodeChunk, decodeChunk, wavBlob } from '../apps/shared/protocol.js';

async function environment(t, options) {
  const relay = createRelay(options); relay.server.listen(0, '127.0.0.1'); await once(relay.server, 'listening');
  const origin = `http://127.0.0.1:${relay.server.address().port}`;
  t.after(() => relay.close());
  async function peer() {
    const ws = new WebSocket(origin.replace('http', 'ws') + '/ws', { origin });
    const messages = [], waiters = [];
    ws.on('message', (data, binary) => {
      const value = binary ? data : JSON.parse(data);
      const i = waiters.findIndex(w => w.type === (binary ? 'binary' : value.type));
      if (i < 0) messages.push(value);
      else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(value); }
    });
    await once(ws, 'open');
    return { ws, send: m => ws.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)),
      next(type) {
        const i = messages.findIndex(m => type === (Buffer.isBuffer(m) ? 'binary' : m.type));
        if (i >= 0) return Promise.resolve(messages.splice(i, 1)[0]);
        return new Promise((resolve, reject) => {
          const w = { type, resolve, timer: setTimeout(() => reject(new Error(`Timeout: ${type}`)), 2000) }; waiters.push(w);
        });
      }, messages };
  }
  async function pair() {
    const pc = await peer(); pc.send({ type: 'create' }); const created = await pc.next('created');
    const phone = await peer(); phone.send({ type: 'join', code: created.code });
    const a = await pc.next('pending'), b = await phone.next('pending'); assert.equal(a.confirm, b.confirm);
    pc.send({ type: 'approve' }); await pc.next('paired'); await phone.next('paired');
    return { pc, phone, code: created.code };
  }
  return { relay, origin, peer, pair };
}
const pcm = Int16Array.from({ length: 480 }, (_, i) => Math.round(Math.sin(i / 10) * 5000));
const frame = (seq = 0, id = 1, samples = pcm) => encodeChunk(id, seq, samples);
const hashOf = data => createHash('sha256').update(decodeChunk(data).pcm).digest('hex');
test('transporta mediciones asociadas al bloque y métricas finales tras verificación', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.send({ type: 'ping', echo: 100 }); const pong = await phone.next('pong');
  assert.ok(pong.serverSend >= pong.serverReceive);
  phone.send({ type: 'block_timing', id: 1, sequence: 0, sent: { serverMs: 123, uncertaintyMs: 5, ageMs: 0 }, queueBytes: 0 });
  phone.send(frame()); const timing = await pc.next('block_timing');
  assert.equal(timing.sent.serverMs, 123); assert.ok(timing.relayMs >= 0); await pc.next('binary');
  phone.send({ type: 'end', id: 1, frames: 1, samples: pcm.length, hash: hashOf(frame()), stopStamp:{serverMs:999,uncertaintyMs:8,ageMs:0} });
  const end = await pc.next('end');assert.deepEqual(end.stopStamp,{serverMs:999,uncertaintyMs:8}); pc.send({ type: 'verified', id: 1, hash: end.hash }); await phone.next('verified');
  phone.send({ type: 'sender_metrics', id: 1, stages: { stopToVerifiedMs: 40, asrRunMs: 10 }, sequence: 0, ackRoundTripMs: 20 });
  const metrics = await pc.next('sender_metrics');
  assert.deepEqual(metrics.stages, { stopToVerifiedMs: 40 }); assert.equal(metrics.ackRoundTripMs, 20);
});
test('rechaza telemetría de un bloque fuera de secuencia', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.send({ type: 'block_timing', id: 1, sequence: 9, sent: null, queueBytes: 0 });
  assert.match((await pc.next('aborted')).reason, /Telemetría/);
});
async function start(pc, phone) { phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' }); await pc.next('start'); }

test('audio de extremo a extremo, ACK del PC y hash idéntico; no se retiene PCM en servidor', async t => {
  const { pair, relay } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  const data = frame(); phone.send(data); const received = await pc.next('binary'); assert.deepEqual(received, Buffer.from(data)); await phone.next('ack');
  pc.send({ type: 'receipt', id: 1, sequence: 0 }); assert.equal((await phone.next('receipt')).sequence, 0);
  phone.send({ type: 'end', id: 1, frames: 1, samples: pcm.length, hash: hashOf(data) }); const end = await pc.next('end'); assert.equal(end.hash, hashOf(data));
  pc.send({ type: 'verified', id: 1, hash: end.hash }); await phone.next('verified');
  assert.equal([...relay.sessions.values()][0].recording, null);
});
test('duplicado idéntico se confirma sin reenviar; audio posterior conserva orden', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.send(frame()); await pc.next('binary'); await phone.next('ack');
  phone.send(frame()); assert.equal((await phone.next('ack')).duplicate, true);
  phone.send(frame(1)); assert.equal(decodeChunk(await pc.next('binary')).sequence, 1);
});
test('duplicado modificado aborta y avisa a ambos', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.send(frame()); await pc.next('binary');
  phone.send(frame(0, 1, new Int16Array(480))); assert.match((await pc.next('aborted')).reason, /diferente/); await phone.next('aborted');
});
test('un hueco de secuencia no se oculta', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.send(frame(1)); assert.match((await pc.next('aborted')).reason, /Falta/);
});
test('audio sin aprobación no pasa al PC', async t => {
  const { peer } = await environment(t); const pc = await peer(); pc.send({ type: 'create' }); const { code } = await pc.next('created');
  const phone = await peer(); phone.send({ type: 'join', code }); await phone.next('pending'); phone.send(frame());
  assert.match((await phone.next('error')).message, /fuera/); assert.equal(pc.messages.some(Buffer.isBuffer), false);
});
test('un código se consume al vincular y no admite otro teléfono', async t => {
  const { pair, peer } = await environment(t); const { code } = await pair(); const other = await peer(); other.send({ type: 'join', code });
  assert.match((await other.next('error')).message, /inválido/);
});
test('código vencido rechazado', async t => {
  const { peer } = await environment(t, { pairTTL: -1 }); const pc = await peer(); pc.send({ type: 'create' }); const { code } = await pc.next('created');
  const phone = await peer(); phone.send({ type: 'join', code }); assert.match((await phone.next('error')).message, /vencido/);
});
test('hash incorrecto nunca se marca verificado', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.send(frame()); await pc.next('binary'); phone.send({ type: 'end', id: 1, frames: 1, samples: 480, hash: 'wrong' });
  assert.match((await pc.next('aborted')).reason, /integridad/);
});
test('caída del teléfono cierra la sesión y avisa al PC', async t => {
  const { pair } = await environment(t); const { pc, phone } = await pair(); await start(pc, phone);
  phone.ws.terminate(); assert.match((await pc.next('closed')).reason, /perdió/);
});
test('rechaza comandos de grabación del receptor', async t => {
  const { pair } = await environment(t); const { pc } = await pair(); pc.send({ type: 'start', id: 1, rate: 48000 }); assert.match((await pc.next('error')).message, /permitida/);
});
test('otro origen no abre WebSocket; documentos y secretos no se sirven', async t => {
  const { origin } = await environment(t);
  const socket = new WebSocket(origin.replace('http', 'ws') + '/ws', { origin: 'https://otro.example' });
  await once(socket, 'error');
  for (const path of ['/README.md', '/.env', '/backend/server.mjs']) assert.equal((await fetch(origin + path)).status, 404);
  const page = await fetch(origin); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('PCM y WAV preservan muestras, frecuencia, canales y longitud', async () => {
  const input = new Int16Array([-32768, -1, 0, 1, 32767]); const encoded = encodeChunk(123, 2, input); const decoded = decodeChunk(encoded);
  assert.equal(decoded.recordingId, 123); assert.equal(decoded.sequence, 2);
  const wav = new DataView(await wavBlob([decoded.pcm], 48000).arrayBuffer());
  assert.equal(wav.getUint32(24, true), 48000); assert.equal(wav.getUint16(22, true), 1); assert.equal(wav.getUint32(40, true), 10);
  for (let i = 0; i < input.length; i++) assert.equal(wav.getInt16(44 + i * 2, true), input[i]);
});

test('QR conecta sin aprobar, consume ambos accesos y exporta tiempos sin token', async t => {
  const { peer } = await environment(t);
  const pc = await peer(); pc.send({type:'create'}); const created = await pc.next('created');
  assert.match(created.token, /^[a-f0-9]{64}$/);
  const phone = await peer(); phone.send({type:'join_qr',token:created.token});
  const result = await pc.next('paired'); await phone.next('paired');
  assert.equal(result.pairing.method,'qr'); assert.equal(result.pairing.confirmationWaitMs,null);
  assert.ok(result.pairing.requestToPairedMs >= 0);
  assert.equal(JSON.stringify(result).includes(created.token),false);
  phone.send({type:'pairing_metrics',connectToPairedMs:45});
  assert.equal((await pc.next('pairing_metrics')).pairing.mobileConnectToPairedMs,45);
  const other = await peer(); other.send({type:'join_qr',token:created.token});
  assert.match((await other.next('error')).message,/inválido/);
  other.send({type:'join',code:created.code}); assert.match((await other.next('error')).message,/inválido/);
  await start(pc,phone); phone.send(frame()); await pc.next('binary');
});
test('QR vencido o alterado no conecta', async t => {
  const { peer } = await environment(t,{pairTTL:-1});
  const pc = await peer(); pc.send({type:'create'}); const c = await pc.next('created');
  const phone = await peer();
  phone.send({type:'join_qr',token:c.token}); assert.match((await phone.next('error')).message,/vencido/);
  phone.send({type:'join_qr',token:'abc'}); assert.match((await phone.next('error')).message,/inválido/);
});
test('manual conserva confirmación y anula el QR incluso antes de aprobar', async t => {
  const { peer } = await environment(t);
  const pc=await peer(); pc.send({type:'create'}); const c=await pc.next('created');
  const phone=await peer(); phone.send({type:'join',code:c.code}); await phone.next('pending'); await pc.next('pending');
  const other=await peer(); other.send({type:'join_qr',token:c.token}); await other.next('error');
  phone.send({type:'approve'}); assert.match((await phone.next('error')).message,/confirmación/);
  pc.send({type:'approve'}); const paired=await pc.next('paired');
  assert.equal(paired.pairing.method,'manual'); assert.ok(paired.pairing.confirmationWaitMs>=0);
});
