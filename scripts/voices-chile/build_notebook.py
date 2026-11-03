"""Build a portable, output-free notebook from reviewed source files."""
import base64
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
files = {name: (ROOT / name).read_text(encoding='utf-8') for name in
         ('pilot.py', 'config.json', 'requirements.txt', 'requirements-chatterbox.txt', 'review.html', 'test_pilot.py')}
payload = base64.b64encode(gzip.compress(json.dumps(files).encode(), mtime=0)).decode()


def cell(source, markdown=False):
    result = {'cell_type': 'markdown' if markdown else 'code', 'metadata': {}, 'source': source.splitlines(True)}
    if not markdown:
        result.update(execution_count=None, outputs=[])
    return result


cells = [cell('''# Dicta Libre · voces chilenas / Chatterbox prioritario

Piloto privado. Dos referencias artificiales Qwen → veinte muestras Chatterbox V3.
No hay entrenamiento ni acento validado. Revisar tasa y saldo en Recursos antes de ejecutar.
No comprar unidades automáticamente. Presupuesto total US$10, watchdog una hora.
Las salidas son temporales: descargar y verificar el ZIP antes de desconectar.
No ejecutar todas las celdas a ciegas: cada fase requiere revisar la anterior.
''', True), cell('''import threading, time, os, json
from pathlib import Path
from google.colab import runtime
# Completar SOLO con la tarifa y tasa observadas en la UI actual.
USD_PER_UNIT = None
UNITS_PER_HOUR = None
assert USD_PER_UNIT is not None and UNITS_PER_HOUR is not None
assert 0 < USD_PER_UNIT * UNITS_PER_HOUR < 10
assert os.environ.get('TBE_RUNTIME_ADDR')
watchdog = threading.Timer(3600, runtime.unassign)
watchdog.daemon = True
watchdog.start()
budget = dict(usd_per_unit=USD_PER_UNIT, units_per_hour=UNITS_PER_HOUR,
              max_runtime_s=3600, watchdog_armed=True, rate_source='Colab UI verificada',
              observed_utc=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
Path('/content/budget.json').write_text(json.dumps(budget))
print('Watchdog activo; coste estimado máximo de una hora', USD_PER_UNIT*UNITS_PER_HOUR)
'''), cell(f'''import base64, gzip, json, subprocess, sys
from pathlib import Path
root=Path('/content/dictalibre_chile_code')
root.mkdir(exist_ok=True)
files=json.loads(gzip.decompress(base64.b64decode({payload!r})))
for name, content in files.items():
    (root/name).write_text(content, encoding='utf-8')
def install_env(name, requirements):
    env=Path('/content')/name
    subprocess.run([sys.executable,'-m','venv','--without-pip',str(env)],check=True)
    py=str(env/'bin/python')
    subprocess.run([sys.executable,'-m','pip','--python',py,'install','-r',str(root/requirements)],check=True,timeout=1200)
    return py
qwen_python=install_env('dictalibre_qwen_venv','requirements.txt')
'''), cell('''assert watchdog.is_alive()
subprocess.run([qwen_python,str(root/'pilot.py'),'generate','--stage','references',
               '--output','/content/chile_references','--budget','/content/budget.json'],check=True,timeout=900)
print(Path('/content/chile_references/summary.json').read_text())
'''), cell('''# Entorno distinto: transformers/torch incompatibles entre los dos motores.
chatter_python=install_env('dictalibre_chatterbox_venv','requirements-chatterbox.txt')
subprocess.run([sys.executable,'-m','pip','--python',chatter_python,'install','--no-deps',
 'git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2'],check=True)
'''), cell('''assert watchdog.is_alive()
subprocess.run([chatter_python,str(root/'pilot.py'),'generate','--stage','chatterbox',
 '--source','/content/chile_references','--output','/content/chile_chatterbox',
 '--budget','/content/budget.json'],check=True,timeout=1200)
print(Path('/content/chile_chatterbox/summary.json').read_text())
'''), cell('''import zipfile, hashlib
from google.colab import files
archive=Path('/content/piloto_chileno_privado.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for folder in ('chile_references','chile_chatterbox'):
        for p in (Path('/content')/folder).rglob('*'):
            if p.is_file(): z.write(p,p.relative_to('/content'))
print('SHA256',hashlib.sha256(archive.read_bytes()).hexdigest())
files.download(str(archive))
'''), cell('''# Solo tras confirmar que el ZIP se descargó y sus hashes coinciden.
# No ejecutar esta celda antes de recuperar las salidas temporales.
runtime.unassign()
''')]
notebook = {'nbformat': 4, 'nbformat_minor': 5, 'metadata': {'kernelspec': {
    'name': 'python3', 'display_name': 'Python 3'}, 'accelerator': 'GPU'}, 'cells': cells}
dest = ROOT / 'piloto_chileno.ipynb'
dest.write_text(json.dumps(notebook, ensure_ascii=False, indent=1), encoding='utf-8')
print(dest)
