// Explicit synthetic-only probe of a running relay. No microphone or patient data.
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { encodeChunk, decodeChunk } from '../apps/shared/protocol.js';
const origin = new URL(process.argv[2] || 'http://127.0.0.1:8787').origin;
const sockets = [];
async function peer() {
  const ws = new WebSocket(origin.replace(/^http/, 'ws') + '/ws', { origin }); sockets.push(ws);
  const queue = [], waiting = [];
  ws.on('message', (data, binary) => {
    const m = binary ? data : JSON.parse(data); const type = binary ? 'binary' : m.type;
    const i = waiting.findIndex(w => w.type === type);
    if (i < 0) queue.push({ type, m }); else { const w = waiting.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
  });
  await once(ws, 'open');
  return { send: m => ws.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)), next(type) {
    const i = queue.findIndex(m => m.type === type);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0].m);
    return new Promise((resolve, reject) => waiting.push({ type, resolve, timer: setTimeout(() => reject(new Error(`Timeout ${type}`)), 10_000) }));
  } };
}
try {
  const response = await fetch(origin + '/health'); assert.equal(response.status, 200);
  const pc = await peer(); pc.send({ type: 'create' }); const session = await pc.next('created');
  const phone = await peer(); phone.send({ type: 'join', code: session.code });
  assert.equal((await pc.next('pending')).confirm, (await phone.next('pending')).confirm);
  pc.send({ type: 'approve' }); await pc.next('paired'); await phone.next('paired');
  phone.send({ type: 'start', id: 1, rate: 16000, mode: 'toggle', source: 'tone' }); await pc.next('start');
  const inputHash = createHash('sha256'), outputHash = createHash('sha256'); let samples = 0;
  for (let sequence = 0; sequence < 10; sequence++) {
    const pcm = Int16Array.from({ length: 1600 }, (_, i) => Math.round(Math.sin(2 * Math.PI * 440 * (i + sequence * 1600) / 16000) * 4000));
    const frame = encodeChunk(1, sequence, pcm); inputHash.update(decodeChunk(frame).pcm); phone.send(frame);
    const arrived = decodeChunk(await pc.next('binary')); assert.equal(arrived.sequence, sequence);
    outputHash.update(arrived.pcm); samples += arrived.samples;
    pc.send({ type: 'receipt', id: 1, sequence }); await phone.next('receipt'); await phone.next('ack');
  }
  const hash = inputHash.digest('hex'); assert.equal(hash, outputHash.digest('hex'));
  phone.send({ type: 'end', id: 1, frames: 10, samples, hash }); assert.equal((await pc.next('end')).hash, hash);
  pc.send({ type: 'verified', id: 1, hash }); await phone.next('verified');
  console.log(JSON.stringify({ result: 'PASS', origin, frames: 10, samples, sampleRate: 16000, sha256: hash,
    scope: 'Synthetic clients through public HTTPS/WSS; not a physical phone or mobile-network test', utc: new Date().toISOString() }, null, 2));
  pc.send({ type: 'close' });
} finally { for (const ws of sockets) ws.close(); }
