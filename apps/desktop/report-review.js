const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
async function api(path,data){const r=await fetch(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'Revisión no disponible.');return value;}

export function mountReportReview({controls,section,copyButton,snapshot,onCopy,event,available=true,onAnnotations=()=>{},onNavigate=()=>{},getRanges=()=>[],onApply=()=>false}){
  const button=el('button','Revisar con IA');button.className='report-review-button';button.title='Envía el informe a Meta para revisarlo; no aplica cambios automáticamente.';controls.insertBefore(button,copyButton);
  const box=el('section');box.className='report-global-review';box.hidden=true;box.setAttribute('aria-label','Revisión global del informe');section.append(box);
  const head=el('div');head.className='review-head';head.append(el('strong','Revisión con IA · Meta'));box.append(head);
  const close=el('button','Cerrar');close.className='review-close';close.onclick=()=>{closeNote('button');box.hidden=true;button.focus?.();};head.append(close);
  const status=el('p',available?'Revisa una copia del informe con Meta. Los cambios requieren tu aceptación.':'La revisión con IA no está habilitada en esta demo pública. El dictado con Muse sí está disponible.');status.setAttribute('role','status');box.append(status);
  const send=el('button','Revisar de nuevo');send.hidden=!available;head.insertBefore(send,close);
  const foot=el('div');foot.className='review-foot';if(available)foot.append(el('p','Se envía el informe completo y la ficha de la plantilla. Comprueba las contradicciones, términos o comandos señalados. No es una lista de datos que debas añadir.'));
  const cancel=el('button','Cancelar revisión');cancel.hidden=true;box.append(cancel);
  const progress=el('div');progress.className='review-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Revisión en curso');progress.append(el('i'));head.after(progress);
  const elapsed=el('span');elapsed.className='review-elapsed';status.after(elapsed);
  const skeleton=el('div');skeleton.className='review-skeleton';skeleton.setAttribute('aria-hidden','true');skeleton.append(el('p','Los avisos aparecerán aquí, numerados igual que en el informe.'));for(let i=0;i<3;i++){const card=el('div');card.className='sk';skeleton.append(card);}box.append(skeleton);
  const warnings=el('div');warnings.className='review-warnings';box.append(cancel,warnings,foot);
  const offer=el('div');offer.hidden=true;offer.append(el('p','Este texto no tiene una revisión global vigente. Puedes revisarlo o copiarlo sin revisión.'));
  const reviewFirst=el('button','Revisar antes de copiar'),copyAnyway=el('button','Copiar sin revisar');offer.append(reviewFirst,copyAnyway);box.append(offer);
  let result=null,requested=null,busy=false,timer=null,epoch=0,started=0,offered=null,lastShown=null,tick=null;const notes=new Map();let popover=null,anchor=null;const acknowledged=new Set();
  const signature=s=>JSON.stringify({text:s.text,context:s.context});
  const current=()=>snapshot();
  function closeNote(reason='button',restoreFocus=true){
    if(!popover)return;popover.remove();popover=null;
    for(const n of section.querySelectorAll('.is-active'))n.classList.remove('is-active');
    if(restoreFocus&&anchor?.isConnected)anchor.focus?.();
    event('review-note-close',{reason});anchor=null;
  }
  function positionNote(){
    if(!popover||!anchor?.isConnected)return;
    const sheet=popover.parentElement,a=anchor.getBoundingClientRect(),r=sheet.getBoundingClientRect(),p=popover.getBoundingClientRect();
    const left=Math.max(16,Math.min(a.left-r.left,Math.max(16,r.width-p.width-16)));
    const above=a.bottom+10+p.height>window.innerHeight&&a.top>p.height+10;
    popover.style.left=left+'px';popover.style.top=Math.max(8,(above?a.top-p.height-10:a.bottom+10)-r.top+sheet.scrollTop)+'px';
    popover.dataset.placement=above?'above':'below';
  }
  function openNote(id,target,source='text'){
    const note=notes.get(id);if(!note||acknowledged.has(id)||busy||current().pending||requested!==signature(current()))return;
    closeNote('other',false);box.hidden=false;anchor=target;
    const sheet=section.querySelector('.clinical-sheet')??section;
    popover=el('div');popover.className='review-popover';popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Aviso '+id);
    popover.append(el('strong',id+' · '+note.label));
    if(typeof note.replacement==='string'){const fix=el('div');fix.className='fix';fix.append(el('s',note.s.original),' → ',el('b',note.replacement));popover.append(fix);}
    popover.append(el('p',note.s.reason));for(const quote of note.s.evidence??[])popover.append(el('blockquote',quote));
    if(note.requiresConfirmation)popover.append(el('p','Este cambio afecta una cifra, unidad, negación o lado. Comprueba lo que dictaste antes de aplicarlo. No se ha modificado el informe.'));
    const acts=el('div');acts.className='note-acts';
    if(note.apply){const apply=el('button',note.requiresConfirmation?'Confirmo el dato y aplico el cambio':'Aceptar');apply.className='accept-correction';apply.onclick=()=>{note.apply();closeNote('action');};acts.append(apply);if(note.requiresConfirmation)event('report-sensitive-confirmation-opened',{reviewId:result.id,warning:Number(id)-1});}
    const acknowledge=el('button','Es correcto');acknowledge.onclick=()=>{note.acknowledge();closeNote('action');};const dismiss=el('button',note.requiresConfirmation?'Conservar original':'Cerrar');dismiss.onclick=()=>closeNote('button');acts.append(acknowledge,dismiss);popover.append(acts);sheet.append(popover);
    note.row.classList.add('is-active');anchor?.classList.add('is-active');positionNote();acts.querySelector('button')?.focus();
    event('review-note-open',{reviewId:result.id,warning:Number(id)-1,source});
  }
  section.ownerDocument.addEventListener('keydown',e=>{if(e.key==='Escape'&&popover){e.preventDefault();closeNote('escape');}});
  section.ownerDocument.addEventListener('click',e=>{if(popover&&!popover.contains(e.target)&&!anchor?.contains(e.target)&&!e.target.closest?.('article[data-review-id]'))closeNote('outside');},{capture:true});
  section.addEventListener('scroll',positionNote,{capture:true,passive:true});window.addEventListener('scroll',positionNote,{passive:true});window.addEventListener('resize',positionNote);
  window.addEventListener('pagehide',()=>{clearInterval(tick);clearTimeout(timer);});
  const updateClock=()=>{const seconds=Math.floor((performance.now()-started)/1000);elapsed.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');};
  function changed(){
    const s=current(),same=requested!==null&&signature(s)===requested;
    send.disabled=s.pending||busy||!s.text.trim();copyAnyway.disabled=s.pending;
    const valid=available&&result?.status==='completed'&&same&&!s.pending;
    if(!valid)closeNote('stale',false);
    box.dataset.busy=String(busy);progress.hidden=skeleton.hidden=elapsed.hidden=!busy;button.classList.toggle('is-busy',busy);button.setAttribute('aria-busy',String(busy));
    if(!busy){clearInterval(tick);tick=null;}
    onAnnotations(valid?getRanges(result.suggestions).filter(r=>!acknowledged.has(r.id)):[]);
    button.textContent='Revisar con IA'+(valid&&result.suggestions.length?' · '+(result.suggestions.length-acknowledged.size):'');
    for(const b of warnings.querySelectorAll?.('button')??[])b.disabled=!valid;
    if(offered!==null&&offered!==signature(s)){offer.hidden=true;offered=null;}
    if(busy){button.textContent='Revisando…';status.textContent=same&&!s.pending?'Meta está revisando una copia del informe. Puedes seguir editando.':'Informe modificado: la revisión en curso corresponde al texto anterior.';return;}
    if(result){
      const stale=!same||s.pending;
      status.textContent=stale?'Revisión desactualizada: el informe cambió. Revisa de nuevo antes de interpretar estos avisos.':result.status==='completed'?(result.suggestions.length?`${result.suggestions.length-acknowledged.size} ${(result.suggestions.length-acknowledged.size)===1?'aviso':'avisos'} para comprobar. No se aplican cambios automáticamente.`:'No hay correcciones concretas ni contradicciones señaladas. Esto no valida clínicamente el informe.'):`Revisión ${result.status}: ${result.error??''}`;
      box.dataset.stale=String(stale);
    }
  }
  function render(r){
    closeNote('result',false);result=r;warnings.replaceChildren();notes.clear();
    for(const [index,s] of (r.suggestions??[]).entries()){const id=String(index+1),row=el('article');row.dataset.reviewId=id;row.tabIndex=-1;const label={contradiction:'Contradicción entre fragmentos',ambiguous_term:'Término para comprobar',format:'Formato o comando'}[s.kind];if(label)row.append(el('small',label));row.append(el('strong',id+' · «'+s.original+'»'),el('p',s.reason));for(const quote of s.evidence??[])row.append(el('blockquote',quote));
      if(getRanges(r.suggestions??[]).some(a=>a.id===id)){const go=el('button','Ir al texto');go.onclick=()=>{const target=onNavigate(id);openNote(id,target,'card');};row.append(go);}else row.append(el('small','Comprueba la cita en el informe; no hay un único fragmento al que enlazar.'));
      const requiresConfirmation=s.replacement===null&&s.guarded===true&&s.kind!=='contradiction';
      const replacement=requiresConfirmation?s.proposedReplacement:s.replacement;
      const note={s,row,label:requiresConfirmation?'Posible interpretación · confirma el dato':label??'Aviso para comprobar',requiresConfirmation,replacement,apply:null};notes.set(id,note);
      if(typeof replacement==='string'&&replacement!==s.original&&s.reason?.trim()){
        const suggestion=el('div');suggestion.className='note-sug';suggestion.append(el('strong',requiresConfirmation?'Posible interpretación · confirma el dato':'Te sugiero esta corrección'),el('span',replacement));row.append(suggestion);
        row.className='correction-proposal';
        const apply=el('button',requiresConfirmation?'Revisar y confirmar':'Aceptar');apply.className='accept-correction';
        const confirmation=el('div');confirmation.hidden=true;confirmation.append(el('p','Este cambio afecta una cifra, unidad, negación o lado. Comprueba lo que dictaste antes de aplicarlo. No se ha modificado el informe.'));
        const confirm=el('button','Confirmo el dato y aplico el cambio'),keep=el('button','Conservar original');confirmation.append(confirm,keep);
        const applyChange=()=>{const state=current();if(state.pending||requested!==signature(state))return;const at=state.text.indexOf(s.original);if(at<0||state.text.indexOf(s.original,at+1)>=0)return;if(onApply({start:at,end:at+s.original.length,original:s.original,replacement})){confirmation.hidden=true;event('report-suggestion-accepted',{reviewId:r.id,warning:index,confirmedSensitive:requiresConfirmation});changed();}};
        note.apply=applyChange;apply.onclick=()=>{if(requiresConfirmation){const state=current();if(state.pending||requested!==signature(state))return;confirmation.hidden=false;event('report-sensitive-confirmation-opened',{reviewId:r.id,warning:index});}else applyChange();};
        confirm.onclick=()=>{if(!confirmation.hidden)applyChange();};keep.onclick=()=>{confirmation.hidden=true;};
        row.append(apply);if(requiresConfirmation)row.append(confirmation);
      }
      const accept=el('button','Es correcto');accept.onclick=()=>{if(requested!==signature(current())||current().pending)return;acknowledged.add(id);row.hidden=true;changed();event('report-warning-acknowledged',{reviewId:r.id,warning:index});};note.acknowledge=accept.onclick;row.append(accept);
      const title=row.querySelector('strong');if(title){const noteHead=el('div');noteHead.className='note-head';const num=el('span',id);num.className='note-num';const term=el('span','«'+s.original+'»');term.className='note-term';const kind=el('small',requiresConfirmation?'Confirmar dato':({contradiction:'Contradicción',ambiguous_term:'Término',format:'Comando'}[s.kind]??'Aviso'));noteHead.append(num,term,kind);row.querySelector('small')?.remove();title.replaceWith(noteHead);}
      const actions=el('div');actions.className='note-acts';for(const b of [...row.children].filter(n=>n.tagName==='BUTTON'))actions.append(b);row.append(actions);warnings.append(row);}
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
    const token=++epoch;requested=signature(s);busy=true;result=null;warnings.replaceChildren();offer.hidden=true;offered=null;cancel.hidden=false;started=performance.now();clearInterval(tick);updateClock();tick=setInterval(updateClock,1000);changed();
    event('report-review-request',{characters:s.text.length,contextCharacters:JSON.stringify(s.context).length});
    try{const r=await api('/api/report-reviews',{text:s.text,context:s.context});if(token!==epoch){if(['queued','running'].includes(r.status))void api('/api/reviews/cancel',{id:r.id}).catch(()=>{});return;}result=r;if(['queued','running'].includes(r.status))await poll(r.id,token);else{busy=false;cancel.hidden=true;render(r);}}
    catch(e){if(token!==epoch)return;busy=false;cancel.hidden=true;render({status:'error',error:e.message,suggestions:[]});}
  }
  // One click explicitly requests review; a current result is reopened without resending.
  button.onclick=()=>{box.hidden=false;changed();event('panel-toggle',{panel:'report-review',open:true});if(!busy&&(!result||result.status!=='completed'||requested!==signature(current())))return request();};send.onclick=reviewFirst.onclick=request;
  copyAnyway.onclick=()=>{if(current().pending||offered!==signature(current()))return;offer.hidden=true;event('report-copy-without-review',{});onCopy();};
  cancel.onclick=()=>{epoch++;clearTimeout(timer);busy=false;cancel.hidden=true;if(result?.id)void api('/api/reviews/cancel',{id:result.id}).catch(()=>{});render({status:'cancelled',error:'Cancelada por el usuario.',suggestions:[]});event('report-review-cancel',{});};
  changed();
  section.dispatchEvent?.(new CustomEvent('review-panel-mounted',{bubbles:true,detail:{box}}));
  return {box,changed,openNote,closeNote,capture(){return !busy&&result?{result:structuredClone(result),requested,acknowledged:[...acknowledged],open:!box.hidden}:null;},restore(saved){epoch++;clearTimeout(timer);busy=false;cancel.hidden=true;result=null;requested=null;acknowledged.clear();warnings.replaceChildren();offer.hidden=true;offered=null;box.hidden=true;if(saved){requested=saved.requested;for(const id of saved.acknowledged)acknowledged.add(id);box.hidden=!saved.open;lastShown=saved.result.id;render(saved.result);for(const row of warnings.children)row.hidden=acknowledged.has(row.dataset.reviewId);}else changed();},focusNote(id){box.hidden=false;const row=warnings.querySelector?.(`[data-review-id="${id}"]`);row?.focus?.();row?.scrollIntoView?.({block:'center'});},beforeCopy(){const s=current();if(s.pending)return false;if(!available)return true;if(result?.status==='completed'&&signature(s)===requested)return true;box.hidden=false;offered=signature(s);offer.hidden=false;status.textContent=busy?'Revisión en curso. Puedes esperar o copiar sin revisión.':'Puedes revisar el informe completo antes de copiar.';event('report-copy-offer',{busy,hasPrevious:!!result});return false;},reset(){cancel.onclick();requested=null;result=null;acknowledged.clear();warnings.replaceChildren();offer.hidden=true;offered=null;box.hidden=true;status.textContent=available?'Revisión opcional del texto completo y ficha de plantilla. Envía texto a Meta.':'La revisión con IA no está habilitada en esta demo pública.';changed();}};
}
