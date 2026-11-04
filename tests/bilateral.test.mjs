import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { Window } from 'happy-dom';
import { SOUNDS, DEFAULTS, validateConfig, renderStereo, analyze, encodeWav } from '../apps/bilateral/synth.js';
import { mountGenerator } from '../apps/bilateral/app.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('bilateral: six distinct procedural sounds, stereo PCM16, finite/non-silent/unclipped and exact duration', () => {
  const hashes = new Set();
  for (const sound of SOUNDS) {
    const audio = renderStereo({ sound: sound.id, durationSec: 5, intervalSec: 0.2, volume: 0.5 }, 16000);
    const stats = analyze(audio), wav = encodeWav(audio), view = new DataView(wav);
    assert.equal(stats.finite, true); assert.equal(stats.silent, false); assert.equal(stats.clippedSamples, 0);
    assert.ok(stats.peak <= 0.500001); assert.equal(stats.durationSec, 5); assert.equal(audio.events, 25);
    assert.equal(view.getUint16(22, true), 2); assert.equal(view.getUint16(34, true), 16);
    assert.equal(view.getUint32(24, true), 16000); assert.equal(view.getUint32(40, true), 5 * 16000 * 4);
    assert.equal(Buffer.from(wav).subarray(0, 4).toString(), 'RIFF'); assert.equal(view.getUint32(4, true) + 8, wav.byteLength);
    assert.ok(audio.left[0] === 0); assert.ok(audio.right.at(-1) === 0); hashes.add(hash(Buffer.from(wav)));
  }
  assert.equal(hashes.size, 6);
});

test('bilateral: alternating isolated channels, reversed start, centered symmetry and deterministic noise seed', () => {
  for (const firstSide of ['left', 'right']) {
    const a = renderStereo({ sound: 'pink', durationSec: 5, intervalSec: 0.5, firstSide }, 16000);
    for (let event = 0; event < 10; event++) {
      const left = (event % 2 === 0) === (firstSide === 'left');
      const active = (left ? a.left : a.right).subarray(event * 8000, (event + 1) * 8000);
      const opposite = (left ? a.right : a.left).subarray(event * 8000, (event + 1) * 8000);
      assert.ok(active.some(v => Math.abs(v) > 0.0001)); assert.ok(opposite.every(v => v === 0));
    }
  }
  const c = { sound: 'brown', durationSec: 5, separation: 0, seed: 10 };
  const a = renderStereo(c, 16000), b = renderStereo(c, 16000), changed = renderStereo({ ...c, seed: 11 }, 16000);
  assert.deepEqual(a.left, a.right); assert.deepEqual(a.left, b.left); assert.notDeepEqual(a.left, changed.left);
  const silent = analyze(renderStereo({ volume: 0, durationSec: 5 }, 16000));
  assert.equal(silent.silent, true); assert.equal(silent.peakDbfs, null);
});

test('bilateral: rejects malformed or excessive configurations and invalid PCM instead of silently clipping', () => {
  for (const patch of [{ volume: 0.51 }, { intervalSec: 0.01 }, { durationSec: 121 }, { seed: -1 },
    { seed: 1.1 }, { separation: NaN }, { frequencyHz: '440' }, { firstSide: 'unknown' }, { sound: '__proto__' }]) {
    assert.throws(() => validateConfig(patch));
  }
  assert.throws(() => renderStereo({}, 0)); assert.throws(() => encodeWav({ left: [1.01], right: [0], sampleRate: 44100 }));
  assert.throws(() => encodeWav({ left: [NaN], right: [0], sampleRate: 44100 }));
  assert.deepEqual(validateConfig(), DEFAULTS);
});

function setup({ deferred = false } = {}) {
  const window = new Window({ url: 'http://localhost', settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
  const d = window.document; d.write(fs.readFileSync('apps/bilateral/index.html', 'utf8'));
  Object.defineProperty(d, 'hidden', { configurable: true, value: false });
  let sourcesStarted = 0, worker, resumeCount = 0, suspendCount = 0;
  const context = { currentTime: 0, state: 'running', destination: {},
    resume: async () => { resumeCount++; context.state = 'running'; }, suspend: async () => { suspendCount++; context.state = 'suspended'; },
    createBuffer: (_channels, frames) => ({ frames, copyToChannel() {} }),
    createGain: () => ({ gain: { value: 0, setTargetAtTime() {}, cancelScheduledValues() {} }, connect() {}, disconnect() {} }),
    createBufferSource: () => ({ connect() {}, disconnect() {}, stop() {}, start() { sourcesStarted++; } }),
  };
  const ui = mountGenerator({ document: d, window, makeAudioContext: () => context, makeWorker: () => {
    worker = { terminate() { this.terminated = true; }, postMessage({ config }) {
      this.complete = () => this.onmessage({ data: { left: new Float32Array(10), right: new Float32Array(10), sampleRate: 44100, config } });
      if (!deferred) queueMicrotask(() => this.complete());
    } }; return worker;
  } });
  return { window, d, ui, context, get worker() { return worker; },
    counts: () => ({ sourcesStarted, resumeCount, suspendCount }) };
}

test('bilateral UI: six options, presets and errors, playback/pause/resume, channel test and visibility pause', async () => {
  const s = setup(), { d, window, ui } = s;
  try {
    assert.equal(d.querySelectorAll('.sound').length, 6); assert.equal(s.counts().sourcesStarted, 0);
    d.querySelector('[data-sound=pink]').click(); assert.equal(ui.getConfig().sound, 'pink'); assert.equal(d.getElementById('frequency').disabled, true);
    d.getElementById('preset-name').value = 'Mi ajuste'; d.getElementById('save').click();
    assert.equal(JSON.parse(window.localStorage.getItem('bilateral-presets-v1'))[0].config.sound, 'pink');
    d.querySelector('[data-sound=bell]').click(); d.getElementById('presets').value = '0'; d.getElementById('presets').onchange(); assert.equal(ui.getConfig().sound, 'pink');
    await d.getElementById('play').onclick(); assert.equal(ui.getState(), 'playing'); assert.equal(s.counts().sourcesStarted, 1);
    await d.getElementById('play').onclick(); assert.equal(ui.getState(), 'paused');
    await d.getElementById('play').onclick(); assert.equal(ui.getState(), 'playing'); assert.equal(s.counts().sourcesStarted, 1);
    Object.defineProperty(d, 'hidden', { value: true, configurable: true }); d.dispatchEvent(new window.Event('visibilitychange'));
    assert.equal(ui.getState(), 'paused'); Object.defineProperty(d, 'hidden', { value: false, configurable: true });
    await d.getElementById('test').onclick(); assert.equal(s.counts().sourcesStarted, 2); assert.match(d.getElementById('status').textContent, /izquierda.*derecha/i);
    d.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); assert.equal(ui.getState(), 'idle');
    Object.defineProperty(window, 'localStorage', { value: { setItem() { throw Error('full'); } } });
    d.getElementById('save').click(); assert.match(d.getElementById('status').textContent, /No se pudo guardar/);
  } finally { ui.stop(); await window.happyDOM.close(); }
});

test('bilateral UI: cancelled generation cannot start audio late; zero level and invalid input stay explicit', async () => {
  const s = setup({ deferred: true }), { d, ui, window } = s;
  try {
    const pending = d.getElementById('play').onclick(); await Promise.resolve(); await Promise.resolve();
    assert.equal(ui.getState(), 'loading'); const worker = s.worker;
    d.getElementById('stop').click(); await pending; assert.equal(worker.terminated, true);
    worker.complete(); assert.equal(ui.getState(), 'idle'); assert.equal(s.counts().sourcesStarted, 0);
    ui.change({ durationSec: 500 }); assert.equal(ui.getConfig().durationSec, 30); assert.match(d.getElementById('status').textContent, /fuera de rango/);
    ui.change({ volume: 0 }); assert.equal(ui.getConfig().volume, 0);
  } finally { ui.stop(); await window.happyDOM.close(); }
});
