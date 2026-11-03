"""Private playback derivatives: fixed batch gain, originals preserved."""
import argparse
import math
import shutil
import time
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
import pilot
from build_comparison import build


def peak4(x):
    x=np.asarray(x,dtype=np.float64)
    if x.ndim!=1 or not x.size or not np.isfinite(x).all() or not np.any(x):
        raise ValueError('invalid_audio')
    return max(float(np.max(np.abs(x))),float(np.max(np.abs(resample_poly(x,4,1)))))


def correct(source,output):
    source=Path(source);output=Path(output)
    rows=pilot.leer(source/'manifest.json');signals=[]
    for row in rows:
        path=pilot.dentro(source,row['archivo'])
        if pilot.sha(path)!=row['sha256'] or sf.info(path).subtype!='FLOAT':
            raise ValueError('verified_float_original_required')
        x,sr=sf.read(path,dtype='float32')
        raw=path.with_suffix('.npy')
        if pilot.sha(raw)!=row['raw_sha256'] or not np.array_equal(x,np.load(raw).astype('float32')):
            raise ValueError('raw_original_mismatch')
        signals.append((x,sr,peak4(x)))
    gain=min(1.0,10**(-2/20)/max(p for _,_,p in signals))
    output.mkdir(parents=True,exist_ok=False);result=[];start=time.perf_counter()
    for row,(x,sr,peak) in zip(rows,signals):
        original='original_'+row['archivo'];fixed='corrected_'+row['archivo']
        shutil.copy2(source/row['archivo'],output/original)
        y=(x.astype('float64')*gain).astype('float32');sf.write(output/fixed,y,sr,subtype='FLOAT')
        decoded,rate=sf.read(output/fixed,dtype='float32')
        assert rate==sr and np.array_equal(y,decoded) and peak4(decoded)<1
        ident=row['case_id']+'_'+row['variant']
        common={**row,'case_id':ident,'source_variant':row['variant'],'source_sha256':row['sha256'],
                'source_manifest_sha256':pilot.sha(source/'manifest.json'),'accent_validated':False}
        result.append({**common,'variant':'original','archivo':original})
        result.append({**common,'variant':'corrected','archivo':fixed,'sha256':pilot.sha(output/fixed),
            **pilot.inspeccionar(y,sr),'gain':gain,'gain_db':20*math.log10(gain),
            'estimated_peak_4x':peak4(y),'raw_sha256':None,
            'max_inverse_gain_error':float(np.max(np.abs(y.astype('float64')/gain-x)))})
    pilot.guardar(output/'manifest.json',result)
    pilot.guardar(output/'correction.json',{'method':'one_constant_gain_for_entire_batch','gain':gain,
        'gain_db':20*math.log10(gain),'target_dbfs':-2,'peak_method':'max_sample_and_scipy_resample_poly_4x',
        'true_peak_certified':False,'originals_changed':False,'seconds':time.perf_counter()-start,
        'gpu_cost_usd':0,'instrumentation_overhead_seconds':None,'human_acceptance':None,
        'numpy':np.__version__,'soundfile':sf.__version__,'script_sha256':pilot.sha(__file__)})
    build(output,output/'ESCUCHAR.html','60 originales y 60 copias con ganancia constante '+str(round(20*math.log10(gain),2))+' dB. Mismas muestras, duración y frecuencia; sin compresión, filtros ni nueva síntesis. Picos estimados con sobremuestreo 4×, margen objetivo −2 dBFS. Los originales conservan sus fallos y hashes. La escucha de acento/naturalidad sigue pendiente. Cómputo GPU adicional: US$0.')
    player=output/'ESCUCHAR.html';html=player.read_text(encoding='utf8')
    html=html.replace('¿Mejoró el acento chileno?','Comparar volumen original y corregido')
    html=html.replace('Escucha la misma frase con el modelo base, el primer adaptador y el nuevo. La referencia vocal y la semilla son las mismas. Una menor pérdida de validación no demuestra por sí sola un mejor acento.','Escucha cada muestra original y su copia con volumen reducido. La corrección conserva la forma de onda salvo redondeo numérico; no repara distorsión que ya pudiera existir dentro del modelo.')
    html=html.replace("const labels={","const labels={original:'Original',corrected:'Volumen corregido',")
    html=html.replace('repeat(3,minmax(0,1fr))','repeat(2,minmax(0,1fr))')
    html=html.replace("id.split('_').pop().replace('p','')","id.split('_').slice(-2).join(' · ')")
    player.write_text(html,encoding='utf8')
    return gain

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();print('GAIN',correct(a.source,a.output))
