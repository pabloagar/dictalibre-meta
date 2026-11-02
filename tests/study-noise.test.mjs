import test from 'node:test';
import assert from 'node:assert/strict';
import {addNoise} from '../scripts/study-noise.mjs';
test('ruido reproducible con SNR digital medido, duración preservada y sin saturación',()=>{
 const b=Buffer.alloc(32044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);
 for(let i=0;i<16000;i++)b.writeInt16LE(Math.round(30000*Math.sin(i*.2)),44+i*2);
 const original=Buffer.from(b),a=addNoise(b,10,42),c=addNoise(b,10,42);assert.deepEqual(b,original);assert.deepEqual(a.wav,c.wav);assert.ok(Math.abs(a.metrics.snrMeasuredDb-10)<.01);assert.equal(a.metrics.durationMs,1000);assert.ok(a.metrics.gain<1);
 assert.throws(()=>addNoise(Buffer.concat([b.subarray(0,44),Buffer.alloc(32000)]),10));
});
