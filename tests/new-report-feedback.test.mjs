import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {Window} from 'happy-dom';
import * as model from '../apps/shared/report-model.js';
test('new-report notice closes at 3000ms or manually; toolbar undo survives',()=>{
 const window=new Window({url:'http://localhost'}),document=window.document;
 const timers=new Map();let id=0;
 const context={...model,window,document,localStorage:window.localStorage,navigator:window.navigator,Option:function(text,value){const o=document.createElement('option');o.textContent=text;o.value=value;return o;},CustomEvent:window.CustomEvent,performance,Blob,URL,fetch:async()=>({ok:true,json:async()=>({templates:[]})}),setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:i=>timers.delete(i),mountReportReview:()=>({changed(){},reset(){},beforeCopy:()=>true,capture:()=>null,restore(){},box:document.createElement('div')})};
 window.localStorage.setItem('dicta-report-v1','Texto de prueba');
 vm.createContext(context);vm.runInContext(("const tr=(s,...v)=>Array.isArray(s)?s.reduce((a,b,i)=>a+(i?v[i-1]:'')+b,''):s;const language=()=> 'es';const initializeLanguage=()=>{};const mountLanguageSwitch=()=>({});\n"+fs.readFileSync('apps/desktop/report-editor.js','utf8').replace(/^import .*;\r?\n/gm,'')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,''),context);
 context.parent=document.body;const report=vm.runInContext('mountReport(parent)',context);
 document.querySelector('.report-new').click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Vaciar y empezar').click();
 const notice=document.querySelector('.new-report-feedback');assert.equal(notice.hidden,false);assert.deepEqual([...notice.querySelectorAll('button')].map(b=>b.textContent),['Cerrar aviso']);
 const scheduled=[...timers.values()].find(t=>t.ms===3000);assert.ok(scheduled);scheduled.fn();assert.equal(notice.hidden,true);
 [...document.querySelectorAll('button')].find(b=>b.textContent==='Deshacer').click();assert.equal(report.model.text,'Texto de prueba');
 document.querySelector('.report-new').click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Vaciar y empezar').click();notice.querySelector('button').click();assert.equal(notice.hidden,true);
 window.happyDOM.abort();
});
