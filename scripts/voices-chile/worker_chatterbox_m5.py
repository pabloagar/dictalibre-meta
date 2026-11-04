"""Run only after the Qwen process exits, to avoid simultaneous GPU models."""
import hashlib
import subprocess
import sys
import time
import zipfile
from pathlib import Path

ROOT=Path('/content/chatter5')
PYTHON='/content/chatter5_venv/bin/python'


def main():
    subprocess.run([sys.executable,'-m','venv','--without-pip','/content/chatter5_venv'],check=True)
    subprocess.run([sys.executable,'-m','pip','--python',PYTHON,'install','--no-compile',
        '-r',str(ROOT/'code/requirements-chatterbox.txt')],check=True)
    subprocess.run([PYTHON,'-m','pip','install','--no-compile','--no-deps',
        'git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2'],check=True)
    subprocess.run([PYTHON,str(ROOT/'code/generate_chatterbox_m5.py'),
        '--protocol','/content/qwen_shared/protocol.json','--audio','/content/qwen_shared/audio',
        '--adapter',str(ROOT/'best.safetensors'),'--output',str(ROOT/'output')],check=True)
    archive=Path('/content/chatter5_result.zip')
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for path in ROOT.rglob('*'):
            if path.is_file() and '__pycache__' not in path.parts:z.write(path,str(path.relative_to(ROOT)))
    print('BACKUP_READY',archive,archive.stat().st_size,hashlib.sha256(archive.read_bytes()).hexdigest(),time.time(),flush=True)


if __name__=='__main__':main()
