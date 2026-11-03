
if(location.pathname==='/live'){
 document.documentElement.dataset.boot='loading';
 try{const t=localStorage.getItem('dicta-theme-v1')||'penumbra';if(['dia','penumbra','ambar','sala'].includes(t))document.documentElement.dataset.bootTheme=t==='sala'?'ambar':t;}catch{}
 const began=performance.now();let timer;
 const fail=()=>{if(!['loading','slow'].includes(document.documentElement.dataset.boot))return;clearTimeout(timer);document.documentElement.dataset.boot='error';const text=document.getElementById('dicta-boot-message');if(text){text.setAttribute('role','alert');text.textContent=(document.documentElement.lang==='en'?'Could not open dicta. Check your connection and try again.':'No se pudo abrir dicta. Comprueba tu conexión y vuelve a intentar.');}};
 window.addEventListener('dicta-ready',()=>{clearTimeout(timer);document.documentElement.removeAttribute('data-boot');document.documentElement.removeAttribute('data-boot-theme');performance.measure('dicta-startup',{start:began,end:performance.now()});},{once:true});
 window.addEventListener('dicta-startup-error',fail);
 timer=setTimeout(()=>{if(document.documentElement.dataset.boot!=='loading')return;document.documentElement.dataset.boot='slow';const text=document.getElementById('dicta-boot-message');if(text){text.setAttribute('role','status');text.textContent=document.documentElement.lang==='en'?'The connection is taking longer. Loading will continue automatically.':'La conexión está tardando. La carga continuará automáticamente.';}},20000);
}
