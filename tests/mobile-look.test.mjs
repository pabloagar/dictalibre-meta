import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const html=fs.readFileSync('apps/mobile/index.html','utf8'),source=fs.readFileSync('apps/shared/mobile-look.js','utf8');
function setup(saved=null){const window=new Window({url:'http://localhost/mobile?lang=es'});window.document.write(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));if(saved!==null)window.localStorage.setItem('dicta-mobile-look',saved);return window;}
test('capa móvil conserva nodos, IDs y eventos existentes; no abre captura',async()=>{
 const w=setup(),d=w.document,ids=[...d.querySelectorAll('[id]')].map(n=>[n.id,n]);let clicks=0;d.getElementById('test-haptics').onclick=()=>clicks++;w.eval(source);
 for(const [id,node] of ids)assert.equal(d.getElementById(id),node,id);
 d.getElementById('test-haptics').click();assert.equal(clicks,1);assert.equal(d.getElementById('record').disabled,true);assert.equal(d.querySelectorAll('.m-viz').length,1);assert.equal(d.querySelectorAll('input[name=m-theme]').length,3);assert.equal(d.querySelectorAll('input[name=m-mic]').length,0);assert.equal(d.querySelectorAll('input[name=m-grab]').length,0);
 assert.ok(d.querySelector('.m-sheet #haptics'));assert.ok(d.querySelector('.m-sheet #close'));await w.happyDOM.close();
});
test('preferencias móviles: tres temas y preferencias anteriores sobreviven al montaje',async()=>{
 for(const theme of ['dia','penumbra','negatoscopio']){const w=setup(JSON.stringify({theme,mic:'onda',grab:{[theme]:'ia'}}));w.eval(source);assert.equal(w.document.body.dataset.theme,theme);assert.equal(w.document.body.dataset.mic,'onda');assert.equal(w.document.body.dataset.grab,'ia');w.dictaLook.set({mic:'halo'});assert.equal(JSON.parse(w.localStorage.getItem('dicta-mobile-look')).mic,'halo');await w.happyDOM.close();}
 const w=setup('"inválido"');w.eval(source);assert.equal(w.document.body.dataset.mic,'punto');await w.happyDOM.close();
});
test('estado visual depende de captura real y Ajustes no deja actuar debajo',async()=>{
 const w=setup(),d=w.document;w.eval(source);const details=d.querySelector('.more-options');details.open=true;details.dispatchEvent(new w.Event('toggle'));assert.equal(d.querySelector('header').inert,true);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));details.dispatchEvent(new w.Event('toggle'));assert.equal(details.open,false);assert.equal(d.querySelector('header').inert,false);
 d.getElementById('controls').hidden=false;w.dictaLook.refresh();assert.equal(d.body.dataset.conn,'on');assert.equal(d.body.dataset.state,'idle');d.getElementById('record').classList.add('recording');w.dictaLook.refresh();assert.equal(d.body.dataset.state,'rec');assert.equal(d.querySelector('.m-state').textContent,'GRABANDO');d.getElementById('record').classList.remove('recording');w.dictaLook.refresh();assert.equal(d.body.dataset.state,'idle');await w.happyDOM.close();
});
test('recursos del diseño móvil se cargan antes del controlador de audio',()=>{assert.ok(html.indexOf('/shared/mobile-look.js')<html.indexOf('/mobile.js'));const server=fs.readFileSync('backend/server.mjs','utf8');assert.ok(server.includes('/shared/mobile-look.css'));assert.ok(server.includes('/shared/mobile-look.js'));});
