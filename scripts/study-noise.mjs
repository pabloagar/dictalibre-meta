import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {wavInfo,hash} from '../backend/lab-core.mjs';
export function addNoise(wav,snrDb,seed=12345){
 const info=wavInfo(wav);if(info.channels!==1)throw Error('Se requiere mono.');if(!Number.isFinite(snrDb)||snrDb<0||snrDb>60)throw Error('SNR inválido.');
 const n=info.bytes/2,signal=Array.from({length:n},(_,i)=>wav.readInt16LE(info.offset+2*i));
 let state=seed>>>0;const noise=signal.map(()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296-.5;});
 const rms=a=>Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length),sr=rms(signal),nr=rms(noise);if(!sr||!nr)throw Error('No se puede fijar SNR de señal silenciosa.');
 const scale=sr/(nr*10**(snrDb/20));let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(signal[i]+noise[i]*scale));const gain=Math.min(1,32000/peak),out=Buffer.from(wav);let noisePower=0,signalPower=0;
 for(let i=0;i<n;i++){const s=signal[i]*gain,y=Math.round((signal[i]+noise[i]*scale)*gain);out.writeInt16LE(y,info.offset+2*i);signalPower+=s*s;noisePower+=(y-s)**2;}
 return {wav:out,metrics:{algorithm:'lcg-uniform-rms-v1',seed,snrRequestedDb:snrDb,snrMeasuredDb:10*Math.log10(signalPower/noisePower),definition:'RMS over entire clip including silence; digital not acoustic SNR',gain,originalHash:hash(wav),outputHash:hash(out),durationMs:info.durationMs}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=path.resolve(process.argv[2]??'data/local/study-corpus-v1'),dest=path.resolve(process.argv[3]??'data/local/study-corpus-noise-v1');
 if(fs.existsSync(dest))throw Error('Usa destino nuevo.');const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8').replace(/^\uFEFF/,''));fs.mkdirSync(dest,{recursive:true});const cases=[];
 for(const c of manifest.cases.filter(c=>c.variant==='clean'))for(const snr of [20,10]){const result=addNoise(fs.readFileSync(path.join(source,c.file)),snr,12345);const file=`${c.id}-snr${snr}.wav`;fs.writeFileSync(path.join(dest,file),result.wav);cases.push({...c,id:file.slice(0,-4),file,variant:`noise${snr}`,sha256:hash(result.wav),...result.metrics});}
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify({...manifest,schema:'dicta-corpus-noise-v1',createdAt:new Date().toISOString(),cases},null,2));console.log(`${cases.length} variantes de ruido guardadas; sin inferencia.`);
}
