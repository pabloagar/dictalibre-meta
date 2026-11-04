"""Build a private, partial-or-complete review; never invent missing audio."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
import numpy as np
import soundfile as sf
from run_demo import inspect_audio, sha, write


def build(protocol_path, sources, output):
    protocol = json.loads(Path(protocol_path).read_text(encoding='utf-8'))
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    audio_dir = output / 'ai-audio'; audio_dir.mkdir(exist_ok=True)
    rows = []
    for engine, manifest_path in sources.items():
        m = json.loads(Path(manifest_path).read_text(encoding='utf-8'))
        assert m['engine'] == engine
        for row in m['rows']:
            if not row.get('file'): continue
            source = Path(manifest_path).parent / row['file']
            assert source.resolve().is_relative_to(Path(manifest_path).parent.resolve())
            assert sha(source) == row['sha256'], 'Original audio hash mismatch'
            stats = inspect_audio(source, protocol['duration_seconds'])
            if not stats['finite']: continue
            name = engine + '-' + row['case']
            original = audio_dir / (name + '-original.wav'); shutil.copyfile(source, original)
            data, rate = sf.read(source, dtype='float32', always_2d=True)
            rms = stats['rms']; peak = stats['sample_peak']
            gain = min(10**(-24/20)/rms if rms else 1, 10**(-3/20)/peak if peak else 1, 8)
            playback = audio_dir / (name + '-listen.wav'); sf.write(playback, data * gain, rate, subtype='FLOAT')
            rows.append({**row, 'engine': engine, 'original': 'ai-audio/' + original.name,
                'playback': 'ai-audio/' + playback.name, 'playback_sha256': sha(playback),
                'playback_gain': gain, 'audio': stats,
                'normalization': 'RMS target -24 dBFS, sample peak ceiling -3 dBFS, max gain 8; original unchanged',
                'source': m['source'], 'rights_status': m['commercial_release_status']})
    payload = {'schema': 'sfx-review-v1', 'cases': protocol['cases'], 'engines': {
        'moss': 'MOSS SoundEffect v2', 'stable': 'Stable Audio 3 Small-SFX'},
        'rows': rows, 'expected': 10, 'available': len(rows),
        'evaluation': 'open_comparison_single_listener_exploratory', 'human_approval': None,
        'license_notice': 'Audios de modelos externos; el permiso del sintetizador procedural no se aplica a este lote.'}
    payload['manifest_id'] = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    write(output / 'ai-comparison.json', payload)
    code = Path(__file__).resolve().parents[2] / 'apps/bilateral'
    for name in ['ai-compare.html', 'ai-compare.js', 'ai-compare.css']:
        shutil.copyfile(code / name, output / name)
    return payload


def main():
    p = argparse.ArgumentParser(); p.add_argument('--protocol', default=str(Path(__file__).with_name('protocol.json')))
    p.add_argument('--moss'); p.add_argument('--stable'); p.add_argument('--output', required=True)
    a = p.parse_args(); sources = {k: getattr(a, k) for k in ['moss','stable'] if getattr(a,k)}
    result = build(a.protocol, sources, a.output)
    print('REVIEW_READY', result['available'], '/', result['expected'], result['manifest_id'])


if __name__ == '__main__': main()
