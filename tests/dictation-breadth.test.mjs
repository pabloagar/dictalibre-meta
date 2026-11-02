import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyFormatting} from '../backend/format-pipeline.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/dictation-breadth.json',import.meta.url),'utf8'));
for(const c of cases)test(`breadth formatting preserves dictated content: ${c.id}`,()=>{
  const run={text:c.script,numbersEnabled:true,termsEnabled:true,commandsEnabled:true,timings:{}};
  applyFormatting(run);
  assert.equal(run.text,c.script,'retain raw recognition');
  // Protocol ignores capitalization; punctuation and paragraph boundaries remain exact.
  assert.equal(run.formatting.text.toLowerCase(),c.expected.toLowerCase(),'format only numbers and commands, not clinical meaning');
});
