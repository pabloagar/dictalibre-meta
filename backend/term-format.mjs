// Display normalization from a reviewed table, not ASR correction. Offsets refer to the input.
import fs from 'node:fs';
const table=JSON.parse(fs.readFileSync(new URL('../data/vocabulario/formas-dictadas.v1.json',import.meta.url),'utf8'));
export const TERM_VERSION=`formas-dictadas-v${table.version}`;
const classes={a:'[aá]',e:'[eé]',i:'[ií]',o:'[oó]',u:'[uúü]',n:'[nñ]'};
const key=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[ \t-]+/gu,' ');
const targets=new Map();
for(const {escrito,dichos} of table.reemplazos)for(const dicho of dichos){
 const k=key(dicho);
 if(targets.has(k)&&targets.get(k)!==escrito)throw Error(`Forma dictada ambigua: ${dicho}`);
 targets.set(k,escrito);
}
const end='(?![\\p{L}\\p{N}_])';
// «dos puntos» is a dictation command, and «a» is usually a preposition: «birads 4 a las 10».
const guards=[[/ (?:dos|2)$/u,`(?![ \\t]+puntos${end})`],[/ a$/u,`(?=[ \\t]*(?:$|[.,;:)\\r\\n]|(?:punto|coma|nueva|nuevo|dos[ \\t]+puntos|2[ \\t]+puntos|en|de|y|con|por|sin|seg[uú]n)${end}))`]];
const source=d=>[...d].map(c=>c===' '?'[ \\t-]+':classes[c]??c.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')).join('')+end+(guards.find(([test])=>test.test(d))?.[1]??'');
const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...targets.keys()].sort((a,b)=>b.length-a.length).map(source).join('|')})`,'giu');
export function formatTerms(original){
 const started=performance.now(),events=[];
 const text=original.replace(pattern,(spoken,start)=>{
  const written=targets.get(key(spoken));
  const replacement=/^\p{Lu}/u.test(spoken)&&/^\p{Ll}/u.test(written)?written[0].toLocaleUpperCase('es')+written.slice(1):written;
  if(replacement!==spoken)events.push({start,end:start+spoken.length,spoken,replacement});
  return replacement;
 });
 return {version:TERM_VERSION,text,events,warnings:[],elapsedMs:performance.now()-started};
}
