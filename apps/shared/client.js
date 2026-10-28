export const $ = id => document.getElementById(id);
export function status(text, kind = '') {
  $('status').textContent = text;
  $('status').className = `status ${kind}`;
}
export class RelayClient {
  constructor(onMessage, onClose) { this.onMessage = onMessage; this.onClose = onClose; }
  connect(first) {
    this.socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    this.connectTimer = setTimeout(() => { if (this.socket.readyState === WebSocket.CONNECTING) this.socket.close(); }, 10_000);
    this.socket.binaryType = 'arraybuffer';
    this.socket.onopen = () => {
      clearTimeout(this.connectTimer);
      this.lastPong = performance.now(); this.send(first);
      this.timer = setInterval(() => {
        if (performance.now() - this.lastPong > 20_000) { this.socket.close(); return; }
        this.send({ type: 'ping', echo: performance.now() });
      }, 5000);
    };
    this.socket.onmessage = event => {
      try {
        if (typeof event.data !== 'string') { this.onMessage(event.data); return; }
        const m = JSON.parse(event.data);
        if (m.type === 'pong') {
          this.lastPong = performance.now();
          if ($('rtt')) $('rtt').textContent = `${Math.round(this.lastPong - m.echo)} ms`;
        } else this.onMessage(m);
      } catch { status('Respuesta no válida. Cierra y vuelve a emparejar.', 'error'); this.close(); }
    };
    this.socket.onerror = () => status('No se pudo conectar con el servidor.', 'error');
    this.socket.onclose = () => { clearTimeout(this.connectTimer); clearInterval(this.timer); this.onClose(); };
  }
  send(m) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(m instanceof ArrayBuffer ? m : JSON.stringify(m)); return true;
  }
  get buffered() { return this.socket?.bufferedAmount ?? Infinity; }
  close() { clearTimeout(this.connectTimer); clearInterval(this.timer); this.socket?.close(); }
}
export function clock(samples, rate) {
  const seconds = Math.floor(samples / rate);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
