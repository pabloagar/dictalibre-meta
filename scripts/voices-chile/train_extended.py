"""Bounded private research continuation, with held-out validation and checkpoints."""
import argparse
import json
import math
import random
import subprocess
import sys
import time
from pathlib import Path
from importlib.metadata import distribution
import pilot
from train_chatterbox import preflight


def schedule(rows, steps, seed):
    """Cover every training utterance before repeating; interleave shuffled speakers."""
    rng = random.Random(seed)
    groups = {}
    for row in rows:
        if row['split'] == 'train':
            groups.setdefault(row['speaker'], []).append(row)
    result = []
    while len(result) < steps:
        queues = {s: rng.sample(v, len(v)) for s, v in groups.items()}
        while any(queues.values()) and len(result) < steps:
            speakers = rng.sample(sorted(queues), len(queues))
            for speaker in speakers:
                if queues[speaker] and len(result) < steps:
                    result.append(queues[speaker].pop())
    return result


def balanced_schedule(rows, steps, seed):
    """Equal updates per speaker, cycling each speaker's shuffled clips."""
    rng=random.Random(seed); groups={}
    for row in rows:
        if row['split']=='train': groups.setdefault(row['speaker'],[]).append(row)
    queues={s:[] for s in groups}; result=[]
    while len(result)<steps:
        for speaker in rng.sample(sorted(groups),len(groups)):
            if not queues[speaker]: queues[speaker]=rng.sample(groups[speaker],len(groups[speaker]))
            result.append(queues[speaker].pop())
            if len(result)==steps: break
    return result


def balanced_validation(rows, count, seed):
    candidates=[{**r,'split':'train'} for r in rows if r['split']=='validation']
    # Round robin without repetitions; no speaker can disappear through random sampling.
    return schedule(candidates,min(count,len(candidates)),seed)


def check_budget(budget):
    rate, price, seconds, remaining = (budget.get(k) for k in
        ('units_per_hour', 'usd_per_unit', 'max_runtime_s', 'remaining_cap_usd'))
    if not all(type(v) in (float, int) and math.isfinite(v) and v > 0
               for v in (rate, price, seconds, remaining)):
        raise ValueError('invalid_budget')
    if (remaining > 5 or seconds > 3600 or rate*price*seconds/3600 > remaining
            or budget.get('watchdog_armed') is not True
            or not budget.get('rate_source') or not budget.get('observed_utc')):
        raise ValueError('five_dollar_cap_or_watchdog_not_verified')


def run(args, out):
    import torch
    import librosa
    from torch.nn import functional as F
    from safetensors.torch import save_file, load_file
    from chatterbox.mtl_tts import punc_norm
    from chatterbox.models.t3.modules.cond_enc import T3Cond
    from lora_core import attach, adapter_state, load_adapter, speech_loss
    budget = pilot.leer(args.budget)
    check_budget(budget)
    config = pilot.leer(pilot.HERE/'config.json')
    spec = config['models']['chatterbox']
    installed = json.loads(distribution('chatterbox-tts').read_text('direct_url.json') or '{}')
    if installed.get('vcs_info', {}).get('commit_id') != spec['code_revision']:
        raise ValueError('code_revision_mismatch')
    parent = pilot.leer(Path(args.resume).with_name('adapter_config.json'))
    if (parent['base_model'] != spec or parent['rank'] != 8 or parent['alpha'] != 16
            or parent['adapter_sha256'] != pilot.sha(args.resume)):
        raise ValueError('resume_provenance_mismatch')
    if not torch.cuda.is_available():
        raise ValueError('cuda_required')
    torch.manual_seed(args.seed)
    engine = pilot.Chatterbox(config, 'chatterbox')
    model = engine.model
    model.ve.requires_grad_(False)
    model.s3gen.requires_grad_(False)
    targets = attach(model.t3)
    model.t3.tfmr.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
    env = {'gpu': torch.cuda.get_device_name(0), 'torch': torch.__version__, 'cuda': torch.version.cuda,
        'python': sys.version, 'model_download_seconds': engine.download_s, 'model_load_seconds': engine.load_s,
        'seed': args.seed, 'instrumentation_overhead_seconds': None, 'network': None}
    pilot.guardar(out/'environment.json', env)
    (out/'pip-freeze.txt').write_text(subprocess.check_output([sys.executable,'-m','pip','freeze'],text=True))
    rows = pilot.leer(args.manifest)['rows']
    groups = {}
    for row in rows:
        if row['split'] in ('train', 'validation'):
            groups.setdefault(row['speaker'], []).append(row)
    refs = {}
    for group in groups.values():
        group.sort(key=lambda x: x['id'])
        if len(group) < 2:
            raise ValueError('two_clips_per_speaker_required')
        for i, row in enumerate(group):
            refs[row['id']] = group[(i+1) % len(group)]
    validation = sorted((r for r in rows if r['split']=='validation'), key=lambda r:r['id'])
    rng = random.Random(args.seed)
    validation = balanced_validation(rows,args.validation_samples,args.seed) if args.balance_speakers else rng.sample(validation, min(args.validation_samples, len(validation)))
    plan = (balanced_schedule if args.balance_speakers else schedule)(rows, args.steps, args.seed)
    pilot.guardar(out/'protocol.json', {'trainer_sha256':pilot.sha(__file__), 'steps_requested':args.steps,
        'lr':args.lr, 'eval_every':args.eval_every, 'validation_ids':[r['id'] for r in validation],
        'manifest_sha256':pilot.sha(args.manifest), 'rights_sha256':pilot.sha(args.rights),
        'resume_sha256':pilot.sha(args.resume), 'resume_steps':parent['steps'], 'budget':budget,
        'scope':'private_research_adaptation', 'accent_validated':False, 'commercial_ready':False,
        'training_ids':[r['id'] for r in plan], 'optimizer_resumed':False, 'balance_speakers':args.balance_speakers})
    cache = {}
    prep_s = 0.0
    deadline = time.perf_counter()+args.max_seconds

    def prepare(row):
        nonlocal prep_s
        if time.perf_counter() > deadline:
            raise TimeoutError('training_deadline')
        if row['id'] not in cache:
            start = time.perf_counter()
            ref = refs[row['id']]
            with torch.no_grad():
                model.prepare_conditionals(str(pilot.dentro(args.audio_root, ref['audio'])))
                cond = {k:v.detach().cpu().clone() if torch.is_tensor(v) else v
                        for k,v in model.conds.t3.__dict__.items()}
                text = model.tokenizer.text_to_tokens(punc_norm(row['text']),language_id='es')
                text = F.pad(F.pad(text,(1,0),value=model.t3.hp.start_text_token),(0,1),value=model.t3.hp.stop_text_token)
                wav,_ = librosa.load(pilot.dentro(args.audio_root,row['audio']),sr=16000)
                speech,lengths = model.s3gen.tokenizer([wav])
                speech = speech[:,:int(lengths[0])]
                speech = F.pad(F.pad(speech,(1,0),value=model.t3.hp.start_speech_token),(0,1),value=model.t3.hp.stop_speech_token)
                if text.shape[1]>model.t3.hp.max_text_tokens or speech.shape[1]>model.t3.hp.max_speech_tokens:
                    raise ValueError('tokens_exceed_limit:'+row['id'])
                cache[row['id']] = (cond,text.cpu(),speech.cpu())
            torch.cuda.synchronize()
            prep_s += time.perf_counter()-start
        cond,text,speech = cache[row['id']]
        return ({k:v.to('cuda') if torch.is_tensor(v) else v for k,v in cond.items()},text.to('cuda'),speech.to('cuda'))

    def loss_for(item):
        cond,text,speech = item
        result = model.t3(t3_cond=T3Cond(**cond),text_tokens=text,
            text_token_lens=torch.tensor([text.shape[1]],device='cuda'),speech_tokens=speech[:,:-1],
            speech_token_lens=torch.tensor([speech.shape[1]-1],device='cuda'),training=True)
        return speech_loss(result.speech_logits,speech)

    evaluations = []
    def evaluate(step, label):
        model.t3.eval()
        start = time.perf_counter()
        total, tokens = 0.0, 0
        with torch.no_grad():
            for row in validation:
                item = prepare(row)
                with torch.autocast('cuda',dtype=torch.float16):
                    loss = loss_for(item)
                if not torch.isfinite(loss):
                    raise ValueError('nonfinite_validation')
                n = item[-1].shape[1]-1
                total += loss.item()*n
                tokens += n
        torch.cuda.synchronize()
        value = total/tokens
        evaluations.append({'step':step,'label':label,'token_weighted_loss':value,'tokens':tokens,
                            'samples':len(validation),'seconds':time.perf_counter()-start})
        pilot.guardar(out/'validation.json',evaluations)
        print('VALIDATION',step,label,value,flush=True)
        model.t3.train()
        return value

    base_loss = evaluate(0,'base')
    load_adapter(model.t3,load_file(args.resume))
    initial = adapter_state(model.t3)
    best = evaluate(0,'resume_'+str(parent['steps']))
    save_file(initial,str(out/'best.safetensors'))
    best_step, stale = 0, 0
    params = [p for p in model.t3.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params,lr=args.lr)
    scaler = torch.amp.GradScaler('cuda')
    metrics=[]
    torch.cuda.reset_peak_memory_stats()
    stop_reason='requested_steps'
    for step,row in enumerate(plan,1):
        if time.perf_counter()>deadline:
            stop_reason='deadline';break
        item=prepare(row)
        optimizer.zero_grad(set_to_none=True)
        torch.cuda.synchronize(); start=time.perf_counter()
        with torch.autocast('cuda',dtype=torch.float16):
            loss=loss_for(item)
        if not torch.isfinite(loss):
            raise ValueError('nonfinite_train')
        scaler.scale(loss).backward(); scaler.unscale_(optimizer)
        norm=torch.nn.utils.clip_grad_norm_(params,1.0,error_if_nonfinite=True)
        if norm.item()==0 or any(p.grad is not None for p in model.t3.parameters() if not p.requires_grad):
            raise ValueError('gradient_contract_failed')
        scaler.step(optimizer);scaler.update();torch.cuda.synchronize()
        metrics.append({'step':step,'id':row['id'],'loss':loss.item(),'gradient_norm':norm.item(),
            'seconds':time.perf_counter()-start,'peak_allocated_bytes':torch.cuda.max_memory_allocated()})
        if step%25==0:
            pilot.guardar(out/'steps.json',metrics);print('STEP',step,'LOSS',loss.item(),flush=True)
        if step%args.eval_every==0 or step==args.steps:
            save_file(adapter_state(model.t3),str(out/f'adapter_{step:05}.safetensors'))
            current=evaluate(step,'extended')
            if current<best:
                best,best_step,stale=current,step,0
                save_file(adapter_state(model.t3),str(out/'best.safetensors'))
            else:
                stale+=1
            torch.save({'optimizer':optimizer.state_dict(),'scaler':scaler.state_dict(),
                'step':step,'torch_rng':torch.get_rng_state(),'cuda_rng':torch.cuda.get_rng_state()},out/'optimizer_last.pt')
            if stale>=3:
                stop_reason='three_validations_without_improvement';break
    pilot.guardar(out/'steps.json',metrics)
    save_file(adapter_state(model.t3),str(out/'last.safetensors'))
    pilot.guardar(out/'summary.json',{'status':'completed','steps_completed':len(metrics),
        'stop_reason':stop_reason,'best_step':best_step,'best_validation_loss':best,'base_validation_loss':base_loss,
        'resume_validation_loss':evaluations[1]['token_weighted_loss'],
        'unique_train_clips':len({x['id'] for x in metrics}),'preparation_seconds':prep_s,
        'train_seconds':sum(x['seconds'] for x in metrics),'best_sha256':pilot.sha(out/'best.safetensors'),
        'accent_validated':False,'commercial_ready':False,'whisper_trained':False})
    pilot.guardar(out/'adapter_config.json',{'rank':8,'alpha':16,'targets':targets,'base_model':spec,
        'steps':parent['steps']+best_step,'adapter_sha256':pilot.sha(out/'best.safetensors'),
        'manifest_sha256':pilot.sha(args.manifest),'accent_validated':False,'commercial_ready':False})


def main():
    p=argparse.ArgumentParser()
    for name in ('manifest','audio-root','rights','output','budget','resume'):
        p.add_argument('--'+name,required=True)
    p.add_argument('--research-source-qc',action='store_true')
    p.add_argument('--balance-speakers',action='store_true')
    p.add_argument('--steps',type=int,default=2000)
    p.add_argument('--max-seconds',type=int,default=2400)
    p.add_argument('--seed',type=int,default=20261103)
    p.add_argument('--lr',type=float,default=3e-5)
    p.add_argument('--eval-every',type=int,default=250)
    p.add_argument('--validation-samples',type=int,default=32)
    args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=False)
    try:
        if not (1<=args.steps<=5000 and 1<=args.max_seconds<=3000 and
                1<=args.eval_every<=args.steps and 1<=args.validation_samples<=200 and 0<args.lr<=1e-4):
            raise ValueError('invalid_configuration')
        check_budget(pilot.leer(args.budget))
        pilot.guardar(out/'preflight.json',preflight(args))
        run(args,out)
    except Exception as e:
        pilot.guardar(out/'failure.json',{'error':str(e),'trainer_sha256':pilot.sha(__file__)})
        raise


if __name__=='__main__':
    main()
