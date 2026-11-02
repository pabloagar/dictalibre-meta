import test from 'node:test';
import assert from 'node:assert/strict';
import {createTakeQueue} from '../apps/desktop/stream-client.js';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('cola conserva audio y fin de segunda toma hasta terminar primera',async()=>{
 const reserve=createTakeQueue(),received=[],opened=[];
 const factory=id=>()=>{opened.push(id);return {send:m=>received.push([id,m]),cancel(){},runId:id};};
 const a=reserve().open(factory('a')),b=reserve().open(factory('b'));
 await a.opened;b.send(new Uint8Array([1,2]).buffer);b.end('hash');await tick();assert.deepEqual(opened,['a']);assert.equal(received.length,0);
 a.release();await b.opened;await new Promise(r=>setTimeout(r,30));assert.deepEqual(opened,['a','b']);assert.equal(new Uint8Array(received[0][1])[1],2);assert.equal(JSON.parse(received[1][1]).pcmHash,'hash');b.release();
});
test('cancelar toma en espera no adelanta posteriores y límite informa error',async()=>{
 const reserve=createTakeQueue({maxBytes:4});const a=reserve(),b=reserve(),c=reserve();let opened=false;
 b.send(new Uint8Array(5).buffer);assert.match(b.error,/llena/);c.open(()=>{opened=true;return {send(){}};});await tick();assert.equal(opened,false);a.release();await c.opened;assert.equal(opened,true);c.release();
});
