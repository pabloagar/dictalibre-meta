import test from 'node:test';
import assert from 'node:assert/strict';
import { ClockCalibration, arrivalEstimate, statistics, RecordingMetrics } from '../apps/shared/metrics.js';

test('calibra desfase, descuenta procesamiento y vence muestras antiguas', () => {
  const c = new ClockCalibration();
  assert.equal(c.stamp(1000), null);
  assert.equal(c.observe(1000, 1510, 1512, 1022), true);
  assert.equal(c.stamp(1022).serverMs, 1522);
  assert.equal(c.stamp(1022).uncertaintyMs, 10);
  assert.equal(c.stamp(31022), null);
  assert.equal(c.observe(20, 2, 1, 30), false);
});
test('no convierte estimaciones negativas ni datos ausentes en cero', () => {
  assert.equal(arrivalEstimate(null, {}), null);
  const estimate = arrivalEstimate({serverMs:100,uncertaintyMs:10}, {serverMs:95,uncertaintyMs:20});
  assert.equal(estimate.usable, false);
  assert.equal(estimate.ms, -5);
  assert.equal(estimate.uncertaintyMs, 30);
  assert.deepEqual(statistics([null, undefined, NaN, -1]), {n:0,p50:null,p95:null,max:null});
  assert.deepEqual(statistics([10,20,30,40]), {n:4,p50:20,p95:40,max:40});
});
test('fusiona confirmación tardía sin duplicar bloque y mantiene ASR sin medir', () => {
  const r = new RecordingMetrics(1, 48000, 'tone', 'hold');
  r.block(0, {bytes:9616,bufferMs:100});
  r.block(0, {ackRoundTripMs:25});
  r.stage('pcHashMs', 4.123); r.stage('asrRunMs', NaN);
  const result = r.export();
  assert.equal(result.summary.blocks, 1);
  assert.equal(result.summary.bytes, 9616);
  assert.equal(result.summary.ackRoundTripMs.p50,25);
  assert.equal(result.stages.asrRunMs,null);
  assert.equal(result.stages.pcHashMs,4.1);
  assert.equal(result.summary.sendToPcEstimateMs.n,0);
  assert.equal(result.summary.unestimatedBlocks,1);
});

