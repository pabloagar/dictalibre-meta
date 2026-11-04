"""Five matched sounds on an explicitly authorized NVIDIA L4; no training."""
import argparse
import json
import os
import platform
import re
import subprocess
import time
from pathlib import Path
from run_demo import inspect_audio, sha, write

os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['GRADIO_ANALYTICS_ENABLED'] = 'False'
os.environ['TORCHDYNAMO_DISABLE'] = '1'
CODE_REVISIONS = {'moss': '934d6826b084c46a0d033402174d5f8ac4ed2519',
                  'stable': '790793b89ddceea612be9ce42ff6830d18f6fa57'}


def download_snapshot(spec, engine, download):
    # run_demo disables implicit tokens for anonymous probes. Authenticated,
    # gated downloads must pass the intended credential explicitly.
    token = normalize_hf_token(os.environ.get('HF_TOKEN', '')) if engine == 'stable' else False
    return download(spec['model'], revision=spec['model_head_at_preparation'], token=token)


def normalize_hf_token(value):
    token = re.sub(r'\s+', '', value)
    if not re.fullmatch(r'hf_[A-Za-z0-9]{20,}', token):
        raise ValueError('HF_TOKEN format invalid; check the stored credential without printing it')
    return token


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--engine', choices=['moss', 'stable'], required=True)
    p.add_argument('--output', required=True); p.add_argument('--protocol', required=True)
    p.add_argument('--budget', required=True)
    a = p.parse_args(); root = Path(a.output); root.mkdir(parents=True, exist_ok=False)
    protocol = json.loads(Path(a.protocol).read_text())
    budget = json.loads(Path(a.budget).read_text())
    assert budget['authorized_cap_usd'] == 3 and budget['watchdog_armed'] is True
    assert budget['aggregate_units_per_hour'] * budget['usd_per_unit_conservative'] < 3
    assert time.time() < budget['session_start_epoch'] + 3300, 'Session budget deadline near'
    import numpy as np
    import soundfile as sf
    import torch
    from huggingface_hub import snapshot_download
    assert torch.cuda.is_available() and 'L4' in torch.cuda.get_device_name(0), 'Only NVIDIA L4 authorized'
    spec = protocol['engines'][a.engine]
    model_revision = spec['model_head_at_preparation']
    manifest = {'engine': a.engine, 'source': {**spec, 'served_model_revision': model_revision,
                'execution': 'self_hosted_L4', 'code_revision': CODE_REVISIONS[a.engine]}, 'rows': [],
                'runner_sha256': sha(__file__), 'protocol_sha256': sha(a.protocol), 'execution_commit': None,
                'status': 'downloading', 'environment': {'gpu': torch.cuda.get_device_name(0),
                'vram_bytes': torch.cuda.get_device_properties(0).total_memory,
                'python': platform.python_version(), 'torch': torch.__version__, 'cuda': torch.version.cuda,
                'driver': subprocess.check_output(['nvidia-smi','--query-gpu=driver_version','--format=csv,noheader'],text=True).strip(),
                'network': None, 'browser': 'Chrome'}, 'instrumentation_overhead_seconds': None,
                'commercial_release_status': 'pending_review_of_output_and_applicable_conditions'}
    def save(): write(root / 'manifest.json', manifest)
    save()
    try:
        tick = time.perf_counter()
        snapshot = Path(download_snapshot(spec, a.engine, snapshot_download))
        manifest['download_seconds'] = time.perf_counter() - tick
        tick = time.perf_counter()
        manifest['weights'] = [{'file': str(f.relative_to(snapshot)), 'bytes': f.stat().st_size, 'sha256': sha(f)}
            for f in snapshot.rglob('*') if f.is_file() and f.suffix in ('.safetensors', '.pth', '.json', '.model')]
        manifest['weights_hash_seconds'] = time.perf_counter() - tick
        save(); print('MODEL_DOWNLOADED', a.engine, flush=True)
        torch.cuda.synchronize(); tick = time.perf_counter()
        if a.engine == 'moss':
            from moss_soundeffect_v2 import MossSoundEffectPipeline
            model = MossSoundEffectPipeline.from_pretrained(str(snapshot), torch_dtype=torch.bfloat16, device='cuda')
            sample_rate = model.sample_rate
        else:
            from stable_audio_3 import StableAudioModel
            from stable_audio_3.loading_utils import load_diffusion_cond
            cfg = json.loads((snapshot / 'model_config.json').read_text())
            # Resolve redistributed Gemma files inside the same pinned official snapshot.
            def localize(value):
                if isinstance(value, dict):
                    if value.get('type') == 't5gemma':
                        value['config']['model_path'] = str(snapshot / 't5gemma-b-b-ul2')
                        value['config'].pop('subfolder', None); value['config'].pop('repo_id', None)
                    for child in value.values(): localize(child)
                elif isinstance(value, list):
                    for child in value: localize(child)
            localize(cfg); write(root / 'effective_model_config.json', cfg)
            loaded = load_diffusion_cond(cfg, str(snapshot / 'model.safetensors'), device='cuda', model_half=True)
            loaded.use_lora = False; loaded.lora_names = []
            model = StableAudioModel(loaded, cfg, 'cuda', True); sample_rate = cfg['sample_rate']
        torch.cuda.synchronize(); manifest['load_seconds'] = time.perf_counter() - tick
        manifest['status'] = 'generating'; save(); print('MODEL_LOADED', a.engine, manifest['load_seconds'], flush=True)
        for index, case in enumerate(protocol['cases']):
            assert time.time() < budget['session_start_epoch'] + 3300, 'Session budget deadline near'
            seed = protocol['seed'] + index; s = spec['settings']
            torch.cuda.reset_peak_memory_stats(); torch.cuda.synchronize(); tick = time.perf_counter()
            if a.engine == 'moss':
                output = model(prompt=case['prompt'], seconds=protocol['duration_seconds'],
                    num_inference_steps=s['steps'], cfg_scale=s['cfg_scale'], sigma_shift=s['sigma_shift'], seed=seed)
            else:
                output = model.generate(prompt=case['prompt'], duration=protocol['duration_seconds'],
                    steps=s['steps'], cfg_scale=s['cfg_scale'], seed=seed, sampler_type=s['sampler_type'])
            torch.cuda.synchronize(); generation_seconds = time.perf_counter() - tick
            data = output.detach().float().cpu().numpy()
            while data.ndim > 2: data = data[0]
            if data.ndim == 1: data = data[None, :]
            file = root / (case['id'] + '.wav')
            sf.write(file, data.T, sample_rate, subtype='FLOAT')  # retain unnormalized output, even >1
            row = {'case': case['id'], 'name': case['name'], 'prompt': case['prompt'], 'seed': seed,
                'requested_seconds': protocol['duration_seconds'], 'settings': s, 'file': file.name,
                'sha256': sha(file), 'generation_seconds': generation_seconds,
                'real_time_factor': generation_seconds / (data.shape[-1] / sample_rate),
                'peak_allocated_bytes': torch.cuda.max_memory_allocated(),
                'audio': inspect_audio(file, protocol['duration_seconds'])}
            row['status'] = 'ok' if row['audio']['technical_ok'] else 'technical_failure'
            manifest['rows'].append(row); save(); print('GENERATED', a.engine, case['id'], row['status'], generation_seconds, flush=True)
        manifest['status'] = 'complete'
    except Exception as error:
        manifest['status'] = 'incomplete'; manifest['error_type'] = type(error).__name__
        # HTTP exceptions can include authorization headers. Keep the class,
        # never their raw message or chained traceback in exportable outputs.
        manifest['error'] = 'Generation failed; inspect configuration without exposing credentials'
        raise RuntimeError('Generation failed: ' + type(error).__name__) from None
    finally:
        save()


if __name__ == '__main__': main()
