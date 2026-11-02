import test from 'node:test';
import assert from 'node:assert/strict';
import {textIntervals} from '../apps/shared/lab-timing.js';
test('primer texto y final: un reloj, streaming, archivo, silencio y ausentes',()=>{
 assert.deepEqual(textIntervals({start:100,end:1100,first:400,final:1500}),{receiveStartToFirstTextMs:300,receiveStartToFinalTextMs:1400,receiveEndToTextMs:400});
 assert.equal(textIntervals({start:100,end:1100,final:1500}).receiveStartToFirstTextMs,1400);
 assert.equal(textIntervals({start:100,end:1100,final:1500,hasFinalText:false}).receiveStartToFirstTextMs,null);
 assert.equal(textIntervals({start:null,end:1100,final:1500}).receiveStartToFinalTextMs,null);
 assert.equal(textIntervals({start:100,end:1100,first:90,final:1500}).receiveStartToFirstTextMs,null);
});
