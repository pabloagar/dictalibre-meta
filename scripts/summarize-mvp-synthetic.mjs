// Summarize the frozen 15-case synthetic experiment; annotations are agent assessments,
// not human-validated clinical judgments. No private template content is exported.
import fs from 'node:fs';
import path from 'node:path';
import {hash} from '../backend/lab-core.mjs';
const dir=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('Pass experiment directory.');
const protocol=JSON.parse(fs.readFileSync(path.join(dir,'protocol.json')));
const bytes=fs.readFileSync(path.join(dir,'results.json')),rows=JSON.parse(bytes);
if(hash(bytes)!=='4f5a229b780c5bcacaad648c17cca548b4e377bde33449e6949b97d019b04eb3')throw Error('Manual annotations apply only to the recorded results hash; reassess a different series.');
if(protocol.schema!=='mvp-synthetic-evaluation-v1'||rows.length!==15||new Set(rows.map(r=>r.caseId)).size!==15)throw Error('Incomplete or unexpected series.');
for(const r of rows){const c=protocol.cases.find(c=>c.id===r.caseId);if(!c||c.sha256!==r.audioHash||c.script!==r.script||c.expectedFormatted!==r.expectedFormatted)throw Error('Result not tied to frozen case.');}
const norm=s=>s.trim().normalize('NFC').toLowerCase().replace(/[ \t]+/g,' ');
const distribution=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {n:a.length,min:a[0]??null,median:a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null,max:a.at(-1)??null};};
const uniqueReviews=[...new Map(rows.filter(r=>r.review).map(r=>[r.review.id,r.review])).values()];
const annotations={
 'microsoft-helena-desktop-negation':{stage:'asr',kind:'terminology-substitution',expected:'neumotórax',observed:'neuromotor ax'},
 'microsoft-helena-desktop-positive':{stage:'asr',kind:'terminology-substitution',expected:'neumotórax',observed:'neuromotorax'},
 'microsoft-pablo-positive':{stage:'asr',kind:'terminology-and-grammar-substitution',expected:'se observa neumotórax',observed:'se observan eumotorax'},
 'microsoft-helena-desktop-sections':{stage:'asr-and-number-and-command-formatting',kind:'heading-command-error',expected:'Hallazgos:',observed:'Hallazgos 2.',chain:['ASR: dos punto (singular)','number formatter: dos -> 2','command formatter: punto -> .']}
};
const perCase=rows.map(r=>({caseId:r.caseId,baseId:r.baseId,voice:r.voice,status:r.run?.status??null,formattedMatchIgnoringCaseAndHorizontalSpaces:r.formatted!==null&&norm(r.formatted)===norm(r.expectedFormatted),annotation:annotations[r.caseId]??null,reviewStatus:r.review?.status??null,noticeCount:r.review?.suggestions.length??null,originalPreserved:r.originalPreserved??null}));
const mismatch=perCase.filter(r=>!r.formattedMatchIgnoringCaseAndHorizontalSpaces);if(mismatch.some(r=>!r.annotation)||mismatch.length!==4)throw Error('Different outcomes: reassess annotations, do not reuse automatically.');
const summary={schema:'mvp-synthetic-summary-v1',build:protocol.build,protocolHash:hash(fs.readFileSync(path.join(dir,'protocol.json'))),resultsHash:hash(bytes),referenceValidated:false,assessment:'agent comparison to provisional TTS scripts; no human listening or clinical validation',conditions:protocol.conditions,
 counts:{audioFiles:rows.length,independentScripts:5,completedAsr:rows.filter(r=>r.run?.status==='completed').length,formattedMatches:perCase.filter(r=>r.formattedMatchIgnoringCaseAndHorizontalSpaces).length,mismatchedCases:mismatch.length,reviewOutcomes:rows.filter(r=>r.review?.status==='completed').length,uniqueProviderReviews:uniqueReviews.length,cachedReuses:rows.length-uniqueReviews.length,noticesAcrossCases:rows.reduce((n,r)=>n+(r.review?.suggestions.length??0),0),uniqueNotices:uniqueReviews.reduce((n,r)=>n+r.suggestions.length,0),mismatchedCasesWithNotice:mismatch.filter(r=>r.noticeCount>0).length,matchedCasesWithNotice:perCase.filter(r=>r.formattedMatchIgnoringCaseAndHorizontalSpaces&&r.noticeCount>0).length,originalsPreserved:rows.filter(r=>r.originalPreserved).length},
 timingMs:{serverEndReceivedToFinal:distribution(rows.map(r=>r.run?.stream?.endToFinalMs)),providerEndStreamToFinal:distribution(rows.map(r=>r.run?.stream?.endStreamToFinalMs)),uniqueReviewRequest:distribution(uniqueReviews.map(r=>r.timings.requestMs))},
 protectedContentAssessment:{basis:'manual agent text comparison, provisional script',polarityMarkers:{preserved:12,opportunities:12,note:'no/sin/affirmation retained; wrong noun can still invalidate a full assertion'},laterality:{preserved:6,opportunities:6},measureAndUnit:{preserved:6,opportunities:6},wholeFindingAdditionsObserved:0,neumothoraxTerm:{correct:3,opportunities:6}},
 reviewAssessment:{usefulErrorNoticesAcrossCases:4,additionalCompletenessNoticesAcrossCases:4,additionalCompletenessNoticesUnique:3,note:'Completeness notices are not dictation errors: missing side/size and impression/hallazgo coverage. May be relevant to complete-report review; not evidence of ASR failure. No automatic edits.'},
 acceptance:{allInferencesCompleted:true,allProtectedClinicalContentAndCommandsPreserved:false,mvpQualityGate:'not closed',humanReferenceValidationPending:true,iphone:'owner to test'},perCase};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
