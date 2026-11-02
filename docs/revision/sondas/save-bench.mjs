import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-bench-'));fs.mkdirSync(dir,{recursive:true});
const filler=n=>'lorem sintético '.repeat(Math.ceil(n/16)).slice(0,n);
function make(runs){const db={schema:1,audios:Array.from({length:55},(_,i)=>({id:'a'+i,name:'x.wav',sha256:'0'.repeat(64),references:[]})),configs:[],runs:[],reviews:[],reviewDocuments:[]};
for(let i=0;i<runs;i++){const stream=i%3===0;db.runs.push({id:'r'+i,status:'completed',text:filler(200),reviewContext:i%2?{templateText:filler(3000),reportText:filler(Math.min(10000,i*80))}:null,stream:stream?{events:Array.from({length:300},(_,k)=>({atMs:k*100,text:filler(120),final:false,audioProcessedMs:k*100})),segments:[]}:undefined,timings:{queueMs:1,requestMs:2}});}
for(let i=0;i<runs/5;i++)db.reviews.push({id:'v'+i,input:{originalText:filler(200),formattedText:filler(200),context:{templateText:filler(3000),reportText:filler(6000)}},rawResponse:filler(800),suggestions:[]});return db;}
for(const runs of [170,500,1000]){const db=make(runs);const p=path.join(dir,'catalog.json');const ser=[],tot=[];let bytes=0;
for(let k=0;k<15;k++){const t0=performance.now();const s=JSON.stringify(db,null,2);const t1=performance.now();fs.writeFileSync(p+'.tmp',s);fs.renameSync(p+'.tmp',p);const t2=performance.now();ser.push(t1-t0);tot.push(t2-t0);bytes=Buffer.byteLength(s);}
const med=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];const p95=a=>a.sort((x,y)=>x-y)[Math.ceil(a.length*.95)-1];
console.log(JSON.stringify({runs,bytes,serializeMedianMs:+med(ser).toFixed(2),saveMedianMs:+med(tot).toFixed(2),saveMaxMs:+p95(tot).toFixed(2),n:15}));}
