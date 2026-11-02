import {LocalWorker} from '../../../backend/lab.mjs';
const py=process.argv[2];
for(const mode of ['crash','empty']){process.env.FAKE_MODE=mode;const w=new LocalWorker(py);
 try{const r=await w.call({command:'transcribe'});console.log(mode,'resolved',JSON.stringify(r));}catch(e){console.log(mode,'rejected:',e.message,'childAfter=',w.child?'alive':'null');}
 if(mode==='crash'){process.env.FAKE_MODE='empty';try{const r=await w.call({command:'transcribe'});console.log('after-crash respawn resolved',JSON.stringify(r));}catch(e){console.log('respawn failed',e.message);}}
 w.close();}
process.env.FAKE_MODE='hang';const w=new LocalWorker(py);const c=new AbortController();const t0=performance.now();setTimeout(()=>c.abort(),300);
try{await w.call({command:'transcribe'},c.signal);}catch(e){console.log('hang+abort rejected after',Math.round(performance.now()-t0),'ms:',e.message,'child=',w.child?'alive':'null');}
// busy
process.env.FAKE_MODE='hang';const w2=new LocalWorker(py);const p=w2.call({command:'a'}).catch(e=>e.message);try{await w2.call({command:'b'});}catch(e){console.log('concurrent call:',e.message);}w2.close();console.log('first after close:',await p);
