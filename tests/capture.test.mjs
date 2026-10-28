import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../apps/mobile/capture-worklet.js', import.meta.url), 'utf8');
function capture() {
  let Processor; const messages = [];
  const sandbox = { sampleRate: 8000, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => messages.push(m) }; } }, registerProcessor: (_, p) => { Processor = p; } };
  vm.runInNewContext(source, sandbox);
  const processor = new Processor();
  return { messages, command: type => processor.port.onmessage({ data: { type, id: 1 } }), input: samples => processor.process([[Float32Array.from(samples)]]) };
}
test('descarta audio fuera del intervalo y vacía el bloque final al soltar', () => {
  const c = capture(); c.input([.8, .8]); assert.equal(c.messages.length, 0);
  c.command('start'); c.input([.25, -.25]); c.command('stop'); c.input([.9, .9]);
  const blocks = c.messages.filter(m => m.type === 'chunk'); assert.equal(blocks.length, 1);
  assert.deepEqual(Array.from(blocks[0].pcm), [8192, -8192]); assert.equal(c.messages.at(-1).samples, 2);
});
test('un toque sin muestras puede terminar sin bloquear la captura', () => {
  const c = capture(); c.command('start'); c.command('stop'); assert.equal(c.messages.at(-1).samples, 0);
  c.command('start'); c.input([.3]); c.command('stop'); assert.equal(c.messages.at(-1).samples, 1);
});
test('abort descarta el bloque parcial y permite una nueva toma', () => {
  const c = capture(); c.command('start'); c.input([.9]); c.command('abort'); c.command('start'); c.input([.1]); c.command('stop');
  const blocks = c.messages.filter(m => m.type === 'chunk'); assert.equal(blocks.length, 1); assert.equal(blocks[0].pcm.length, 1); assert.equal(blocks[0].pcm[0], 3277);
});
test('limita saturación sin desbordar PCM16', () => {
  const c = capture(); c.command('start'); c.input([2, -2]); c.command('stop');
  assert.deepEqual(Array.from(c.messages.find(m => m.type === 'chunk').pcm), [32767, -32768]);
});
test('se detiene a los tres minutos y no captura audio posterior', () => {
  const c = capture(); c.command('start'); const block = new Array(8000).fill(.1);
  for (let i = 0; i < 181; i++) c.input(block);
  const stop = c.messages.find(m => m.type === 'stopped'); assert.equal(stop.samples, 180 * 8000); assert.equal(stop.limit, true);
  assert.equal(c.messages.filter(m => m.type === 'chunk').reduce((s, m) => s + m.pcm.length, 0), 180 * 8000);
});
