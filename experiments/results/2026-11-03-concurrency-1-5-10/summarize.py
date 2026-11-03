import json, statistics, re, unicodedata
from pathlib import Path
root=Path('data/local')
manifest=json.loads((root/'concurrency-tts-20261102-v2/manifest.json').read_text(encoding='utf-8-sig'))
def words(s): return re.findall(r'[^\W\d_]+',unicodedata.normalize('NFC',s).lower())
def stats(v): return {'median':statistics.median(v),'min':min(v),'max':max(v),'mean':statistics.mean(v)}
levels=[]
for n in [1,5,10]:
 folder=root/f'concurrency-20261103-authorized-{n}'
 summary=json.loads((folder/'summary.json').read_text(encoding='utf-8'))
 rows=json.loads((folder/'results.json').read_text(encoding='utf-8'))
 protocol=json.loads((folder/'protocol.json').read_text(encoding='utf-8'))
 exact=[words(x['syntheticTranscript'])==words(manifest['cases'][x['session']-1]['script']) for x in rows]
 levels.append({'concurrent':n,'attempted':len(rows),'passed':sum(x['passed'] for x in rows),'wordsExactIgnoringCasePunctuation':sum(exact),'audioIntegrityPassed':sum(x['relayHashMatches'] and x['asrIntegrity'] for x in rows),'foreignMarkers':sum(x['foreignMarker'] for x in rows),'remainingActive':summary['activeAfter'],'stopToDoneMs':stats([x['stopToDoneMs'] for x in rows]),'matchedFirstAudioStopToDoneMs':stats([x['stopToDoneMs'] for x in rows if x['session']==1]),'handshakeMs':stats([x['handshakeMs'] for x in rows]),'createdAt':protocol['createdAt'],'build':summary['build'],'driverHash':protocol['driverHash'],'rows':[{k:v for k,v in x.items() if k!='syntheticTranscript'} for x in rows]})
for level in levels:
 level['medianDeltaFromOneMs']=level['stopToDoneMs']['median']-levels[0]['stopToDoneMs']['median']
out=Path('experiments/results/2026-11-03-concurrency-1-5-10');out.mkdir(parents=True,exist_ok=True)
report={'method':'3 rounds per level; synthetic Windows Helena speech, one Windows driver, real Render/Meta; no browser or physical microphone','normalization':'Full word sequence compared ignoring punctuation and case; punctuation is not validated','clock':'performance.now ms; message polling 10ms; precision and overhead not measured','network':None,'cost':None,'levels':levels}
(out/'summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
for x in levels: print(json.dumps({k:v for k,v in x.items() if k!='rows'},ensure_ascii=False))
