import test from 'node:test';import assert from 'node:assert/strict';import {ReportModel} from '../apps/shared/report-model.js';
test('rehacer conserva texto y plantilla; nueva edición invalida futuro y tomas pendientes bloquean ambos',()=>{
 const m=new ReportModel('Inicial');m.reset('Plantilla');m.templateContext={name:'Sintética'};
 m.undo();assert.equal(m.text,'Inicial');assert.equal(m.templateContext,null);
 m.redo();assert.equal(m.text,'Plantilla');assert.equal(m.templateContext.name,'Sintética');
 m.edit('Nueva');m.undo();m.edit('Otra');assert.equal(m.redo(),false);assert.equal(m.text,'Otra');
 m.begin('take',4,4);m.preview('take','provisional');assert.throws(()=>m.redo());assert.throws(()=>m.undo());
 m.finish('take','final');m.undo();assert.equal(m.text,'Otra');m.redo();assert.equal(m.text,'Otra final');
});
test('agrupar escritura mantiene el estado anterior al grupo y no reutiliza futuro',()=>{
 const m=new ReportModel();m.edit('a');m.edit('ab',{group:true});m.edit('abc',{group:true});m.undo();assert.equal(m.text,'');m.redo();assert.equal(m.text,'abc');m.undo();m.edit('nuevo',{group:true});assert.equal(m.redo(),false);m.undo();assert.equal(m.text,'');
});
test('enlaces de revisión solo a citas únicas, exactas y no solapadas',async()=>{
 const {reviewRanges}=await import('../apps/shared/report-model.js');
 assert.deepEqual(reviewRanges('derecho e izquierdo',[{original:'derecho'},{original:'izquierdo'},{original:'inexistente'}]),[{id:'1',start:0,end:7},{id:'2',start:10,end:19}]);
 assert.deepEqual(reviewRanges('dos dos',[{original:'dos'}]),[]);
 assert.deepEqual(reviewRanges('nódulo derecho',[{original:'nódulo derecho'},{original:'derecho'}]),[{id:'1',start:0,end:14}]);
});
test('borradores sustituyen solo selección; cancelar restaura plantilla',()=>{const m=new ReportModel('Inicio. Sin derrame. Fin.');m.begin('a',8,20);m.preview('a','Derrame');m.preview('a','Derrame derecho.');assert.equal(m.text,'Inicio. Derrame derecho. Fin.');assert.equal(m.committed(),'Inicio. Sin derrame. Fin.');m.cancel('a');assert.equal(m.text,'Inicio. Sin derrame. Fin.');});
test('destino fijado, final único, deshacer completo',()=>{const m=new ReportModel('A  B');m.begin('a',2,2);m.preview('a','tres');m.preview('a','3 cm');m.finish('a','3 cm');assert.equal(m.text,'A 3 cm B');assert.equal(m.finish('a','duplicado'),null);m.undo();assert.equal(m.text,'A  B');});
test('edición antes de toma desplaza destino; editar provisional se bloquea',()=>{const m=new ReportModel('A  B');m.begin('a',2,2);m.preview('a','texto');m.edit('Inicio A texto B');assert.equal(m.anchors.get('a').start,9);assert.throws(()=>m.edit('Inicio A otro B'));m.finish('a','final');assert.equal(m.text,'Inicio A final B');});
test('respuestas fuera de orden mantienen destinos y cancelación independiente',()=>{const m=new ReportModel('AA BB');m.begin('a',0,2);m.begin('b',3,5);m.preview('a','primer');m.finish('b','segundo');m.finish('a','uno');assert.equal(m.text,'uno segundo');m.undo();assert.equal(m.text,'AA segundo');m.undo();assert.equal(m.text,'AA BB');});
test('review anclado, edición invalida propuestas y no modifica texto vecino',()=>{const m=new ReportModel('A  Z');m.begin('a',2,2);m.finish('a','error');assert.ok(m.review('a','error','correcto'));assert.equal(m.text,'A correcto Z');m.edit('A edición humana Z');assert.equal(m.review('a','correcto','otro'),null);assert.equal(m.text,'A edición humana Z');});
test('bloquea solapamiento, copia provisional/undo y cambio plantilla',()=>{const m=new ReportModel('base');m.begin('a',0,4);m.preview('a','borrador');assert.throws(()=>m.begin('b',1,2));assert.throws(()=>m.undo());assert.throws(()=>m.reset('otra'));assert.equal(m.committed(),'base');});
test('Unicode, saltos y reemplazo vacío no alteran resto del informe',()=>{const m=new ReportModel('Hígado\nNódulo de 2,5 cm.\nFin');const a=m.text.indexOf('Nódulo'),b=m.text.indexOf('\nFin');m.begin('a',a,b);m.finish('a','');assert.equal(m.text,'Hígado\n\nFin');m.undo();assert.equal(m.text,'Hígado\nNódulo de 2,5 cm.\nFin');});

test('tomas sucesivas al final separan palabras y revisión conserva el separador',()=>{const m=new ReportModel('Primera.');m.begin('a',8,8);m.preview('a','Segunda');m.finish('a','Segunda.');assert.equal(m.text,'Primera. Segunda.');assert.ok(m.review('a','Segunda.','Tercera.'));assert.equal(m.text,'Primera. Tercera.');m.undo();m.undo();assert.equal(m.text,'Primera.');});
test('sección de destino: títulos en mayúsculas, rótulo con dos puntos y sin títulos',async()=>{
 const {sectionAt}=await import('../apps/shared/report-model.js');
 const report='TÉCNICA\nTC de tórax sin contraste.\n\nHALLAZGOS\nNo se observa derrame pleural.\nSin adenopatías.\n\nCONCLUSIÓN\nSin hallazgos agudos.\n';
 const inFindings=report.indexOf('Sin adenopatías');
 assert.deepEqual(sectionAt(report,inFindings),{title:'HALLAZGOS',text:'No se observa derrame pleural.\nSin adenopatías.',truncated:false});
 assert.equal(sectionAt(report,report.length).title,'CONCLUSIÓN');
 assert.equal(sectionAt(report,report.indexOf('HALLAZGOS')+3).title,'HALLAZGOS');
 const inline='Técnica: TC sin contraste.\nHallazgos: nódulo de 5 mm en lóbulo superior derecho.\nImpresión: nódulo pulmonar.';
 assert.deepEqual(sectionAt(inline,inline.indexOf('5 mm')),{title:'Hallazgos',text:'nódulo de 5 mm en lóbulo superior derecho.',truncated:false});
 assert.deepEqual(sectionAt('Texto libre sin títulos.',5),{title:'',text:'Texto libre sin títulos.',truncated:false});
 assert.deepEqual(sectionAt('',0),{title:'',text:'',truncated:false});
 const long='HALLAZGOS\n'+'a'.repeat(5000)+'X'+'b'.repeat(5000);const s=sectionAt(long,long.indexOf('X'),3000);
 assert.equal(s.truncated,true);assert.ok(s.text.length<=3000);assert.ok(s.text.includes('X'));
});
test('contexto por toma: ficha y sección, sin texto de plantilla ni informe completo',async()=>{
 const {takeContext,reportContext}=await import('../apps/shared/report-model.js');
 const template={name:'TC de tórax',category:'TC',text:'PLANTILLA PRIVADA COMPLETA',imported:true};
 const report='HALLAZGOS\nSin derrame.\n\nCONCLUSIÓN\nNormal.';
 const c=takeContext({template,text:report,position:report.indexOf('Sin derrame')});
 assert.deepEqual(c,{templateName:'TC de tórax',templateCategory:'TC',templateOrigin:'importada',sectionTitle:'HALLAZGOS',sectionText:'Sin derrame.',truncated:false});
 assert.equal(JSON.stringify(c).includes('PLANTILLA PRIVADA'),false);assert.equal(JSON.stringify(c).includes('Normal.'),false);
 assert.equal(takeContext({template:null,text:'',position:0}).templateOrigin,'en blanco');
 assert.equal(takeContext({template:{name:'Propia',text:'x',imported:false},text:'',position:0}).templateOrigin,'propia');
 assert.equal(takeContext({template:{name:'Guardada antes',text:'x'},text:'',position:0}).templateOrigin,'sin dato');
 const g=reportContext({template});
 assert.deepEqual(g,{templateName:'TC de tórax',templateCategory:'TC',templateOrigin:'importada'});
});


test('dictado antes de título separa párrafos y conserva cancelación, revisión y deshacer',()=>{
 const m=new ReportModel('RX DE TÓRAX\nHallazgos.');m.begin('a',0,0);m.preview('a','Sin derrame');m.preview('a','Sin neumotórax.');
 assert.equal(m.text,'Sin neumotórax.\n\nRX DE TÓRAX\nHallazgos.');m.cancel('a');assert.equal(m.text,'RX DE TÓRAX\nHallazgos.');
 m.begin('b',0,0);m.finish('b','Sin derrame.');m.review('b','Sin derrame.','Sin neumotórax.');assert.equal(m.text,'Sin neumotórax.\n\nRX DE TÓRAX\nHallazgos.');m.undo();m.undo();assert.equal(m.text,'RX DE TÓRAX\nHallazgos.');
});
test('inserción media separa palabras sin agregar espacio antes de puntuación ni duplicar saltos',()=>{
 for(const [base,at,text,expected] of [['uno dos',4,'tres','uno tres dos'],['Hallazgo.',8,' leve','Hallazgo leve.'],['RX DE TÓRAX',0,'Prueba.\n','Prueba.\nRX DE TÓRAX']]){const m=new ReportModel(base);m.begin('a',at,at);m.finish('a',text);assert.equal(m.text,expected);}
});

test('contradicción enlaza ambos lados y acota contexto compartido sin alterar texto',async()=>{
 const {reviewRanges,reviewEvidence}=await import('../apps/shared/report-model.js');
 const a='Consolidación de 2 × 3 cm en el lóbulo inferior derecho.',b='Consolidación en el lóbulo inferior izquierdo compatible con neumonía.',text=a+'\n'+b;
 const suggestion={kind:'contradiction',original:b,evidence:[a,b]};
 assert.deepEqual(reviewEvidence(text,suggestion).map(e=>e.text),['lóbulo inferior derecho','lóbulo inferior izquierdo']);
 const ranges=reviewRanges(text,[suggestion]);assert.equal(ranges.length,2);assert.deepEqual(ranges.map(r=>text.slice(r.start,r.end)),['lóbulo inferior derecho','lóbulo inferior izquierdo']);assert.ok(ranges.every(r=>r.id==='1'));
 assert.equal(reviewEvidence(a+' '+a+' '+b,suggestion)[0].start,null);
 const neg={kind:'contradiction',original:'sin derrame',evidence:['con derrame','sin derrame']};assert.deepEqual(reviewEvidence('con derrame; sin derrame',neg).map(e=>e.text),neg.evidence);
});
