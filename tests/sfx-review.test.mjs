import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
import { mountAiReview } from '../apps/bilateral/ai-compare.js';

function setup(saved) {
  const w = new Window({url:'http://localhost',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  w.document.write(fs.readFileSync('apps/bilateral/ai-compare.html','utf8'));
  if (saved) w.localStorage.setItem('bilateral-ai-review-v1', saved);
  const cases = ['wood','bell','rain','water','wind'].map(id=>({id,name:id,prompt:'Original description <not markup>'}));
  const rows = ['moss','stable'].map(engine=>({engine,case:'wood',sha256:engine+'-hash',original:`ai-audio/${engine}-wood-original.wav`,playback:`ai-audio/${engine}-wood-listen.wav`,audio:{duration_seconds:5,channels:1,sample_rate:48000}}));
  const data = {cases,rows,engines:{moss:'MOSS SoundEffect v2',stable:'Stable Audio 3 Small-SFX'},manifest_id:'synthetic-fixture'};
  const controller = mountAiReview(data, w.document, w);
  return {w,d:w.document,data,controller};
}
test('SFX review: matched five cases, only real files play, pending slots and unscored zero remain distinct',()=>{
  const {w,d}=setup();
  try {
    assert.equal(d.querySelectorAll('.ai-case').length,5); assert.equal(d.querySelectorAll('audio').length,2);
    assert.equal(d.querySelectorAll('.pending').length,8); assert.match(d.getElementById('count').textContent,/2\/10/);
    assert.equal(d.querySelectorAll('[aria-pressed=true]').length,0);
    d.querySelector('.rating button').click(); const stored=JSON.parse(w.localStorage.getItem('bilateral-ai-review-v1'));
    assert.equal(stored['moss_wood_moss-hash'].sound_match,0); assert.equal(stored['moss_wood_moss-hash'].cleanliness,undefined);
    const note=d.querySelector('textarea'); note.value='<img src=x onerror=bad> sonido extraño'; note.dispatchEvent(new w.Event('input'));
    const restored=setup(w.localStorage.getItem('bilateral-ai-review-v1'));
    assert.equal(restored.d.querySelector('textarea').value,note.value); assert.equal(restored.d.querySelectorAll('img').length,0);
    restored.w.happyDOM.abort();
  } finally {w.happyDOM.abort();}
});
test('SFX review: external media paths rejected, storage failure explicit, playback pauses other samples',()=>{
  const {w,d,data}=setup(); let pauses=0;
  try {
    for(const audio of d.querySelectorAll('audio'))audio.pause=()=>pauses++;
    d.querySelector('audio').dispatchEvent(new w.Event('play')); assert.equal(pauses,1);
    Object.defineProperty(w,'localStorage',{value:{setItem(){throw Error('full')}}});
    d.querySelector('.rating button').click(); assert.match(d.getElementById('review-status').textContent,/Sin guardar/);
    data.rows[0].playback='https://untrusted.example/audio.wav'; mountAiReview(data,d,w);
    assert.equal(d.querySelectorAll('audio').length,1);
  } finally {w.happyDOM.abort();}
});
