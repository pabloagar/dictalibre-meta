"""Matched pilot through official public demos; never allocates paid compute.

The demos do not pin their loaded model weights. Record that limit explicitly;
the observed Hub model head is not represented as the served revision.
"""
import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import sys
import time
import urllib.request
from pathlib import Path

os.environ['GRADIO_ANALYTICS_ENABLED'] = 'False'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def inspect_audio(path, expected_seconds):
    import numpy as np
    import soundfile as sf
    data, rate = sf.read(path, dtype='float32', always_2d=True)
    finite = bool(np.isfinite(data).all())
    peak = float(np.max(np.abs(data))) if data.size else 0.0
    duration = len(data) / rate
    return {'sample_rate': rate, 'channels': data.shape[1], 'frames': len(data),
            'duration_seconds': duration, 'finite': finite, 'silent': peak == 0,
            'sample_peak': peak, 'samples_at_full_scale': int(np.sum(np.abs(data) >= 0.99996)),
            'rms': float(np.sqrt(np.mean(data.astype('float64') ** 2))) if data.size else 0.0,
            'technical_ok': finite and peak > 0 and abs(duration - expected_seconds) <= 0.1,
            'human_approved': None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--engine', choices=['moss', 'stable'], required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--protocol', default=str(Path(__file__).with_name('protocol.json')))
    parser.add_argument('--count', type=int, choices=range(1, 6), default=5)
    args = parser.parse_args()
    root = Path(args.output); root.mkdir(parents=True, exist_ok=False)
    protocol = json.loads(Path(args.protocol).read_text(encoding='utf-8'))
    assert protocol['paid_services_allowed'] is False and protocol['training'] is False
    engine = protocol['engines'][args.engine]
    shutil.copyfile(args.protocol, root / 'protocol.json')
    manifest = {'engine': args.engine, 'source': engine, 'protocol_sha256': sha(args.protocol),
                'runner_sha256': sha(__file__), 'execution_commit': None, 'rows': [],
                'environment': {'python': platform.python_version(), 'platform': platform.platform(),
                                'local_gpu_used': False, 'provider_gpu_actual': None, 'network': None},
                'load_seconds': None, 'generation_seconds': None, 'instrumentation_overhead_seconds': None,
                'paid_cost_usd': 0, 'commercial_release_status': 'pending_review_of_output_and_applicable_conditions',
                'status': 'initializing'}
    def save(): write(root / 'manifest.json', manifest)
    save()
    try:
        from gradio_client import Client
        metadata = json.load(urllib.request.urlopen('https://huggingface.co/api/spaces/' + engine['space'], timeout=30))
        write(root / 'space_before.json', metadata)
        assert metadata['sha'] == engine['space_revision'], 'Official demo code changed; review before proceeding.'
        tick = time.perf_counter()
        client = Client(engine['space'], token=False, verbose=False, analytics_enabled=False,
                        max_workers=1, download_files=str(root / 'downloads'), httpx_kwargs={'timeout': 60.0})
        manifest['client_setup_seconds'] = time.perf_counter() - tick
        api = client.view_api(return_format='dict', print_info=False)
        write(root / 'api.json', api)
        manifest['status'] = 'generating'; save()
        for index, case in enumerate(protocol['cases'][:args.count]):
            row = {'case': case['id'], 'name': case['name'], 'prompt': case['prompt'],
                   'seed': protocol['seed'] + index, 'requested_seconds': protocol['duration_seconds'],
                   'settings': engine['settings'], 'status': 'submitted', 'started_epoch': time.time()}
            manifest['rows'].append(row); save()
            print('SUBMITTED', args.engine, case['id'], flush=True)
            tick = time.perf_counter()
            try:
                s = engine['settings']
                if args.engine == 'moss':
                    job = client.submit(case['prompt'], protocol['duration_seconds'], s['steps'], s['cfg_scale'],
                                        s['sigma_shift'], row['seed'], api_name=engine['endpoint'])
                else:
                    job = client.submit(s['variant_key'], case['prompt'], protocol['duration_seconds'], s['steps'],
                                        s['cfg_scale'], s['sampler_type'], row['seed'], api_name=engine['endpoint'])
                result = job.result(timeout=240)
                row['request_wall_seconds'] = time.perf_counter() - tick  # includes queue/load/render/transfer
                write(root / (case['id'] + '-response.json'), result)
                audio_path = result[0] if args.engine == 'moss' else result
                if isinstance(audio_path, dict): audio_path = audio_path['path']
                target = root / (case['id'] + '.wav'); shutil.copyfile(audio_path, target)
                row['file'] = target.name; row['sha256'] = sha(target)
                row['audio'] = inspect_audio(target, protocol['duration_seconds'])
                row['provider_status'] = result[1] if args.engine == 'moss' else None
                elapsed = re.search(r'elapsed: ([\d.]+)s', row['provider_status'] or '')
                row['provider_reported_elapsed_seconds'] = float(elapsed.group(1)) if elapsed else None
                row['status'] = 'ok' if row['audio']['technical_ok'] else 'technical_failure'
                print('RESULT', args.engine, case['id'], row['status'], row['request_wall_seconds'], flush=True)
            except Exception as error:
                row['request_wall_seconds'] = time.perf_counter() - tick
                row['status'] = 'failed'; row['error_type'] = type(error).__name__; row['error'] = str(error)
                print('FAILED', args.engine, case['id'], type(error).__name__, str(error)[:600], flush=True)
                save(); raise  # no retry storm or bypass of demo quotas/access controls
            save()
        manifest['status'] = 'complete'
    except Exception as error:
        manifest['status'] = 'incomplete'; manifest['error_type'] = type(error).__name__; manifest['error'] = str(error)
        print('INCOMPLETE', args.engine, type(error).__name__, str(error)[:600], flush=True)
    finally:
        save()
    return 0 if manifest['status'] == 'complete' else 1


if __name__ == '__main__':
    sys.exit(main())
