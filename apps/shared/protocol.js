export const MAGIC = 0x444c4131;
export const HEADER_BYTES = 16;
export const MAX_SECONDS = 180;

export function encodeChunk(recordingId, sequence, pcm) {
  const out = new ArrayBuffer(HEADER_BYTES + pcm.length * 2);
  const view = new DataView(out);
  view.setUint32(0, MAGIC);
  view.setUint32(4, recordingId);
  view.setUint32(8, sequence);
  view.setUint32(12, pcm.length);
  for (let i = 0; i < pcm.length; i++) view.setInt16(HEADER_BYTES + i * 2, pcm[i], true);
  return out;
}

export function decodeChunk(data) {
  const view = new DataView(data.buffer ?? data, data.byteOffset ?? 0, data.byteLength);
  if (view.byteLength < HEADER_BYTES || view.getUint32(0) !== MAGIC) throw new Error('Bloque de audio inválido.');
  const samples = view.getUint32(12);
  if (!samples || view.byteLength !== HEADER_BYTES + samples * 2) throw new Error('Longitud de audio inválida.');
  return { recordingId: view.getUint32(4), sequence: view.getUint32(8), samples,
    pcm: new Uint8Array(view.buffer, view.byteOffset + HEADER_BYTES, samples * 2) };
}

export function joinBytes(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.byteLength; }
  return out;
}

export async function sha256(parts) {
  const digest = await crypto.subtle.digest('SHA-256', joinBytes(parts));
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
}

export function wavBlob(parts, sampleRate) {
  const bytes = parts.reduce((n, p) => n + p.byteLength, 0);
  const header = new ArrayBuffer(44), view = new DataView(header);
  const ascii = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  ascii(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); ascii(8, 'WAVE'); ascii(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, bytes, true);
  return new Blob([header, ...parts], { type: 'audio/wav' });
}
