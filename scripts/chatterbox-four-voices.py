import pathlib,json,time,datetime,hashlib,random,subprocess,sys,platform,zipfile,urllib.request,traceback
import importlib.metadata as md
import numpy as np
import soundfile as sf
import torch
from huggingface_hub import snapshot_download
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
root=pathlib.Path('/content/dictalibre_four_voices');root.mkdir(exist_ok=True)
run=root/datetime.datetime.now(datetime.timezone.utc).strftime('run_%Y%m%dT%H%M%SZ');run.mkdir()
(root/'latest.txt').write_text(str(run))
def save(n,o): (run/n).write_text(json.dumps(o,ensure_ascii=False,indent=2))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
es=['Hallazgos dos puntos. Nódulo sólido de ocho milímetros en el lóbulo superior derecho. Punto.','La lesión presenta una atenuación de menos diez unidades Hounsfield. Punto.','Bronquiectasias cilíndricas en ambos lóbulos inferiores. Punto.','Quiste renal izquierdo de dos coma cinco centímetros. Punto.','No se observa derrame pleural ni neumotórax. Punto.']
en=['Findings colon. An eight millimeter solid nodule in the right upper lobe. Period.','The lesion has an attenuation of minus ten Hounsfield units. Period.','Cylindrical bronchiectasis in both lower lobes. Period.','A left renal cyst measuring two point five centimeters. Period.','No pleural effusion or pneumothorax is seen. Period.']
config=dict(exaggeration=.5,cfg_weight=.5,temperature=.8,repetition_penalty=1.2,min_p=.05,top_p=1.)
protocol={'hypothesis':'Cuatro referencias publicadas con licencias permisivas producen dictados íntegros y pronunciación aceptable; revisión humana pendiente.','cases':{'es':es,'en':en},'translation':'English translations prepared for this experiment; not original Spanish audio.','repetitions':1,'voices':['Aldo','Dave','Joe','Kathleen'],'conditions':'Limpio. Mismo modelo, parámetros y semilla por caso. Comparar voces dentro del idioma; no atribuir diferencias entre idiomas solo a la voz.','config':config,'seed_base':20261103,'metrics':{'generation_s':'perf_counter entre sincronizaciones CUDA antes/después de generate, excluye escritura y carga','duration_s':'muestras/frecuencia','rtf':'generation_s/duration_s','naturalness':'valoración humana 1-5 después de escuchar WAV completo','errors':'conteo humano de términos/cifras/negaciones/comandos incorrectos','stumbles':'conteo humano de cortes/repeticiones'},'acceptance':'Técnico 20/20 WAV finitos no silenciosos legibles. Humano por muestra: naturalidad>=4/5 y cero errores y tropiezos. Conservar fallos. Sin validación ASR.','human_results':None,'network':None,'browser_version':None,'dictalibre_commit':None,'instrumentation_overhead_s':None,'clock_resolution_s':time.get_clock_info('perf_counter').resolution,'precision_note':'Sobrecosto CUDA no aislado; tiempos observados, no benchmark comparativo.'}
save('protocol.json',protocol)
refs=run/'references';refs.mkdir()
base='https://raw.githubusercontent.com/OHF-Voice/voice-datasets/master/'
sources={'Dave':(base+'es_ES/dave/0000000001.mp3','CC0','es'),'Joe':(base+'en_US/joe/0000000001.mp3','CC0','en'),'Kathleen':(base+'en_US/kathleen/arctic_a0001_1592748574.mp3','CC0','en')}
reference_rows=[]
for voice,(url,lic,lang) in sources.items():
    src=refs/(voice+'.mp3');urllib.request.urlretrieve(url,src)
    dst=refs/(voice+'.wav')
    subprocess.run(['ffmpeg','-y','-i',str(src),'-ac','1','-ar','24000',str(dst)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    x,sr=sf.read(dst);assert len(x)/sr>=3 and np.isfinite(x).all()
    reference_rows.append(dict(voice=voice,url=url,license=lic,language=lang,source_sha256=sha(src),reference_sha256=sha(dst),duration_s=len(x)/sr,processing='Full clip decoded to mono PCM16 24kHz; no trim'))
url='https://huggingface.co/datasets/rmcpantoja/Ald_Mexican_Spanish_speech_dataset/resolve/main/wavs.zip'
zpath=refs/'aldo_source.zip';urllib.request.urlretrieve(url,zpath)
with zipfile.ZipFile(zpath) as z:
    names=[n for n in z.namelist() if pathlib.PurePosixPath(n).name=='6 (enhanced).wav']
    assert len(names)==1, z.namelist()[:15]
    src=refs/'Aldo_source.wav';src.write_bytes(z.read(names[0]))
dst=refs/'Aldo.wav';subprocess.run(['ffmpeg','-y','-i',str(src),'-ac','1','-ar','24000',str(dst)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
x,sr=sf.read(dst);assert len(x)/sr>=3 and np.isfinite(x).all()
reference_rows.append(dict(voice='Aldo',url=url,archive_member=names[0],license='Unlicense',language='es',archive_sha256=sha(zpath),source_sha256=sha(src),reference_sha256=sha(dst),duration_s=len(x)/sr,processing='Full clip decoded to mono PCM16 24kHz; no trim'))
save('references.json',reference_rows)
for r in reference_rows: print('REFERENCE',r['voice'],r['duration_s'],flush=True)
assert torch.cuda.is_available()
meta=dict(started_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),gpu=torch.cuda.get_device_name(0),cuda=torch.version.cuda,python=platform.python_version(),source_commit='5de7a54aa4e5e2baadb0182dde554908b48b85c2',model_revision='5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18',generator_sha256=sha(pathlib.Path(__file__)),versions={p:md.version(p) for p in ['chatterbox-tts','torch','torchaudio','numpy','soundfile']})
save('environment.json',meta)
(run/'pip-freeze.txt').write_text(subprocess.check_output([sys.executable,'-m','pip','freeze'],text=True))
checkpoint=snapshot_download('ResembleAI/chatterbox',revision=meta['model_revision'],allow_patterns=['ve.pt','t3_mtl23ls_v3.safetensors','s3gen.pt','grapheme_mtl_merged_expanded_v1.json','conds.pt','Cangjie5_TC.json'])
model=ChatterboxMultilingualTTS.from_local(checkpoint,device='cuda',t3_model='v3')
rows=[]
for voice,lang in [('Aldo','es'),('Dave','es'),('Joe','en'),('Kathleen','en')]:
    out=run/voice;out.mkdir();(out/'originals').mkdir()
    for i,text in enumerate(es if lang=='es' else en,1):
        row=dict(voice=voice,language=lang,case_id=f'p{i:02d}',text=text,seed=20261103+i,status='error',human_review=None)
        try:
            random.seed(row['seed']);np.random.seed(row['seed']);torch.manual_seed(row['seed']);torch.cuda.manual_seed_all(row['seed'])
            torch.cuda.synchronize();t=time.perf_counter()
            wav=model.generate(text,language_id=lang,audio_prompt_path=str(refs/(voice+'.wav')),**config)
            torch.cuda.synchronize();elapsed=time.perf_counter()-t
            x=wav.detach().cpu().numpy().squeeze();assert x.ndim==1 and x.size>0 and np.isfinite(x).all() and np.max(np.abs(x))>0
            original=out/'originals'/f'p{i:02d}.wav';sf.write(original,x,model.sr,subtype='FLOAT')
            peak=float(np.max(np.abs(x)));gain=min(1.,.98/peak);dst=out/f'p{i:02d}.wav';sf.write(dst,x*gain,model.sr,subtype='PCM_16')
            y,sr=sf.read(dst);assert len(y)==len(x) and sr==model.sr and np.isfinite(y).all()
            row.update(status='ok',generation_s=elapsed,duration_s=len(x)/sr,rtf=elapsed/(len(x)/sr),sample_rate=sr,gain=gain,source_peak=peak,sha256=sha(dst),original_sha256=sha(original),file=str(dst.relative_to(run)))
        except Exception as e: row['error']=str(e);traceback.print_exc()
        rows.append(row);save('manifest.json',rows);print('DONE',voice,i,row['status'],flush=True)
save('summary.json',dict(completed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),successful=sum(r['status']=='ok' for r in rows),attempted=len(rows),human_acceptance=None))
print('FOUR_VOICES_COMPLETE',run,flush=True)
