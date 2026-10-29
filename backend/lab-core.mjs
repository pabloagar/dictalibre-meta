import { createHash } from 'node:crypto';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function wavInfo(b) {
  if (b.length < 44 || b.toString('ascii',0,4) !== 'RIFF' || b.toString('ascii',8,12) !== 'WAVE') throw new Error('Se requiere WAV RIFF PCM16.');
  if (b.readUInt32LE(4) + 8 !== b.length) throw new Error('WAV truncado o longitud inconsistente.');
  let fmt, data;
  for (let i=12; i+8<=b.length;) {
    const size=b.readUInt32LE(i+4), end=i+8+size;
    if (end>b.length) throw new Error('Bloque WAV truncado.');
    const type=b.toString('ascii',i,i+4);
    if (type==='fmt ') { if(size<16) throw new Error('Formato WAV incompleto.'); fmt={encoding:b.readUInt16LE(i+8),channels:b.readUInt16LE(i+10),sampleRate:b.readUInt32LE(i+12),align:b.readUInt16LE(i+20),bits:b.readUInt16LE(i+22)}; }
    if (type==='data') { if(data) throw new Error('Se admite un bloque data.'); data={offset:i+8,bytes:size}; }
    i=end+(size%2);
  }
  if(!fmt||!data||fmt.encoding!==1||fmt.bits!==16||![1,2].includes(fmt.channels)||fmt.sampleRate<8000||fmt.sampleRate>96000||fmt.align!==fmt.channels*2||data.bytes%fmt.align) throw new Error('WAV PCM16 mono/estéreo, 8–96 kHz requerido.');
  const durationMs=data.bytes/fmt.align/fmt.sampleRate*1000;
  if(durationMs<=0||durationMs>180000) throw new Error('Duración permitida: más de cero y hasta 180 segundos.');
  return {...fmt,...data,durationMs};
}
export function normalize(text) { return text.normalize('NFC').toLocaleLowerCase('es').replace(/[^\p{L}\p{N},.%]+/gu,' ').replace(/(?<!\d)[,.]|[,.](?!\d)/g,' ').replace(/%/g,' % ').trim().split(/\s+/).filter(Boolean); }
export function score(reference, hypothesis) {
  if(reference===null||reference===undefined) return null;
  const a=normalize(reference),b=normalize(hypothesis);
  if(a.length>1000||b.length>1000) return {unavailable:'Texto demasiado largo para evaluación interactiva.'};
  const d=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=0;i<=a.length;i++) d[i][0]=i;
  for(let j=0;j<=b.length;j++) d[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  const alignment=[]; let i=a.length,j=b.length,S=0,D=0,I=0;
  while(i||j) {
    if(i&&j&&d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)) { const kind=a[i-1]===b[j-1]?'equal':'substitution'; if(kind!=='equal')S++;alignment.push({kind,reference:a[--i],hypothesis:b[--j]}); }
    else if(i&&d[i][j]===d[i-1][j]+1) {D++;alignment.push({kind:'deletion',reference:a[--i],hypothesis:''});}
    else {I++;alignment.push({kind:'insertion',reference:'',hypothesis:b[--j]});}
  }
  return {normalizer:'es-literal-v1',referenceWords:a.length,substitutions:S,deletions:D,insertions:I,wer:a.length?(S+D+I)/a.length:null,silenceInsertions:a.length?null:I,alignment:alignment.reverse()};
}
export function configuration(input,previous) {
  if(!['muse','whisper'].includes(input.engine)) throw new Error('Motor desconocido.');
  const name=String(input.name||'').trim(); if(!name||name.length>80) throw new Error('Nombre de configuración requerido (máx. 80).');
  const keywords=Array.isArray(input.keywords)?input.keywords.map(x=>String(x).trim()).filter(Boolean):[];
  if(keywords.length>100||keywords.some(x=>x.length>100)) throw new Error('Máximo 100 términos de 100 caracteres.');
  if(input.engine==='whisper'&&keywords.length) throw new Error('Este adaptador Whisper base no admite glosario todavía.');
  const beams=Number(input.beams??1); if(![1,3,5].includes(beams)) throw new Error('Beams: 1, 3 o 5.');
  if(input.engine==='whisper'&&beams!==1) throw new Error('Esta GPU/runtime solo tiene validada búsqueda 1. Beams > 1 bloqueados tras fallo real de OpenVINO.');
  return {name,engine:input.engine,version:(previous?.version??0)+1,parentId:previous?.id??null,
    model:input.engine==='muse'?'muse-voice-transcribe-1.0':'whisper-large-v3',language:'es',device:input.engine==='whisper'?'GPU':null,
    precision:input.engine==='whisper'?'FP16 weights':null,beams:input.engine==='whisper'?beams:null,keywords,
    preparation:'scipy-resample-poly-mono-16k-v1',mode:'file',correction:false};
}
export function csv(rows) {
  const keys=['id','audioId','configId','status','text','queueMs','prepareMs','loadMs','requestMs','totalMs','commandMs','formattedText','commandVersion','commandCount','commandWarnings','cold','wer','error'];
  const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,'\t$&').replaceAll('"','""')+'"';
  return [keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k]??r.timings?.[k]??({formattedText:r.formatting?.text,commandVersion:r.formatting?.version,commandCount:r.formatting?.events.length,commandWarnings:r.formatting?.warnings.length,cold:r.result?.cold,wer:r.evaluation?.wer}[k]))).join(','))].join('\r\n');
}
