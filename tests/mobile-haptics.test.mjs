import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function phone(saved, vibrate = () => true, storageFails = false) {
  const elements = new Map(), pulses = [], posts = [], values = new Map();
  if (saved !== undefined) values.set('dicta-haptics-v1', saved);
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { value: '', classList: { toggle() {} }, addEventListener() {} });
    return elements.get(id);
  };
  const box = { $, document: { hidden: false, querySelectorAll: () => [], addEventListener() {} },
    window: { addEventListener() {} }, location: { hash: '', pathname: '/mobile' }, history: { replaceState() {} },
    performance: { now: () => 100, timeOrigin: 0 }, status() {}, setTimeout, clearTimeout,
    navigator: { vibrate: vibrate && (ms => { pulses.push(ms); return vibrate(ms); }) },
    localStorage: { getItem: key => { if (storageFails) throw Error(); return values.get(key); }, setItem: (key, value) => { if (storageFails) throw Error(); values.set(key, value); } },
    sha256: async () => 'hash', posts };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync('apps/mobile/mobile.js', 'utf8').replace(/^import .*;\r?\n/gm, ''), box);
  vm.runInContext("paired=true;prepared=true;context={state:'running',sampleRate:48000};worklet={port:{postMessage:m=>posts.push(m)}};client={send:()=>true,clock:{stamp:()=>({})}};", box);
  return { $, box, pulses, values, run: code => vm.runInContext(code, box) };
}

test('vibración opt-in persistente: espera confirmación de captura y parada, sin duplicados', async () => {
  const p = phone();
  assert.equal(p.$('haptics').checked, false);
  p.run('start();captureStarted(recording);stop();');
  await p.run('stopped({id:1,samples:0})');
  assert.deepEqual(p.pulses, []);
  p.run('recording=null;');
  p.$('haptics').checked = true; p.$('haptics').onchange();
  assert.equal(phone(p.values.get('dicta-haptics-v1')).$('haptics').checked, true);
  p.run('start();'); assert.deepEqual(p.pulses, []);
  assert.equal(p.$('haptics').disabled, true);
  p.run('captureStarted(recording);captureStarted(recording);stop();');
  assert.deepEqual(p.pulses, [12]);
  await p.run('stopped({id:2,samples:0})');
  await p.run('stopped({id:2,samples:0})');
  assert.deepEqual(p.pulses, [12, 12]);
  assert.equal(p.run("lifecycle.filter(e=>e.type==='haptic').every(e=>e.actualDurationMs===null)"), true);
  p.run('recording=null;');p.$('haptics').checked=false;p.$('haptics').onchange();
  assert.equal(phone(p.values.get('dicta-haptics-v1')).$('haptics').checked, false);
});

test('fallos de vibración/almacenamiento no bloquean captura; inicio tardío y abort no vibran', async () => {
  for (const vibrate of [null, () => false, () => { throw Error(); }]) {
    const p = phone('true', vibrate);
    p.run('start();captureStarted(recording);stop();');
    await p.run('stopped({id:1,samples:0})');
    assert.equal(p.run('recording.state'), 'finishing');
  }
  const p = phone(undefined, () => true, true);
  p.$('haptics').checked=true;p.$('haptics').onchange();
  p.run('start();stop();captureStarted(recording);abort("cancelada");');
  assert.deepEqual(p.pulses, []);
});
