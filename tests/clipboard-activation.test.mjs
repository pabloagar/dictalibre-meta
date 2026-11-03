import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {Window} from 'happy-dom';
const source=fs.readFileSync('apps/desktop/report-editor.js','utf8');const helper=source.slice(source.indexOf('export async function copyReportText'),source.indexOf('export function mountReport')).replace('export ','');
test('copy uses current text synchronously before permission queries across successive reports',async()=>{
 const window=new Window(),doc=window.document;let clipboard='OLD';const context={};vm.createContext(context);vm.runInContext(helper,context);
 doc.execCommand=()=>{const event=new window.Event('copy',{cancelable:true});Object.defineProperty(event,'clipboardData',{value:{setData:(type,text)=>{assert.equal(type,'text/plain');clipboard=text;}}});doc.dispatchEvent(event);return true;};
 for(const text of ['Informe A\nSin derrame.','Informe B\nHallazgo sintético diferente.']){
  let queried=false;const pending=context.copyReportText(text,{doc,clipboard:{readText:async()=>clipboard,writeText:async()=>{throw Error('Native path expected');}},permissions:{query:async()=>{queried=true;assert.equal(clipboard,text);return {state:'granted'};}}});
  assert.equal(clipboard,text);assert.equal(queried,true);assert.equal((await pending).verified,true);
 }
 await window.happyDOM.close();
});
