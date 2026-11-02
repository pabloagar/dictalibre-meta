// Display normalization, not ASR correction. Offsets refer to the original input.
import {isHeadingColon} from './spoken-colon.mjs';
export const NUMBER_VERSION='es-cardinals-v3-heading-colon';
// Sin una unidad o medida después, «ocho punto dos quistes» puede ser fin de frase y no un decimal.
const MEASURE=/^\s*(?:mm|mil[ií]metros?|cm|cent[ií]metros?|ml|mililitros?|cc|mg|miligramos?|g|gramos?|kg|l|litros?|m|metros?|%|por\s+ciento|por|x|×|uh|hu|unidades|s|seg|segundos?|min|minutos?|horas?|d[ií]as?|semanas?|mes(?:es)?|a[nñ]os?)(?![\p{L}\p{N}_])/iu;
const fold=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
const small=['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidos','veintitres','veinticuatro','veinticinco','veintiseis','veintisiete','veintiocho','veintinueve'];
const values=Object.fromEntries(small.map((s,i)=>[s,i]));Object.assign(values,{un:1,una:1,veintiun:21,veintiuna:21,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900});
const word='(?:cero|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|diecis[eé]is|diecisiete|dieciocho|diecinueve|veinte|veinti(?:uno|una|[uú]n|d[oó]s|tr[eé]s|cuatro|cinco|s[eé]is|siete|ocho|nueve)|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien(?:to)?|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|mill[oó]n|millones|\\d+)';
const sequence=`${word}(?:[ \\t]+(?:y[ \\t]+)?${word})*`;
const pattern=new RegExp(`(?<![\\p{L}\\p{N}_,.])${sequence}(?:[ \\t]+(?:coma|punto)[ \\t]+${sequence})?(?![\\p{L}\\p{N}_])`,'giu');
function integer(s){
 if(/^\d+$/.test(s))return s;
 const w=fold(s).split(/\s+/u);
 if(w.length===1&&w[0]!=='ciento'&&Object.hasOwn(values,w[0]))return String(values[w[0]]);
 if(w.length===3&&values[w[0]]>=30&&values[w[0]]<=90&&w[1]==='y'&&values[w[2]]>=1&&values[w[2]]<=9)return String(values[w[0]]+values[w[2]]);
 if(values[w[0]]>=100&&w[0]!=='cien'&&w.length>1){const rest=integer(w.slice(1).join(' '));if(rest!==null&&Number(rest)>0&&Number(rest)<100)return String(values[w[0]]+Number(rest));}
 return null;
}
export function formatNumbers(original){
 const startTime=performance.now(),events=[],warnings=[];
 const text=original.replace(pattern,(spoken,start)=>{
  const after=original.slice(start+spoken.length);
  // Articles and the spoken colon command are not number-formatting targets.
  if(/^(?:un|una)$/iu.test(spoken)||/^(?:dos|2)$/iu.test(spoken)&&/^\s+puntos\b/iu.test(after))return spoken;
  const singular=after.match(/^[ \t]+punto\b/iu);
  if(/^(?:dos|2)$/iu.test(spoken)&&singular&&isHeadingColon(original,start,start+spoken.length+singular[0].length))return spoken;
  const pieces=spoken.split(/\s+(?:coma|punto)\s+/iu);
  const whole=integer(pieces[0]);let replacement=whole;
  if(pieces.length===2){const words=fold(pieces[1]).split(/\s+/u);const fraction=words.length>1&&words[0]==='cero'&&words.every(w=>values[w]>=0&&values[w]<=9)?words.map(w=>values[w]).join(''):integer(pieces[1]);replacement=whole!==null&&fraction!==null?`${whole},${fraction}`:null;}
  if(replacement===null){warnings.push({start,end:start+spoken.length,spoken,reason:'unsupported_number_expression'});return spoken;}
  if(pieces.length===2&&!MEASURE.test(after))warnings.push({start,end:start+spoken.length,spoken,replacement,reason:'possible_sentence_boundary'});
  if(replacement!==spoken)events.push({start,end:start+spoken.length,spoken,replacement});
  return replacement;
 });
 return {version:NUMBER_VERSION,text,events,warnings,elapsedMs:performance.now()-startTime};
}
