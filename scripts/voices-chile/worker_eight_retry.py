"""Colab worker for the bounded 40-sample candidate-only correction run."""
import hashlib
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path('/content/eight_retry')
PYTHON = '/content/eight_retry_venv/bin/python'


def sha(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def main():
    subprocess.run([sys.executable, '-m', 'venv', '--without-pip', '/content/eight_retry_venv'], check=True)
    subprocess.run([sys.executable, '-m', 'pip', '--python', PYTHON, 'install', '--no-compile',
                    'pip==25.2', '-r', str(ROOT / 'code/requirements-chatterbox.txt')], check=True)
    subprocess.run([PYTHON, '-m', 'pip', 'install', '--no-compile', '--no-deps',
                    'git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2'], check=True)
    print('DEPENDENCIES_READY', flush=True)
    subprocess.run([
        PYTHON, str(ROOT / 'code/regenerate_eight_last.py'),
        '--protocol', str(ROOT / 'eight_voice_protocol.json'),
        '--references', str(ROOT / 'references'),
        '--last', str(ROOT / 'last.safetensors'),
        '--parent-config', str(ROOT / 'parent_adapter_config.json'),
        '--run-summary', str(ROOT / 'run_summary.json'),
        '--output', str(ROOT / 'candidate_last'),
    ], check=True)
    print('CANDIDATE_RETRY_COMPLETE', flush=True)
    archive = Path('/content/eight_candidate_last_20261103.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in (ROOT / 'candidate_last').rglob('*'):
            if path.is_file():
                z.write(path, str(path.relative_to(ROOT)))
        z.write(ROOT / 'worker.log', 'worker.log')
    print('BACKUP_READY', archive, archive.stat().st_size, sha(archive), flush=True)


if __name__ == '__main__':
    main()
