// Audio outside an explicitly active recording is neither buffered nor posted.
class DictaCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.active = false; this.size = Math.round(sampleRate / 10);
    this.port.onmessage = ({ data }) => {
      if (data.type === 'start' && !this.active) {
        this.id = data.id; this.active = true; this.buffer = new Int16Array(this.size);
        this.used = 0; this.total = 0; this.started = false;
      } else if (data.type === 'stop' && this.active) this.stop(false);
      else if (data.type === 'abort') { this.active = false; this.buffer = null; this.used = 0; }
    };
  }
  flush() {
    if (!this.used) return;
    const pcm = this.buffer.slice(0, this.used);
    this.port.postMessage({ type: 'chunk', id: this.id, pcm }, [pcm.buffer]);
    this.used = 0;
  }
  stop(limit) {
    this.flush(); this.active = false; this.buffer = null;
    this.port.postMessage({ type: 'stopped', id: this.id, samples: this.total, limit });
  }
  process(inputs) {
    const channels = inputs[0];
    if (!this.active || !channels?.length) return true;
    const length = channels[0].length;
    if (!length) return true;
    if (!this.started) { this.started = true; this.port.postMessage({ type: 'started', id: this.id, confirmation: 'first-input' }); }
    for (let i = 0; i < length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i];
      value = Math.max(-1, Math.min(1, value / channels.length));
      this.buffer[this.used++] = Math.round(value < 0 ? value * 32768 : value * 32767);
      this.total++;
      if (this.used === this.size) this.flush();
      if (this.total >= sampleRate * 180) { this.stop(true); break; }
    }
    return true;
  }
}
registerProcessor('dicta-capture', DictaCapture);
