// Etapas deterministas sobre el texto del motor: números, términos y comandos. El original no se modifica.
import {formatDictation} from './dictation-commands.mjs';
import {formatNumbers} from './number-format.mjs';
import {formatTerms} from './term-format.mjs';
import {suppressUnattributedCommas} from './spoken-punctuation.mjs';

export function applyFormatting(r){
  // Not enabled by demo/mobile. Candidate must be evaluated before UI/default adoption.
  r.punctuationFormatting=r.punctuationMode==='explicit-commas-candidate'?suppressUnattributedCommas(r.text):null;
  const input=r.punctuationFormatting?.text??r.text;
  r.numberFormatting=r.numbersEnabled?formatNumbers(input):null;
  r.termFormatting=r.termsEnabled?formatTerms(r.numberFormatting?.text??input):null;
  if(r.termFormatting)r.termFormatting.input=r.numberFormatting?'numberFormatting.text':'text';
  r.formatting=r.commandsEnabled?formatDictation(r.termFormatting?.text??r.numberFormatting?.text??input):null;
  if(r.formatting)r.formatting.input=r.termFormatting?'termFormatting.text':r.numberFormatting?'numberFormatting.text':'text';
  r.timings.numberFormatMs=r.numberFormatting?.elapsedMs??0;r.timings.termFormatMs=r.termFormatting?.elapsedMs??0;
  if(r.punctuationFormatting)r.timings.punctuationFormatMs=r.punctuationFormatting.elapsedMs;
}
