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
  const results=[];
  for (const method of ['qr','manual']) {
    const pc=await peer(); pc.send({type:'create'}); const c=await pc.next('created');
    assert.match(c.token ?? '',/^[a-f0-9]{64}$/, 'El servidor no entrega token QR: comprobar que se reinició el backend actualizado.');
    const phone=await peer(); const started=performance.now();
    phone.send(method==='qr'?{type:'join_qr',token:c.token}:{type:'join',code:c.code});
    if(method==='manual') {
      assert.equal((await pc.next('pending')).confirm,(await phone.next('pending')).confirm);
      phone.send({type:'start',id:1,rate:16000,mode:'hold'});
      assert.match((await phone.next('error')).message,/confirmación/);
      pc.send({type:'approve'});
    }
    const paired=await pc.next('paired'); await phone.next('paired');
    assert.equal(paired.pairing.method,method);
    assert.ok(paired.pairing.createdToPairedMs>=0);
    assert.ok(paired.pairing.requestToPairedMs>=0);
    assert.equal(method==='qr',paired.pairing.confirmationWaitMs===null);
    const elapsed=performance.now()-started;
    phone.send({type:'pairing_metrics',connectToPairedMs:elapsed});
    const measured=await pc.next('pairing_metrics');
    assert.equal(measured.pairing.mobileConnectToPairedMs,elapsed);
    assert.equal(JSON.stringify(measured).includes(c.token),false);
    const other=await peer(); other.send({type:'join_qr',token:c.token}); await other.next('error');
    results.push({method,result:'PASS',pairing:measured.pairing});
    pc.send({type:'close'});
  }
  console.log(JSON.stringify({utc:new Date().toISOString(),origin,scope:'Public WSS synthetic clients; no camera or physical phone. connectToPairedMs in this test starts before join send, not browser WebSocket open.',results},null,2));
} finally {for(const ws of sockets) ws.close();}
