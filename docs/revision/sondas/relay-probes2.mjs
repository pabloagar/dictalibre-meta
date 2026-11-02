import { once } from 'node:events';
import { createHash } from 'node:crypto';
import WebSocket from 'ws';
import { createRelay } from '../../../backend/server.mjs';
import { encodeChunk } from '../../../apps/shared/protocol.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function env(opts) {
  const relay = createRelay(opts); relay.server.listen(0, '127.0.0.1'); await once(relay.server, 'listening');
  const origin = `http://127.0.0.1:${relay.server.address().port}`;
  async function peer() {
    const ws = new WebSocket(origin.replace('http', 'ws') + '/ws', { origin }); const log = [];
    ws.on('message', (d, b) => log.push(b ? { binary: d } : JSON.parse(d))); await once(ws, 'open');
    return { ws, log, send: m => ws.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)) };
  }
  const pc = await peer(); pc.send({ type: 'create' }); await sleep(30);
  const created = pc.log.find(m => m.type === 'created');
  const phone = await peer(); phone.send({ type: 'join_qr', token: created.token }); await sleep(30);
  return { relay, pc, phone };
}
const pcm = n => Int16Array.from({ length: n }, () => 100);
const types = log => log.map(m => m.binary ? 'BIN' : m.type + (m.message ? `(${m.message})` : m.reason ? `(${m.reason})` : '') + (m.id != null ? `#${m.id}` : ''));
const res = {};
{ // 101.ª toma, a ritmo humano (sin exceder 80 msg/s)
  const { relay, pc, phone } = await env(); const h = createHash('sha256').digest('hex');
  for (let id = 1; id <= 100; id++) {
    phone.send({ type: 'start', id, rate: 48000, mode: 'hold' }); await sleep(15);
    phone.send({ type: 'end', id, frames: 0, samples: 0, hash: h }); await sleep(15);
    pc.send({ type: 'verified', id, hash: h }); await sleep(15);
  }
  const ok = phone.log.filter(m => m.type === 'verified').length;
  phone.log.length = 0; pc.log.length = 0;
  phone.send({ type: 'start', id: 101, rate: 48000, mode: 'hold' }); await sleep(30);
  phone.send(encodeChunk(101, 0, pcm(4800))); await sleep(30);
  phone.send({ type: 'end', id: 101, frames: 1, samples: 4800, hash: 'x' }); await sleep(50);
  res.take101 = { verifiedBefore: ok, phone: types(phone.log), pc: types(pc.log) };
  await relay.close();
}
{ // Ráfaga tras corte de subida ~5 s: block_timing+binario en ráfaga, PC confirma, teléfono emite sender_metrics por recibo (como mobile.js:172)
  const { relay, pc, phone } = await env(); phone.log.length = 0;
  pc.ws.on('message', (d, b) => { if (b) { const seq = d.readUInt32BE(8); pc.send({ type: 'receipt', id: 1, sequence: seq }); } });
  phone.ws.on('message', d => { try { const m = JSON.parse(d); if (m.type === 'receipt') phone.send({ type: 'sender_metrics', id: 1, stages: {}, sequence: m.sequence, ackRoundTripMs: 5000 }); } catch {} });
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' });
  await sleep(5200);
  for (let s = 0; s < 52; s++) { phone.send({ type: 'block_timing', id: 1, sequence: s, sent: null, queueBytes: 400000 }); phone.send(encodeChunk(1, s, pcm(4800))); }
  await sleep(500);
  res.burstAfterStall5s = { phone: [...new Set(types(phone.log).filter(t => !/^(ack|receipt)#1$/.test(t)))], receipts: phone.log.filter(m => m.type === 'receipt').length };
  await relay.close();
}
console.log(JSON.stringify(res, null, 1)); process.exit(0);
