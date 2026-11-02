// One state request in flight per page; short cache coalesces concurrent consumers.
let stateFlight=null,stateCache=null,stateAt=-Infinity;
export async function sharedState(force=false){
 if(stateFlight)return stateFlight;
 if(!force&&stateCache&&performance.now()-stateAt<150)return stateCache;
 stateFlight=(async()=>{const r=await fetch('/api/state');if(!r.ok)throw Error('Estado no disponible');const value=await r.json();stateCache=value;stateAt=performance.now();return value;})();
 try{return await stateFlight;}finally{stateFlight=null;}
}
const subscribers=new Set();let reviewTimer=null;
function subscribeReview(box,update){
 const entry={box,update};subscribers.add(entry);
 if(!reviewTimer)reviewTimer=setInterval(async()=>{
  for(const e of subscribers)if(!e.box.isConnected)subscribers.delete(e);
  if(!subscribers.size){clearInterval(reviewTimer);reviewTimer=null;return;}
  try{const state=await sharedState();for(const e of subscribers)if(e.box.isConnected)e.update(state);}catch{}
 },1500);
}
export function trimTakeCards(panel,limit=5){
 const cards=[...panel.children].filter(c=>c.classList.contains('clip'));
 let excess=cards.length-limit;
 for(const card of cards){if(excess<=0)break;if(card.dataset.pending==='true'||card.querySelector('[data-dirty="true"]'))continue;card.remove();excess--;}
}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
async function api(path,data){const r=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
export function mountReview(parent,run,{onChange,initialState}={}){
 const box=el('section');box.className='meta-review';parent.append(box);
 box.append(el('h4','Revisor Meta · experimental'));
 const status=el('p','Consultando revisión…');status.setAttribute('role','status');box.append(status);
 const control=el('div'),review=el('button','Revisar con Meta'),cancel=el('button','Cancelar revisión');control.append(review,cancel);box.append(control);
 const suggestions=el('div');box.append(suggestions);
 const details=el('details'),summary=el('summary','Texto revisado de esta toma · edición guardada');details.append(summary);
 const editor=el('textarea');editor.rows=4;editor.setAttribute('aria-label','Texto revisado de la toma');details.append(editor);
 const save=el('button','Guardar edición'),undo=el('button','Deshacer último cambio');details.append(save,undo);box.append(details);
 const notice=el('p');notice.className='tiny';box.append(notice);
 const audio=el('audio');audio.controls=true;audio.preload='none';audio.src=`/api/audio/${run.audioId}`;const listen=el('details');listen.append(el('summary','Escuchar toma completa'),audio);box.append(listen);
 const base=run.formatting?.text??run.numberFormatting?.text??run.text??'';
 let doc={revision:0,text:base,history:[]},latest=null,dirty=false,busy=false,lastSignature='',shown=new Set(),seenAt=performance.now(),timer;
 editor.value=base;editor.oninput=()=>{dirty=true;box.dataset.dirty='true';notice.textContent='Edición pendiente de guardar. Las propuestas conservan su texto base.';};
 const perform=async fn=>{if(busy)return;busy=true;try{await fn();}catch(e){notice.textContent=e.message;}finally{busy=false;await poll(true);trimTakeCards(parent.parentElement);}};
 review.onclick=()=>perform(async()=>{if(dirty)throw Error('Guarda la edición antes de revisar.');await api('/api/reviews',{runId:run.id,retry:true});});
 cancel.onclick=()=>perform(()=>api('/api/reviews/cancel',{id:latest.id}));
 async function action(m){
  const old=doc.text;
  doc=await api('/api/reviews/action',{runId:run.id,revision:doc.revision,...m});editor.value=doc.text;dirty=false;delete box.dataset.dirty;
  const applied=onChange?.(old,doc.text);notice.textContent=applied===false?'Guardado en esta toma. El informe se editó por separado y no se sobrescribió; copia el texto revisado si corresponde.':'Cambio guardado en esta toma. Original conservado.';
 }
 save.onclick=()=>perform(()=>action({action:'edit',text:editor.value}));
 undo.onclick=()=>perform(async()=>{if(dirty)throw Error('Guarda o descarta la edición pendiente antes de deshacer.');await action({action:'undo'});});
 function render(state){
  const next=state.reviewDocuments?.find(d=>d.runId===run.id);if(next&&!dirty){if(next.text!==doc.text)onChange?.(doc.text,next.text);doc=next;editor.value=doc.text;}
  latest=state.reviews?.filter(r=>r.runId===run.id).at(-1)??null;
  const signature=JSON.stringify([latest,doc.revision]);if(signature===lastSignature)return;lastSignature=signature;
  const pending=latest&&['queued','running'].includes(latest.status);cancel.hidden=!pending;review.disabled=!!pending;
  status.textContent=!latest?'Revisión automática desactivada para esta toma.':pending?(latest.status==='queued'?'En cola de revisión…':'Meta está revisando; puedes seguir dictando.'):
   latest.status==='completed'?(latest.suggestions.length?`${latest.suggestions.length} observación(es) · aplicación manual`:'Meta no señaló dudas en esta revisión'):`Revisión ${latest.status}: ${latest.error??''}`;
  if(latest?.timings.requestMs!=null)status.textContent+=` · petición ${(latest.timings.requestMs/1000).toFixed(2)} s`;
  if(latest?.status==='completed'&&!shown.has(latest.id)){shown.add(latest.id);void api('/api/reviews/shown',{id:latest.id,elapsedMs:performance.now()-seenAt,context:initialState?'laboratory-history':'live-final'}).catch(()=>{});}
  suggestions.replaceChildren();
  for(const s of latest?.suggestions??[]){
   const row=el('article');row.append(el('strong',`${s.category==='sensitive'?'Comprobar dato sensible':s.category==='grammar'?'Redacción':'Posible término'}: «${s.original}»`));
   if(s.replacement!==null)row.append(el('p',`Propuesta: ${s.replacement}`));else row.append(el('p','Sin sustitución propuesta. Escucha y revisa este fragmento.'));
   row.append(el('p',s.reason),el('small',`Estado: ${s.status}`));
   if(s.status==='pending'){
    if(s.replacement!==null){const accept=el('button','Aceptar');accept.onclick=()=>perform(async()=>{if(dirty)throw Error('Guarda primero tu edición; después solicita una revisión nueva.');await action({action:'accept',reviewId:latest.id,suggestionId:s.id});});row.append(accept);}
    const reject=el('button','Rechazar');reject.onclick=()=>perform(async()=>{if(dirty)throw Error('Guarda tu edición antes de rechazar la propuesta.');await action({action:'reject',reviewId:latest.id,suggestionId:s.id});});row.append(reject);
   }
   suggestions.append(row);
  }
 }
 async function poll(force=false){if(!box.isConnected)return;try{render(await sharedState(force));}catch(e){status.textContent=`Revisor no disponible: ${e.message}`;}}
 if(initialState)render(initialState);else void poll();subscribeReview(box,state=>{if(!busy)render(state);});
 return box;
}
