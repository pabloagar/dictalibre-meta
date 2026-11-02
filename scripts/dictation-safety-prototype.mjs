// Experimental only: not imported by the application. Never modifies its input.
import {applyFormatting} from '../backend/format-pipeline.mjs';
export function assessFormatting(original, proposed){
  const run={text:original,numbersEnabled:true,termsEnabled:true,commandsEnabled:true,timings:{}};
  applyFormatting(run);
  const warnings=[...(run.numberFormatting?.warnings??[]),...(run.termFormatting?.warnings??[]),...(run.formatting?.warnings??[])];
  const formatted=run.formatting.text;
  if(warnings.length)return {original,text:original,candidate:formatted,automatic:false,reason:'ambiguous_format',warnings};
  if(proposed!==undefined&&proposed!==formatted)return {original,text:original,candidate:proposed,automatic:false,reason:'requires_explicit_acceptance',warnings};
  return {original,text:formatted,candidate:formatted,automatic:true,reason:'existing_deterministic_format',warnings};
}
