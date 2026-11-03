"""Create a portable private comparison without changing original WAV or manifest."""
import argparse
import base64
import json
from pathlib import Path
import pilot


def build(source, output, description):
    source=Path(source)
    rows=pilot.leer(source/'manifest.json')
    for row in rows:
        audio=pilot.dentro(source,row['archivo'])
        if pilot.sha(audio)!=row['sha256']:
            raise ValueError('audio_hash_mismatch')
        row['audio']='data:audio/wav;base64,'+base64.b64encode(audio.read_bytes()).decode()
    data={'manifest_sha256':pilot.sha(source/'manifest.json'),'rows':rows,'description':description}
    text=(pilot.HERE/'compare.html').read_text(encoding='utf-8')
    Path(output).write_text(text.replace('__DATA__',json.dumps(data,ensure_ascii=False).replace('<','\\u003c')),encoding='utf-8')


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--source',required=True);p.add_argument('--output',required=True)
    p.add_argument('--description',required=True)
    a=p.parse_args();build(a.source,a.output,a.description)
