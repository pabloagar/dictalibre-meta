import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('apps/shared/style.css','utf8');
const luminance=h=>h.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const x=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (x[0]+.05)/(x[1]+.05);};
for(const theme of ['sala-neutral','negatoscopio','contraste'])test('paleta '+theme+': contraste de texto principal, secundario y acción',()=>{
 const rule=css.split('.clinical-workspace [data-theme="'+theme+'"]{')[1].split('}')[0];
 const tokens=Object.fromEntries([...rule.matchAll(/(--[a-z-]+):(#[0-9a-f]{6});/g)].map(m=>[m[1],m[2]]));
 for(const [ink,bg] of [['--dl-ink','--dl-sheet'],['--dl-muted','--dl-sheet'],['--review-cta-ink','--review-cta']])assert.ok(ratio(tokens[ink],tokens[bg])>=4.5,ink+' sobre '+bg);
 if(theme==='negatoscopio')for(const ink of ['--dl-chrome-ink','--dl-chrome-muted'])assert.ok(ratio(tokens[ink],tokens['--dl-bar'])>=4.5);
});
