// Read-only local audit. No inference, microphone, external requests, or catalog writes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { hash, score } from '../backend/lab-core.mjs';
import { ReportModel } from '../apps/shared/report-model.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, 'data/local/audits', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output, { recursive: true });
const protocol = {
  version: 'resource-audit-v1', createdAt: new Date().toISOString(),
  hypothesis: 'Full-catalog polling and unbounded editor history increase work with session length.',
  scope: 'Read-only existing catalog; five sequential local HTTP reads; synthetic editor fixture in separate Node process.',
  acceptance: 'Document current payload, work per request, and history growth; no before/after improvement claim.',
  intervals: {
    httpMs: 'performance.now immediately before fetch until entire response body consumed; excludes JSON parsing.',
    parseMs: 'JSON.parse of one in-memory catalog snapshot.',
    serializeMs: 'JSON.stringify snapshot with indentation 2; excludes filesystem writes.',
    scoreAllMs: 'Existing score() for every completed run against latest stored reference; no result serialization.',
    editorMs: 'ReportModel.edit for 1000 single-character synthetic edits; no browser, DOM, or localStorage.'
  },
  repetitions: { http: 5, snapshotOperations: 5, editorFixture: 1 },
  conditions: { platform: process.platform, arch: process.arch, node: process.version,
    browser: null, network: 'HTTP loopback only', physicalPhone: false, audioSource: null,
    concurrentUserActivity: 'May be present; not controlled', gpuMemoryBytes: null },
  clock: 'performance.now; effective resolution and measurement overhead not calibrated',
  privateDataPolicy: 'Only aggregate sizes, counts, hashes, versions and intervals written; no audio, transcript or API key.'
};
fs.writeFileSync(path.join(output, 'protocol.json'), JSON.stringify(protocol, null, 2));
const files = ['scripts/audit-resources.mjs', 'backend/lab.mjs', 'backend/lab-core.mjs',
  'backend/lab-worker.py', 'backend/muse-stream.mjs', 'backend/live-bridge.mjs',
  'apps/desktop/live.js', 'apps/desktop/report-editor.js', 'apps/shared/report-model.js',
  'apps/shared/review-ui.js', 'apps/lab/lab.js'];
let head = null, dirty = null;
try {
  head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  dirty = !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
} catch {}
const source = files.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const raw = fs.readFileSync(path.join(root, 'data/local/lab/catalog.json'));
const text = raw.toString('utf8').replace(/^\uFEFF/, '');
const db = JSON.parse(text);
const samples = { parseMs: [], serializeMs: [], scoreAllMs: [] };
const measured = fn => { const start = performance.now(); fn(); return performance.now() - start; };
for (let i = 0; i < 5; i++) {
  samples.parseMs.push(measured(() => JSON.parse(text)));
  samples.serializeMs.push(measured(() => JSON.stringify(db, null, 2)));
  samples.scoreAllMs.push(measured(() => db.runs.map(run => {
    const audio = db.audios.find(a => a.id === run.audioId);
    return run.status === 'completed' ? score(audio?.references.at(-1)?.text ?? null, run.text) : null;
  })));
}
const http = [];
let stateMeta = null;
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  try {
    const res = await fetch('http://127.0.0.1:8789/api/state', { signal: AbortSignal.timeout(10000) });
    const body = await res.text();
    http.push({ status: res.status, elapsedMs: performance.now() - start, bytes: Buffer.byteLength(body) });
    if (res.ok) { const state = JSON.parse(body); stateMeta = { build: state.build,
      sourceHashAtServerStartup: state.sourceHash, runs: state.runs.length,
      reviews: state.reviews?.length ?? 0, activeRuns: state.runs.filter(r => ['running', 'queued'].includes(r.status)).length,
      activeReviews: state.reviews?.filter(r => ['running', 'queued'].includes(r.status)).length ?? 0 }; }
  } catch (e) { http.push({ error: e.name, elapsedMs: performance.now() - start, bytes: null }); }
  if (i < 4) await new Promise(resolve => setTimeout(resolve, 200));
}
const disk = relative => {
  let count = 0, bytes = 0;
  const visit = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) { count++; bytes += fs.statSync(full).size; }
    }
  };
  visit(path.join(root, relative));
  return { directory: relative, files: count, bytes };
};
const editor = new ReportModel('Texto sintético. '.repeat(300));
const initialCharacters = editor.text.length;
const editorMs = measured(() => { for (let i = 0; i < 1000; i++) editor.edit(editor.text + 'a'); });
const payloadBytes = http.find(s => s.bytes !== null)?.bytes ?? null;
const result = {
  version: protocol.version, recordedAt: new Date().toISOString(), root,
  headObserved: head, dirty, source,
  attribution: 'HEAD is context only; inspected working-tree hashes and running server hash are separate.',
  catalog: { sha256: hash(raw), bytes: raw.length, audios: db.audios.length, runs: db.runs.length,
    configs: db.configs.length, reviews: db.reviews?.length ?? 0,
    audioWithReference: db.audios.filter(a => a.references.length).length,
    topLevelJsonBytes: Object.fromEntries(Object.entries(db).map(([key, value]) => [key, Buffer.byteLength(JSON.stringify(value))])) },
  samples, http, runningServer: stateMeta,
  pollingEstimate: { measuredBytesPerState: payloadBytes, secondsPerReviewPanel: 1.5,
    panels: 5, requestsPerSecond: 5 / 1.5,
    bodyBytesPerSecond: payloadBytes === null ? null : payloadBytes * 5 / 1.5,
    caveat: 'Estimate from source intervals and one payload, not measured browser traffic. Local loopback, not phone data. Excludes HTTP overhead and other polling; ignores request duration.' },
  editorFixture: { initialCharacters, edits: 1000, historyEntries: editor.history.length,
    logicalHistoryCharacters: editor.history.reduce((sum, value) => sum + value.length, 0),
    finalCharacters: editor.text.length, elapsedMs: editorMs,
    caveat: 'Logical retained characters, not measured heap bytes; string sharing/GC can change actual memory.' },
  disk: ['data/local/lab/audio', 'data/local/lab/derived', 'models', 'data/local/templates'].map(disk),
  limits: ['No physical phone test.', 'No ASR/LLM inference or GPU benchmark.',
    'No active-browser memory or CPU sampling.', 'Filesystem save latency and browser localStorage cost not measured.',
    'Five HTTP reads and fixture work may add transient load; this is not a controlled latency comparison.']
};
fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(JSON.stringify({ output, catalog: result.catalog, runningServer: stateMeta,
  medianMs: Object.fromEntries(Object.entries(samples).map(([key, values]) => [key, median(values)])),
  http, pollingEstimate: result.pollingEstimate, editorFixture: result.editorFixture, disk: result.disk }, null, 2));
