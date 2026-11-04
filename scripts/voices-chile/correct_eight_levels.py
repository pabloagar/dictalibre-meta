"""Create one-gain playback copies of the 88 comparison WAVs; retain originals."""
import argparse
import math
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
import pilot


def peak4(x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim != 1 or not x.size or not np.isfinite(x).all() or not np.any(x):
        raise ValueError('invalid_audio')
    return max(float(np.max(np.abs(x))), float(np.max(np.abs(resample_poly(x, 4, 1)))))


def correct(folder):
    folder = Path(folder)
    rows = pilot.leer(folder / 'manifest.json')
    assert len(rows) in (88, 120)
    signals = []
    for row in rows:
        if not row.get('archivo') or not row.get('sha256'):
            continue
        source = folder / row['archivo']
        if pilot.sha(source) != row['sha256'] or sf.info(source).subtype != 'FLOAT':
            raise ValueError('original_changed:' + row['id'])
        x, sr = sf.read(source, dtype='float32')
        raw = source.with_suffix('.npy')
        if pilot.sha(raw) != row['raw_sha256'] or not np.array_equal(x, np.load(raw).astype('float32')):
            raise ValueError('raw_mismatch:' + row['id'])
        signals.append((row, x, sr, peak4(x)))
    gain = min(1.0, 10 ** (-2 / 20) / max(peak for _, _, _, peak in signals))
    target = folder / 'playback'
    target.mkdir(exist_ok=False)
    playback = []
    for row, x, sr, _ in signals:
        name = 'playback/' + row['archivo']
        path = folder / name
        y = (x.astype('float64') * gain).astype('float32')
        sf.write(path, y, sr, subtype='FLOAT')
        decoded, rate = sf.read(path, dtype='float32')
        assert rate == sr and np.array_equal(y, decoded) and peak4(decoded) < 1
        playback.append({'id': row['id'], 'archivo': name, 'sha256': pilot.sha(path),
                         'source_sha256': row['sha256'], 'estimated_peak_4x': peak4(decoded)})
    pilot.guardar(folder / 'playback_manifest.json', {
        'source_manifest_sha256': pilot.sha(folder / 'manifest.json'),
        'method': 'one_constant_gain_for_entire_batch', 'gain': gain,
        'gain_db': 20 * math.log10(gain), 'target_dbfs': -2,
        'true_peak_certified': False, 'originals_changed': False,
        'instrumentation_overhead_seconds': None, 'rows': playback,
    })
    return gain


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--comparison', required=True)
    args = parser.parse_args()
    print('FIXED_GAIN', correct(args.comparison))
