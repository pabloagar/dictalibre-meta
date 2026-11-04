"""Colab bootstrap; budget/watchdog must already be configured in the notebook."""
import hashlib
import json
import os
import subprocess
import sys
import time
import zipfile
from pathlib import Path

ROOT = Path('/content/sfx-pilot')
REV = '934d6826b084c46a0d033402174d5f8ac4ed2519'


def run(command): subprocess.run(command, check=True)


def main():
    budget = json.loads((ROOT / 'budget.json').read_text())
    assert budget['authorized_cap_usd'] == 3 and budget['watchdog_armed']
    assert time.time() < budget['session_start_epoch'] + 3000
    source = ROOT / 'moss-code'; source.mkdir(exist_ok=False)
    run(['git', '-C', str(source), 'init', '-q'])
    run(['git', '-C', str(source), 'remote', 'add', 'origin', 'https://github.com/OpenMOSS/MOSS-TTS.git'])
    run(['git', '-C', str(source), 'fetch', '--filter=blob:none', '--depth=1', 'origin', REV])
    run(['git', '-C', str(source), 'sparse-checkout', 'set', 'moss_soundeffect_v2'])
    run(['git', '-C', str(source), 'checkout', '--detach', REV])
    assert subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip() == REV
    run([sys.executable, '-m', 'pip', 'install', '--disable-pip-version-check', 'uv==0.13.7'])
    env = ROOT / 'moss-env'
    run(['uv', 'venv', '--python', '3.12', str(env)])
    py = str(env / 'bin/python')
    run(['uv', 'pip', 'install', '--python', py, '--extra-index-url', 'https://download.pytorch.org/whl/cu128',
         '--index-strategy', 'unsafe-best-match', '-e', str(source / 'moss_soundeffect_v2') + '[torch-cu128]'])
    (ROOT / 'requirements-moss-effective.txt').write_text(subprocess.check_output(['uv', 'pip', 'freeze', '--python', py], text=True))
    # Shared analysis code needs scipy only for comparison preparation, not GPU inference.
    print('MOSS_DEPENDENCIES_READY', flush=True)
    status = 'failed'
    try:
        run([py, str(ROOT / 'code/run_gpu.py'), '--engine', 'moss', '--output', str(ROOT / 'moss-l4'),
             '--protocol', str(ROOT / 'code/protocol.json'), '--budget', str(ROOT / 'budget.json')])
        status = 'complete'
    finally:
        archive = Path('/content/sfx-moss-result.zip')
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            for folder in [ROOT / 'moss-l4', ROOT / 'code']:
                for file in folder.rglob('*'):
                    if file.is_file() and '__pycache__' not in file.parts: z.write(file, str(file.relative_to(ROOT)))
            for file in [ROOT / 'budget.json', ROOT / 'requirements-moss-effective.txt', ROOT / 'moss-worker.log']:
                if file.exists(): z.write(file, file.name)
        print('MOSS_BACKUP_READY', status, archive.stat().st_size, hashlib.sha256(archive.read_bytes()).hexdigest(), flush=True)


if __name__ == '__main__': main()
