"""Local-only worker: one task at a time; explicit GPU, no automatic CPU fallback."""
import sys, json, time, wave, math, os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['DO_NOT_TRACK'] = '1'
import numpy as np
from scipy.signal import resample_poly
pipe = None

def task(m):
    global pipe
    if m['command'] == 'prepare':
        start = time.perf_counter()
        with wave.open(m['input'], 'rb') as w:
            rate, channels = w.getframerate(), w.getnchannels()
            if w.getsampwidth() != 2: raise ValueError('PCM16 requerido')
            raw = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
        raw = raw.reshape(-1, channels).mean(axis=1)
        if rate != 16000:
            divisor = math.gcd(rate, 16000)
            raw = resample_poly(raw, 16000//divisor, rate//divisor)
        encoded = np.clip(np.rint(raw*32768), -32768,32767).astype('<i2')
        with wave.open(m['output'],'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(encoded.tobytes())
        return {'prepareMs':(time.perf_counter()-start)*1000, 'sampleRate':16000}
    import openvino as ov
    import openvino_genai as genai
    core = ov.Core()
    device = core.get_property('GPU','FULL_DEVICE_NAME')
    if m['command'] == 'probe': return {'devices':core.available_devices,'gpu':device,'openvino':ov.__version__,'genai':genai.__version__}
    if m['beams'] != 1: raise ValueError('Beams > 1 no habilitado: fallo reproducido en runtime GPU.')
    load_start = time.perf_counter(); cold = pipe is None
    if cold: pipe = genai.WhisperPipeline(m['modelPath'], 'GPU', INFERENCE_PRECISION_HINT='f16')
    load_ms = (time.perf_counter()-load_start)*1000 if cold else 0
    with wave.open(m['input'],'rb') as w:
        raw = np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
    started = time.perf_counter()
    result = pipe.generate(raw.tolist(), language='<|es|>', task='transcribe', num_beams=m['beams'])
    return {'text':''.join(result.texts), 'loadMs':load_ms, 'generateMs':(time.perf_counter()-started)*1000,
            'cold':cold, 'device':'GPU', 'deviceName':device, 'openvino':ov.__version__, 'genai':genai.__version__,
            'memoryBytes':None, 'precision':'FP16 weights; f16 inference hint'}

for line in sys.stdin:
    try:
        message=json.loads(line)
        result=task(message)
        print(json.dumps({'id':message['id'],'result':result}, ensure_ascii=True),flush=True)
    except Exception as error:
        print(json.dumps({'id':message.get('id'), 'error':str(error)[:1000]}),flush=True)
