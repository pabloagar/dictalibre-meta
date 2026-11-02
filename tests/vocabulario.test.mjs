import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {parseVocabSource,buildCandidates,validateVocabulary,frequencyScore,rankGlossary,countTermFrequencies,findTerms,stableHash,glossaryToConfig,ESTADO_PENDIENTE} from '../backend/vocabulary.mjs';
import {createLab} from '../backend/lab.mjs';

const fuente=`TÍTULO
======================================================================
TAC DE TÓRAX Y TAC DE ALTA RESOLUCIÓN
======================================================================

[A] Neumonía e infección
condensación (15); condensaciones (0); broncograma aéreo (0); pulmón derecho (0); trombo no oclusivo (0); atelectasia (0); atelectasia laminar (0); milímetros (3)

[B] Enfermedad intersticial
panalización (0); bula (0); bulas (2); realce (5, base)
======================================================================
ANGIOTAC DE TÓRAX: TROMBOEMBOLISMO PULMONAR
======================================================================

[A] Tromboembolismo pulmonar
TEP (0); atelectasia (0); joroba de Hampton (0)
`;
const SECCIONES={'TAC DE TÓRAX Y TAC DE ALTA RESOLUCIÓN':['tc-torax'],'ANGIOTAC DE TÓRAX: TROMBOEMBOLISMO PULMONAR':['angiotc-torax-tep']};

test('vocabulario: lectura de la fuente, variantes agrupadas y exclusiones explícitas',()=>{
 const entradas=parseVocabSource(fuente);
 assert.equal(entradas.length,15);assert.equal(entradas.find(e=>e.term==='realce').base,true);assert.deepEqual(entradas[0],{section:'TAC DE TÓRAX Y TAC DE ALTA RESOLUCIÓN',group:'Neumonía e infección',prio:'A',term:'condensación',count:15});
 const {candidatos,excluidos}=buildCandidates(entradas,{secciones:SECCIONES,propuesta:['atelectasia']});
 const terminos=candidatos.map(c=>c.termino);
 assert.deepEqual(terminos,['condensación','broncograma aéreo','atelectasia','panalización','bula','TEP','joroba de Hampton']);
 assert.deepEqual(candidatos.find(c=>c.termino==='condensación').variantes_omitidas,['condensaciones']);
 assert.deepEqual(candidatos.find(c=>c.termino==='atelectasia').examenes,['tc-torax','angiotc-torax-tep']);
 assert.deepEqual(excluidos.lateralidad_negacion,['pulmón derecho','trombo no oclusivo']);
 assert.deepEqual(excluidos.unidades,['milímetros']);assert.equal(excluidos.origen_puc_omitidos,1,'términos PUC: solo se cuenta cuántos, sin nombrarlos');assert.equal(JSON.stringify(excluidos).includes('realce'),false);assert.deepEqual(excluidos.compuestos_con_candidato,['atelectasia laminar']);
 const c=candidatos.find(x=>x.termino==='condensación');
 assert.equal(c.apariciones_plantillas,null);assert.equal(c.tasa_error_sin_glosario,null);assert.equal(c.impacto_clinico,null);assert.equal(c.estado,ESTADO_PENDIENTE);
 assert.equal(c.propuesta_medicion,false);assert.equal(candidatos.find(x=>x.termino==='atelectasia').propuesta_medicion,true);
 assert.equal(JSON.stringify(candidatos).includes('15'),false,'los conteos de plantillas no se copian al vocabulario');
});

test('vocabulario versionado del repo: válido, sin duplicados y sin datos medidos inventados',()=>{
 const doc=JSON.parse(fs.readFileSync('data/vocabulario/candidatos-tc-torax.v1.json','utf8'));
 assert.deepEqual(validateVocabulary(doc),[]);
 assert.ok(doc.candidatos.every(c=>c.apariciones_plantillas===null&&c.tasa_error_sin_glosario===null&&c.impacto_clinico===null&&c.estado===ESTADO_PENDIENTE));
 const propuesta=doc.candidatos.filter(c=>c.propuesta_medicion).length;assert.ok(propuesta>=60&&propuesta<=80,`propuesta ${propuesta}`);
 const dup={...doc,candidatos:[...doc.candidatos,{...doc.candidatos[0],termino:doc.candidatos[0].termino.toUpperCase()}]};
 assert.match(validateVocabulary(dup).join(' '),/duplicado/);
 assert.match(validateVocabulary({...doc,candidatos:[{...doc.candidatos[0],termino:'x'.repeat(101)}]}).join(' '),/100 caracteres/);
 assert.match(validateVocabulary({...doc,candidatos:[{...doc.candidatos[0],grupo:'Inventado'}]}).join(' '),/grupo desconocido/);
 assert.match(validateVocabulary({...doc,candidatos:[{...doc.candidatos[0],tasa_error_sin_glosario:1.5}]}).join(' '),/tasa/);
});

test('frecuencia 1–3 con fuente visible; un cero en plantillas no significa raro',()=>{
 assert.deepEqual(frequencyScore(5,'B'),{valor:3,fuente:'plantillas'});
 assert.deepEqual(frequencyScore(1,'B'),{valor:2,fuente:'plantillas'});
 assert.deepEqual(frequencyScore(0,'A'),{valor:2,fuente:'editorial A/B (plantillas: 0)'});
 assert.deepEqual(frequencyScore(0,'B'),{valor:1,fuente:'editorial A/B (plantillas: 0)'});
 assert.deepEqual(frequencyScore(null,'A'),{valor:2,fuente:'editorial A/B (sin conteo)'});
});

const cand=(termino,prioridad='A')=>({termino,forma:'palabra',examenes:['tc-torax'],grupo:'g',prioridad,apariciones_plantillas:null,tasa_error_sin_glosario:null,impacto_clinico:null,estado:ESTADO_PENDIENTE,propuesta_medicion:true,variantes_omitidas:[]});
test('ranking: sin medir no entra, Muse ya lo reconoce no gasta espacio, determinista con hash',()=>{
 const candidatos=['atelectasia','bula','carina','enfisema','timoma','língula'].map(t=>cand(t));
 const mediciones={atelectasia:{observaciones:6,errores:6},bula:{observaciones:6,errores:3},carina:{observaciones:6,errores:0},timoma:{observaciones:6,errores:2},'língula':{observaciones:6,errores:2}};
 const impactos={atelectasia:2,bula:1,carina:3,timoma:3,enfisema:3};
 const a=rankGlossary({candidatos,mediciones,impactos,frecuencias:{},examen:'tc-torax'});
 assert.deepEqual(a.ranking.map(r=>r.termino),['atelectasia','timoma','bula']);
 assert.deepEqual(a.excluidos,{sin_medir:['enfisema'],sin_error_sin_glosario:['carina'],sin_impacto:['língula']});
 assert.deepEqual(a.glosarios['10'],{omitido:'Solo 3 términos elegibles; no se rellena.'});
 const b=rankGlossary({candidatos:[...candidatos].reverse(),mediciones,impactos,frecuencias:{},examen:'tc-torax'});
 assert.equal(a.hash,b.hash);assert.deepEqual(a.ranking,b.ranking);
 const c=rankGlossary({candidatos,mediciones,impactos:{...impactos,bula:2},frecuencias:{},examen:'tc-torax'});
 assert.notEqual(a.hash,c.hash);assert.notEqual(a.entradas.impactos,c.entradas.impactos);
 const muchos=Array.from({length:120},(_,i)=>cand('término '+String(i).padStart(3,'0')));
 const r=rankGlossary({candidatos:muchos,mediciones:Object.fromEntries(muchos.map(x=>[x.termino,{observaciones:6,errores:3}])),impactos:Object.fromEntries(muchos.map(x=>[x.termino,2])),frecuencias:{},examen:'tc-torax'});
 assert.equal(r.glosarios['100'].terminos.length,100);assert.equal(r.glosarios['10'].terminos.length,10);
 assert.throws(()=>rankGlossary({candidatos,mediciones,impactos,frecuencias:{},examen:'tc-torax',tamanos:[101]}),/100/);
});

test('frecuencias: deduplica plantillas, excluye rutas y entrega solo totales',()=>{
 const plantillas=[
  {id:'1',name:'TC de tórax',category:'TC',text:'Atelectasia basal. Atelectasia laminar.',sources:[{path:'a/1.docx'}]},
  {id:'2',name:'TC de tórax copia',category:'TC',text:'atelectasia  basal.\nATELECTASIA laminar.',sources:[{path:'b/2.docx'}]},
  {id:'3',name:'TC de tórax',category:'TC',text:'Atelectasia y bula.',sources:[{path:'28.10.26/x.docx'}]},
  {id:'4',name:'TC de tórax',category:'TC',text:'atelectasia sin tilde: atelectasia',sources:[{path:'c/4.docx'}]}];
 const r=countTermFrequencies({plantillas,terminos:['atelectasia','bula'],excluirRutas:['28.10.26']});
 assert.equal(r.textos.total,4);assert.equal(r.textos.excluidos_por_ruta,1);assert.equal(r.textos.unicos_exactos,3);assert.equal(r.textos.unicos_normalizados,2);
 assert.deepEqual(r.apariciones,{atelectasia:4,bula:0});assert.deepEqual(r.textos_con_termino,{atelectasia:2,bula:0});
 assert.equal(JSON.stringify(r).includes('basal'),false);assert.equal(JSON.stringify(r).includes('docx'),false);
});

test('coincidencia de términos: exacta, flexionada y sin falsos positivos dentro de palabras',()=>{
 assert.deepEqual(findTerms('Atelectasias basales y bula.',['atelectasia','bula','tela']),{exactos:['bula'],flexionados:['atelectasia']});
 assert.deepEqual(findTerms('vidrio esmerilado difuso',['vidrio esmerilado']),{exactos:['vidrio esmerilado'],flexionados:[]});
 assert.equal(stableHash({b:1,a:[2,{d:3,c:4}]}),stableHash({a:[2,{c:4,d:3}],b:1}));
});

test('glosario de solo lectura en el laboratorio; una versión nueva no altera tomas pasadas',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-vocab-')),glosarios=path.join(dir,'glosarios');fs.mkdirSync(glosarios);
 const escribir=(version,terminos)=>{const g={schema:'dicta-libre.glosario.v1',examen:'tc-torax',version,terminos,generadoEn:'2026-11-02T00:00:00.000Z',hash_entradas:'x'.repeat(64)};g.hash=stableHash({...g,hash:undefined});fs.writeFileSync(path.join(glosarios,`tc-torax.v${version}.json`),JSON.stringify(g));return g;};
 const v1=escribir(1,['atelectasia','bula']);
 assert.equal(glossaryToConfig(v1).id,`vocab:tc-torax:v1:${v1.hash.slice(0,12)}`);
 const wav=()=>{const b=Buffer.alloc(64044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;};
 const seen=[];const opts={dataDir:dir,keyFile:path.join(dir,'.env.local'),glossaryDir:glosarios,worker:{call:async m=>{fs.copyFileSync(m.input,m.output);},close(){}},muse:async(w,config)=>{seen.push(config.keywords);return {text:'atelectasia'};}};
 const start=async()=>{const lab=createLab(opts);lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');return {lab,base:`http://127.0.0.1:${lab.server.address().port}`};};
 let {lab,base}=await start();
 const post=(p,body)=>fetch(base+p,{method:'POST',headers:{Origin:base},body:Buffer.isBuffer(body)?body:JSON.stringify(body)});
 try{
  await post('/api/key',{key:'fixture'});const audio=await(await post('/api/audio',wav())).json();
  let state=await(await fetch(base+'/api/state')).json();const c1=state.configs.find(c=>c.readOnly);
  assert.deepEqual(c1.keywords,['atelectasia','bula']);assert.equal(c1.engine,'muse');assert.equal(c1.vocabulario.hash,v1.hash);
  assert.equal((await post('/api/configs',{engine:'muse',name:'copia',parentId:c1.id,keywords:[]})).status,400);
  assert.equal(lab.db.configs.some(c=>c.readOnly),false,'no se escribe en el catálogo');
  assert.ok((await post('/api/runs',{audioIds:[audio.id],configIds:[c1.id],repeats:1,reviewEnabled:false})).ok);
  for(let i=0;i<200&&lab.db.runs.some(r=>['queued','running'].includes(r.status));i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(lab.db.runs[0].status,'completed');assert.deepEqual(seen[0],['atelectasia','bula']);
  const closed=once(lab.server,'close');lab.close();await closed;
  fs.rmSync(path.join(glosarios,'tc-torax.v1.json'));const v2=escribir(2,['timoma']);
  ({lab,base}=await start());
  state=await(await fetch(base+'/api/state')).json();
  assert.deepEqual(state.configs.filter(c=>c.readOnly).map(c=>c.id),[`vocab:tc-torax:v2:${v2.hash.slice(0,12)}`]);
  assert.deepEqual(lab.db.runs[0].configuration.keywords,['atelectasia','bula']);assert.equal(lab.db.runs[0].configId,c1.id);
 }finally{const closed=once(lab.server,'close');lab.close();await closed;fs.rmSync(dir,{recursive:true,force:true});}
});

test('planilla del responsable: solo seleccionados con impacto 1–3; errores explícitos',async()=>{
 const {parseImpactSheet}=await import('../backend/vocabulary.mjs');
 const csv='﻿termino;grupo;forma;examenes;prioridad_editorial;propuesta_medicion;seleccionado (si/no);impacto_clinico (1-3);notas\r\natelectasia;Atelectasia y pleura;palabra;tc-torax;A;si;si;2;\r\n"bula; gigante";g;expresion;tc-torax;A;no;sí;3;"nota ""x"""\r\ncarina;g;palabra;tc-torax;A;si;no;;\r\ntimoma;g;palabra;tc-torax;A;si;si;;\r\n';
 const r=parseImpactSheet(csv);
 assert.deepEqual(r.seleccionados,['atelectasia','bula; gigante','timoma']);assert.deepEqual(r.impactos,{atelectasia:2,'bula; gigante':3});assert.deepEqual(r.sin_impacto,['timoma']);
 assert.throws(()=>parseImpactSheet(csv.replace(';si;si;2;',';si;si;5;')),/impacto/);
});

test('frases de TC de tórax: cobertura de la fase A, fase B distinta y controles limpios',async()=>{
 const {phraseCoverage}=await import('../backend/vocabulary.mjs');
 const doc=JSON.parse(fs.readFileSync('data/vocabulario/frases-tc-torax.v1.json','utf8'));
 const vocab=JSON.parse(fs.readFileSync('data/vocabulario/candidatos-tc-torax.v1.json','utf8'));
 const propuesta=vocab.candidatos.filter(c=>c.propuesta_medicion).map(c=>c.termino);
 const {A,B}=doc.fases;assert.ok(A.frases.length>=30&&A.frases.length<=50);assert.ok(B.frases.length>=20);assert.ok(B.controles.length>=10);
 const ids=[...A.frases,...B.frases,...B.controles].map(f=>f.id);assert.equal(new Set(ids).size,ids.length);
 const a=phraseCoverage(A.frases,propuesta);
 assert.deepEqual(a.insuficientes,[],'cada candidato en al menos 3 frases distintas de la fase A (≥6 lecturas con 2 voces)');
 const b=phraseCoverage(B.frases,propuesta);assert.deepEqual(b.sin_objetivo,[]);assert.deepEqual(b.sin_cobertura,[]);
 const textosA=new Set(A.frases.map(f=>f.texto));assert.equal([...B.frases,...B.controles].some(f=>textosA.has(f.texto)),false);
 const k=phraseCoverage(B.controles,propuesta);assert.deepEqual(k.con_candidatos,[],'los controles no contienen candidatos, ni flexionados');
 assert.ok(B.controles.every(f=>f.parecidas));
});

test('regla de decisión fijada antes de medir: el más corto con ≥90 % de la mejora, sin términos no dichos ni más WER que el ruido',async()=>{
 const {decideGlossary}=await import('../backend/vocabulary.mjs');
 const base={aciertos:20,objetivos:60,controles_no_dichos:0,errores:30,palabras:1000};
 const resumen={sin_glosario:[base,{...base,errores:34}],variantes:{
  '10':{aciertos:38,objetivos:60,controles_no_dichos:0,errores:29,palabras:1000},
  '25':{aciertos:41,objetivos:60,controles_no_dichos:0,errores:30,palabras:1000},
  '50':{aciertos:42,objetivos:60,controles_no_dichos:1,errores:31,palabras:1000}}};
 let d=decideGlossary(resumen);assert.equal(d.elegido,'25');assert.equal(d.mejora_maxima,22);
 assert.match(d.motivos['10'],/menos del 90/);assert.match(d.motivos['50'],/no dicho/);
 d=decideGlossary({...resumen,variantes:{...resumen.variantes,'25':{...resumen.variantes['25'],errores:35}}});
 assert.equal(d.elegido,null);assert.match(d.motivos['25'],/WER/);assert.match(d.decision,/glosario actual/);
 assert.equal(decideGlossary({sin_glosario:[base,base],variantes:{'10':{...base}}}).elegido,null);
});

test('evaluación por grabación: aciertos, no reconocidos, términos no dichos y errores en otras palabras',async()=>{
 const {evaluateRun,parseAudioName}=await import('../backend/vocabulary.mjs');
 const r=evaluateRun({referencia:'Atelectasia basal y bula apical.',hipotesis:'ate tasia basal y bula apical carina',objetivos:['atelectasia','bula'],glosario:['bula','carina']});
 assert.deepEqual(r.aciertos,['bula']);assert.deepEqual(r.no_reconocidos,['atelectasia']);assert.deepEqual(r.flexionados,[]);
 assert.deepEqual(r.no_dichos,['carina']);assert.equal(r.errores_wer,3);assert.equal(r.palabras_referencia,5);
 assert.equal(r.errores_otras_palabras,1,'la inserción «tasia» se atribuye al término objetivo; «carina» es error en otra palabra');
 const f=evaluateRun({referencia:'Atelectasia basal.',hipotesis:'Atelectasias basal.',objetivos:['atelectasia'],glosario:[]});
 assert.deepEqual(f.aciertos,[]);assert.deepEqual(f.flexionados,['atelectasia']);
 assert.deepEqual(parseAudioName('A_A07_v1.wav'),{fase:'A',frase:'A07',voz:'v1',sintetica:false});
 assert.deepEqual(parseAudioName('b_K03_s1.WAV'),{fase:'B',frase:'K03',voz:'s1',sintetica:true});
 assert.equal(parseAudioName('toma 3.wav'),null);
});

test('ranking de TC de tórax incluye los términos de angioTC por tromboembolismo',()=>{
 const candidatos=[cand('atelectasia'),{...cand('joroba de Hampton'),examenes:['angiotc-torax-tep']},{...cand('hígado'),examenes:['tc-abdomen']}];
 const mediciones={atelectasia:{observaciones:6,errores:3},'joroba de Hampton':{observaciones:6,errores:6},'hígado':{observaciones:6,errores:6}};
 const r=rankGlossary({candidatos,mediciones,impactos:{atelectasia:2,'joroba de Hampton':2,'hígado':3},frecuencias:{},examen:['tc-torax','angiotc-torax-tep']});
 assert.deepEqual(r.ranking.map(x=>x.termino),['joroba de Hampton','atelectasia']);
});

test('términos base del equipo, exclusiones por examen y excepción de negación con nombre de entidad',()=>{
 const src=`x
======================================================================
TAC DE TÓRAX Y TAC DE ALTA RESOLUCIÓN
======================================================================

[A] Nódulos
nódulo subsólido (0); fase nefrográfica (0); neumonía intersticial no específica (0); neumonía (0); trombo no oclusivo (0)
`;
 const base=[{termino:'nódulo',grupo:'Términos base de tórax',examenes:['tc-torax']},{termino:'neumonía',grupo:'Términos base de tórax',examenes:['tc-torax']}];
 const {candidatos,excluidos}=buildCandidates(parseVocabSource(src),{secciones:SECCIONES,terminosBase:base,excluirTerminos:{'fase nefrográfica':'fase de contraste de abdomen; no aplica a TC de tórax'},propuesta:['nódulo subsólido']});
 const t=candidatos.map(c=>c.termino);
 assert.ok(t.includes('nódulo subsólido'),'un término base no saca expresiones de la fuente por la regla de compuestos');
 assert.ok(t.includes('nódulo'));assert.equal(candidatos.find(c=>c.termino==='nódulo').origen,'lista base del equipo');
 assert.equal(t.filter(x=>x==='neumonía').length,1,'un término base que ya existe no se duplica');
 assert.equal(t.includes('fase nefrográfica'),false);assert.deepEqual(excluidos.no_aplica_al_examen,[{termino:'fase nefrográfica',motivo:'fase de contraste de abdomen; no aplica a TC de tórax'}]);
 assert.equal(excluidos.lateralidad_negacion.includes('neumonía intersticial no específica'),false,'«no específica» es nombre de entidad, no negación');
 assert.ok(excluidos.compuestos_con_candidato.includes('neumonía intersticial no específica'));
 assert.ok(excluidos.lateralidad_negacion.includes('trombo no oclusivo'));
});

test('vocabulario del repo: lista base presente y fases de abdomen fuera',()=>{
 const doc=JSON.parse(fs.readFileSync('data/vocabulario/candidatos-tc-torax.v1.json','utf8'));const t=new Set(doc.candidatos.map(c=>c.termino));
 for(const x of ['neumotórax','derrame pleural','nódulo','adenopatía','tromboembolismo pulmonar','aorta','tráquea','pericardio'])assert.ok(t.has(x),x);
 for(const x of ['fase nefrográfica','fase corticomedular','fase excretora'])assert.equal(t.has(x),false,x);
 assert.equal(doc.excluidos.lateralidad_negacion.includes('neumonía intersticial no específica'),false);
 assert.ok(doc.candidatos.filter(c=>c.origen==='lista base del equipo').every(c=>!c.propuesta_medicion&&c.estado===ESTADO_PENDIENTE));
});

test('glosario de demostración: 20 por examen, técnicos primero, grupos intercalados, sin lateralidad ni PUC',async()=>{
 const {selectDemoGlossary}=await import('../backend/vocabulary.mjs');
 const src=`x
======================================================================
TAC DE CEREBRO
======================================================================

[A] Infarto
infarto (9); infartos (0); hipodensidad corticosubcortical (0); ACM (0); hemisferio derecho (0); edema (12, base)

[B] Tumores
meningioma (0); glioblastoma multiforme (0); lesión (40)
======================================================================
TAC DE CUELLO
======================================================================

[A] Tiroides
tiroides (3)
`;
 const r=selectDemoGlossary(parseVocabSource(src),{secciones:['TAC DE CEREBRO'],n:4});
 assert.deepEqual(r.terminos,['hipodensidad corticosubcortical','meningioma','ACM','glioblastoma multiforme']);
 assert.equal(r.terminos.includes('hemisferio derecho'),false);assert.equal(r.terminos.includes('edema'),false);assert.equal(r.terminos.includes('tiroides'),false);
 assert.deepEqual(selectDemoGlossary(parseVocabSource(src),{secciones:['TAC DE CEREBRO'],n:4}),r,'determinista');
 assert.equal(JSON.stringify(r).includes('40'),false,'no expone conteos de plantillas');
 assert.equal(selectDemoGlossary(parseVocabSource(src),{secciones:['TAC DE CEREBRO'],n:20}).terminos.length,6);
});

test('glosario de demostración: sin pares sigla–forma completa ni expresiones contenidas en otras',async()=>{
 const {selectDemoGlossary}=await import('../backend/vocabulary.mjs');
 const src=`x
======================================================================
ANGIOTAC DE TÓRAX: TROMBOEMBOLISMO PULMONAR
======================================================================

[A] TEP
TVP (0); trombosis venosa profunda (0); septum interventricular (0); rectificación del septum interventricular (0); joroba de Hampton (0); EPOC (0)

[A] Otros
enfermedad pulmonar obstructiva crónica (0); hipertensión pulmonar (0)
`;
 const r=selectDemoGlossary(parseVocabSource(src),{secciones:['ANGIOTAC DE TÓRAX: TROMBOEMBOLISMO PULMONAR'],n:20});
 assert.equal(r.terminos.includes('TVP')&&r.terminos.includes('trombosis venosa profunda'),false);
 assert.equal(r.terminos.includes('septum interventricular')&&r.terminos.includes('rectificación del septum interventricular'),false);
 assert.equal(r.terminos.includes('EPOC')&&r.terminos.includes('enfermedad pulmonar obstructiva crónica'),false);
 assert.ok(r.terminos.includes('joroba de Hampton')&&r.terminos.includes('hipertensión pulmonar'));
 assert.deepEqual(r.omitidos_por_repeticion.map(x=>x.termino).sort(),['EPOC','rectificación del septum interventricular','trombosis venosa profunda'].sort(),'se queda el primero en el orden; el otro se registra');
});
