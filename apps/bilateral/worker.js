// SPDX-License-Identifier: MIT
import { ENGINE_VERSION, renderStereo, analyze, encodeWav } from './synth.js';
self.onmessage = async ({ data }) => {
  try {
    const started = performance.now();
    const audio = renderStereo(data.config), stats = analyze(audio);
    const renderMs = performance.now() - started;
    if (data.mode === 'wav') {
      const encodedAt = performance.now(), wav = encodeWav(audio), encodeMs = performance.now() - encodedAt;
      const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
      const source = await fetch(new URL('./synth.js', import.meta.url));
      if (!source.ok) throw Error('No se pudo verificar el motor.');
      const manifest = { schema: 'bilateral-export-v1', engine: ENGINE_VERSION, config: audio.config,
        source: 'procedural-synthesis-only', sourceSamples: [], models: [], codeLicense: 'MIT',
        outputPermission: 'commercial-use-and-redistribution-permitted; see OUTPUT-LICENSE.txt',
        engineSha256: await sha(await source.arrayBuffer()), wavSha256: await sha(wav),
        stats, events: audio.events, renderMs, encodeMs, createdUtc: new Date().toISOString(),
        environment: { userAgent: navigator.userAgent, platform: navigator.platform || null, device: null,
          outputDevice: null, network: null, requestedSampleRate: audio.sampleRate },
        measurement: { timing: 'performance.now; worker render+analysis and WAV encoding measured separately',
          physicalPlaybackTiming: null, calibratedPrecision: null, instrumentationOverheadMs: null,
          therapeuticOutcome: null, estimatedComputeCostUsd: 0, paidServicesUsed: false } };
      self.postMessage({ id: data.id, wav, manifest }, [wav]);
    } else {
      self.postMessage({ id: data.id, ...audio, stats, renderMs }, [audio.left.buffer, audio.right.buffer]);
    }
  } catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
