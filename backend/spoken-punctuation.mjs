// Opt-in candidate only. A glyph has no acoustic provenance: see warnings and protocol.
// This version targets the observed unwanted commas; never removes periods/colons
// or other symbols whose clinical/abbreviation roles have not been evaluated.
export function suppressUnattributedCommas(original){
 const started=performance.now(),events=[];
 const text=original.replace(/,/gu,(spoken,start)=>{
  if(/\d/u.test(original[start-1]??'')&&/\d/u.test(original[start+1]??''))return spoken;
  events.push({start,end:start+1,spoken,replacement:'',reason:'comma_without_spoken_provenance'});return '';
 });
 return {version:'explicit-commas-candidate-v1',text,events,warnings:events.length?[{reason:'asr_may_have_consumed_spoken_comma',message:'A removed comma might have been spoken but rendered as a symbol by ASR.'}]:[],elapsedMs:performance.now()-started};
}
