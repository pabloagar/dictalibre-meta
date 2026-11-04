// SPDX-License-Identifier: MIT — Copyright (c) 2026 Pablo Agar / Dicta Libre contributors
// Standalone module. No samples, datasets, models, or runtime dependencies.
export const ENGINE_VERSION = 'bilateral-synth-1.0.0';
export const SOUNDS = Object.freeze([
  { id: 'tone', name: 'Tono suave', detail: 'Redondo y sencillo', mark: '∿' },
  { id: 'bell', name: 'Campana', detail: 'Brillante y ligera', mark: '♧' },
  { id: 'wood', name: 'Madera', detail: 'Seca y cálida', mark: '◒' },
  { id: 'click', name: 'Clic suave', detail: 'Breve y discreto', mark: '·' },
  { id: 'pink', name: 'Ruido rosa', detail: 'Textura suave', mark: '≋' },
  { id: 'brown', name: 'Ruido marrón', detail: 'Textura grave', mark: '≈' },
]);
export const DEFAULTS = Object.freeze({ sound: 'tone', intervalSec: 0.65, durationSec: 30,
  volume: 0.12, separation: 1, frequencyHz: 440, seed: 20261104, firstSide: 'left' });

export function validateConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Configuración inválida.');
  const c = Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, input[k] ?? v]));
  if (!SOUNDS.some(s => s.id === c.sound)) throw Error('Sonido desconocido.');
  for (const [key, low, high] of [['intervalSec', 0.2, 2], ['durationSec', 5, 120],
    ['volume', 0, 0.5], ['separation', 0, 1], ['frequencyHz', 120, 1200], ['seed', 0, 4294967295]]) {
    if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || c[key] < low || c[key] > high) {
      throw Error(`${key}: valor fuera de rango (${low}–${high}).`);
    }
  }
  if (!Number.isInteger(c.seed)) throw Error('La semilla debe ser un entero.');
  if (!['left', 'right'].includes(c.firstSide)) throw Error('Lado inicial inválido.');
  return c;
}

function random(seed) {
  let x = seed >>> 0 || 0x6d2b79f5;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 2147483648 - 1; };
}

export function eventGains(config, index) {
  const left = (index % 2 === 0) === (config.firstSide === 'left');
  const pan = config.separation * (left ? -1 : 1);
  const angle = (pan + 1) * Math.PI / 4;
  return [pan === 1 ? 0 : Math.cos(angle), pan === -1 ? 0 : Math.sin(angle)];
}

export function createPulse(input, sampleRate, index) {
  const c = validateConfig(input);
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw Error('Tasa de audio inválida.');
  const lengths = { tone: 0.24, bell: 0.32, wood: 0.14, click: 0.045, pink: 0.32, brown: 0.32 };
  const seconds = Math.min(lengths[c.sound], c.intervalSec * 0.72);
  const n = Math.round(seconds * sampleRate), pulse = new Float32Array(n);
  const noise = random((c.seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0);
  // Log-spaced one-pole filters approximate a pink spectrum; brown uses a leaky integral.
  const poles = [0.001, 0.01, 0.1].map(t => Math.exp(-1 / (t * sampleRate)));
  let b0 = 0, b1 = 0, b2 = 0, brown = 0, smooth = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate, phase = 2 * Math.PI * c.frequencyHz * t, white = noise();
    let v;
    if (c.sound === 'tone') v = Math.sin(phase) + 0.12 * Math.sin(phase * 2);
    if (c.sound === 'bell') v = (Math.sin(phase) + 0.35 * Math.sin(phase * 2.76) + 0.15 * Math.sin(phase * 4.07)) * Math.exp(-t * 11);
    if (c.sound === 'wood') v = (Math.sin(phase * 0.65) + 0.4 * Math.sin(phase * 1.43)) * Math.exp(-t * 32);
    if (c.sound === 'click') { smooth += 0.15 * (white - smooth); v = smooth * Math.exp(-t * 75); }
    if (c.sound === 'pink') {
      b0 = poles[0] * b0 + (1 - poles[0]) * white;
      b1 = poles[1] * b1 + (1 - poles[1]) * white;
      b2 = poles[2] * b2 + (1 - poles[2]) * white;
      v = b0 + 3.16 * b1 + 10 * b2;
    }
    if (c.sound === 'brown') { brown = Math.exp(-1 / (0.1 * sampleRate)) * brown + white * 0.015; v = brown; }
    pulse[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  const attack = Math.min(0.012 * sampleRate, n * 0.2), release = Math.min(0.035 * sampleRate, n * 0.3);
  for (let i = 0; i < n; i++) {
    const a = Math.sin(Math.min(1, i / attack) * Math.PI / 2) ** 2;
    const r = Math.sin(Math.min(1, (n - 1 - i) / release) * Math.PI / 2) ** 2;
    pulse[i] = peak ? pulse[i] / peak * a * r * c.volume : 0;
  }
  return pulse;
}

export function renderStereo(input, sampleRate = 44100) {
  const config = validateConfig(input);
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw Error('Tasa de audio inválida.');
  const frames = Math.round(config.durationSec * sampleRate);
  const left = new Float32Array(frames), right = new Float32Array(frames);
  let events = 0;
  for (let index = 0; ; index++) {
    const start = Math.round(index * config.intervalSec * sampleRate);
    if (start >= frames) break;
    const pulse = createPulse(config, sampleRate, index), gains = eventGains(config, index);
    for (let j = 0; j < pulse.length && start + j < frames; j++) {
      const fade = Math.min(1, (frames - 1 - start - j) / (sampleRate * 0.012));
      left[start + j] = pulse[j] * gains[0] * fade;
      right[start + j] = pulse[j] * gains[1] * fade;
    }
    events++;
  }
  return { left, right, sampleRate, config, events };
}

export function analyze({ left, right, sampleRate }) {
  let peak = 0, squares = 0, finite = true, clipped = 0;
  for (let i = 0; i < left.length; i++) for (const v of [left[i], right[i]]) {
    if (!Number.isFinite(v)) finite = false;
    peak = Math.max(peak, Math.abs(v)); squares += v * v;
    if (Math.abs(v) >= 1) clipped++;
  }
  return { frames: left.length, channels: 2, sampleRate, durationSec: left.length / sampleRate,
    finite, silent: peak === 0, peak, peakDbfs: peak ? 20 * Math.log10(peak) : null,
    rms: Math.sqrt(squares / (left.length * 2)), clippedSamples: clipped };
}

export function encodeWav({ left, right, sampleRate }) {
  if (left.length !== right.length) throw Error('Canales de distinta longitud.');
  const buffer = new ArrayBuffer(44 + left.length * 4), view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, left.length * 4, true);
  let offset = 44;
  for (let i = 0; i < left.length; i++) for (const v of [left[i], right[i]]) {
    if (!Number.isFinite(v) || Math.abs(v) > 1) throw Error('Audio inválido o fuera de rango.');
    view.setInt16(offset, Math.round(v * (v < 0 ? 32768 : 32767)), true); offset += 2;
  }
  return buffer;
}
