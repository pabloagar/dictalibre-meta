
if(location.pathname==='/live'){
 document.documentElement.dataset.boot='loading';
 try{const t=localStorage.getItem('dicta-theme-v1');if(['penumbra','ambar','sala'].includes(t))document.documentElement.dataset.bootTheme=t==='sala'?'ambar':t;}catch{}
 const began=performance.now();let timer;
 const fail=()=>{if(document.documentElement.dataset.boot!=='loading')return;document.documentElement.dataset.boot='error';const text=document.getElementById('dicta-boot-message');if(text)text.textContent='No se pudo abrir dicta. Comprueba tu conexión y vuelve a intentar.';};
 window.addEventListener('dicta-ready',()=>{clearTimeout(timer);document.documentElement.removeAttribute('data-boot');document.documentElement.removeAttribute('data-boot-theme');performance.measure('dicta-startup',{start:began,end:performance.now()});},{once:true});
 window.addEventListener('dicta-startup-error',fail);
 timer=setTimeout(fail,20000);
}
