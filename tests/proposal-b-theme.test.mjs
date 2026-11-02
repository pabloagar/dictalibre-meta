import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../apps/shared/style.css',import.meta.url),'utf8').split('/* Propuesta B rev3: exact supplied tokens, scoped to desktop. */')[1];
const palettes={dia:['#e2ded4','#ebe7dd','#e5e1d7','#2b2823','#5b554b','#c9c1b3','#dbd5c8','#7a5217','#e9dcc5','#45403a','#f1ede4','#97392a','#3b6536'],penumbra:['#0e0f10','#15171a','#111214','#c4c9ce','#878e95','#2e3237','#1f2226','#8eaed6','#1d2834','#2b3b4f','#dce6f2','#e08a7e','#8cbf98'],ambar:['#110e0a','#18140f','#14110d','#d8c9b0','#9d8f79','#352e24','#251f17','#d6a04b','#2c2215','#c8954a','#1a1208','#e2846a','#a8c48a']};
const keys=['bg','sheet','bar','ink','muted','line','soft','accent','accent-bg','act','act-ink','rec','ok'];
const luminance=hex=>hex.slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const [theme,values] of Object.entries(palettes))test('B: tokens exactos y contraste de texto en '+theme,()=>{
 const block=css.split('body.clinical-workspace[data-theme="'+theme+'"]')[1].split('}')[0];const actual=Object.fromEntries([...block.matchAll(/--dl-([\w-]+):\s*(#[\da-f]{6})/g)].map(m=>[m[1],m[2]]));
 for(const [i,key] of keys.entries())assert.equal(actual[key],values[i],key);
 for(const foreground of ['ink','muted'])for(const background of ['sheet','bar','bg','soft'])assert.ok(contrast(actual[foreground],actual[background])>=4.5,foreground+' on '+background);
 assert.ok(contrast(actual['act-ink'],actual.act)>=4.5);
 for(const background of ['sheet','accent-bg'])assert.ok(contrast(actual.accent,actual[background])>=4.5);
});
