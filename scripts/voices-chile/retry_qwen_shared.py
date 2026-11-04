"""Retry only the trainer in an installed Colab environment, preserving failed evidence."""
import hashlib
import subprocess
import time
import zipfile
from pathlib import Path

ROOT=Path('/content/qwen_shared')


def main():
    subprocess.run(['apt-get','update','-qq'],check=True)
    subprocess.run(['apt-get','install','-y','-qq','sox'],check=True)
    status='failed'
    try:
        subprocess.run(['/content/qwen_shared_venv/bin/python',str(ROOT/'code/train_qwen_shared.py'),
            '--root',str(ROOT)],check=True)
        status='complete'
    finally:
        archive=Path('/content/qwen_shared_retry_result.zip')
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for path in ROOT.rglob('*'):
                if not path.is_file() or any(p in ('audio','audio24','__pycache__') for p in path.relative_to(ROOT).parts) or path.suffix=='.zip':continue
                z.write(path,str(path.relative_to(ROOT)))
        print('RETRY_STATUS',status,'BACKUP_READY',archive,archive.stat().st_size,
            hashlib.sha256(archive.read_bytes()).hexdigest(),time.time(),flush=True)


if __name__=='__main__':main()
