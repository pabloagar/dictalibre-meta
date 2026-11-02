const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
async function api(path,data){const r=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'Revisión no disponible.');return value;}

export function mountReportReview({controls,section,copyButton,snapshot,onCopy,event}){
  const button=el('button','Revisar informe');controls.insertBefore(button,copyButton);
  const box=el('section');box.className='report-global-review';box.hidden=true;box.setAttribute('aria-label','Revisión global del informe');section.append(box);
  box.append(el('strong','Revisión del informe · Meta'));
  const status=el('p','Revisión opcional del texto completo y contexto de plantilla. Envía texto a Meta; no modifica el informe.');status.setAttribute('role','status');box.append(status);
  const cancel=el('button','Cancelar revisión');cancel.hidden=true;box.append(cancel);
  const warnings=el('div');box.append(warnings);
  const offer=el('div');offer.hidden=true;offer.append(el('p','Este texto no tiene una revisión global vigente. Puedes revisarlo o copiarlo sin revisión.'));
  const reviewFirst=el('button','Revisar antes de copiar'),copyAnyway=el('button','Copiar sin revisar');offer.append(reviewFirst,copyAnyway);box.append(offer);
  let result=null,requested=null,busy=false,timer=null,epoch=0,started=0,offered=null,lastShown=null;
  const signature=s=>JSON.stringify({text:s.text,context:s.context});
  const current=()=>snapshot();
  function changed(){
    const s=current(),same=requested!==null&&signature(s)===requested;
    button.disabled=s.pending||busy||!s.text.trim();copyAnyway.disabled=s.pending;
    if(offered!==null&&offered!==signature(s)){offer.hidden=true;offered=null;}
    if(busy){status.textContent=same&&!s.pending?'Meta está revisando una copia del informe. Puedes seguir editando.':'Informe modificado: la revisión en curso corresponde al texto anterior.';return;}
    if(result){
      const stale=!same||s.pending;
      status.textContent=stale?'Revisión desactualizada: el informe cambió. Revisa de nuevo antes de interpretar estos avisos.':result.status==='completed'?(result.suggestions.length?`${result.suggestions.length} aviso(s) para comprobar. No se aplican cambios automáticamente.`:'Meta no señaló inconsistencias. Esto no valida clínicamente el informe.'):`Revisión ${result.status}: ${result.error??''}`;
      box.dataset.stale=String(stale);
    }
  }
  function render(r){
    result=r;warnings.replaceChildren();
    for(const s of r.suggestions??[]){const row=el('article');row.append(el('strong','Comprobar: '+s.original),el('p',s.reason));for(const quote of s.evidence??[])row.append(el('blockquote',quote));warnings.append(row);}
    changed();
    if(r.status==='completed'&&lastShown!==r.id){lastShown=r.id;event('report-review-shown',{reviewId:r.id,elapsedMs:performance.now()-started,stale:signature(current())!==requested,warningCount:r.suggestions.length});}
  }
  async function poll(id,token){
    if(token!==epoch)return;
    try{const r=await api('/api/report-reviews/'+encodeURIComponent(id));if(token!==epoch)return;
      if(['queued','running'].includes(r.status)){result=r;timer=setTimeout(()=>poll(id,token),1000);return;}
      busy=false;cancel.hidden=true;render(r);
    }catch(e){if(token!==epoch)return;busy=false;cancel.hidden=true;result={status:'error',error:e.message,suggestions:[]};render(result);}
  }
  async function request(){
    const s=current();if(s.pending||busy||!s.text.trim())return;box.hidden=false;
    const token=++epoch;requested=signature(s);busy=true;result=null;warnings.replaceChildren();offer.hidden=true;offered=null;cancel.hidden=false;started=performance.now();changed();
    event('report-review-request',{characters:s.text.length,contextCharacters:JSON.stringify(s.context).length});
    try{const r=await api('/api/report-reviews',{text:s.text,context:s.context});if(token!==epoch){if(['queued','running'].includes(r.status))void api('/api/reviews/cancel',{id:r.id}).catch(()=>{});return;}result=r;if(['queued','running'].includes(r.status))await poll(r.id,token);else{busy=false;cancel.hidden=true;render(r);}}
    catch(e){if(token!==epoch)return;busy=false;cancel.hidden=true;render({status:'error',error:e.message,suggestions:[]});}
  }
  button.onclick=reviewFirst.onclick=request;
  copyAnyway.onclick=()=>{if(current().pending||offered!==signature(current()))return;offer.hidden=true;event('report-copy-without-review',{});onCopy();};
  cancel.onclick=()=>{epoch++;clearTimeout(timer);busy=false;cancel.hidden=true;if(result?.id)void api('/api/reviews/cancel',{id:result.id}).catch(()=>{});render({status:'cancelled',error:'Cancelada por el usuario.',suggestions:[]});event('report-review-cancel',{});};
  changed();
  return {changed,beforeCopy(){const s=current();if(s.pending)return false;if(result?.status==='completed'&&signature(s)===requested)return true;box.hidden=false;offered=signature(s);offer.hidden=false;status.textContent=busy?'Revisión en curso. Puedes esperar o copiar sin revisión.':'Puedes revisar el informe completo antes de copiar.';event('report-copy-offer',{busy,hasPrevious:!!result});return false;},reset(){cancel.onclick();requested=null;result=null;warnings.replaceChildren();offer.hidden=true;offered=null;status.textContent='Revisión opcional del texto completo y contexto de plantilla. Envía texto a Meta.';changed();}};
}
