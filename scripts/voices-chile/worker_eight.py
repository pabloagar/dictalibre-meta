"""Colab L4 worker for one bounded research run and matched voice comparison."""
import hashlib
import json
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path('/content/chile_eight')
PYTHON = '/content/eight_venv/bin/python'


def sha(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def main():
    manifest = json.loads((ROOT / 'data/manifest.json').read_text(encoding='utf-8'))
    audio = ROOT / 'data/audio'
    audio.mkdir(exist_ok=True)
    transfers = []
    for sex, expected in (
        ('female', '23593f3dac085d26f99df38159c1ab0ae2c23f5c97ad869292496abc6e171bc6'),
        ('male', 'ace2cbd6df28e94fdd636ba1263b72b557722b0d2abcf4c6e072011ac870cbee'),
    ):
        url = f'https://openslr.elda.org/resources/71/es_cl_{sex}.zip'
        archive = ROOT / f'es_cl_{sex}.zip'
        started = time.perf_counter()
        print('DOWNLOAD_DATA', sex, flush=True)
        with urllib.request.urlopen(url, timeout=60) as source, archive.open('wb') as target:
            shutil.copyfileobj(source, target)
        assert sha(archive) == expected
        with zipfile.ZipFile(archive) as z:
            lookup = {Path(n).name: n for n in z.namelist() if n.endswith('.wav')}
            for row in manifest['rows']:
                if row['split'] not in ('train', 'validation'):
                    continue
                name = row['audio']
                if name not in lookup:
                    continue
                assert Path(name).name == name
                content = z.read(lookup[name])
                assert hashlib.sha256(content).hexdigest() == row['audio_sha256']
                (audio / name).write_bytes(content)
        transfers.append({'url': url, 'sha256': expected,
                          'seconds': time.perf_counter() - started})
        archive.unlink()
    assert len(list(audio.glob('*.wav'))) == 2931
    (ROOT / 'data_transfer.json').write_text(json.dumps(transfers, indent=2))
    print('DATA_READY', len(list(audio.glob('*.wav'))), flush=True)

    subprocess.run([sys.executable, '-m', 'venv', '--without-pip', '/content/eight_venv'], check=True)
    subprocess.run([sys.executable, '-m', 'pip', '--python', PYTHON, 'install', '--no-compile',
                    'pip==25.2', '-r', str(ROOT / 'code/requirements-chatterbox.txt')], check=True)
    subprocess.run([PYTHON, '-m', 'pip', 'install', '--no-compile', '--no-deps',
                    'git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2'], check=True)
    print('DEPENDENCIES_READY', flush=True)
    subprocess.run([
        PYTHON, str(ROOT / 'code/train_extended.py'),
        '--manifest', str(ROOT / 'data/manifest.json'),
        '--audio-root', str(audio), '--rights', str(ROOT / 'data/rights.json'),
        '--output', str(ROOT / 'run01'), '--resume', str(ROOT / 'parent/best.safetensors'),
        '--budget', str(ROOT / 'budget.json'), '--research-source-qc',
        '--steps', '1500', '--max-seconds', '2400', '--balance-speakers',
        '--validation-samples', '40', '--eval-every', '250', '--lr', '0.00001',
    ], check=True)
    print('TRAINING_COMPLETE', flush=True)
    subprocess.run([
        PYTHON, str(ROOT / 'code/compare_eight.py'),
        '--data', str(ROOT / 'data'), '--protocol', str(ROOT / 'eight_voice_protocol.json'),
        '--parent', str(ROOT / 'parent/best.safetensors'),
        '--candidate', str(ROOT / 'run01/best.safetensors'),
        '--output', str(ROOT / 'comparison'),
    ], check=True)
    print('COMPARISON_COMPLETE', flush=True)
    backup = Path('/content/chatterbox_eight_20261103.zip')
    with zipfile.ZipFile(backup, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in ROOT.rglob('*'):
            if not path.is_file():
                continue
            rel = path.relative_to(ROOT)
            if rel.parts[:2] == ('data', 'audio') or '__pycache__' in rel.parts:
                continue
            z.write(path, str(rel))
    print('BACKUP_READY', backup, backup.stat().st_size, sha(backup), flush=True)


if __name__ == '__main__':
    main()
