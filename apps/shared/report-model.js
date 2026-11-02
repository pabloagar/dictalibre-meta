export const EDITOR_VERSION='anchored-report-v1';
export function textDiff(before,after){let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;let end=before.length,tail=after.length;while(end>start&&tail>start&&before[end-1]===after[tail-1]){end--;tail--;}return {start,end,text:after.slice(start,tail)};}
export class ReportModel {
 constructor(text=''){this.text=text;this.anchors=new Map();this.history=[];}
 get pending(){return [...this.anchors.values()].some(a=>a.active);}
 committed(){let text=this.text;for(const a of [...this.anchors.values()].filter(a=>a.active).sort((a,b)=>b.start-a.start))text=text.slice(0,a.start)+a.original+text.slice(a.end);return text;}
 overlaps(a,start,end){return start===end?start>=a.start&&start<=a.end:start<a.end&&end>a.start||a.start===a.end&&start<=a.start&&end>=a.end;}
 begin(id,start,end){if(this.anchors.has(id)||start<0||end<start||end>this.text.length)throw Error('Destino inválido.');if([...this.anchors.values()].some(a=>a.active&&this.overlaps(a,start,end)))throw Error('La toma anterior sigue pendiente en este lugar. Selecciona otro destino.');const a={id,start,end,original:this.text.slice(start,end),prefix:start===end&&start===this.text.length&&start>0&&!/\s$/u.test(this.text)?' ':'',active:true};this.anchors.set(id,a);return a;}
 splice(start,end,text,owner=null){for(const [id,a] of this.anchors)if(id!==owner&&a.active&&this.overlaps(a,start,end))throw Error('Destino ocupado por otra toma.');const delta=text.length-(end-start);for(const [id,a] of this.anchors){if(id===owner)continue;if(this.overlaps(a,start,end)){if(a.active)throw Error('Termina o cancela la toma antes de editar ese fragmento.');this.anchors.delete(id);}else if(a.start>=end){a.start+=delta;a.end+=delta;}}this.text=this.text.slice(0,start)+text+this.text.slice(end);const a=this.anchors.get(owner);if(a)a.end=start+text.length;return {start,end,text};}
 preview(id,text){const a=this.anchors.get(id);if(!a?.active)return null;return this.splice(a.start,a.end,text?a.prefix+text:text,id);}
 finish(id,text){const a=this.anchors.get(id);if(!a?.active)return null;const before=this.committed(),change=this.preview(id,text);a.active=false;this.history.push(before);return change;}
 cancel(id){const a=this.anchors.get(id);if(!a?.active)return null;const change=this.splice(a.start,a.end,a.original,id);this.anchors.delete(id);return change;}
 edit(next){if(next===this.text)return null;const d=textDiff(this.text,next);for(const a of this.anchors.values())if(a.active&&this.overlaps(a,d.start,d.end))throw Error('El fragmento provisional está protegido mientras llega el resultado.');const before=this.committed();this.splice(d.start,d.end,d.text);this.history.push(before);return d;}
 review(id,old,next){const a=this.anchors.get(id);if(!a||a.active||this.text.slice(a.start,a.end)!==a.prefix+old)return null;const before=this.committed(),change=this.splice(a.start,a.end,a.prefix+next,id);this.history.push(before);return change;}
 undo(){if(this.pending)throw Error('Espera a que terminen las tomas antes de deshacer.');if(!this.history.length)return false;this.text=this.history.pop();this.anchors.clear();return true;}
 reset(text=''){if(this.pending)throw Error('Termina las tomas antes de cambiar de informe.');this.history.push(this.text);this.text=text;this.anchors.clear();}
}
// Contexto para el Revisor: ficha del estudio y sección de destino, sin texto de plantilla ni informe completo.
const SECTION_LABELS=new Set(['tecnica','tecnica del examen','hallazgos','hallazgo','conclusion','conclusiones','impresion','impresion diagnostica','comparacion','antecedentes','antecedentes clinicos','indicacion','indicaciones','indicacion clinica','historia clinica','examen','estudio','comentario','comentarios','sugerencia','sugerencias','recomendacion','recomendaciones','diagnostico','observaciones','resultado','resultados','informe']);
const plain=t=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function heading(line){
 const t=line.trim();if(!t||t.length>60)return null;
 if(!/\p{Ll}/u.test(t)&&(t.match(/\p{Lu}/gu)??[]).length>=3&&/^[\p{Lu}\d\s.,()/-]+:?$/u.test(t))return {title:t.replace(/:$/,'').trim(),inline:''};
 const m=/^([\p{L} ]{3,40}):(.*)$/u.exec(t);if(m&&SECTION_LABELS.has(plain(m[1])))return {title:m[1].trim(),inline:m[2]};
 return null;
}
export function sectionAt(text,position,max=3000){
 const heads=[];let offset=0;
 for(const line of text.split('\n')){const h=heading(line);if(h)heads.push({start:offset,title:h.title,contentStart:h.inline?offset+line.length-h.inline.length:offset+line.length+1});offset+=line.length+1;}
 const current=heads.filter(h=>h.start<=position).at(-1),next=heads.find(h=>h.start>(current?.start??-1));
 const start=Math.min(current?.contentStart??0,text.length),end=next?.start??text.length,raw=text.slice(start,Math.max(start,end));
 const content=raw.trim(),lead=raw.length-raw.trimStart().length;
 if(content.length<=max)return {title:current?.title??'',text:content,truncated:false};
 const at=Math.min(Math.max(position-start-lead-Math.floor(max/2),0),content.length-max);
 return {title:current?.title??'',text:content.slice(at,at+max),truncated:true};
}
const templateOrigin=t=>!t?'en blanco':t.imported===true?'importada':t.imported===false?'propia':'sin dato';
export function reportContext({template}){return {templateName:(template?.name??'').slice(0,200),templateCategory:(template?.category??'').slice(0,200),templateOrigin:templateOrigin(template)};}
export function takeContext({template,text,position}){const s=sectionAt(text,position);return {...reportContext({template}),sectionTitle:s.title.slice(0,200),sectionText:s.text,truncated:s.truncated};}
// Examen de TC al que corresponde una plantilla, por su nombre (y categoría si existe). Sirve para PROPONER el glosario
// de demostración en /live; el médico puede cambiarlo. El orden importa: angio antes que simple; columna antes que cuello.
const EXAM_PATTERNS=[
 ['angiotc-torax-tep',/angio.*(torax|pulmon|tep\b)|tromboemb|\btep\b/],
 ['angiotc-aorta',/angio.*(aort|abdom|mesenter|renal|visceral)|aortograf/],
 ['angiotc-cerebro-cuello',/angio.*(cerebr|encefal|cuello|carot|willis|cran)|perfusion/],
 ['pielotc-urotc',/pielo|\buro ?(tc|tac)\b|urotomograf/],
 ['tc-cavidades-orbitas-oidos',/paranasal|orbita|oido|penasco|macizo facial|maxilofacial/],
 ['tc-columna',/columna|lumbar|dorsal|sacro|raquis/],
 ['tc-cuello',/cuello/],
 ['tc-cerebro',/cerebr|encefal|craneo|cabeza/],
 ['tc-torax',/torax|pulmon|alta resolucion|\btacar\b/],
 ['tc-abdomen-pelvis',/abdom|pelvi|higado|hepat|pancrea|biliar|apendic/],
];
export function examForTemplate(template){
 if(!template||typeof template.name!=='string')return null;
 const n=plain(template.name),cat=plain(template.category??'');
 if(/resonancia|ecograf|doppler|radiograf|mamograf/.test(cat))return null;
 if(cat!=='tomografia'&&!/\b(tc|tac|angio|tomograf|pielo|uro)/.test(n))return null;
 return EXAM_PATTERNS.find(([,re])=>re.test(n))?.[0]??null;
}
// Confirmación antes de reemplazar el informe por otra plantilla: solo si hay contenido propio (distinto de la plantilla aplicada).
export function needsReplaceConfirmation(committed,template){return committed.trim()!==''&&committed!==(template?.text??'');}
// Revisión LOCAL (no se envía a Meta) de órganos que no corresponden al sexo marcado por el médico (F/M).
// Regla exacta: lista cerrada de órganos y derivados, sin distinguir mayúsculas ni tildes. «Mama» queda fuera a propósito
// (los hombres tienen tejido mamario). Es un aviso para revisar, nunca un cambio: hay excepciones reales.
const ORGANOS={
 F:[['útero',/\b(utero|uterin[oa]s?|histerectomia)\b/],['ovario',/\b(ovari[oa]s?|ovaric[oa]s?|ooforectomia)\b/],['endometrio',/\bendometri(o|al|ales)\b/],['miometrio',/\bmiometri(o|al)\b/],['trompa uterina',/\btrompas? (de falopio|uterinas?)\b/],['cérvix',/\bcervix\b/],['vagina',/\bvagina(l|les)?\b/]],
 M:[['próstata',/\b(prostat(a|ico|ica|icos|icas)|prostatectomia)\b/],['vesículas seminales',/\bvesiculas? seminal(es)?\b/],['testículo',/\b(testicul(o|os|ar|ares)|orquiectomia)\b/],['epidídimo',/\bepididim(o|os|aria|ario)\b/],['escroto',/\b(escroto|escrotal(es)?)\b/],['pene',/\b(pene|peneano)\b/],['conducto deferente',/\bconductos? deferentes?\b/]],
};
export function sexAnatomyWarnings(text,sexo){
 if(sexo!=='F'&&sexo!=='M')return [];
 const original=String(text).normalize('NFC'),p=original.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),out=[];
 for(const [termino,re] of ORGANOS[sexo==='F'?'M':'F']){const m=re.exec(p);if(m){const fragmento=original.slice(m.index,m.index+m[0].length);out.push({termino,fragmento,inicio:m.index,mensaje:`Revisar: «${fragmento}» en un informe marcado ${sexo}.`});}}
 return out;
}
