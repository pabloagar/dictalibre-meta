import {t as tr, language} from './i18n.js';
export const EDITOR_VERSION='anchored-report-v3';
export function textDiff(before,after){let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;let end=before.length,tail=after.length;while(end>start&&tail>start&&before[end-1]===after[tail-1]){end--;tail--;}return {start,end,text:after.slice(start,tail)};}
export class ReportModel {
 constructor(text=''){this.text=text;this.anchors=new Map();this.history=[];this.future=[];this.templateContext=null;}
 snapshot(){return {text:this.committed(),templateContext:this.templateContext};}
 remember(before,group=false){if(!group||!this.history.length)this.history.push(before);this.future=[];}
 restore(snapshot){this.text=snapshot.text;this.templateContext=snapshot.templateContext;this.anchors.clear();}
 get pending(){return [...this.anchors.values()].some(a=>a.active);}
 committed(){let text=this.text;for(const a of [...this.anchors.values()].filter(a=>a.active).sort((a,b)=>b.start-a.start))text=text.slice(0,a.start)+a.original+text.slice(a.end);return text;}
 overlaps(a,start,end){return start===end?start>=a.start&&start<=a.end:start<a.end&&end>a.start||a.start===a.end&&start<=a.start&&end>=a.end;}
 begin(id,start,end){if(this.anchors.has(id)||start<0||end<start||end>this.text.length)throw Error(tr('Destino inválido.'));if([...this.anchors.values()].some(a=>a.active&&this.overlaps(a,start,end)))throw Error(tr('La toma anterior sigue pendiente en este lugar. Selecciona otro destino.'));const a={id,start,end,original:this.text.slice(start,end),insertOnly:start===end,suffix:'',prefix:start===end&&start===this.text.length&&start>0&&!/\s$/u.test(this.text)?' ':'',active:true};this.anchors.set(id,a);return a;}
 splice(start,end,text,owner=null){for(const [id,a] of this.anchors)if(id!==owner&&a.active&&this.overlaps(a,start,end))throw Error(tr('Destino ocupado por otra toma.'));const delta=text.length-(end-start);for(const [id,a] of this.anchors){if(id===owner)continue;if(this.overlaps(a,start,end)){if(a.active)throw Error(tr('Termina o cancela la toma antes de editar ese fragmento.'));this.anchors.delete(id);}else if(a.start>=end){a.start+=delta;a.end+=delta;}}this.text=this.text.slice(0,start)+text+this.text.slice(end);const a=this.anchors.get(owner);if(a)a.end=start+text.length;return {start,end,text};}
 preview(id,text){const a=this.anchors.get(id);if(!a?.active)return null;if(a.insertOnly){const left=this.text.slice(0,a.start),right=this.text.slice(a.end);a.prefix=text&&left&&!/\s$/u.test(left)&&!/^([\s,.;:!?)}\]])/u.test(text)?' ':'';a.suffix=text&&right&&!/\s$/u.test(text)&&!/^([\s,.;:!?)}\]])/u.test(right)?((!left||left.endsWith('\n'))&&heading(right.split('\n')[0])?'\n\n':' '):'';}return this.splice(a.start,a.end,text?a.prefix+text+a.suffix:text,id);}
 finish(id,text){const a=this.anchors.get(id);if(!a?.active)return null;const before=this.snapshot(),change=this.preview(id,text);a.active=false;this.remember(before);return change;}
 cancel(id){const a=this.anchors.get(id);if(!a?.active)return null;const change=this.splice(a.start,a.end,a.original,id);this.anchors.delete(id);return change;}
 edit(next,{group=false}={}){if(next===this.text)return null;const d=textDiff(this.text,next);for(const a of this.anchors.values())if(a.active&&this.overlaps(a,d.start,d.end))throw Error(tr('El fragmento provisional está protegido mientras llega el resultado.'));const before=this.snapshot();this.splice(d.start,d.end,d.text);this.remember(before,group&&!this.pending&&!this.future.length);return d;}
 review(id,old,next){const a=this.anchors.get(id);if(!a||a.active||this.text.slice(a.start,a.end)!==a.prefix+old+a.suffix)return null;const before=this.snapshot(),change=this.splice(a.start,a.end,a.prefix+next+a.suffix,id);this.remember(before);return change;}
 undo(){if(this.pending)throw Error(tr('Espera a que terminen las tomas antes de deshacer.'));if(!this.history.length)return false;this.future.push(this.snapshot());this.restore(this.history.pop());return true;}
 redo(){if(this.pending)throw Error(tr('Espera a que terminen las tomas antes de rehacer.'));if(!this.future.length)return false;this.history.push(this.snapshot());this.restore(this.future.pop());return true;}
 reset(text=''){if(this.pending)throw Error(tr('Termina las tomas antes de cambiar de informe.'));this.remember(this.snapshot());this.text=text;this.anchors.clear();}
}

// Only exact, unique, non-overlapping quotes are linked to text. Ambiguous quotes remain notes.
// Locate both quoted passages. Narrow lateral contradictions only when each quote
// has one explicit, opposing side; otherwise preserve the complete evidence.
export function reviewEvidence(text,s){
 const quotes=[...new Set((s.evidence??[]).filter(q=>typeof q==='string'&&q.trim()))];
 const sides=quotes.map(q=>[...q.matchAll(/\b(derech[oa]s?|izquierd[oa]s?|right|left)\b/giu)]);
 const narrow=s.kind==='contradiction'&&quotes.length===2&&sides.every(m=>m.length===1)&&/^(derech|right)/i.test(sides[0][0][0])!==/^(derech|right)/i.test(sides[1][0][0]);
 return quotes.map((quote,i)=>{
  let from=0,to=quote.length;
  if(narrow){const m=sides[i][0],other=quotes[1-i],om=sides[1-i][0];const words=[...quote.slice(0,m.index).matchAll(/[\p{L}]+/gu)].slice(-2);const ow=[...other.slice(0,om.index).matchAll(/[\p{L}]+/gu)].slice(-2);if(words.length===2&&ow.length===2&&words.map(w=>w[0].toLowerCase()).join(' ')===ow.map(w=>w[0].toLowerCase()).join(' '))from=words[0].index;else from=m.index;to=m.index+m[0].length;}
  const at=text.indexOf(quote),unique=at>=0&&text.indexOf(quote,at+1)<0;
  return {text:quote.slice(from,to),start:unique?at+from:null,end:unique?at+to:null};
 });
}
export function reviewRanges(text,suggestions){const ranges=[];for(const [index,s] of suggestions.entries()){
 const evidence=s.kind==='contradiction'?reviewEvidence(text,s).filter(e=>e.start!==null):[];
 const candidates=evidence.length?evidence:[{start:s.original?text.indexOf(s.original):-1,end:(s.original?text.indexOf(s.original):-1)+(s.original?.length??0)}];
 for(const {start,end} of candidates){if(start===null||start<0||(!evidence.length&&text.indexOf(s.original,start+1)!==-1)||ranges.some(r=>start<r.end&&end>r.start))continue;ranges.push({id:String(index+1),start,end});}
 }return ranges.sort((a,b)=>a.start-b.start);}

// Contexto para el Revisor: ficha del estudio y sección de destino, sin texto de plantilla ni informe completo.
const SECTION_LABELS=new Set(['clinical history','history','technique','findings','impression','comparison','indication','recommendations','tecnica','tecnica del examen','hallazgos','hallazgo','conclusion','conclusiones','impresion','impresion diagnostica','comparacion','antecedentes','antecedentes clinicos','indicacion','indicaciones','indicacion clinica','historia clinica','examen','estudio','comentario','comentarios','sugerencia','sugerencias','recomendacion','recomendaciones','diagnostico','observaciones','resultado','resultados','informe']);
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
