import fs from 'node:fs';
import {applyFormatting} from '../backend/format-pipeline.mjs';
const dir=process.argv[2],rows=JSON.parse(fs.readFileSync(dir+'/results.json'));
const expected={p1:'Pulmones bien expandidos',p2:'Pulmones bien expandidos.',p3:'Sin derrame pleural ni neumotórax',p4:'Sin derrame pleural, ni neumotórax.',p5:'Hallazgos lesión de 1,8 centímetros',p6:'Hallazgos:\nLesión de 1,8 centímetros.',p7:'Paciente en coma inducido.','digital-silence':''};
const norm=s=>s.toLowerCase().trim().replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n');
const out=rows.map(r=>{const v={text:r.text??'',numbersEnabled:true,termsEnabled:true,commandsEnabled:true,timings:{}};applyFormatting(v);return {case:r.caseId,rep:r.rep,variant:r.variant,raw:r.text,formatted:v.formatting.text,expected:expected[r.caseId],exact:norm(v.formatting.text)===norm(expected[r.caseId])};});
fs.writeFileSync(dir+'/punctuation-scored.json',JSON.stringify(out,null,2));
for(const variant of ['baseline','balanced'])console.log(JSON.stringify({variant,exact:out.filter(r=>r.variant===variant&&r.exact).length,total:out.filter(r=>r.variant===variant).length,failures:out.filter(r=>r.variant===variant&&!r.exact)}));
