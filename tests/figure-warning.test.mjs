import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formatNumbers} from '../backend/number-format.mjs';

const doubts=t=>formatNumbers(t).warnings.filter(w=>w.reason==='possible_sentence_boundary');

test('decimal sin unidad: conserva la conversión y agrega aviso',()=>{
  for(const [text,converted,spoken] of [['segmento ocho punto dos quistes simples','segmento 8,2 quistes simples','ocho punto dos'],['T dos punto dos lesiones','T 2,2 lesiones','dos punto dos'],['tres punto cinco nódulos','3,5 nódulos','tres punto cinco'],['mide cinco coma seis.','mide 5,6.','cinco coma seis']]){
    const r=formatNumbers(text);assert.equal(r.text,converted,text);
    const w=doubts(text);assert.equal(w.length,1,text);assert.equal(w[0].spoken,spoken);assert.equal(w[0].replacement,converted.match(/\d+,\d+/)[0]);
    assert.equal(text.slice(w[0].start,w[0].end),spoken);
  }
});
test('decimal con unidad o medida: sin aviso',()=>{
  for(const text of ['uno punto cinco centímetros','dos coma cinco cm','tres coma cinco mm','1,5 cm','cero coma cinco mililitros','tres punto cinco por dos centímetros','cinco coma dos %','dos coma cinco unidades Hounsfield','4 punto 5 milímetros'])assert.equal(doubts(text).length,0,text);
});
test('sin decimal: sin aviso',()=>{
  for(const text of ['nódulo de tres milímetros','tres punto','lesión uno punto lesión dos'])assert.equal(doubts(text).length,0,text);
});
test('conectar no borra el informe',()=>{
  const live=fs.readFileSync(new URL('../apps/desktop/live.js',import.meta.url),'utf8');
  const handler=live.slice(live.indexOf("addEventListener('dicta-new-session'"),live.indexOf("addEventListener('pagehide'"));
  assert.ok(handler.length>50);assert.doesNotMatch(handler,/reportEditor\.reset\(/);assert.match(handler,/reportEditor\.cancel\(/);
});
