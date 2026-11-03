"""Generate a private, matched comparison after a completed extended run."""
import argparse
from pathlib import Path
import pilot


def main():
    p=argparse.ArgumentParser()
    for name in ('data','run','resume','output'):
        p.add_argument('--'+name,required=True)
    p.add_argument('--references',help='JSON list of reserved reference IDs')
    a=p.parse_args()
    from lora_core import attach,load_adapter
    from safetensors.torch import load_file
    run=Path(a.run); data=Path(a.data); out=Path(a.output)
    summary=pilot.leer(run/'summary.json')
    if summary['status']!='completed' or pilot.sha(run/'best.safetensors')!=summary['best_sha256']:
        raise ValueError('completed_verified_run_required')
    out.mkdir(parents=True,exist_ok=False)
    config=pilot.leer(pilot.HERE/'config.json')
    rows=pilot.leer(data/'manifest.json')['rows']
    ids=pilot.leer(a.references) if a.references else [next(r['id'] for r in rows if r['split']=='validation')]
    refs=[next(r for r in rows if r['id']==ident and r['split']=='validation') for ident in ids]
    if len({r['speaker'] for r in refs})!=len(refs): raise ValueError('distinct_reserved_speakers_required')
    for ref in refs:
        if pilot.sha(data/'audio'/ref['audio'])!=ref['audio_sha256']: raise ValueError('reference_changed')
    parent=pilot.leer(Path(a.resume).with_name('adapter_config.json'))
    engine=pilot.Chatterbox(config,'chatterbox')
    attach(engine.model.t3)
    records=[]
    variants=[('base',None,0),('anterior',Path(a.resume),parent['steps']),
              ('extendido',run/'best.safetensors',parent['steps']+summary['best_step'])]
    pilot.guardar(out/'protocol.json',{'model':config['models']['chatterbox'],
        'seed':20261103,'references':[{'id':r['id'],'sha256':r['audio_sha256']} for r in refs],
        'model_load_seconds':engine.load_s,'model_download_seconds':engine.download_s,
        'generation':config['chatterbox_generation'],'scope':'private_research_adaptation',
        'new_identity':False,'accent_validated':False,'commercial_ready':False})
    for label,path,steps in variants:
        if path:
            load_adapter(engine.model.t3,load_file(str(path)))
        engine.model.t3.eval()
        for ref in refs:
            for case in config['cases']:
                name=label+'_'+ref['speaker']+'_'+case['id']+'.wav'
                result=engine.generar_audio(case['text'],{'semilla':20261103,
                    'referencia':str(data/'audio'/ref['audio'])},out/name)
                records.append({'variant':label,'case_id':ref['speaker']+'_'+case['id'],'reference_id':ref['id'],'reference_sha256':ref['audio_sha256'],'voice_label':ref['speaker'],'text':case['text'],'steps':steps,
                    'adapter_sha256':pilot.sha(path) if path else None,**result})
                pilot.guardar(out/'manifest.json',records)
                print('GENERATED',name,result['estado'],flush=True)
    pilot.guardar(out/'summary.json',{'attempted':len(records),
        'technical_ok':sum(r['estado']=='ok' for r in records),
        'new_process_reload':True,'accent_validated':False})


if __name__=='__main__':
    main()
