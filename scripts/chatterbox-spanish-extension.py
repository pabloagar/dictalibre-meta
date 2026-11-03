# Joe y Kathleen: mismos cinco guiones en español, referencias originales.
import pathlib, subprocess
base=pathlib.Path('/content/dictalibre_four_voices')
previous=pathlib.Path((base/'latest.txt').read_text())
source=(base/'generate_four.py').read_text()
source=source.replace("'/content/dictalibre_four_voices'", "'/content/dictalibre_joe_kathleen_es'")
source=source.replace("[('Aldo','es'),('Dave','es'),('Joe','en'),('Kathleen','en')]", "[('Joe','es'),('Kathleen','es')]")
start=source.index("refs=run/'references'")
end=source.index("save('references.json',reference_rows)")
reuse="import shutil\nrefs=run/'references';refs.mkdir()\nprevious=pathlib.Path("+repr(str(previous))+")\nreference_rows=[r for r in json.loads((previous/'references.json').read_text()) if r['voice'] in ['Joe','Kathleen']]\nfor r in reference_rows:\n    src=previous/'references'/(r['voice']+'.wav')\n    assert sha(src)==r['reference_sha256']\n    shutil.copy2(src,refs/src.name)\n"
source=source[:start]+reuse+source[end:]
marker="save('protocol.json',protocol)"
extra="protocol.update(hypothesis='Joe y Kathleen con referencias inglesas pueden leer los mismos cinco guiones españoles; evaluar acento y exactitud.',cases={'es':es},translation=None,voices=['Joe','Kathleen'],conditions='Referencias inglesas idénticas a la prueba anterior, salida en español. Parámetros y semillas iguales a Aldo y Dave. Una toma por caso. No ajustar acento antes de la primera comparación.',acceptance='Técnico: 10/10 WAV finitos no silenciosos legibles; humano: naturalidad>=4/5, cero errores y tropiezos por WAV completo. Sin validación ASR.',previous_run="+repr(str(previous))+",user_feedback={'source':'usuario','preference':'Voz A anterior preferida a Aldo español mexicano','scores':None})\n"
source=source.replace(marker,extra+marker)
source=source.replace('FOUR_VOICES_COMPLETE','SPANISH_VOICES_COMPLETE')
compile(source,'spanish_voices','exec')
root_es=pathlib.Path('/content/dictalibre_joe_kathleen_es');root_es.mkdir(exist_ok=True)
script_es=root_es/'generate_es.py';script_es.write_text(source,encoding='utf-8')
log_es=open(root_es/'generation.log','w')
proc_es=subprocess.Popen(['/content/dictalibre_venv/bin/python','-u',str(script_es)],stdout=log_es,stderr=subprocess.STDOUT)
print('SPANISH_GENERATION_STARTED',proc_es.pid)
