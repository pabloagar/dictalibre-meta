"""Derive PCM16 files without overwriting raw WAVs or generation metrics."""
import pathlib
import json
import hashlib
import numpy as np
import soundfile as sf

root = pathlib.Path('/content/dictalibre_pilot')
for run in root.glob('run_*'):
    out = run / 'lab_pcm16'
    out.mkdir(exist_ok=True)
    conversions = []
    for src in sorted(run.glob('*.wav')):
        x, sr = sf.read(src)
        peak = float(np.max(np.abs(x)))
        gain = min(1.0, 0.98 / peak)
        dst = out / src.name
        sf.write(dst, x * gain, sr, subtype='PCM_16')
        y, ysr = sf.read(dst)
        assert ysr == sr and len(y) == len(x)
        assert np.isfinite(y).all() and np.max(np.abs(y)) <= 0.981
        conversions.append({
            'file': src.name,
            'source_sha256': hashlib.sha256(src.read_bytes()).hexdigest(),
            'output_sha256': hashlib.sha256(dst.read_bytes()).hexdigest(),
            'source_peak': peak, 'gain': gain,
            'output_peak': float(np.max(np.abs(y))),
            'format': 'PCM_16', 'sample_rate': sr, 'samples': len(y),
        })
    (out / 'conversion.json').write_text(json.dumps(conversions, indent=2))
