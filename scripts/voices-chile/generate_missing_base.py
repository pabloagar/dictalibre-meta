"""Generate exactly the 32 missing original-model controls; never load an adapter."""
import argparse
from pathlib import Path
import pilot

def main():
 p=argparse.ArgumentParser()
 for key in ('protocol','references','output'): p.add_argument('--'+key,required=True)
 a=p.parse_args(); protocol=pilot.leer(a.protocol); refs=Path(a.references);out=Path(a.output)
 assert len(protocol['references'])==8 and len(protocol['phrases'])==5
 for ref in protocol['references']: assert pilot.sha(refs/ref['reference_audio'])==ref['reference_sha256']
 out.mkdir(exist_ok=False,parents=True);config=pilot.leer(pilot.HERE/'config.json');engine=pilot.Chatterbox(config,'chatterbox')
 pilot.guardar(out/'protocol.json',{'model':config['models']['chatterbox'],'generation':config['chatterbox_generation'],'seed':protocol['seed'],'steps':0,'adapter_sha256':None,'model_download_seconds':engine.download_s,'model_load_seconds':engine.load_s,'instrumentation_overhead_seconds':None})
 rows=[]
 for ref in protocol['references']:
  for phrase in protocol['phrases']:
   if phrase['id']=='p03':continue
   ident=f"base_control_{ref['label']}_{phrase['id']}"
   row={'id':ident,'condition':'base_control','voice':ref['label'],'speaker':ref['speaker'],'speaker_split':ref['split'],'phrase':phrase['id'],'text':phrase['text'],'steps':0,'reference_id':ref['reference_id'],'reference_sha256':ref['reference_sha256'],'adapter_sha256':None,'status':'error'}
   try:
    row.update(engine.generar_audio(phrase['text'],{'semilla':protocol['seed'],'referencia':str(refs/ref['reference_audio'])},out/(ident+'.wav')));row['status']=row['estado']
   except Exception as exc:row['error']=f'{type(exc).__name__}: {exc}'
   rows.append(row);pilot.guardar(out/'manifest.json',rows);print('GENERATED',ident,row['status'],flush=True)
 assert len(rows)==32
 pilot.guardar(out/'summary.json',{'expected':32,'attempted':len(rows),'technical_ok':sum(r['status']=='ok' for r in rows),'accent_validated':False})
if __name__=='__main__':main()
