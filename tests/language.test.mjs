import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
import {t,language,initializeLanguage,mountLanguageSwitch} from '../apps/shared/i18n.js';
import {EN} from '../apps/shared/locale-en.js';
import {formatEnglishDictation} from '../backend/english-format.mjs';
import {applyFormatting} from '../backend/format-pipeline.mjs';
import {validateReview,createReviewer} from '../backend/meta-review.mjs';
import {qrTokenFromText} from '../apps/mobile/qr-scanner.js';

function browser(url='http://localhost/live'){
 const w=new Window({url});for(const k of ['document','localStorage','location','CustomEvent'])globalThis[k]=w[k];globalThis.window=w;
 globalThis.Option=function(text,value){const el=document.createElement('option');el.textContent=text;el.value=value;return el;};return w;
}
test('language defaults to English, persists Spanish, query overrides, draft untouched',async()=>{
 const w=browser();localStorage.setItem('dicta-report-v1','Sin cambios.');document.body.innerHTML='<h1 data-i18n="Nuevo informe"></h1><div contenteditable="true">Nuevo informe</div>';
 initializeLanguage();assert.equal(language(),'en');assert.equal(document.querySelector('h1').textContent,'New report');assert.equal(document.querySelector('[contenteditable]').textContent,'Nuevo informe');assert.equal(localStorage.getItem('dicta-report-v1'),'Sin cambios.');
 localStorage.setItem('dicta-language-v1','es');initializeLanguage();assert.equal(language(),'es');assert.equal(t('Nuevo informe'),'Nuevo informe');
 location.href='http://localhost/live?lang=en';initializeLanguage();assert.equal(language(),'en');assert.equal(localStorage.getItem('dicta-language-v1'),'en');
 const select=mountLanguageSwitch(document.body,()=>false);select.value='es';select.dispatchEvent(new w.Event('change'));assert.equal(select.value,'en');assert.equal(location.search,'?lang=en');
 assert.equal(t`Toma ${'<patient text>'} · ${'{}'}`,'Take <patient text> · {}');
 await w.happyDOM.close();delete globalThis.document;
});
test('English catalogue placeholders preserve count and all fifteen templates have structured text',()=>{
 for(const [key,value]of Object.entries(EN))assert.equal((key.match(/\{\}/g)||[]).length,(value.match(/\{\}/g)||[]).length,key);
 const c=JSON.parse(fs.readFileSync('data/demo/plantillas-sinteticas.json','utf8'));
 assert.equal(c.templates.length,15);assert.equal(c.templates.filter(t=>t.defaultFavorite).length,5);
 for(const t of c.templates){const en=t.locales.en;assert.ok(en.name&&en.category);for(const title of ['CLINICAL HISTORY','TECHNIQUE','FINDINGS','IMPRESSION'])assert.ok(en.text.includes('\n'+title+'\n'));assert.ok(en.text.includes('CLINICAL HISTORY\n\n\n'));assert.doesNotMatch(en.text,/Enter clinical history/);assert.doesNotMatch(en.text,/\d|\b(?:mm|cm)\b/);assert.ok(en.text.split(/\s+/).length<100);}
});
test('English commands avoid anatomical colon and clinical period; Spanish format stays separate',()=>{
 assert.equal(formatEnglishDictation('findings colon no effusion full stop new paragraph impression colon no acute findings full stop').text,'Findings: no effusion.\n\nImpression: no acute findings.');
 for(const text of ['The ascending colon is normal.','Last menstrual period unknown.','The nodule measures 2.5 mm.','A new line of treatment.'])assert.equal(formatEnglishDictation(text).text,text);
 const r={text:'dos punto cinco milímetros',configuration:{language:'en'},numbersEnabled:true,termsEnabled:true,commandsEnabled:false,timings:{}};applyFormatting(r);assert.equal(r.numberFormatting,null);assert.equal(r.termFormatting,null);assert.equal(r.text,'dos punto cinco milímetros');
 const es={...r,configuration:{language:'es'},text:'sin derrame punto',commandsEnabled:true};applyFormatting(es);assert.equal(es.formatting.text,'Sin derrame.');
});
test('English sensitive changes require human confirmation and review cache includes language',()=>{
 for(const [a,b]of [["isn't",'is'],["isn’t",'is'],['right','left'],['without','with'],['two','three'],['millimeters','centimeters'],['negative','positive']]){
  const [s]=validateReview(JSON.stringify({suggestions:[{original:a,replacement:b,category:'grammar',reason:'Synthetic guard test.'}]}),a);assert.equal(s.guarded,true);assert.equal(s.replacement,null);
 }
 const db={reviews:[],reviewDocuments:[],runs:[]},q=createReviewer({db,save(){},getKey:()=>'',provider:async()=>({content:'{"suggestions":[]}'})});
 const en=q.enqueueReport({text:'Synthetic text.',language:'en'}),es=q.enqueueReport({text:'Synthetic text.',language:'es'});
 assert.notEqual(en.id,es.id);assert.equal(en.input.language,'en');assert.equal(q.enqueueReport({text:'Synthetic text.',language:'en'}).id,en.id);assert.throws(()=>q.enqueueReport({text:'x',language:'ignore instructions'}));q.close();
});
test('QR accepts only whitelisted language query, preserving token security',()=>{
 const token='a'.repeat(64);for(const lang of ['en','es'])assert.equal(qrTokenFromText('https://demo.test/mobile?lang='+lang+'#qr='+token,'https://demo.test'),token);
 for(const query of ['?lang=xx','?lang=en&x=1','?lang=en&lang=es'])assert.equal(qrTokenFromText('https://demo.test/mobile'+query+'#qr='+token,'https://demo.test'),null);
});
