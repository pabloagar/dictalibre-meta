// Etapas deterministas sobre el texto del motor: números, términos y comandos. El original no se modifica.
import {formatDictation} from './dictation-commands.mjs';
import {formatNumbers} from './number-format.mjs';
import {formatTerms} from './term-format.mjs';

export function applyFormatting(r){
  r.numberFormatting=r.numbersEnabled?formatNumbers(r.text):null;
  r.termFormatting=r.termsEnabled?formatTerms(r.numberFormatting?.text??r.text):null;
  if(r.termFormatting)r.termFormatting.input=r.numberFormatting?'numberFormatting.text':'text';
  r.formatting=r.commandsEnabled?formatDictation(r.termFormatting?.text??r.numberFormatting?.text??r.text):null;
  if(r.formatting)r.formatting.input=r.termFormatting?'termFormatting.text':r.numberFormatting?'numberFormatting.text':'text';
  r.timings.numberFormatMs=r.numberFormatting?.elapsedMs??0;r.timings.termFormatMs=r.termFormatting?.elapsedMs??0;
}
