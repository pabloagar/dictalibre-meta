"""Experimental V3 LoRA smoke test, 1–20 steps. Not an accent-trained product."""
import argparse
import json
import math
import random
import time
import subprocess
import sys
from importlib.metadata import distribution
from pathlib import Path
import pilot
import training_data


def preflight(args):
    manifest = pilot.leer(args.manifest)
    training_data.validate(manifest)
    training_data.check_training_rights(args.manifest, pilot.leer(args.rights), args.research_source_qc)
    return training_data.validate(manifest, args.audio_root, args.research_source_qc)


def run(args, out):
    import torch
    import librosa
    from torch.nn import functional as F
    from safetensors.torch import save_file, load_file
    from chatterbox.mtl_tts import punc_norm
    from chatterbox.models.t3.modules.cond_enc import T3Cond
    from lora_core import attach, adapter_state, load_adapter, speech_loss
    config = pilot.leer(pilot.HERE / 'config.json')
    code_commit = config['models']['chatterbox']['code_revision']
    installed = json.loads(distribution('chatterbox-tts').read_text('direct_url.json') or '{}')
    if installed.get('vcs_info', {}).get('commit_id') != code_commit:
        raise ValueError('chatterbox_code_revision_mismatch')
    if not torch.cuda.is_available():
        raise ValueError('cuda_required_no_cpu_fallback')
    budget = pilot.leer(args.budget)
    estimate = budget['usd_per_unit'] * budget['units_per_hour'] * budget['max_runtime_s'] / 3600
    remaining = budget.get('remaining_cap_usd')
    if (not math.isfinite(estimate) or not isinstance(remaining, (int, float)) or
            not 0 < estimate <= remaining <= 10 or budget.get('watchdog_armed') is not True or
            not budget.get('rate_source') or not budget.get('observed_utc')):
        raise ValueError('verified_remaining_budget_and_external_watchdog_required')
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    engine = pilot.Chatterbox(config, 'chatterbox')
    model = engine.model
    model.ve.requires_grad_(False)
    model.s3gen.requires_grad_(False)
    targets = attach(model.t3)
    model.t3.train()
    model.t3.tfmr.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant': False})
    rows = pilot.leer(args.manifest)['rows']
    groups = {}
    for r in rows:
        if r['split'] == 'train':
            groups.setdefault(r['speaker'], []).append(r)
    if any(len(v) < 2 for v in groups.values()):
        raise ValueError('two_recordings_per_training_speaker_required')
    # Round-robin speakers; condition on a different utterance from the same speaker.
    speakers = sorted(groups)
    prepared = []
    prep_start = time.perf_counter()
    deadline = prep_start + min(args.max_seconds, budget['max_runtime_s'])
    for i in range(args.steps):
        if time.perf_counter() > deadline:
            raise TimeoutError('preparation_deadline')
        group = groups[speakers[i % len(speakers)]]
        index = (i // len(speakers)) % len(group)
        row, ref = group[index], group[(index+1) % len(group)]
        with torch.no_grad():
            model.prepare_conditionals(str(pilot.dentro(args.audio_root, ref['audio'])))
            cond = {k: v.detach().clone() if torch.is_tensor(v) else v
                    for k, v in model.conds.t3.__dict__.items()}
            text = model.tokenizer.text_to_tokens(punc_norm(row['text']), language_id='es').to('cuda')
            text = F.pad(F.pad(text, (1, 0), value=model.t3.hp.start_text_token),
                         (0, 1), value=model.t3.hp.stop_text_token)
            wav, _ = librosa.load(pilot.dentro(args.audio_root, row['audio']), sr=16000)
            speech, lengths = model.s3gen.tokenizer([wav])
            speech = speech[:, :int(lengths[0])].to('cuda')
            speech = F.pad(F.pad(speech, (1, 0), value=model.t3.hp.start_speech_token),
                           (0, 1), value=model.t3.hp.stop_speech_token)
            if text.shape[1] > model.t3.hp.max_text_tokens or speech.shape[1] > model.t3.hp.max_speech_tokens:
                raise ValueError('tokens_exceed_limit_no_silent_truncation')
            prepared.append((row['id'], ref['id'], cond, text, speech))
    torch.cuda.synchronize()
    preparation_s = time.perf_counter()-prep_start
    params = [p for p in model.t3.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=1e-4)
    scaler = torch.amp.GradScaler('cuda')
    initial = adapter_state(model.t3)
    metrics = []
    torch.cuda.reset_peak_memory_stats()

    def forward(item):
        _, _, cond, text, speech = item
        # Fresh T3Cond: upstream prepare_conditioning mutates its cached embedding.
        output = model.t3(t3_cond=T3Cond(**cond), text_tokens=text,
            text_token_lens=torch.tensor([text.shape[1]], device='cuda'), speech_tokens=speech[:, :-1],
            speech_token_lens=torch.tensor([speech.shape[1]-1], device='cuda'), training=True)
        return output.speech_logits

    for step, item in enumerate(prepared, 1):
        if time.perf_counter() > deadline:
            raise TimeoutError('training_deadline')
        optimizer.zero_grad(set_to_none=True)
        torch.cuda.synchronize()
        start = time.perf_counter()
        with torch.autocast('cuda', dtype=torch.float16):
            loss = speech_loss(forward(item), item[-1])
        if not torch.isfinite(loss):
            raise ValueError('nonfinite_loss')
        scaler.scale(loss).backward()
        scaler.unscale_(optimizer)
        norm = torch.nn.utils.clip_grad_norm_(params, 1.0, error_if_nonfinite=True)
        if norm.item() == 0 or any(p.grad is not None for p in model.t3.parameters() if not p.requires_grad):
            raise ValueError('gradient_contract_failed')
        scaler.step(optimizer)
        scaler.update()
        torch.cuda.synchronize()
        metrics.append({'step': step, 'sample_id': item[0], 'reference_id': item[1],
            'loss': loss.item(), 'gradient_norm': norm.item(), 'seconds': time.perf_counter()-start,
            'peak_allocated_bytes': torch.cuda.max_memory_allocated(),
            'peak_reserved_bytes': torch.cuda.max_memory_reserved()})
        pilot.guardar(out/'steps.json', metrics)
    state = adapter_state(model.t3)
    if not any(not torch.equal(state[k], initial[k]) for k in state):
        raise ValueError('adapter_did_not_change')
    save_file(state, str(out/'adapter.safetensors'))
    model.t3.eval()
    with torch.no_grad(), torch.autocast('cuda', dtype=torch.float16):
        expected = forward(prepared[0]).detach().clone()
        load_adapter(model.t3, initial)
        load_adapter(model.t3, load_file(str(out/'adapter.safetensors')))
        actual = forward(prepared[0])
        if not torch.allclose(expected, actual, atol=1e-4, rtol=1e-4):
            raise ValueError('adapter_reload_logits_mismatch')
    pilot.guardar(out/'adapter_config.json', {'rank': 8, 'alpha': 16, 'targets': targets,
        'base_model': config['models']['chatterbox'], 'code_commit': code_commit,
        'manifest_sha256': pilot.sha(args.manifest), 'rights_sha256': pilot.sha(args.rights),
        'adapter_sha256': pilot.sha(out/'adapter.safetensors'), 'steps': args.steps,
        'accent_validated': False, 'commercial_ready': False, 'whisper_training_executed': False})
    pilot.guardar(out/'environment.json', {'torch': torch.__version__, 'cuda': torch.version.cuda,
        'gpu': torch.cuda.get_device_name(0), 'model_load_seconds': engine.load_s,
        'model_download_seconds': engine.download_s, 'preparation_seconds': preparation_s,
        'seed': args.seed, 'python': sys.version, 'instrumentation_overhead_seconds': None})
    (out/'pip-freeze.txt').write_text(subprocess.check_output([sys.executable, '-m', 'pip', 'freeze'], text=True))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--manifest', required=True)
    p.add_argument('--audio-root', required=True)
    p.add_argument('--rights', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--budget')
    p.add_argument('--run', action='store_true', help='Without this flag only preflight runs, before importing torch')
    p.add_argument('--research-source-qc', action='store_true', help='Private SLR71 smoke only; provider QC is not human approval or commercial clearance')
    p.add_argument('--steps', type=int, choices=range(1, 21), default=20)
    p.add_argument('--max-seconds', type=int, default=600)
    p.add_argument('--seed', type=int, default=20261103)
    args = p.parse_args()
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=False)
    try:
        if not 0 < args.max_seconds <= 3600:
            raise ValueError('invalid_deadline')
        result = preflight(args)
        pilot.guardar(out/'preflight.json', {'ready': True, **result})
        if args.run:
            if not args.budget:
                raise ValueError('budget_required')
            run(args, out)
        pilot.guardar(out/'status.json', {'status': 'smoke_completed' if args.run else 'preflight_passed',
            'accent_validated': False, 'trainer_sha256': pilot.sha(__file__)})
    except Exception as e:
        pilot.guardar(out/'status.json', {'status': 'blocked_or_failed', 'error': str(e),
            'accent_validated': False, 'trainer_sha256': pilot.sha(__file__)})
        raise


if __name__ == '__main__':
    main()
