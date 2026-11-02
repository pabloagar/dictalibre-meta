// Microbenchmarks en Node del contenedor (NO es S25 Ultra ni Chrome Android). Mediana de N repeticiones.
import { encodeChunk, sha256, joinBytes } from '../../../apps/shared/protocol.js';
import { RecordingMetrics } from '../../../apps/shared/metrics.js';
import { StreamResampler } from '../../../backend/stream-audio.mjs';
const med = a => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(3); };
const time = (fn, n) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); fn(i); t.push(performance.now() - a); } return med(t); };
const pcm = Int16Array.from({ length: 4800 }, (_, i) => Math.round(Math.sin(i / 10) * 8000));
const r = { node: process.version };
for (let i = 0; i < 200; i++) encodeChunk(1, i, pcm); // calentamiento
r.encodeChunk4800_ms = time(i => encodeChunk(1, i, pcm), 500);
r.encodeAlt_setLE_ms = time(() => { const out = new ArrayBuffer(16 + pcm.byteLength); new Uint8Array(out, 16).set(new Uint8Array(pcm.buffer)); return out; }, 500);
// Resumen de métricas tras N bloques (renderMetrics llama summary() por bloque y por sender_metrics)
for (const n of [100, 600, 1800]) {
  const t = new RecordingMetrics(1, 48000, 'microphone', 'hold');
  for (let s = 0; s < n; s++) t.block(s, { bytes: 9616, bufferMs: 100, relayMs: .1, queueBytes: 0, rawEstimateMs: 50 + s % 7, sendToPcEstimateMs: 50 + s % 7, uncertaintyMs: 5, interarrivalMs: 100, ackRoundTripMs: 120 + s % 11 });
  r[`summary_${n}blocks_ms`] = time(() => t.summary(), 50);
}
// Hash de la toma completa (3 min, 48 kHz): joinBytes + WebCrypto
const parts = Array.from({ length: 1800 }, () => new Uint8Array(9600));
const ts = []; for (let i = 0; i < 5; i++) { const a = performance.now(); await sha256(parts); ts.push(performance.now() - a); }
r.sha256_3min48k_ms = med(ts); r.sha256_input_bytes = 1800 * 9600;
// Resampler Muse: costo por 1 s de audio a 48 kHz y 44,1 kHz, empujado en bloques de 100 ms
for (const rate of [48000, 44100]) {
  const block = Buffer.alloc(rate / 10 * 2); for (let i = 0; i < rate / 10; i++) block.writeInt16LE(Math.round(Math.sin(i / 7) * 5000), i * 2);
  const reps = []; for (let k = 0; k < 5; k++) { const rs = new StreamResampler(rate); const a = performance.now(); for (let i = 0; i < 10; i++) rs.push(block); reps.push(performance.now() - a); }
  r[`resampler_1s_${rate}_ms`] = med(reps);
}
console.log(JSON.stringify(r, null, 1));
