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
