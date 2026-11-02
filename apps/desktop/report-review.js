const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
async function api(path,data){const r=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'Revisión no disponible.');return value;}

export function mountReportReview({controls,section,copyButton,snapshot,onCopy,event,available=true,onAnnotations=()=>{},onNavigate=()=>{},getRanges=()=>[]}){
  const button=el('button','Revisar con IA');button.className='report-review-button';controls.insertBefore(button,copyButton);
  const box=el('section');box.className='report-global-review';box.hidden=true;box.setAttribute('aria-label','Revisión global del informe');section.append(box);
  box.append(el('strong','Revisión con IA · Meta'));
  const close=el('button','Cerrar');close.className='review-close';close.onclick=()=>{box.hidden=true;button.focus?.();};box.append(close);
  const status=el('p',available?'Revisa una copia del informe con Meta. No modifica el texto.':'La revisión con IA no está habilitada en esta demo pública. El dictado con Muse sí está disponible.');status.setAttribute('role','status');box.append(status);
  const send=el('button','Enviar a Meta y revisar');send.hidden=!available;box.append(send);
  if(available)box.append(el('p','Se envía el informe completo y la ficha de la plantilla. Comprueba cada aviso antes de usarlo.'));
  const cancel=el('button','Cancelar revisión');cancel.hidden=true;box.append(cancel);
  const warnings=el('div');box.append(warnings);
  const offer=el('div');offer.hidden=true;offer.append(el('p','Este texto no tiene una revisión global vigente. Puedes revisarlo o copiarlo sin revisión.'));
  const reviewFirst=el('button','Revisar antes de copiar'),copyAnyway=el('button','Copiar sin revisar');offer.append(reviewFirst,copyAnyway);box.append(offer);
  let result=null,requested=null,busy=false,timer=null,epoch=0,started=0,offered=null,lastShown=null;const acknowledged=new Set();
  const signature=s=>JSON.stringify({text:s.text,context:s.context});
  const current=()=>snapshot();
  function changed(){
    const s=current(),same=requested!==null&&signature(s)===requested;
    send.disabled=s.pending||busy||!s.text.trim();copyAnyway.disabled=s.pending;
    const valid=available&&result?.status==='completed'&&same&&!s.pending;
    onAnnotations(valid?getRanges(result.suggestions).filter(r=>!acknowledged.has(r.id)):[]);
    button.textContent='Revisar con IA'+(valid&&result.suggestions.length?' · '+(result.suggestions.length-acknowledged.size):'');
    for(const b of warnings.querySelectorAll?.('button')??[])b.disabled=!valid;
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
    for(const [index,s] of (r.suggestions??[]).entries()){const id=String(index+1),row=el('article');row.dataset.reviewId=id;row.tabIndex=-1;row.append(el('strong',id+' · «'+s.original+'»'),el('p',s.reason));for(const quote of s.evidence??[])row.append(el('blockquote',quote));
      if(getRanges(r.suggestions??[]).some(a=>a.id===id)){const go=el('button','Ir al texto');go.onclick=()=>onNavigate(id);row.append(go);}else row.append(el('small','Comprueba la cita en el informe; no hay un único fragmento al que enlazar.'));
      const accept=el('button','Es correcto');accept.onclick=()=>{if(requested!==signature(current())||current().pending)return;acknowledged.add(id);row.hidden=true;changed();event('report-warning-acknowledged',{reviewId:r.id,warning:index});};row.append(accept);warnings.append(row);}
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
    const s=current();if(!available||s.pending||busy||!s.text.trim())return;box.hidden=false;acknowledged.clear();
    const token=++epoch;requested=signature(s);busy=true;result=null;warnings.replaceChildren();offer.hidden=true;offered=null;cancel.hidden=false;started=performance.now();changed();
    event('report-review-request',{characters:s.text.length,contextCharacters:JSON.stringify(s.context).length});
    try{const r=await api('/api/report-reviews',{text:s.text,context:s.context});if(token!==epoch){if(['queued','running'].includes(r.status))void api('/api/reviews/cancel',{id:r.id}).catch(()=>{});return;}result=r;if(['queued','running'].includes(r.status))await poll(r.id,token);else{busy=false;cancel.hidden=true;render(r);}}
    catch(e){if(token!==epoch)return;busy=false;cancel.hidden=true;render({status:'error',error:e.message,suggestions:[]});}
  }
  button.onclick=()=>{box.hidden=!box.hidden;if(!box.hidden)changed();event('panel-toggle',{panel:'report-review',open:!box.hidden});};send.onclick=reviewFirst.onclick=request;
  copyAnyway.onclick=()=>{if(current().pending||offered!==signature(current()))return;offer.hidden=true;event('report-copy-without-review',{});onCopy();};
  cancel.onclick=()=>{epoch++;clearTimeout(timer);busy=false;cancel.hidden=true;if(result?.id)void api('/api/reviews/cancel',{id:result.id}).catch(()=>{});render({status:'cancelled',error:'Cancelada por el usuario.',suggestions:[]});event('report-review-cancel',{});};
  changed();
  section.dispatchEvent?.(new CustomEvent('review-panel-mounted',{bubbles:true,detail:{box}}));
  return {box,changed,focusNote(id){box.hidden=false;const row=warnings.querySelector?.(`[data-review-id="${id}"]`);row?.focus?.();row?.scrollIntoView?.({block:'nearest'});},beforeCopy(){const s=current();if(s.pending)return false;if(!available)return true;if(result?.status==='completed'&&signature(s)===requested)return true;box.hidden=false;offered=signature(s);offer.hidden=false;status.textContent=busy?'Revisión en curso. Puedes esperar o copiar sin revisión.':'Puedes revisar el informe completo antes de copiar.';event('report-copy-offer',{busy,hasPrevious:!!result});return false;},reset(){cancel.onclick();requested=null;result=null;acknowledged.clear();warnings.replaceChildren();offer.hidden=true;offered=null;box.hidden=true;status.textContent=available?'Revisión opcional del texto completo y ficha de plantilla. Envía texto a Meta.':'La revisión con IA no está habilitada en esta demo pública.';changed();}};
}
