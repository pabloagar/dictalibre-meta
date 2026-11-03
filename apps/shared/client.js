import {t as tr, language} from './i18n.js';
import { ClockCalibration, epochNow } from './metrics.js';
export const $ = id => document.getElementById(id);
export function status(text, kind = '') {
  $('status').textContent = tr(text);
  $('status').className = `status ${kind}`;
}
export class RelayClient {
  constructor(onMessage, onClose) { this.onMessage = onMessage; this.onClose = onClose; this.clock = new ClockCalibration(); this.syncTimers = []; }
  connect(first) {
    this.socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    this.connectTimer = setTimeout(() => { if (this.socket.readyState === WebSocket.CONNECTING) this.socket.close(); }, 10_000);
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = () => {
      clearTimeout(this.connectTimer);
      this.lastPong = performance.now(); this.send(first);
      const ping = () => this.send({ type: 'ping', echo: epochNow() });
      for (const delay of [0, 200, 600]) this.syncTimers.push(setTimeout(ping, delay));
      this.timer = setInterval(() => {
        if (performance.now() - this.lastPong > 20_000) { this.socket.close(); return; }
        ping();
      }, 5000);
    };
    this.socket.onmessage = event => {
      try {
        if (typeof event.data !== 'string') { this.onMessage(event.data); return; }
        const m = JSON.parse(event.data);
        if (m.type === 'pong') {
          this.lastPong = performance.now();
          const now = epochNow();
          this.clock.observe(m.echo, m.serverReceive, m.serverSend, now);
          if ($('rtt')) $('rtt').textContent = `${Math.round(now - m.echo)} ms`;
        } else this.onMessage(m);
      } catch { status(tr('Respuesta no válida. Cierra y vuelve a emparejar.'), 'error'); this.close(); }
    };
    this.socket.onerror = () => status(tr('No se pudo conectar con el servidor.'), 'error');
    this.socket.onclose = () => { this.clearTimers(); this.onClose(); };
  }
  send(m) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)); return true;
  }
  get buffered() { return this.socket?.bufferedAmount ?? Infinity; }
  clearTimers() { clearTimeout(this.connectTimer); clearInterval(this.timer); this.syncTimers.forEach(clearTimeout); }
  close() { this.clearTimers(); this.socket?.close(); }
}
export function clock(samples, rate) {
  const seconds = Math.floor(samples / rate);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
