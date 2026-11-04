"""Five matched controls for the new male reference, with the preserved 4020-step adapter."""
import argparse
from pathlib import Path
import pilot


def main():
    parser=argparse.ArgumentParser()
    for key in ('protocol','audio','adapter','output'):parser.add_argument('--'+key,required=True)
    a=parser.parse_args();p=pilot.leer(a.protocol)
    ref=next(r for r in p['references'] if r['label']=='M5')
    assert pilot.sha(Path(a.audio)/ref['reference_audio'])==ref['reference_sha256']
    expected='314c213a0bbc10883968b29d331200182d2930056277276d8398d8209883787e'
    assert pilot.sha(a.adapter)==expected
    from lora_core import attach,load_adapter
    from safetensors.torch import load_file
    engine=pilot.Chatterbox(pilot.leer(pilot.HERE/'config.json'),'chatterbox')
    attach(engine.model.t3);load_adapter(engine.model.t3,load_file(a.adapter));engine.model.t3.eval()
    out=Path(a.output);out.mkdir(exist_ok=False)
    rows=[]
    for phrase in p['phrases']:
        ident='chatterbox_M5_'+phrase['id']
        stats=engine.generar_audio(phrase['text'],{'semilla':20261103,
            'referencia':str(Path(a.audio)/ref['reference_audio'])},out/(ident+'.wav'))
        rows.append({'id':ident,'voice':'M5','speaker':ref['speaker'],'phrase':phrase['id'],
            'text':phrase['text'],'condition':'chatterbox','steps':4020,'seed':20261103,
            'reference_sha256':ref['reference_sha256'],'adapter_sha256':expected,
            'status':stats['estado'],**stats})
        pilot.guardar(out/'manifest.json',rows);print('CHATTERBOX_M5',phrase['id'],flush=True)


if __name__=='__main__':main()
