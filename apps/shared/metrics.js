// Timing only: never includes audio, transcription, pairing codes or credentials.
export const epochNow = () => performance.timeOrigin + performance.now();
const finite = value => typeof value === 'number' && Number.isFinite(value);
export const round = value => finite(value) ? Math.round(value * 10) / 10 : null;

export class ClockCalibration {
  constructor() { this.samples = []; }
  observe(t0, serverReceive, serverSend, t3) {
    if (![t0, serverReceive, serverSend, t3].every(finite) || t3 < t0 || serverSend < serverReceive) return false;
    const rtt = (t3 - t0) - (serverSend - serverReceive);
    if (rtt < 0 || rtt > 10_000) return false;
    this.samples.push({ offset: ((serverReceive - t0) + (serverSend - t3)) / 2, rtt, at: t3 });
    this.samples = this.samples.slice(-8); return true;
  }
  stamp(now = epochNow()) {
    const fresh = this.samples.filter(s => now >= s.at && now - s.at < 30_000);
    if (!fresh.length) return null;
    const best = fresh.reduce((a, b) => a.rtt <= b.rtt ? a : b);
    const age = now - best.at;
    // Indicative resolution, not a calibrated error guarantee. Assumes limited drift.
    return { serverMs: now + best.offset, uncertaintyMs: best.rtt / 2 + age * .0002, ageMs: age, rttMs: best.rtt };
  }
}

export function arrivalEstimate(sent, received) {
  if (!sent || !received || ![sent.serverMs, received.serverMs, sent.uncertaintyMs, received.uncertaintyMs].every(finite)) return null;
  const value = received.serverMs - sent.serverMs;
  return { ms: value, uncertaintyMs: sent.uncertaintyMs + received.uncertaintyMs,
    usable: value >= 0, reason: value < 0 ? 'below_clock_resolution' : null };
}

export function statistics(values) {
  const sorted = values.filter(v => finite(v) && v >= 0).sort((a, b) => a - b);
  if (!sorted.length) return { n: 0, p50: null, p95: null, max: null };
  const percentile = p => round(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]);
  return { n: sorted.length, p50: percentile(.5), p95: percentile(.95), max: round(sorted.at(-1)) };
}

export function exportBatch(traces, pairing = null) {
  const recordings = [...traces].slice(-5).map(trace => trace.export());
  const verified = recordings.filter(r => r.status === 'verified');
  return { schema: 'dicta-libre.metrics-batch.v1', exportedAt: new Date().toISOString(), pairing,
    scope: 'Last five started takes in this browser session; incomplete and active takes retained. Reload or new session clears history.',
    recordings,
    summary: { takes: recordings.length, verified: verified.length,
      incomplete: recordings.filter(r => r.status === 'incomplete').length,
      active: recordings.filter(r => r.status === 'recording').length,
      verifiedDurationMs: statistics(verified.map(r => r.blocks.reduce((sum, b) => sum + (b.bufferMs ?? 0), 0))),
      stopToVerifiedMs: statistics(verified.map(r => r.stages.stopToVerifiedMs)),
      perTakeAckMedianMs: statistics(verified.map(r => r.summary.ackRoundTripMs.p50)),
      perTakeArrivalEstimateMedianMs: statistics(verified.map(r => r.summary.sendToPcEstimateMs.p50)) },
    aggregationNotes: 'Timing summaries use verified takes, one value per take, not pooled blocks. Per-take medians are not overall block percentiles. Missing values excluded; n reports measured takes. Five takes are exploratory, not a robust benchmark.' };
}

export class RecordingMetrics {
  constructor(id, rate, source, mode) {
    this.id = id; this.rate = rate; this.source = source; this.mode = mode;
    this.createdAt = new Date().toISOString(); this.blocks = new Map(); this.status = 'recording';
    this.counters = { duplicates: 0, sequenceErrors: 0, telemetryOmitted: 0 };
    this.stages = Object.fromEntries(['prepareMs','startControlMs','stopFlushMs','senderHashMs','pcHashMs','stopToVerifiedMs',
      'asrQueueMs','asrRunMs','firstTextMs','finalTextMs','startToFirstPartialMs','suggestionMs','receiveStartToFirstTextMs','receiveStartToFinalTextMs','receiveEndToTextMs','stopToTextEstimateMs','clockUncertaintyMs'].map(k => [k, null]));
    this.reason = null;
  }
  block(sequence, values) {
    if (!Number.isInteger(sequence) || sequence < 0) return;
    if (!this.blocks.has(sequence) && this.blocks.size >= 6000) { this.counters.telemetryOmitted++; return; }
    this.blocks.set(sequence, { ...this.blocks.get(sequence), sequence, ...values });
  }
  stage(name, value) { if (Object.hasOwn(this.stages, name) && finite(value) && value >= 0 && value < 600_000) this.stages[name] = round(value); }
  summary() {
    const rows = [...this.blocks.values()];
    const stat = name => statistics(rows.map(row => row[name]));
    return { bufferMs: stat('bufferMs'), sendToPcEstimateMs: stat('sendToPcEstimateMs'), uncertaintyMs: stat('uncertaintyMs'),
      ackRoundTripMs: stat('ackRoundTripMs'), relayMs: stat('relayMs'), interarrivalMs: stat('interarrivalMs'), queueBytes: stat('queueBytes'),
      bytes: rows.reduce((n, row) => n + (row.bytes || 0), 0), blocks: rows.length,
      unestimatedBlocks: rows.filter(row => !finite(row.sendToPcEstimateMs)).length };
  }
  export() {
    return { schema: 'dicta-libre.metrics.v1', recordingId: this.id, createdAt: this.createdAt, source: this.source, mode: this.mode,
      sampleRate: this.rate, status: this.status, reason: this.reason, counters: this.counters, stages: this.stages, asr: this.asr??null,
      summary: this.summary(), blocks: [...this.blocks.values()],
        timingNotes: 'sendToPcEstimateMs and stopToTextEstimateMs use clock calibration; uncertainty is indicative, not a confidence interval. receiveEndToTextMs uses one PC clock through DOM text update, including polling. ackRoundTripMs uses one sender clock. Missing ASR metrics stay null.' };
  }
}
