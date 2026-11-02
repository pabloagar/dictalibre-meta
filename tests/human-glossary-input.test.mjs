import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {plan,validateHumanManifest} from '../scripts/human-glossary-input.mjs';
import {hash} from '../backend/lab-core.mjs';
const planHash=hash(fs.readFileSync(new URL('./fixtures/human-glossary-plan.json',import.meta.url)));
test('human protocol freezes 12 distinct scripts and balanced hints',()=>{
 assert.equal(plan.cases.length,12);assert.equal(new Set(plan.cases.map(c=>c.id)).size,12);
 assert.deepEqual(plan.keywords,['neumotórax','hemotórax','hemitórax','esteatosis','aorta','litiasis','hipodensa','hiperdensa','hemorragia','hidrocefalia']);
});
test('human evaluation refuses pending references before any inference',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-reference-gate-'));
 try{
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schema:'human-glossary-corpus-v1',source:'human voice, fictional scripts',planHash,referenceValidated:false,cases:plan.cases}));
  assert.throws(()=>execFileSync(process.execPath,['scripts/evaluate-human-glossary.mjs',dir],{stdio:'pipe'}),e=>String(e.stderr).includes('Human confirmation required'));
  assert.deepEqual(fs.readdirSync(dir),['manifest.json']);
 }finally{assert.equal(path.dirname(dir),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(dir).startsWith('dicta-reference-gate-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('human validator checks actual audio hashes and refuses escaped paths',()=>{
 const dir=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'dicta-corpus-gate-'));
 try{
  const wav=Buffer.alloc(76);wav.write('RIFF');wav.writeUInt32LE(68,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32,40);
  fs.writeFileSync(path.join(dir,'test.wav'),wav);
  const m={schema:'human-glossary-corpus-v1',source:'human voice, fictional scripts',planHash,referenceValidated:true,cases:plan.cases.map(c=>({...c,expectedFormatted:c.script,referenceValidated:true,referenceConfirmation:'unit test only, no human recording',file:'test.wav',sha256:hash(wav),originalFile:'test.wav',originalSha256:hash(wav)}))};
  assert.equal(validateHumanManifest(m,dir),m);
  m.cases[0].file='../outside.wav';assert.throws(()=>validateHumanManifest(m,dir),/Invalid path/);
  m.cases[0].file='test.wav';m.cases[0].sha256='bad';assert.throws(()=>validateHumanManifest(m,dir),/Audio mismatch/);
 }finally{assert.equal(path.dirname(dir),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(dir).startsWith('dicta-corpus-gate-'));fs.rmSync(dir,{recursive:true,force:true});}
});
test('human validator rejects incomplete, modified and unconfirmed manifests',()=>{
 const m={schema:'human-glossary-corpus-v1',planHash,source:'human voice, fictional scripts',referenceValidated:true,cases:plan.cases};
 assert.throws(()=>validateHumanManifest({...m,planHash:'wrong'},'.'),/Plan mismatch/);
 assert.throws(()=>validateHumanManifest({...m,cases:[]},'.'),/12 distinct/);
 assert.throws(()=>validateHumanManifest(m,'.'),/Unconfirmed reference/);
});
