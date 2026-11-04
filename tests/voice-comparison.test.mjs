import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const template=fs.readFileSync('scripts/voices-chile/compare.html','utf8');
function setup(stored){const w=new Window({url:'http://localhost'});const rows=[0,1,2,3].map(i=>({case_id:'case'+Math.floor(i/2),voice_label:'clf_1',archivo:'a'+i,sha256:'hash'+i,variant:i%2?'extendido':'base',text:'Frase sintética',audio:'data:audio/wav;base64,'}));if(stored)w.localStorage.setItem('chile-comparison-test',JSON.stringify(stored));w.document.write(template.replace('__DATA__',JSON.stringify({manifest_sha256:'test',rows})));w.eval(template.split('<script>')[1].split('</script>')[0]);return w}
test('comparison keeps independent scores, validates next, filters and restores drafts',()=>{const w=setup(),d=w.document;assert.equal(d.querySelectorAll('audio').length,2);d.querySelector('#next').click();assert.match(d.querySelector('#message').textContent,/Completa/);function rate(){d.querySelector('input').click();for(const f of d.querySelectorAll('fieldset'))f.querySelector('button').click()}rate();d.querySelectorAll('.player button')[1].click();assert.equal(d.querySelector('input').checked,false);rate();d.querySelector('#next').click();assert.match(d.querySelector('#position').textContent,/2 de 2/);d.querySelector('#prev').click();assert.equal(d.querySelector('input').checked,true);assert.match(d.querySelector('#status').textContent,/2 \/ 4/);const saved=JSON.parse(w.localStorage.getItem('chile-comparison-test'));assert.equal(saved.a0.accent,1);assert.equal(saved.a1.content,'correct');assert.equal(saved.a2.accent,null);const restored=setup(saved);assert.equal(restored.document.querySelector('input').checked,true);w.happyDOM.abort();restored.happyDOM.abort()});
test('stale hashes and storage failures never report a saved completed review',()=>{const w=setup({a0:{sha256:'old',listened:true,accent:5,naturalness:5,content:'correct'}});assert.equal(w.document.querySelector('input').checked,false);Object.defineProperty(w,'localStorage',{value:{setItem(){throw Error('full')}}});w.document.querySelector('input').click();assert.match(w.document.querySelector('#status').textContent,/Sin guardar/);w.happyDOM.abort()});


import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
test('eight-voice builder retains blind ratings and shows one pair at a time',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'voice-ui-'));
 try{
 const references=['F1','F2','F3','F4','M1','M2','M3','M4'].map(label=>({label,split:'validation'}));
 const phrases=[1,2,3,4,5].map(i=>({id:'p'+i,text:'Synthetic test phrase'}));
 const rows=references.flatMap(r=>phrases.flatMap(p=>['parent','candidate'].map(condition=>({voice:r.label,phrase:p.id,condition,archivo:r.label+p.id+condition+'.wav',status:'ok'}))));
 rows.push(...references.map(r=>({voice:r.label,phrase:'p3',condition:'base_control',archivo:r.label+'.wav'})));
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(rows));fs.writeFileSync(path.join(dir,'protocol.json'),JSON.stringify({references,phrases}));
 execFileSync('python',['scripts/voices-chile/build_eight_player.py','--comparison',dir,'--protocol',path.join(dir,'protocol.json')]);
 const html=fs.readFileSync(path.join(dir,'ESCUCHAR_OCHO.html'),'utf8'),w=new Window({url:'http://localhost'});w.document.write(html);w.eval([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'));const d=w.document;
 assert.equal([...d.querySelectorAll('.card')].filter(c=>!c.hidden).length,1);assert.equal(d.querySelector('.card').querySelectorAll('.choices').length,8);assert.equal(d.querySelector('#reveal').disabled,true);
 d.querySelector('#minimal-nav .primary').click();assert.match(d.querySelector('#message').textContent,/Completa/);
 for(const box of d.querySelector('.card').querySelectorAll('.sample')){box.querySelector('.heard').click();for(const choices of box.querySelectorAll('.choices'))choices.querySelector('button').click()}
 d.querySelector('#minimal-nav .primary').click();assert.equal([...d.querySelectorAll('.card')].findIndex(c=>!c.hidden),1);
 const tabs=[...d.querySelectorAll('.bench-header nav button')];assert.equal(tabs.length,4);
 tabs[2].click();assert.match(d.querySelector('.bench-panel').textContent,/2\/10/);assert.equal(d.querySelector('.bench-panel').textContent.includes('4.020 pasos'),false);assert.equal(d.querySelector('#cards').hasAttribute('data-bench-hidden'),true);
 tabs[0].click();assert.equal(d.querySelectorAll('.voice-tile').length,8);d.querySelectorAll('.voice-tile button')[4].click();assert.equal(d.querySelector('#cards').hasAttribute('data-bench-hidden'),false);assert.equal(d.querySelector('[data-voice=M1]').className,'active');assert.equal([...d.querySelectorAll('.card')].findIndex(c=>!c.hidden),0);
 tabs[3].click();assert.match(d.querySelector('.bench-panel').textContent,/750 pasos/);w.happyDOM.abort();
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
