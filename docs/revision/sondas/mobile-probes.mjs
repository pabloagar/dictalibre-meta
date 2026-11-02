// Arnés vm igual al de tests/mobile-lifecycle.test.mjs; sólo lee apps/mobile/mobile.js.
import fs from 'node:fs'; import vm from 'node:vm';
function load() {
  const elements = new Map(), listeners = {}, sent = [], worklet = []; let lastStatus;
  const $ = id => { if (!elements.has(id)) elements.set(id, { value: '', textContent: '', classList: { toggle() {} }, addEventListener() {} }); return elements.get(id); };
  const document = { hidden: false, querySelectorAll: () => [], addEventListener: (n, f) => listeners[n] = f };
  const box = { $, document, window: { addEventListener() {} }, location: { hash: '', pathname: '/mobile' }, history: { replaceState() {} }, performance: { now: () => 100 }, status: (t, k) => lastStatus = [t, k], console, setTimeout, clearTimeout };
  vm.createContext(box); vm.runInContext(fs.readFileSync(new URL('../../../apps/mobile/mobile.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''), box);
  box.fakeClient = { send: m => { sent.push(m); return true; }, close() {}, buffered: 0 };
  box.fakeWorklet = { port: { postMessage: m => worklet.push(m) }, disconnect() {} };
  vm.runInContext("paired=true;prepared=true;client=fakeClient;worklet=fakeWorklet;", box);
  return { box, $, sent, worklet, get status() { return lastStatus; } };
}
const out = {};
{ // (a) error del relay sin 'aborted' durante una toma
  const h = load();
  vm.runInContext("recording={id:101,state:'recording',sequence:3,samples:0,parts:[],sentTimes:new Map()};", h.box);
  vm.runInContext("onMessage({type:'error',message:'Crea una sesión nueva para continuar.'})", h.box);
  out.errorDuringTake = { recordingStillActive: vm.runInContext('recording?.state ?? null', h.box), recordLabel: h.$('record-label').textContent, status: h.status, abortSent: h.sent.some(m => m.type === 'abort') };
}
{ // (b) 'aborted' rezagado de la toma 1 llega cuando la toma 2 ya empezó en el teléfono
  const h = load();
  vm.runInContext("recording={id:2,state:'starting',sequence:0,samples:0,parts:[],sentTimes:new Map()};", h.box);
  vm.runInContext("onMessage({type:'aborted',id:1,reason:'Grabación interrumpida. Inicia otra explícitamente.'})", h.box);
  out.staleAborted = { recordingAfter: vm.runInContext('recording?.id ?? null', h.box), abortSentToRelay: h.sent.some(m => m.type === 'abort'), workletMsgs: h.worklet.map(m => m.type), status: h.status };
}
console.log(JSON.stringify(out, null, 1));
