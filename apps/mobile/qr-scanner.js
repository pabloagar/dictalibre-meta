export function qrTokenFromText(text,origin){
 try{const url=new URL(text);if(url.origin!==origin||url.pathname!=='/mobile'||url.search||url.username||url.password)return null;
 return /^#qr=[a-f0-9]{64}$/.test(url.hash)?url.hash.slice(4):null;}catch{return null;}
}
export function createQrScanner({video,panel,message,cancel,onResult,onEvent=()=>{}}){
 let epoch=0,stream=null,timer=null,started=0,frames=0;
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
 function stop(reason='cancelled'){
  epoch++;clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;panel.hidden=true;
  onEvent('qr-scan-stop',{reason,frames,elapsedMs:performance.now()-started});
 }
 cancel.onclick=()=>stop();
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!panel.hidden)stop('hidden');});
 window.addEventListener('pagehide',()=>{if(!panel.hidden)stop('pagehide');});
 async function start(){
  stop('restart');const generation=++epoch;started=performance.now();frames=0;panel.hidden=false;message.textContent='Permite la cámara y apunta al QR del computador.';cancel.focus();onEvent('qr-scan-start');
  try{
   if(!navigator.mediaDevices?.getUserMedia||!context||typeof window.jsQR!=='function')throw Error('unsupported');
   const obtained=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480}},audio:false});
   if(generation!==epoch||document.hidden){obtained.getTracks().forEach(track=>track.stop());return;}
   stream=obtained;video.srcObject=stream;await video.play();if(generation!==epoch)return;
   message.textContent='Apunta al QR nuevo que muestra dicta en el computador.';
   const scan=()=>{
    if(generation!==epoch)return;
    if(performance.now()-started>60000){stop('timeout');message.textContent='No se detectó un QR. Pulsa Escanear QR para reintentar o usa el código.';panel.hidden=false;return;}
    try{if(video.readyState>=2&&video.videoWidth){
     const scale=Math.min(1,640/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
     context.drawImage(video,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height);frames++;
     const result=window.jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
     if(result){const token=qrTokenFromText(result.data,location.origin);if(token){stop('decoded');onResult(token);return;}message.textContent='Este QR no corresponde a esta página de dicta. Escanea el QR del computador.';}
    }}catch{stop('decode-error');message.textContent='No se pudo leer la cámara. Reintenta o usa el código.';panel.hidden=false;return;}
    timer=setTimeout(scan,150);
   };scan();
  }catch(error){if(generation!==epoch)return;stop('camera-error');panel.hidden=false;message.textContent=error.name==='NotAllowedError'?'Permiso de cámara denegado. Habilítalo para este sitio o usa el código manual.':'No se pudo abrir la cámara. Reintenta o usa el código manual.';}
 }
 return {start,stop};
}
