import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Window} from 'happy-dom';
const html=fs.readFileSync('apps/desktop/index.html','utf8');
const boot=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(theme){
 const window=new Window({url:'https://example.test/live'});window.document.write(html.replace(/<script[\s\S]*?<\/script>/g,''));
 if(theme)window.localStorage.setItem('dicta-theme-v1',theme);
 let timeout;const measures=[];
 vm.runInNewContext(boot,{window,document:window.document,location:window.location,localStorage:window.localStorage,performance:{now:()=>10,measure:(...args)=>measures.push(args)},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>{timeout=null;}});
 return {window,measures,timeout:()=>timeout?.()};
}
test('arranque oculta interfaz heredada hasta montaje completo, conserva tema y mide transición',async()=>{
 const {window,measures}=setup('penumbra');const root=window.document.documentElement;
 assert.equal(root.dataset.boot,'loading');assert.equal(root.dataset.bootTheme,'penumbra');
 assert.equal(window.getComputedStyle(window.document.querySelector('.shell')).display,'none');
 window.dispatchEvent(new window.Event('dicta-ready'));assert.equal(root.hasAttribute('data-boot'),false);assert.equal(root.hasAttribute('data-boot-theme'),false);assert.equal(measures.length,1);
 await window.happyDOM.close();
});
test('error o espera agotada ofrece reintento sin mostrar interfaz antigua',async()=>{
 for(const kind of ['error','timeout']){const s=setup();if(kind==='error')s.window.dispatchEvent(new s.window.Event('dicta-startup-error'));else s.timeout();
 assert.equal(s.window.document.documentElement.dataset.boot,'error');assert.match(s.window.document.querySelector('#dicta-boot-message').textContent,/No se pudo/);
 assert.equal(s.window.getComputedStyle(s.window.document.querySelector('.shell')).display,'none');assert.equal(s.window.document.querySelector('#dicta-boot a').getAttribute('href'),'/live');await s.window.happyDOM.close();}
});
