// Isolated synthetic UI fixture. Never opens the production catalogue or credentials.
import {createLab} from '../backend/lab.mjs';
import fs from 'node:fs';
import path from 'node:path';
const dataDir=path.resolve(process.argv[2]??'.runtime/lab-study-preview');
if(fs.existsSync(path.join(dataDir,'catalog.json')))throw Error('Choose a new preview directory to preserve earlier evidence.');
const lab=createLab({dataDir,keyFile:path.join(dataDir,'unused.env'),worker:{close(){},call(){throw Error('Fixture: no inference');}},muse:async()=>{throw Error('Fixture: no inference');},reviewProvider:async()=>{throw Error('Fixture: no inference');}});
const audio={id:'synthetic-a',name:'EJEMPLO SINTÉTICO · sin inferencia',sha256:null,durationMs:2000,sampleRate:16000,channels:1,references:[{version:1,text:'No hay lesión derecha de tres milímetros.'}]};lab.db.audios.push(audio);
for(const [i,c] of lab.db.configs.entries())lab.db.runs.push({id:'fixture-'+i,audioId:audio.id,configId:c.id,configuration:c,repeat:1,status:'completed',text:i?'No hay lesión derecha de tres milímetros.':'Hay lesión derecha de tres milímetros.',timings:{requestMs:null,totalMs:null},result:{cold:null},referenceAtRun:audio.references[0],environment:{source:'synthetic-fixture-no-inference'},formatting:null});
lab.db.reviewDocuments.push({runId:'fixture-0',revision:0,text:lab.db.runs[0].text,history:[]});
lab.db.reviews.push({id:'fixture-review',runId:'fixture-0',baseRevision:0,baseText:lab.db.runs[0].text,status:'completed',config:{model:'FIXTURE'},timings:{requestMs:null},suggestions:[{id:'fixture-suggestion',original:'Hay lesión',replacement:'No hay lesión',category:'sensitive',status:'pending',reason:'Propuesta sintética para probar anotación; no resultado del modelo.'}],uiMeasurements:[]});
fs.writeFileSync(path.join(dataDir,'catalog.json'),JSON.stringify(lab.db,null,2));
lab.server.listen(8794,'127.0.0.1',()=>console.log('Synthetic preview http://127.0.0.1:8794'));
