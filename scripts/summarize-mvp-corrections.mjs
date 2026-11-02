import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='data/local/lab/reports/';
const comparison=root+'mvp-corrections-1793645039871/', fresh=root+'mvp-evaluation-1793645039975/';
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(hash(fresh+'results.json')!=='4d6a05f7f3e1e92ab864d927a5cc0c247ba61e55980a096d09d710938f7381f5'||hash(comparison+'same-text-reviews.json')!=='df9381a9f43f06269801a675210bb05fdd28f0ba869e63fce29609c6cd744bed'||hash(comparison+'controls.json')!=='f190fe97fa660edbc11c0621060228955f398c170be4ed92fc4d4ff172649125')throw Error('Manual assessment applies only to the frozen evidence.');
const norm=s=>s.trim().normalize('NFC').toLowerCase().replace(/[ \t]+/g,' ');
const rows=read(fresh+'results.json'),format=read(comparison+'formatting.json'),same=read(comparison+'same-text-reviews.json'),controls=read(comparison+'controls.json');
const mismatch=rows.filter(r=>norm(r.formatted)!==norm(r.expectedFormatted));
if(rows.length!==15||controls.length!==10||mismatch.length!==2||mismatch[0].formatted!=='No se observa neumotorax.'||mismatch[1].formatted!=='No se observa hemotórax.')throw Error('Reassess annotations for changed results.');
const distribution=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return {n:a.length,min:a[0]??null,median:a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:null,max:a.at(-1)??null};};
const notices=(r,k)=>r.reduce((n,x)=>n+x[k].suggestions.length,0);
const unique=[...new Map(rows.map(r=>[r.review.id,r.review])).values()];
const result={schema:'mvp-corrections-summary-v1',build:read(fresh+'protocol.json').build,referenceValidated:false,
 assessment:'Agent comparison against provisional synthetic scripts; no human listening validation or clinical validation.',
 evidenceHashes:Object.fromEntries([fresh+'protocol.json',fresh+'results.json',comparison+'protocol.json',comparison+'formatting.json',comparison+'same-text-reviews.json',comparison+'controls.json'].map(p=>[p,hash(p)])),
 frozenAsr:{cases:format.length,beforeMatches:format.filter(r=>norm(r.before)===norm(r.expected)).length,afterMatches:format.filter(r=>norm(r.after)===norm(r.expected)).length,changedCases:format.filter(r=>r.before!==r.after).map(r=>r.caseId)},
 sameTextReview:{cases:same.length,beforeNotices:notices(same,'before'),afterNotices:notices(same,'after'),beforeUniqueReviews:new Set(same.map(r=>r.before.id)).size,afterUniqueReviews:new Set(same.map(r=>r.after.id)).size,extraCompletenessNoticesBefore:4,extraCompletenessNoticesAfter:0,deformedTermsFlaggedAfter:3,oldMalformedHeadingMissedAfter:true},
 controls:controls.map(r=>({id:r.id,expectedNotice:r.expect,beforeNotices:r.before.suggestions.length,afterNotices:r.after.suggestions.length,passed:(r.after.suggestions.length>0)===r.expect})),
 freshAudio:{cases:rows.length,matched:rows.length-mismatch.length,uniqueReviews:unique.length,cachedReuses:rows.length-unique.length,noticeCount:rows.reduce((n,r)=>n+r.review.suggestions.length,0),originalsPreserved:rows.filter(r=>r.originalPreserved).length,mismatches:mismatch.map(r=>({caseId:r.caseId,expected:r.expectedFormatted,observed:r.formatted,classification:r.caseId.includes('laura')?'valid-medical-term-substitution-not-flagged':'missing-accent',noticeCount:r.review.suggestions.length}))},
 templateModel:{count:285,passed:285,privateContentSentToMeta:false,clinicalValidation:false},
 browserSmoke:{browser:'ChatGPT in-app browser',url:'http://127.0.0.1:8797/live',templateCategory:'thyroid ultrasound',selectedReplacement:true,undoExact:true,redoExact:true,privateContentSentToMeta:false,audioSource:null},
 timingMs:{serverEndToFinal:distribution(rows.map(r=>r.run.stream.endToFinalMs)),providerEndToFinal:distribution(rows.map(r=>r.run.stream.endStreamToFinalMs)),uniqueReviewRequest:distribution(unique.map(r=>r.timings.requestMs)),clockPrecisionMs:null,instrumentationOverheadMs:null},
 limitations:['One repetition, five scripts and three synthetic voices; references not human-listened.','ASR and reviewer comparisons ran concurrently: timing is descriptive, not causal.','Different ASR outcomes cannot be attributed to the formatting change.','Text-only reviewer cannot reliably detect a plausible wrong medical word.','285 template checks exercise the editor model, not clinical review of 285 reports.','iPhone physical test remains assigned to the owner.'],mvpQualityGate:'not closed'};
const destination='experiments/results/2026-11-02-mvp-corrections/summary.json';fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
