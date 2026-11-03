// Test-only DOM observer: no audio, report text, cookies or credentials collected.
(()=>{
 const rows=[],states=[],errors=[];let last='',lastState='',qrAt=null,readyAt=null,finished=false,sampleCostMs=0;
 const start=performance.now();
 function sample(){
  if(finished)return;
  const began=performance.now(),state=document.documentElement?.dataset.boot??'ready',boot=state!=='ready';
  if(state!==lastState){states.push({ms:began,state});lastState=state;}
  const sheet=document.querySelector(boot?'.boot-paper':'.clinical-sheet'),logo=document.querySelector(boot?'.boot-header .dicta-wordmark':'header .dicta-wordmark'),qr=!!document.querySelector('.scan-home #qr svg');
  if(qr&&qrAt===null)qrAt=began;if(!boot&&sheet&&readyAt===null)readyAt=began;
  if(sheet&&getComputedStyle(sheet).display!=='none'){
   const r=sheet.getBoundingClientRect(),l=logo?.getBoundingClientRect();
   const v={boot,qr,x:r.x,y:r.y,width:r.width,height:r.height,logo:l?{x:l.x,y:l.y,width:l.width,height:l.height}:null};
   const key=JSON.stringify(v);if(key!==last&&r.width>0&&r.height>0){rows.push({ms:began,...v});last=key;}
  }
  sampleCostMs+=performance.now()-began;
  if(qrAt!==null&&began-qrAt>=600)finish('qr');
 }
 function finish(reason){
  if(finished)return;finished=true;clearInterval(poll);clearTimeout(deadline);
  const out=document.createElement('script');out.type='application/json';out.id='startup-test-result';
  out.textContent=JSON.stringify({reason,rows,states,errors,qrAt,readyAt,viewport:{width:innerWidth,height:innerHeight},elapsed:performance.now()-start,sampleCostMs,visibility:document.visibilityState});document.body.append(out);
 }
 window.addEventListener('error',e=>errors.push({ms:performance.now(),kind:e.target===window?'javascript':'resource',path:e.filename?new URL(e.filename,location.href).pathname:null}),true);
 window.addEventListener('unhandledrejection',()=>errors.push({ms:performance.now(),kind:'unhandled-rejection'}));
 const poll=setInterval(sample,250),deadline=setTimeout(()=>{sample();finish('observation-deadline');},35000);
 function frame(){sample();if(!finished)requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
