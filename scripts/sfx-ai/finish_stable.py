"""Run Stable after MOSS has exited; credentials only arrive via environment."""
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path('/content/sfx-pilot')


def main():
    ready = json.loads((ROOT / 'stable-env-ready.json').read_text())
    status = 'failed'
    try:
        subprocess.run([ready['python'], str(ROOT / 'code/run_gpu.py'), '--engine', 'stable',
            '--output', str(ROOT / 'stable-l4'), '--protocol', str(ROOT / 'code/protocol.json'),
            '--budget', str(ROOT / 'budget.json')], check=True)
        status = 'complete'
    finally:
        archive = Path('/content/sfx-stable-result.zip')
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            for folder in [ROOT / 'stable-l4', ROOT / 'code']:
                for file in folder.rglob('*'):
                    if file.is_file() and '__pycache__' not in file.parts: z.write(file, str(file.relative_to(ROOT)))
            for file in [ROOT / 'budget.json', ROOT / 'requirements-stable-effective.txt', ROOT / 'stable-worker.log']:
                if file.exists(): z.write(file, file.name)
        print('STABLE_BACKUP_READY', status, archive.stat().st_size, hashlib.sha256(archive.read_bytes()).hexdigest(), flush=True)


if __name__ == '__main__': main()
