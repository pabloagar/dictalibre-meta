import { once } from 'node:events';
import WebSocket from 'ws';
import { createRelay } from '../../../backend/server.mjs';
import { encodeChunk } from '../../../apps/shared/protocol.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function env() {
  const relay = createRelay(); relay.server.listen(0, '127.0.0.1'); await once(relay.server, 'listening');
  const origin = `http://127.0.0.1:${relay.server.address().port}`;
  async function peer() { const ws = new WebSocket(origin.replace('http', 'ws') + '/ws', { origin }); const log = [];
    ws.on('message', (d, b) => log.push(b ? { binary: d } : JSON.parse(d))); await once(ws, 'open');
    return { ws, log, send: m => ws.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)) }; }
  const pc = await peer(); pc.send({ type: 'create' }); await sleep(30);
  const created = pc.log.find(m => m.type === 'created');
  const phone = await peer(); phone.send({ type: 'join_qr', token: created.token }); await sleep(30);
  return { relay, pc, phone };
}
const pcm = n => Int16Array.from({ length: n }, () => 100);
const res = {};
for (const stallMs of [2000, 3000, 4000, 4500]) {
  const { relay, pc, phone } = await env(); phone.log.length = 0;
  pc.ws.on('message', (d, b) => { if (b) pc.send({ type: 'receipt', id: 1, sequence: d.readUInt32BE(8) }); });
  phone.ws.on('message', d => { try { const m = JSON.parse(d); if (m.type === 'receipt') phone.send({ type: 'sender_metrics', id: 1, stages: {}, sequence: m.sequence, ackRoundTripMs: 1 }); } catch {} });
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' }); await sleep(stallMs);
  const n = Math.floor(stallMs / 100);
  for (let s = 0; s < n; s++) { phone.send({ type: 'block_timing', id: 1, sequence: s, sent: null, queueBytes: 0 }); phone.send(encodeChunk(1, s, pcm(4800))); }
  await sleep(400);
  res[`stall_${stallMs}ms`] = phone.log.find(m => m.type === 'aborted')?.reason ?? 'sin abort';
  await relay.close();
}
{ // cascada: abort + start#2 inmediato; luego start#3
  const { relay, pc, phone } = await env(); phone.log.length = 0;
  phone.send({ type: 'start', id: 1, rate: 48000, mode: 'hold' }); phone.send({ type: 'abort' }); phone.send({ type: 'start', id: 2, rate: 48000, mode: 'hold' });
  await sleep(50); phone.send({ type: 'start', id: 3, rate: 48000, mode: 'hold' }); await sleep(50);
  res.cascade = phone.log.map(m => m.type + (m.id ? '#' + m.id : '') + (m.message ? `(${m.message})` : ''));
  await relay.close();
}
console.log(JSON.stringify(res, null, 1)); process.exit(0);
