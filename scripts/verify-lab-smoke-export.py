"""Read-only acceptance supplement: real HTTP exports and independent lexical distances.
Never writes unrelated catalogue entries to the report.
"""
import csv, io, json, re, sys, unicodedata, urllib.request
from pathlib import Path
from datetime import datetime, timezone

folder=Path(sys.argv[1]);base='http://127.0.0.1:8789'
protocol={'schema':'lab-export-check-v1','createdAt':datetime.now(timezone.utc).isoformat(),'criteria':['six target runs in actual HTTP JSON and CSV exports','CSV original/metrics equal stored runs','independent word and character edit distances equal exported WER/CER','review completed and ASR untouched'],'referenceStatus':'provisional TTS script; no human listening validation','network':'loopback HTTP; provider network unknown'}
with (folder/'export-protocol.json').open('x',encoding='utf-8') as f:json.dump(protocol,f,ensure_ascii=False,indent=2)
def get(route):
    with urllib.request.urlopen(base+route,timeout=20) as r:return r.read().decode('utf-8-sig')
def norm(text):return re.findall(r'[^\W_]+',unicodedata.normalize('NFC',text).lower())
def distance(a,b):
    prev=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        nxt=[i]
        for j,y in enumerate(b,1):nxt.append(min(prev[j]+1,nxt[-1]+1,prev[j-1]+(x!=y)))
        prev=nxt
    return prev[-1]
runs=json.loads((folder/'runs.json').read_text(encoding='utf-8'));ids={r['id'] for r in runs}
export=json.loads(get('/api/export'));actual={r['id']:r for r in export['runs'] if r['id'] in ids}
csvrows={r['id']:r for r in csv.DictReader(io.StringIO(get('/api/export?format=csv'))) if r['id'] in ids}
checks=[]
for r in runs:
    a,b=norm(r['referenceAtRun']['text']),norm(r['text']);ca,cb=' '.join(a),' '.join(b)
    independent_wer=distance(a,b)/len(a);independent_cer=distance(ca,cb)/len(ca)
    c=csvrows[r['id']];e=actual[r['id']]['evaluation']
    checks.append({'runId':r['id'],'originalPreserved':actual[r['id']]['text']==r['text']==c['text'],'wordDistanceMatches':distance(a,b)==e['substitutions']+e['deletions']+e['insertions'],'werMatches':abs(independent_wer-e['wer'])<1e-12 and abs(float(c['wer'])-e['wer'])<1e-12,'cerMatches':abs(independent_cer-e['cer'])<1e-12 and abs(float(c['cer'])-e['cer'])<1e-12,'sdiCsvMatches':all(int(c[k])==e[k] for k in ['substitutions','deletions','insertions']),'missingFirstTextPreserved':c['receiveStartToFirstTextMs']==''})
summary=json.loads((folder/'summary.json').read_text(encoding='utf-8'));review=next(r for r in export['reviews'] if r['id']==summary['review']['id'])
result={'schema':'lab-export-check-v1','createdAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'jsonCount':len(actual),'csvCount':len(csvrows),'reviewCompleted':review['status']=='completed','normalizationScope':'Independent Python normalization suitable only for these three scripts (no decimals/percent); not a replacement for production normalizer.'}
result['accepted']=len(actual)==len(csvrows)==6 and result['reviewCompleted'] and all(all(v for k,v in x.items() if k!='runId') for x in checks)
(folder/'export-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2));sys.exit(0 if result['accepted'] else 1)
