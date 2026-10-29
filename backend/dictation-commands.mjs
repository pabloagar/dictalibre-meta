// Independent, deterministic formatting of ASR text; never a clinical corrector.
export const COMMAND_VERSION='es-basic-v1';
const replacements={'nueva línea':'\n','nuevo párrafo':'\n\n','punto y coma':';','dos puntos':':','punto':'.','coma':','};
const numbers=/^(?:\d+(?:[.,]\d+)?|cero|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cien)$/iu;
export function formatDictation(original){
 const started=performance.now(),events=[],warnings=[];
 const pattern=/(?<![\p{L}\p{N}_])(?:nueva l[ií]nea|nuevo p[aá]rrafo|punto y coma|(?:dos|2) puntos|punto|coma)(?![\p{L}\p{N}_])/giu;
 let output='',cursor=0;
 for(const match of original.matchAll(pattern)){
  if(match.index<cursor)continue;
  const start=match.index,end=start+match[0].length;
  const command=match[0].toLowerCase().replace('linea','línea').replace('parrafo','párrafo').replace(/^2 puntos$/u,'dos puntos');
  const before=original.slice(0,start),after=original.slice(end);
  const previous=before.match(/([\p{L}\d.,]+)\s*$/u)?.[1]??'';
  const next=after.match(/^\s*([\p{L}\d.,]+)/u)?.[1]??'';
  const decimal=['punto','coma'].includes(command)&&numbers.test(previous.replace(/[.,]$/u,''))&&numbers.test(next.replace(/[.,]$/u,''));
  const literal=command==='punto'&&(/\b(?:el|un|del|al|este|ese)\s*$/iu.test(before)||/^\s+(?:de|focal|doloroso|hiperecogénico|ecogénico)\b/iu.test(after))||command==='coma'&&(/\b(?:en|del|el|un)\s*$/iu.test(before)||/^\s+(?:hepático|inducido|profundo|diabético)\b/iu.test(after))||command==='nueva línea'&&/^\s+de\b/iu.test(after)||command==='dos puntos'&&/^\s+(?:de|hiperecogénicos|ecogénicos|dolorosos)\b/iu.test(after);
  output+=original.slice(cursor,start);
  if(decimal||literal){output+=match[0];warnings.push({start,end,command,reason:decimal?'possible_decimal':'possible_literal'});cursor=end;continue;}
  const replacement=replacements[command];
  output=output.replace(/[ \t]+$/u,'');
  // Remove only adjacent ASR punctuation around a recognized command.
  if(!replacement.includes('\n'))output=output.replace(/[.,;:]$/u,'');
  output+=replacement;
  const suffix=after.match(/^[ \t]*[.,;:]?[ \t]*/u)?.[0]??'';
  cursor=end+suffix.length;
  if(!replacement.includes('\n')&&cursor<original.length)output+=' ';
  events.push({start,end,spoken:match[0],command,replacement});
 }
 output+=original.slice(cursor);
 // Only start of text, a sentence boundary followed by whitespace, or paragraph.
 output=output.replace(/(^[ \t]*|[.!?][ \t\r\n]+|\n\n[ \t]*)(\p{Ll})/gu,(_,prefix,letter)=>prefix+letter.toLocaleUpperCase('es'));
 return {version:COMMAND_VERSION,text:output,events,warnings,elapsedMs:performance.now()-started};
}
