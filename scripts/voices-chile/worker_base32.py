"""Bounded original-model generation worker; watchdog is armed by the notebook."""
import hashlib
import json
import subprocess
import sys
import time
import zipfile
from pathlib import Path

ROOT = Path('/content/base32')
PYTHON = '/content/base32_venv/bin/python'


def main():
    started = time.time()
    subprocess.run([sys.executable, '-m', 'venv', '--without-pip', '/content/base32_venv'], check=True)
    subprocess.run([sys.executable, '-m', 'pip', '--python', PYTHON, 'install', '--no-compile',
                    'pip==25.2', '-r', str(ROOT / 'code/requirements-chatterbox.txt')], check=True)
    subprocess.run([PYTHON, '-m', 'pip', 'install', '--no-compile', '--no-deps',
                    'git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2'], check=True)
    installed = time.time()
    print('DEPENDENCIES_READY', flush=True)
    subprocess.run([PYTHON, str(ROOT / 'code/generate_missing_base.py'),
                    '--protocol', str(ROOT / 'protocol.json'), '--references', str(ROOT / 'references'),
                    '--output', str(ROOT / 'output')], check=True)
    (ROOT / 'timing.json').write_text(json.dumps({'started_epoch': started,
        'installation_seconds': installed-started, 'worker_seconds': time.time()-started,
        'instrumentation_overhead_seconds': None}), encoding='utf-8')
    archive = Path('/content/base32_result.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in ROOT.rglob('*'):
            if path.is_file() and '__pycache__' not in path.parts:
                z.write(path, str(path.relative_to(ROOT)))
    print('BACKUP_READY', archive, archive.stat().st_size,
          hashlib.sha256(archive.read_bytes()).hexdigest(), flush=True)


if __name__ == '__main__':
    main()
