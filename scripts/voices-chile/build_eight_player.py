"""Build a local, blind A/B review page for the eight-voice research run."""
import argparse
import hashlib
import json
import random
from pathlib import Path


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--comparison', required=True)
    p.add_argument('--protocol', required=True)
    p.add_argument('--three-way', action='store_true')
    p.add_argument('--cross-engine', action='store_true')
    a = p.parse_args()
    a.three_way = a.three_way or a.cross_engine
    folder = Path(a.comparison)
    rows = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    protocol = json.loads(Path(a.protocol).read_text(encoding='utf-8'))
    playback_path = folder / 'playback_manifest.json'
    playback = {}
    if playback_path.exists():
        corrected = json.loads(playback_path.read_text(encoding='utf-8'))
        assert corrected['source_manifest_sha256'] == hashlib.sha256((folder / 'manifest.json').read_bytes()).hexdigest()
        playback = {r['id']: r['archivo'] for r in corrected['rows']}
    conditions = ['base_control', 'parent', 'candidate'] if a.three_way else ['parent', 'candidate']
    if a.cross_engine: conditions = ['qwen_base', 'qwen_adjusted', 'chatterbox']
    pairs = {}
    for row in rows:
        if row['condition'] in conditions:
            pairs.setdefault((row['voice'], row['phrase']), {})[row['condition']] = row
    assert len(pairs) == (20 if a.cross_engine else 40) and len(rows) == (60 if a.cross_engine else 120 if a.three_way else 88)
    rng = random.Random(20261103)
    cards = []
    for ref in protocol['references']:
        for phrase in protocol['phrases']:
            key = (ref['label'], phrase['id'])
            pair = pairs[key]
            assert set(pair) == set(conditions)
            order = conditions.copy()
            rng.shuffle(order)
            cards.append({
                'key': '_'.join(key), 'voice': ref['label'], 'split': ref['split'],
                'phrase': phrase['id'], 'text': phrase['text'],
                **{side: {'file': playback.get(pair[condition].get('id'), pair[condition]['archivo']),
                           'status': pair[condition]['status'], 'condition': condition}
                   for side, condition in zip('ABC', order)},
            })
    controls = {r['voice']: playback.get(r.get('id'), r['archivo']) for r in rows if r['condition'] == 'base_control'}
    assert len(controls) == (0 if a.cross_engine else 8)
    targets = {
        'F1': 'Mujer joven · habla rápida y natural',
        'F2': 'Mujer adulta · dicción clínica formal',
        'F3': 'Mujer adulta · entonación conversacional',
        'F4': 'Mujer · ritmo pausado',
        'M1': 'Hombre joven · habla rápida y aspiración de /s/',
        'M2': 'Hombre adulto · dictado radiológico',
        'M3': 'Hombre adulto · entonación chilena espontánea',
        'M4': 'Hombre · voz grave y pausas naturales',
    }
    if a.cross_engine:
        targets = {r['label']: ('Mujer' if r['label'].startswith('F') else 'Hombre') + ' · referencia ' + r['label'] for r in protocol['references']}
    reference_files = {r['label']: 'references/' + r['reference_audio']
                       for r in protocol['references']
                       if r.get('reference_audio') and (folder / 'references' / r['reference_audio']).is_file()}
    payload = json.dumps({'cards': cards, 'controls': controls, 'targets': targets,
                          'reference_files': reference_files, 'sides': list('ABC' if a.three_way else 'AB'),
                          'conditions': conditions, 'three_way': a.three_way,
                          'steps': protocol['condition_steps'] if a.cross_engine else {'base_control': 0, 'parent': 4020, 'candidate': 4770},
                          'cross_engine': a.cross_engine, 'labels': protocol.get('condition_labels', {}),
                          'manifest_id': hashlib.sha256((folder/'manifest.json').read_bytes()).hexdigest()[:12]}, ensure_ascii=False).replace('<', '\\u003c')
    html = '''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ocho voces · comparación ciega</title><style>
:root{color-scheme:light;font:16px system-ui,sans-serif;background:#f6f8f5;color:#18342c}body{max-width:1100px;margin:auto;padding:24px}
h1{font-size:1.8rem;margin-bottom:4px}.muted{color:#52675e}.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:22px 0}
button,select,input,textarea{font:inherit}button,select{border:1px solid #9bb4a7;border-radius:8px;background:white;padding:8px 12px;color:inherit}
button.active{background:#135b43;color:white}.card{background:white;border:1px solid #cadbd0;border-radius:13px;padding:20px;margin:18px 0}
.quote{border-left:4px solid #135b43;padding:10px 14px;background:#f5f8f5;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.sample{border:1px solid #d5e1d9;border-radius:10px;padding:14px}.sample h3{margin:0 0 9px}.sample audio{width:100%}
.scores{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}.scores label{font-size:.86rem;display:grid;gap:4px}
textarea{box-sizing:border-box;width:100%;min-height:48px;border:1px solid #b2c4b8;border-radius:8px;padding:8px;margin-top:10px}
.small{font-size:.83rem}.bad{color:#a33}#control{margin-top:25px} @media(max-width:700px){.grid,.scores{grid-template-columns:1fr}}
</style><body><h1>¿Cambió el acento chileno?</h1><p class="muted">Ocho referencias, cinco frases iguales y dos checkpoints por frase. Escucha cada audio completo antes de puntuar. A/B están ocultos hasta exportar las 80 evaluaciones.</p>
<p class="small">Cinco hablantes no aparecen en el entrenamiento y tres sí. Los perfiles de edad, ritmo y rasgos fonéticos siguen sin verificar. Investigación privada; ninguna muestra tiene autorización comercial confirmada.</p>
<div class="bar" id="voices"></div><p id="profile" class="small"></p><details id="refdetail"><summary>Escuchar referencia original de esta voz</summary><p class="small muted">Usa este audio para comprobar el perfil propuesto. Edad, ritmo y fonética aún no están certificados.</p><audio controls preload="none"></audio></details><p id="progress"></p><main id="cards"></main>
<div class="bar"><button id="export">Exportar evaluación JSON</button><button id="reveal" disabled>Revelar A/B tras completar</button></div><p id="message" class="muted"></p>
<details id="control"><summary>Control del modelo base · una frase por voz</summary><div id="controls"></div></details>
<script>const DATA=__PAYLOAD__;const SIDES=DATA.sides;const KEY=DATA.cross_engine?'dictalibre-qwen-four-v1-'+DATA.manifest_id:DATA.three_way?'dictalibre-eight-abc-v1':'dictalibre-eight-20261103';let state=JSON.parse(localStorage.getItem(KEY)||'{}');const exposure=JSON.parse(localStorage.getItem(KEY+'-exposure')||'null')||{ever_revealed:false,labels_visible:false,events:[],prior_exposure:null};let voice=Object.keys(DATA.targets)[0],revealed=DATA.cross_engine&&exposure.labels_visible;
const metrics=[['accent','Acento chileno'],['naturalness','Naturalidad']];
function save(id,field){if(DATA.cross_engine&&id&&field){((state[id]??={}).field_context??={})[field]={labels_visible:revealed,ever_revealed_since_tracking:exposure.ever_revealed,updated_utc:new Date().toISOString()}}localStorage.setItem(KEY,JSON.stringify(state));progress()}
function complete(){return DATA.cards.every(c=>SIDES.every(side=>{let v=state[c.key+'_'+side];return v?.heard&&metrics.every(([k])=>Number.isInteger(Number(v[k]))&&v[k]!==null&&v[k]!==undefined&&v[k]!==''&&Number(v[k])>=0&&Number(v[k])<=5)}))}
function progress(){let n=DATA.cards.reduce((a,c)=>a+SIDES.filter(s=>state[c.key+'_'+s]?.heard).length,0);document.getElementById('progress').textContent=`${n}/${DATA.cards.length*SIDES.length} escuchados · ${DATA.cards.filter(c=>SIDES.every(s=>{let v=state[c.key+'_'+s];return v?.heard&&metrics.every(([k])=>v[k]!==null&&v[k]!==undefined&&v[k]!==''&&Number(v[k])>=0&&Number(v[k])<=5)})).length}/${DATA.cards.length} frases puntuadas`;document.getElementById('reveal').disabled=!DATA.cross_engine&&!complete()}
function render(){document.getElementById('voices').innerHTML=Object.keys(DATA.targets).map(v=>`<button class="${v===voice?'active':''}" data-voice="${v}">${v}</button>`).join('');document.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{voice=b.dataset.voice;render()});document.getElementById('profile').textContent='Perfil buscado: '+DATA.targets[voice]+' · pendiente de confirmar en la referencia';const ref=DATA.reference_files[voice];document.querySelector('#refdetail audio').src=ref||'';document.getElementById('refdetail').hidden=!ref;
const root=document.getElementById('cards');root.innerHTML='';for(const card of DATA.cards.filter(c=>c.voice===voice)){const el=document.createElement('section');el.className='card';el.innerHTML=`<h2>Frase ${card.phrase.slice(1)}</h2><p class="quote"></p><p class="small muted">Referencia ${card.split==='validation'?'no vista':'vista'} durante el ajuste</p><div class="grid"></div>`;el.querySelector('.quote').textContent=card.text;
for(const side of SIDES){const sample=card[side],id=card.key+'_'+side,v=state[id]||{};const box=document.createElement('div');box.className='sample';box.innerHTML=`<h3>Muestra ${side}</h3><audio controls preload="none"></audio><p class="small"></p><label class="small"><input type="checkbox" class="heard"> Escuché el audio completo</label><div class="scores"></div><textarea placeholder="Errores de contenido, cortes, repeticiones u observaciones"></textarea>`;if(DATA.cross_engine&&revealed)box.querySelector('h3').textContent=side+' · '+DATA.labels[sample.condition];box.querySelector('audio').src=sample.file||'';box.querySelector('p').textContent=(sample.status==='ok'?'Archivo legible':`Estado técnico: ${sample.status}`)+(revealed&&!DATA.cross_engine?' · '+(DATA.labels[sample.condition]||DATA.steps[sample.condition].toLocaleString('es-CL')+' pasos de ajuste'):'');box.querySelector('.heard').checked=!!v.heard;box.querySelector('.heard').onchange=e=>{(state[id]??={}).heard=e.target.checked;save(id,'heard')};
for(const [key,label] of metrics){const wrap=document.createElement('label');wrap.textContent=label;const select=document.createElement('select');select.innerHTML='<option value="">Sin evaluar</option>'+[0,1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('');select.value=v[key]??'';select.onchange=e=>{(state[id]??={})[key]=e.target.value;save(id,key)};wrap.append(select);box.querySelector('.scores').append(wrap)}box.querySelector('textarea').value=v.notes||'';box.querySelector('textarea').onchange=e=>{(state[id]??={}).notes=e.target.value;save(id,'notes')};el.querySelector('.grid').append(box)}root.append(el)}progress()}
document.getElementById('export').onclick=()=>{const out={evaluation_context:DATA.cross_engine?exposure:null,evaluation_version:DATA.cross_engine?'qwen-chatterbox-four-v2':DATA.three_way?'accent-naturalness-abc-v1':'accent-naturalness-v2',active_metrics:metrics.map(([key])=>key),conditions_steps:DATA.steps,rating_scale:{min:0,max:5,unrated:null},protocol:DATA.cross_engine?'protocol.json':'eight_voice_protocol.json',created_utc:new Date().toISOString(),ratings:state,blinding_map:DATA.cards.map(c=>({key:c.key,...Object.fromEntries(SIDES.map(s=>[s,c[s].condition]))})),complete:complete()};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=DATA.cross_engine?'evaluacion_qwen_chatterbox.json':'evaluacion_ocho_voces.json';link.click();URL.revokeObjectURL(link.href);document.getElementById('message').textContent=out.complete?'Evaluación completa exportada.':'Evaluación parcial exportada; conserva los pendientes.'};
document.getElementById('reveal').onclick=()=>{if(DATA.cross_engine){revealed=!revealed;exposure.labels_visible=revealed;exposure.ever_revealed||=revealed;exposure.events.push({labels_visible:revealed,utc:new Date().toISOString()});localStorage.setItem(KEY+'-exposure',JSON.stringify(exposure));render()}else{if(!complete())return;revealed=true;render()}};
for(const [name,file] of Object.entries(DATA.controls)){const p=document.createElement('p');p.textContent=name+' · frase 03';const a=document.createElement('audio');a.controls=true;a.preload='none';a.src=file;p.append(a);document.getElementById('controls').append(p)}render();</script></body></html>'''.replace('__PAYLOAD__', payload)
    target = folder / ('QWEN_VS_CHATTERBOX.html' if a.cross_engine else 'ESCUCHAR_OCHO.html')
    from minimal_review import minimal_eight
    result = minimal_eight(html)
    if a.three_way:
        result = result.replace('dos checkpoints por frase', 'tres versiones por frase').replace('las 80 evaluaciones', 'las 120 evaluaciones').replace('Revelar A/B tras completar', 'Revelar A/B/C tras completar')
    if a.cross_engine:
        result = result.replace('Ocho voces · comparación ciega', 'Qwen y Chatterbox · cuatro voces')
    target.write_text(result, encoding='utf-8')
    print(target, hashlib.sha256(target.read_bytes()).hexdigest())


if __name__ == '__main__':
    main()
