import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function phone(saved, vibrate = () => true, storageFails = false) {
  const elements = new Map(), pulses = [], posts = [], values = new Map(), statuses = [];
  if (saved !== undefined) values.set('dicta-haptics-v1', saved);
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { value: '', classList: { toggle() {} }, addEventListener() {} });
    return elements.get(id);
  };
  const box = { $, document: { hidden: false, querySelectorAll: () => [], addEventListener() {} },
    window: { addEventListener() {} }, location: { hash: '', pathname: '/mobile' }, history: { replaceState() {} },
    performance: { now: () => 100, timeOrigin: 0 }, status: text => statuses.push(text), setTimeout, clearTimeout,
    navigator: { vibrate: vibrate && (ms => { pulses.push(ms); return vibrate(ms); }) },
    localStorage: { getItem: key => { if (storageFails) throw Error(); return values.get(key); }, setItem: (key, value) => { if (storageFails) throw Error(); values.set(key, value); } },
    sha256: async () => 'hash', posts };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync('apps/mobile/mobile.js', 'utf8').replace(/^import .*;\r?\n/gm, ''), box);
  vm.runInContext("paired=true;prepared=true;microphoneInitialized=true;context={state:'running',sampleRate:48000};worklet={port:{postMessage:m=>posts.push(m)}};client={send:()=>true,clock:{stamp:()=>({})}};", box);
  return { $, box, pulses, values, statuses, run: code => vm.runInContext(code, box) };
}

test('vibración por defecto: espera entrada real y parada confirmada, sin duplicados', async () => {
  const p = phone();
  assert.equal(p.$('haptics').checked, true);
  p.run('start();'); assert.deepEqual(p.pulses, []);
  assert.match(p.statuses.at(-1), /Iniciando captura/);
  assert.equal(p.$('record-label').textContent, 'Iniciando…');
  assert.equal(p.$('haptics').disabled, true);
  p.run("recording.samples=1;captureStarted(recording,'first-input');captureStarted(recording,'first-input');refresh();");
  assert.match(p.statuses.at(-1), /Grabando/);
  assert.equal(p.run("lifecycle.filter(e=>e.type==='capture-started').length"), 1);
  p.run('stop();');
  assert.equal(p.$('record-label').textContent, 'Deteniendo…');
  assert.equal(p.$('record').disabled, true);
  assert.deepEqual(p.pulses, [12]);
  await p.run('stopped({id:1,samples:1})');
  await p.run('stopped({id:1,samples:1})');
  assert.deepEqual(p.pulses, [12, 12]);
  assert.equal(p.$('record-label').textContent, 'Comprobando entrega…');
  assert.equal(p.run("lifecycle.filter(e=>e.type==='capture-stopped').length"), 1);
  assert.equal(p.run("lifecycle.filter(e=>e.type==='haptic').every(e=>e.actualDurationMs===null)"), true);
  p.run("onMessage({type:'verified',id:1,samples:1})");
  assert.equal(p.run('recording'), null);
  assert.deepEqual(p.pulses, [12, 12]);
});

test('apagar vibración persiste y se respeta una elección anterior al cambiar el valor por defecto', async () => {
  const p = phone();p.$('haptics').checked=false;p.$('haptics').onchange();
  assert.equal(phone(p.values.get('dicta-haptics-v1')).$('haptics').checked, false);
  const restored=phone('false');restored.run('start();recording.samples=1;captureStarted(recording);stop();');
  await restored.run('stopped({id:1,samples:1})');assert.deepEqual(restored.pulses, []);
  p.$('haptics').checked=true;p.$('haptics').onchange();assert.equal(phone(p.values.get('dicta-haptics-v1')).$('haptics').checked,true);
});

test('toque sin muestras y cancelación temprana no confirman grabación mediante vibración', async () => {
  const p=phone();p.run('start();stop();captureStarted(recording);');await p.run('stopped({id:1,samples:0})');
  assert.deepEqual(p.pulses, []);assert.equal(p.statuses.some(s=>s.startsWith('Grabando')),false);
});

test('fallos de vibración/almacenamiento no bloquean captura; inicio tardío y abort no vibran', async () => {
  for (const vibrate of [null, () => false, () => { throw Error(); }]) {
    const p = phone('true', vibrate);
    p.run('start();recording.samples=1;captureStarted(recording);stop();');
    await p.run('stopped({id:1,samples:1})');
    assert.equal(p.run('recording.state'), 'finishing');
  }
  const p = phone(undefined, () => true, true);
  p.$('haptics').checked=true;p.$('haptics').onchange();
  p.run('start();stop();captureStarted(recording);abort("cancelada");');
  assert.deepEqual(p.pulses, []);
});

test('recuperación móvil vuelve emparejada pero sin preparar ni iniciar micrófono',()=>{
 const p=phone();p.box.connections=[];
 p.run("context=null;worklet=null;prepared=false;client=null;resumeToken='temporal';resumeUntil=Date.now()+300000;");
 p.box.RelayClient=class{constructor(onMessage,onClose){this.onMessage=onMessage;this.onClose=onClose;}connect(request){p.box.connections.push(request);}send(){return true;}};
 p.run('reconnect();');assert.equal(p.box.connections.length,1);assert.equal(p.box.connections[0].type,'resume');
 p.run("onMessage({type:'paired',resumed:true,resumeToken:'rotado'});");
 assert.equal(p.run('paired'),true);assert.equal(p.run('prepared'),false);assert.equal(p.run('recording'),null);assert.equal(p.$('record').disabled,false);
 assert.equal(p.run("lifecycle.at(-1).resumed"),true);assert.equal(p.run('resumeToken'),'rotado');
});
test('móvil no recupera oculto, vencido ni después de cierre explícito',()=>{
 const p=phone();p.run("client=null;resumeToken='temporal';resumeUntil=Date.now()-1;reconnect();");assert.equal(p.run('resumeToken'),null);
 assert.match(p.statuses.at(-1),/superó cinco minutos/);
 p.run("resumeToken='temporal';resumeUntil=Date.now()+300000;document.hidden=true;reconnect();");assert.equal(p.run('client'),null);
 p.run("context=null;worklet=null;onMessage({type:'closed',reason:'Sesión cerrada'});");assert.equal(p.run('resumeToken'),null);
});

test('un gesto prepara e inicia; soltar antes de preparación evita inicio tardío',async()=>{
 for(const cancel of [false,true]){const p=phone();p.run('prepared=false;');let ready;
 p.box.prepare=()=>new Promise(resolve=>{ready=()=>{p.run('prepared=true;');resolve();};});
 const pending=p.run('requestStart()');if(cancel)p.run('releaseStart()');ready();await pending;
 assert.equal(p.run('recording!==null'),!cancel);if(!cancel)assert.equal(p.run('recording.state'),'starting');assert.deepEqual(p.pulses,[]);}
});

test('primera preparación separada; al volver basta botón de dictado',()=>{
 const p=phone();p.run('microphoneInitialized=false;prepared=false;refresh();');assert.equal(p.$('prepare').hidden,false);assert.equal(p.$('record').disabled,true);
 p.run('microphoneInitialized=true;refresh();');assert.equal(p.$('prepare').hidden,true);assert.equal(p.$('record').disabled,false);
});
