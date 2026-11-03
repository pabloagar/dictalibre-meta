import pathlib, json, csv, time, datetime, platform, subprocess, hashlib, random, traceback
import importlib.metadata as md
import numpy as np
import torch
import soundfile as sf
from huggingface_hub import snapshot_download
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
ROOT = pathlib.Path('/content/dictalibre_pilot')
RUN = ROOT / datetime.datetime.now(datetime.timezone.utc).strftime('run_%Y%m%dT%H%M%SZ')
RUN.mkdir(parents=True, exist_ok=False)
def save(name, obj):
    (RUN/name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')
texts = [
'Hallazgos dos puntos. Nódulo sólido de ocho milímetros en el lóbulo superior derecho. Punto.',
'La lesión presenta una atenuación de menos diez unidades Hounsfield. Punto.',
'Bronquiectasias cilíndricas en ambos lóbulos inferiores. Punto.',
'Quiste renal izquierdo de dos coma cinco centímetros. Punto.',
'No se observa derrame pleural ni neumotórax. Punto.',
'Opacidad en vidrio esmerilado en el segmento apical del lóbulo superior izquierdo. Punto.',
'Adenopatía mediastínica de doce por ocho milímetros. Punto.',
'Colelitiasis sin signos de colecistitis aguda. Punto.',
'Espondilolistesis de grado uno en el nivel L cinco S uno. Punto.',
'Engrosamiento de la pared del íleon terminal. Punto.',
'Conclusión dos puntos. Sin evidencia de tromboembolismo pulmonar. Punto y aparte.',
'Se sugiere comparar con estudios previos, coma, si están disponibles. Punto final.'
]
config = dict(language_id='es', exaggeration=0.5, cfg_weight=0.5, temperature=0.8, repetition_penalty=1.2, min_p=0.05, top_p=1.0)
save('protocol.json', {'hypothesis':'V3 puede producir 12 WAV íntegros; pronunciación apta requiere revisión humana.', 'n_scripts':12,'repetitions_per_script':1,'voice':'builtin conds.pt; sin referencia personal','audio_source':'TTS sintético','condition':'limpio, sin ruido añadido','configuration':config,'seed_base':20261103,'interval':'CUDA sincronizada inmediatamente antes de generate hasta sincronización posterior; excluye escritura WAV, carga y descarga del modelo','metrics':{'generation_s':'segundos directos perf_counter','audio_duration_s':'muestras / frecuencia','rtf':'generation_s / audio_duration_s'},'acceptance':'Técnico: 12/12 WAV finitos, no silenciosos, legibles; auditivo: 12/12 conservan términos, cifras, negaciones y comandos, sin omisiones/repeticiones. No escalar antes de revisión humana.','human_review':None,'comparison':None,'network':None,'browser_version':None,'client_device':None,'instrumentation_overhead_s':None,'overhead_note':'Sincronización CUDA puede añadir sobrecosto no aislado; guardado y hash fuera del intervalo. No es benchmark comparativo.','clock_resolution_s':time.get_clock_info('perf_counter').resolution,'dictalibre_commit':None})
assert torch.cuda.is_available(), 'GPU no disponible'
meta = {'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'python':platform.python_version(),'os':platform.platform(),'gpu':torch.cuda.get_device_name(0),'cuda':torch.version.cuda,'source_commit':'5de7a54aa4e5e2baadb0182dde554908b48b85c2','versions':{p:md.version(p) for p in ['chatterbox-tts','torch','torchaudio','transformers','numpy','soundfile']}}
save('environment.json',meta)
(RUN/'pip-freeze.txt').write_text(subprocess.check_output([__import__('sys').executable,'-m','pip','freeze'], text=True))
print('RUN', RUN, flush=True)
print('Descargando checkpoint V3...', flush=True)
t0=time.perf_counter()
checkpoint=snapshot_download('ResembleAI/chatterbox',allow_patterns=['ve.pt','t3_mtl23ls_v3.safetensors','s3gen.pt','grapheme_mtl_merged_expanded_v1.json','conds.pt','Cangjie5_TC.json'])
meta['model_revision']=pathlib.Path(checkpoint).name
meta['download_s']=time.perf_counter()-t0
save('environment.json',meta)
t0=time.perf_counter()
model=ChatterboxMultilingualTTS.from_local(checkpoint,device='cuda',t3_model='v3')
torch.cuda.synchronize()
meta['model_load_s']=time.perf_counter()-t0
save('environment.json',meta)
rows=[]
for i,text in enumerate(texts,1):
    row={'case_id':f'p{i:02d}','text':text,'seed':20261103+i,'repetition':1,'status':'error','generation_s':None,'duration_s':None,'rtf':None,'sample_rate':None,'sha256':None,'error':None,'human_review':None}
    try:
        random.seed(row['seed']); np.random.seed(row['seed']); torch.manual_seed(row['seed']); torch.cuda.manual_seed_all(row['seed'])
        torch.cuda.synchronize(); start=time.perf_counter()
        wav=model.generate(text,**config)
        torch.cuda.synchronize(); row['generation_s']=time.perf_counter()-start
        samples=wav.detach().cpu().numpy().squeeze()
        assert samples.ndim==1 and samples.size>0 and np.isfinite(samples).all() and np.max(np.abs(samples))>0
        path=RUN/(row['case_id']+'.wav')
        sf.write(path,samples,model.sr,subtype='FLOAT')
        check,sr=sf.read(path)
        assert sr==model.sr and len(check)==len(samples) and np.isfinite(check).all()
        row.update(status='ok',duration_s=len(samples)/sr,sample_rate=sr,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),peak=float(np.max(np.abs(samples))))
        row['rtf']=row['generation_s']/row['duration_s']
    except Exception as exc:
        row['error']=str(exc)
        traceback.print_exc()
    rows.append(row)
    save('manifest.json',rows)
    keys=sorted(set().union(*(r.keys() for r in rows)))
    with (RUN/'manifest.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=keys); writer.writeheader(); writer.writerows(rows)
    print(row['case_id'],row['status'],'duration_s=',row['duration_s'],'generation_s=',row['generation_s'],flush=True)
save('summary.json',{'completed_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'successful':sum(r['status']=='ok' for r in rows),'attempted':len(rows),'human_acceptance':None})
print('PILOTO_TERMINADO',sum(r['status']=='ok' for r in rows),'/12',flush=True)
