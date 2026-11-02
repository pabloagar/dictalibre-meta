import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('ocultar interrumpe captura, volver exige gesto y reset no reutiliza token',()=>{
 const elements=new Map(),listeners={},sent=[];let stopped=0,closed=0,lastStatus;
 const $=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',classList:{toggle(){}},addEventListener(){}});return elements.get(id);};
 const document={hidden:false,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn};
 const box={$,document,window:{addEventListener(){}},location:{hash:'',pathname:'/mobile'},history:{replaceState(){}},performance:{now:()=>100},status:t=>lastStatus=t,console,setTimeout,clearTimeout};
 vm.createContext(box);vm.runInContext(fs.readFileSync('apps/mobile/mobile.js','utf8').replace(/^import .*;\r?\n/gm,''),box);
 box.fakeClient={send:m=>sent.push(m),close:()=>closed++};box.fakeStream={getTracks:()=>[{stop:()=>stopped++}]};
 vm.runInContext("paired=true;prepared=true;client=fakeClient;stream=fakeStream;recording={id:7,state:'recording'};",box);
 document.hidden=true;listeners.visibilitychange();assert.equal(sent[0].type,'abort');assert.equal(stopped,1);assert.equal($('record').disabled,true);
 document.hidden=false;listeners.visibilitychange();assert.match(lastStatus,/Reactivar/);assert.equal($('prepare').textContent,'Reactivar micrófono');assert.equal($('record').disabled,true);
 $('restart').onclick();assert.equal(sent.at(-1).type,'close');assert.equal(closed,1);assert.equal($('join-code').value,'');assert.equal($('duration').textContent,'00:00');
 vm.runInContext('paired=false;client=null;',box);listeners.visibilitychange();assert.match(lastStatus,/nuevo QR/);
});
