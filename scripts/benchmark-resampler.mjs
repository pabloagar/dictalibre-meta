// Local CPU comparison; no microphone, network, or deployment. Baseline must be explicit.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {StreamResampler} from '../backend/stream-audio.mjs';
import {wavInfo} from '../backend/lab-core.mjs';
const [baselinePath,manifestPath,output]=process.argv.slice(2);
if(!baselinePath||!manifestPath||!output)throw Error('Usage: node scripts/benchmark-resampler.mjs BASELINE.mjs MANIFEST.json NEW_OUTPUT.json');
if(fs.existsSync(output))throw Error('Preserve previous evidence; output already exists');
const Baseline=(await import(pathToFileURL(path.resolve(baselinePath)))).StreamResampler;
const digest=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,''));
const fixtures=manifest.cases.map(c=>{const wav=fs.readFileSync(path.resolve(path.dirname(manifestPath),c.file)),i=wavInfo(wav);return {rate:i.sampleRate,pcm:wav.subarray(i.offset,i.offset+i.bytes)};});
function run(Resampler){
  const streams=fixtures.map(f=>new Resampler(f.rate)),outputs=fixtures.map(()=>[]);
  const start=performance.now();
  // Interleave 100 ms chunks across all ten streams, as in the concurrent driver.
  for(let block=0;;block++){
    let any=false;
    fixtures.forEach((f,i)=>{const size=f.rate/10*2,offset=block*size;if(offset<f.pcm.length){any=true;outputs[i].push(streams[i].push(f.pcm.subarray(offset,offset+size)));}});
    if(!any)break;
  }
  streams.forEach((r,i)=>outputs[i].push(r.push(Buffer.alloc(0),true)));
  const elapsedMs=performance.now()-start;
  return {elapsedMs,hashes:outputs.map(p=>digest(Buffer.concat(p)))};
}
run(Baseline);run(StreamResampler); // Equal warm-up, excluded from measurements.
const rounds=[];
for(let i=0;i<5;i++){
  let before,after;
  if(i%2===0){before=run(Baseline);after=run(StreamResampler);}else{after=run(StreamResampler);before=run(Baseline);}
  rounds.push({round:i+1,order:i%2===0?'baseline,candidate':'candidate,baseline',before,after,equal:JSON.stringify(before.hashes)===JSON.stringify(after.hashes)});
}
const result={createdAt:new Date().toISOString(),node:process.version,platform:process.platform,baselineHash:digest(fs.readFileSync(baselinePath)),candidateHash:digest(fs.readFileSync(new URL('../backend/stream-audio.mjs',import.meta.url))),clock:'performance.now ms',precisionMs:null,overheadMs:null,rounds};
fs.writeFileSync(output,JSON.stringify(result,null,2));
console.log(JSON.stringify(rounds.map(r=>({round:r.round,beforeMs:r.before.elapsedMs,afterMs:r.after.elapsedMs,equal:r.equal}))));
if(rounds.some(r=>!r.equal))process.exitCode=1;
