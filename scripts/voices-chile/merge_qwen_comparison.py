"""Verify and join 40 Qwen samples with 20 matched Chatterbox controls privately."""
import argparse
import hashlib
import shutil
import zipfile
from pathlib import Path
import pilot


def main():
    parser=argparse.ArgumentParser()
    for key in ('qwen','chatter5','previous','protocol','archives','output'):
        parser.add_argument('--'+key,required=True)
    a=parser.parse_args();qwen=Path(a.qwen);old=Path(a.previous);m5=Path(a.chatter5);out=Path(a.output)
    p=pilot.leer(a.protocol);summary=pilot.leer(qwen/'summary.json')
    assert summary['status']=='complete' and len(p['references'])==4
    labels={r['label']:r for r in p['references']};phrases={r['id']:r['text'] for r in p['phrases']}
    inputs=[(qwen,r) for r in pilot.leer(qwen/'manifest.json')]
    assert len(inputs)==40
    inputs += [(old,r) for r in pilot.leer(old/'manifest.json') if r['condition']=='parent' and r['voice'] in labels]
    inputs += [(m5,r) for r in pilot.leer(m5/'manifest.json')]
    assert len(inputs)==60
    rows=[];files=[]
    for folder,row in inputs:
        row=dict(row);source_id=row['id'];source_file=row['archivo']
        assert row['reference_sha256']==labels[row['voice']]['reference_sha256']
        assert row['text']==phrases[row['phrase']]
        path=pilot.dentro(folder,source_file);raw=path.with_suffix('.npy')
        assert pilot.sha(path)==row['sha256'] and pilot.sha(raw)==row['raw_sha256']
        if folder==qwen:
            assert row['steps']==(0 if row['condition']=='base' else summary['best_step'])
        condition=('qwen_'+row['condition']) if folder==qwen else 'chatterbox'
        if condition=='chatterbox':assert row['steps']==4020 and row['adapter_sha256']=='314c213a0bbc10883968b29d331200182d2930056277276d8398d8209883787e'
        row.update(condition=condition,id=f'{condition}_{row["voice"]}_{row["phrase"]}')
        row['archivo']=row['id']+'.wav';row['source_id']=source_id
        files.append((path,raw,row['archivo']));rows.append(row)
    expected={(c,v,f) for c in ('qwen_base','qwen_adjusted','chatterbox') for v in labels for f in phrases}
    assert {(r['condition'],r['voice'],r['phrase']) for r in rows}==expected
    out.mkdir(parents=True,exist_ok=False);(out/'references').mkdir()
    for path,raw,name in files:
        shutil.copy2(path,out/name);shutil.copy2(raw,(out/name).with_suffix('.npy'))
    for sex in ('female','male'):
        with zipfile.ZipFile(Path(a.archives)/f'es_cl_{sex}.zip') as z:
            lookup={Path(n).name:n for n in z.namelist() if n.endswith('.wav')}
            for ref in labels.values():
                if ref['reference_audio'] not in lookup:continue
                data=z.read(lookup[ref['reference_audio']]);assert hashlib.sha256(data).hexdigest()==ref['reference_sha256']
                (out/'references'/ref['reference_audio']).write_bytes(data)
    assert len(list((out/'references').glob('*.wav')))==4
    p['condition_steps']={'qwen_base':0,'qwen_adjusted':summary['best_step'],'chatterbox':4020}
    p['condition_labels']={'qwen_base':'Qwen original','qwen_adjusted':f'Qwen ajustado · {summary["best_step"]} pasos',
        'chatterbox':'Chatterbox ajustado · 4.020 pasos'}
    pilot.guardar(out/'protocol.json',p);pilot.guardar(out/'manifest.json',rows)
    shutil.copy2(qwen/'summary.json',out/'qwen_summary.json')
    shutil.copy2(qwen/'generation_batches.json',out/'qwen_generation_batches.json')
    print('MATCHED_COMPARISON',len(rows),pilot.sha(out/'manifest.json'))


if __name__=='__main__':main()
