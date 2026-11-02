import {validateReview} from '../../../backend/meta-review.mjs';
const text='Lesión hipodensa en lóbulo superior derecho. Fractura del segundo arco costal. Nódulo de dieciséis milímetros. Derrame pleural leve. Aumento de densidad. Hallazgo ausente. Proximal al hilio. Realce positivo. Densidad de 40 UH. Estenosis del 50 %. Imagen ponderada en T2. Nódulo en C5. Hiperintenso en T dos. Hígado normal. Lesión benigna.';
const cases=[
['hipodensa','hiperdensa','terminology'],
['lóbulo superior','lóbulo inferior','terminology'],
['segundo arco','tercer arco','terminology'],
['dieciséis milímetros','diecisiete milímetros','terminology'],
['Derrame pleural leve.','Derrame pleural leve. Neumotórax a tensión.','grammar'],
['Aumento','Disminución','terminology'],
['ausente','presente','terminology'],
['Proximal','Distal','terminology'],
['positivo','negativo','terminology'],
['40 UH','40 HU','terminology'],
['50 %','5 %','terminology'],
['T2','T1','terminology'],
['C5','C6','terminology'],
['T dos','T uno','terminology'],
['Hígado normal','Hígado no normal','grammar'],
['benigna','maligna','terminology'],
['superior derecho','superior Derecho','grammar'],
['derecho','izquierdo','terminology'],
];
for(const [o,r,c] of cases){const content=JSON.stringify({suggestions:[{original:o,replacement:r,category:c,reason:'x'}]});
try{const [s]=validateReview(content,text);console.log(JSON.stringify({original:o,proposed:r,offeredReplacement:s.replacement,category:s.category,guarded:s.guarded}));}catch(e){console.log(o,'ERROR',e.message);}}
// unique-span with repeated fragment
try{validateReview(JSON.stringify({suggestions:[{original:'derecho',replacement:null,category:'sensitive',reason:'x'}]}),'derecho y derecho');}catch(e){console.log('repeated span ->',e.message);}
// one bad suggestion invalidates all
try{validateReview(JSON.stringify({suggestions:[{original:'hipodensa',replacement:'hiperdensa',category:'terminology',reason:'x'},{original:'NO EXISTE',replacement:null,category:'sensitive',reason:'x'}]}),text);}catch(e){console.log('one bad of two ->',e.message);}
