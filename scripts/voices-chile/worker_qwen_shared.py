"""Colab worker; requires a verified budget and live external watchdog."""
import hashlib
import json
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT=Path('/content/qwen_shared')
PYTHON='/content/qwen_shared_venv/bin/python'


def sha(path):
    with Path(path).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()


def main():
    started=time.time()
    budget=json.loads((ROOT/'budget.json').read_text())
    assert 0<budget['units_per_hour']*budget['usd_per_unit']*7200/3600<budget['remaining_cap_usd']<=5
    protocol=json.loads((ROOT/'protocol.json').read_text())
    assert sha(ROOT/'source_manifest.json')==protocol['source_manifest_sha256']
    assert sha(ROOT/'rights.json')==protocol['rights_sha256']
    rights=json.loads((ROOT/'rights.json').read_text())
    assert rights['scope']=='private_research_adaptation' and rights['commercial_use']['status']=='unverified'
    audio=ROOT/'audio';audio.mkdir(exist_ok=False)
    transfers=[]
    for sex,expected in [('female','23593f3dac085d26f99df38159c1ab0ae2c23f5c97ad869292496abc6e171bc6'),
                         ('male','ace2cbd6df28e94fdd636ba1263b72b557722b0d2abcf4c6e072011ac870cbee')]:
        path=ROOT/(sex+'.zip');url=f'https://openslr.elda.org/resources/71/es_cl_{sex}.zip'
        tick=time.perf_counter()
        with urllib.request.urlopen(url,timeout=60) as response,path.open('wb') as f:shutil.copyfileobj(response,f)
        assert sha(path)==expected
        with zipfile.ZipFile(path) as z:
            lookup={Path(n).name:n for n in z.namelist() if n.endswith('.wav')}
            for row in protocol['rows']:
                if row['audio'] not in lookup:continue
                content=z.read(lookup[row['audio']]);assert hashlib.sha256(content).hexdigest()==row['audio_sha256']
                (audio/row['audio']).write_bytes(content)
        transfers.append({'url':url,'sha256':expected,'seconds':time.perf_counter()-tick})
    assert len(list(audio.glob('*.wav')))==len(protocol['rows'])
    (ROOT/'transfer.json').write_text(json.dumps(transfers))
    print('DATA_READY',len(protocol['rows']),flush=True)
    subprocess.run([sys.executable,'-m','venv','--without-pip','/content/qwen_shared_venv'],check=True)
    subprocess.run([sys.executable,'-m','pip','--python',PYTHON,'install','--no-compile',
        '-r',str(ROOT/'code/requirements.txt')],check=True)
    (ROOT/'requirements-effective.txt').write_text(subprocess.check_output([PYTHON,'-m','pip','freeze'],text=True))
    print('DEPENDENCIES_READY',flush=True)
    subprocess.run([PYTHON,str(ROOT/'code/test_qwen_shared.py')],check=True)
    subprocess.run(['apt-get','update','-qq'],check=True)
    subprocess.run(['apt-get','install','-y','-qq','sox'],check=True)
    status='failed'
    try:
        subprocess.run([PYTHON,str(ROOT/'code/train_qwen_shared.py'),'--root',str(ROOT)],check=True)
        status='complete'
    finally:
        (ROOT/'worker_timing.json').write_text(json.dumps({'started_epoch':started,'seconds':time.time()-started,
            'status':status,'instrumentation_overhead_seconds':None}))
        archive=Path('/content/qwen_shared_result.zip')
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for path in ROOT.rglob('*'):
                if not path.is_file() or any(part in ('audio','audio24') for part in path.relative_to(ROOT).parts) or path.suffix=='.zip' or '__pycache__' in path.parts:continue
                z.write(path,str(path.relative_to(ROOT)))
        print('BACKUP_READY',archive,archive.stat().st_size,sha(archive),flush=True)


if __name__=='__main__':main()
