"""Private four-speaker LoRA pilot. Experimental primary-codec objective, not upstream SFT."""
import argparse
import gc
import json
import random
import time
from pathlib import Path
import pilot


def run(root):
    import numpy as np
    import soundfile as sf
    import torch
    from safetensors.torch import load_file, save_file
    from qwen_tts import Qwen3TTSTokenizer
    from dataset import TTSDataset
    from qwen_shared_core import attach, embeddings, next_codec_loss
    root = Path(root)
    p = pilot.leer(root / 'protocol.json')
    seed = p['seed']; random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    assert torch.cuda.is_available()
    start = time.perf_counter()
    out = root / 'result';out.mkdir(exist_ok=False)
    # The external Colab watchdog bounds installation, preparation, training and inference.
    deadline = start + 6300
    config = pilot.leer(pilot.HERE / 'config.json')
    from huggingface_hub import snapshot_download
    token_start = time.perf_counter()
    tokenizer_path = snapshot_download('Qwen/Qwen3-TTS-Tokenizer-12Hz',
        revision='7dd38ad4e9bad454aae9cd937d0cd577604fe229')
    tokenizer = Qwen3TTSTokenizer.from_pretrained(tokenizer_path, device_map='cuda:0')
    rows = p['rows']
    for row in rows:
        path = root / 'audio' / row['audio']
        assert pilot.sha(path) == row['audio_sha256']
        x, sr = sf.read(path)
        assert sr>0 and pilot.inspeccionar(x, sr)['estado'] == 'ok'
    converted=root/'audio24';converted.mkdir(exist_ok=True)
    conversions=[]
    from scipy.signal import resample_poly
    import math
    for row in rows:
        source=root/'audio'/row['audio'];x,sr=sf.read(source,dtype='float32')
        divisor=math.gcd(sr,24000);y=resample_poly(x,24000//divisor,sr//divisor).astype('float32')
        assert np.isfinite(y).all() and np.any(y)
        target=converted/row['audio'];sf.write(target,y,24000,subtype='FLOAT')
        conversions.append({'id':row['id'],'source_sha256':row['audio_sha256'],'source_sample_rate':sr,
            'processed_sha256':pilot.sha(target),'processed_sample_rate':24000,'method':'scipy_resample_poly'})
    pilot.guardar(out/'resampling.json',conversions)
    codes = {}
    for i in range(0, len(rows), 8):
        assert time.perf_counter() < deadline
        batch = rows[i:i+8]
        result = tokenizer.encode([str(converted / r['audio']) for r in batch])
        codes.update({r['id']: c.cpu().tolist() for r,c in zip(batch, result.audio_codes)})
        print('ENCODED',min(i+8,len(rows)),flush=True)
    pilot.guardar(out / 'audio_codes.json', codes)
    tokenizer_seconds = time.perf_counter()-token_start
    del tokenizer;gc.collect();torch.cuda.empty_cache()
    engine = pilot.Qwen(config, 'stability');model=engine.model.model
    model.requires_grad_(False)
    refs = {r['label']:r for r in p['references']}
    prompts = engine.model.create_voice_clone_prompt(
        ref_audio=[str(converted/r['reference_audio']) for r in p['references']],
        ref_text=[r['reference_text'] for r in p['references']], x_vector_only_mode=False)
    generated=[];batch_metrics=[]
    def compare(condition, steps):
        model.eval()
        for phrase in p['phrases']:
            assert time.perf_counter() < deadline
            torch.manual_seed(seed);torch.cuda.manual_seed_all(seed);np.random.seed(seed);random.seed(seed)
            torch.cuda.synchronize();begin=time.perf_counter()
            wavs,sr=engine.model.generate_voice_clone(text=[phrase['text']]*4,language=['Spanish']*4,
                voice_clone_prompt=prompts, **{**config['generation'], 'max_new_tokens':1400})
            torch.cuda.synchronize();elapsed=time.perf_counter()-begin
            batch_id=f'{condition}_{phrase["id"]}'
            duration=0
            for ref,x in zip(p['references'],wavs):
                ident=f'{condition}_{ref["label"]}_{phrase["id"]}'
                path=out/(ident+'.wav');x=np.asarray(x,dtype=np.float32)
                np.save(path.with_suffix('.npy'),x);sf.write(path,x,sr,subtype='FLOAT')
                stats=pilot.inspeccionar(x,sr);duration+=stats['duracion_audio'] or 0
                generated.append({'id':ident,'condition':condition,'voice':ref['label'],'speaker':ref['speaker'],
                    'phrase':phrase['id'],'text':phrase['text'],'steps':steps,'archivo':path.name,
                    'sha256':pilot.sha(path),'raw_sha256':pilot.sha(path.with_suffix('.npy')),
                    'status':stats['estado'],**stats,'batch_id':batch_id,'segundos_generacion':None,
                    'factor_tiempo_real':None,'sample_rate':sr,'reference_sha256':ref['reference_sha256']})
            batch_metrics.append({'id':batch_id,'seconds':elapsed,'audio_seconds':duration,
                'aggregate_rtf':elapsed/duration if duration else None,'samples':len(wavs)})
            pilot.guardar(out/'manifest.json',generated);pilot.guardar(out/'generation_batches.json',batch_metrics)
            print('GENERATED_BATCH',batch_id,elapsed,flush=True)
    # Cache official dataset tensors and frozen speaker embeddings; no speaker averages.
    data=[]
    for row in rows:
        if row['qwen_split']=='reference':continue
        ref=refs[row['label']]
        data.append({**row,'audio':str(converted/row['audio']),'audio_codes':codes[row['id']],
            'ref_audio':str(converted/ref['reference_audio'])})
    ds=TTSDataset(data,engine.model.processor,model.config)
    cache=[ds[i] for i in range(len(data))]
    speaker_embeddings={}
    with torch.no_grad():
        for label in refs:
            index=next(i for i,r in enumerate(data) if r['label']==label)
            speaker_embeddings[label]=model.speaker_encoder(cache[index]['ref_mel'].to('cuda',dtype=engine.dtype)).detach()
    targets=attach(model.talker)
    model.talker.model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant':False})
    params={n:v for n,v in model.talker.named_parameters() if v.requires_grad}
    def save(name):save_file({n:v.detach().cpu().contiguous() for n,v in params.items()},str(out/name))
    optimizer=torch.optim.AdamW(params.values(),lr=p['lr'])
    groups={label:[i for i,r in enumerate(data) if r['label']==label and r['qwen_split']=='train'] for label in refs}
    valid=[i for label in refs for i in [j for j,r in enumerate(data)
        if r['label']==label and r['qwen_split']=='validation'][:4]]
    pilot.guardar(out/'validation_ids.json',[data[i]['id'] for i in valid])
    def loss_at(i):
        batch={k:v.to('cuda') for k,v in ds.collate_fn([cache[i]]).items()}
        emb=embeddings(model.talker,batch,speaker_embeddings[data[i]['label']])
        result=model.talker(inputs_embeds=emb,attention_mask=batch['attention_mask'][:,:-1],use_cache=False)
        return next_codec_loss(result.logits,batch['codec_0_labels']),int((batch['codec_0_labels'][:,1:]!=-100).sum())
    validations=[]
    def validate(step):
        model.eval();total=0;tokens=0;begin=time.perf_counter()
        with torch.no_grad():
            for i in valid:
                loss,n=loss_at(i);total+=float(loss)*n;tokens+=n
        value=total/tokens
        validations.append({'step':step,'token_weighted_primary_codec_loss':value,'tokens':tokens,
            'samples':len(valid),'seconds':time.perf_counter()-begin})
        pilot.guardar(out/'validation.json',validations)
        print('VALIDATION',step,value,flush=True)
        return value
    best=validate(0);best_step=0;save('best.safetensors');save('initial.safetensors')
    smoke_start=time.perf_counter();model.talker.train();torch.cuda.reset_peak_memory_stats()
    smoke_loss,_=loss_at(groups[next(iter(refs))][0]);smoke_loss.backward()
    assert any(v.grad is not None and torch.any(v.grad!=0) for v in params.values())
    smoke_peak=torch.cuda.max_memory_allocated();optimizer.zero_grad(set_to_none=True)
    del smoke_loss;torch.cuda.empty_cache()
    pilot.guardar(out/'smoke.json',{'backward_ok':True,'seconds':time.perf_counter()-smoke_start,
        'peak_allocated_bytes':smoke_peak,'base_weights_frozen':True})
    print('SMOKE_BACKWARD_OK',smoke_peak,flush=True)
    compare('base',0)
    best_initial=best;bad=0;steps=[];stop='max_steps';begin=time.perf_counter()
    for step in range(1,p['max_steps']+1):
        if time.perf_counter()>deadline-1200:stop='reserve_generation_and_backup';break
        label=list(refs)[(step-1)%4];i=random.choice(groups[label]);model.talker.train()
        optimizer.zero_grad(set_to_none=True)
        tick=time.perf_counter();loss,n=loss_at(i)
        if not torch.isfinite(loss):raise ValueError('nonfinite_loss')
        loss.backward();norm=torch.nn.utils.clip_grad_norm_(params.values(),1.0);optimizer.step()
        if step==1 and not any(torch.any(v.detach()!=0) for n,v in params.items() if 'lora_b' in n):
            raise ValueError('adapter_did_not_update')
        steps.append({'step':step,'speaker':data[i]['speaker'],'id':data[i]['id'],'loss':float(loss),
            'gradient_norm':float(norm),'seconds':time.perf_counter()-tick,'tokens':n})
        if step%25==0:print('STEP',step,float(loss),flush=True);pilot.guardar(out/'steps.json',steps)
        if step%p['eval_every']==0:
            value=validate(step)
            if value<best-0.001:best=value;best_step=step;bad=0;save('best.safetensors')
            else:bad+=1
            if bad>=p['patience']:stop='three_validations_without_improvement';break
    save('last.safetensors');pilot.guardar(out/'steps.json',steps)
    train_seconds=time.perf_counter()-begin
    state=load_file(str(out/'best.safetensors'),device='cuda')
    with torch.no_grad():
        for n,v in params.items():v.copy_(state[n])
    compare('adjusted',best_step)
    summary={'status':'complete','steps_completed':len(steps),'best_step':best_step,'stop_reason':stop,
        'base_validation_loss':best_initial,'best_validation_loss':best,'validation_speakers_unseen':False,
        'generation':{**config['generation'],'max_new_tokens':1400},'model':config['models']['base'],'code_revision':config['source_code_revision'],
        'model_download_seconds':engine.download_s,'model_load_seconds':engine.load_s,
        'tokenization_seconds':tokenizer_seconds,'train_interval_seconds':train_seconds,
        'worker_seconds':time.perf_counter()-start,'targets':targets,'trainable_parameters':sum(v.numel() for v in params.values()),
        'adapter_sha256':pilot.sha(out/'best.safetensors'),'protocol_sha256':pilot.sha(root/'protocol.json'),
        'accent_validated':False,'commercial_ready':False,'whisper_trained':False,
        'instrumentation_overhead_seconds':None,'method':p['method']}
    pilot.guardar(out/'summary.json',summary);print('QWEN_SHARED_COMPLETE',summary,flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--root',required=True)
    run(parser.parse_args().root)
