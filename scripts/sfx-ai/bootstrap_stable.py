"""Prepare a separate, upstream-locked Stable Audio environment, without a token."""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path('/content/sfx-pilot')
REV = '790793b89ddceea612be9ce42ff6830d18f6fa57'


def main():
    budget = json.loads((ROOT / 'budget.json').read_text())
    assert budget['authorized_cap_usd'] == 3 and budget['watchdog_armed']
    assert time.time() < budget['session_start_epoch'] + 3000
    source = ROOT / 'stable-code'; source.mkdir(exist_ok=False)
    def run(command): subprocess.run(command, check=True, cwd=source)
    run(['git', 'init', '-q'])
    run(['git', 'remote', 'add', 'origin', 'https://github.com/Stability-AI/stable-audio-3.git'])
    run(['git', 'fetch', '--filter=blob:none', '--depth=1', 'origin', REV])
    run(['git', 'checkout', '--detach', REV])
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip() == REV
    run(['uv', 'sync', '--frozen', '--no-dev', '--python', '3.12'])
    py = str(source / '.venv/bin/python')
    (ROOT / 'requirements-stable-effective.txt').write_text(subprocess.check_output(['uv', 'pip', 'freeze', '--python', py], text=True))
    (ROOT / 'stable-env-ready.json').write_text(json.dumps({'python': py, 'code_revision': REV}))
    print('STABLE_ENV_READY', py, flush=True)


if __name__ == '__main__': main()
