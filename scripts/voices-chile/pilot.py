"""Piloto independiente: diseño, revisión humana, estabilidad y exportación."""
import argparse
import base64
import csv
import hashlib
import json
import math
import platform
import random
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ERRORS = ('terminos', 'cifras', 'unidades', 'lateralidad', 'negaciones', 'comandos', 'cortes', 'repeticiones', 'otras_palabras')


def guardar(path, value):
    path = Path(path)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    tmp.replace(path)


def leer(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def dentro(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError('ruta_fuera_de_ejecucion')
    return path


def inspeccionar(audio, sr):
    import numpy as np
    x = np.asarray(audio)
    if x.ndim != 1 or not x.size or sr <= 0 or not np.isfinite(x).all():
        return {'estado': 'error_audio_invalido', 'duracion_audio': None, 'pico': None}
    peak = float(np.abs(x).max())
    return {'estado': 'error_silencio' if peak == 0 else 'error_recorte' if peak >= 1 else 'ok',
            'duracion_audio': len(x) / sr, 'pico': peak}


def revision_valida(row, review):
    if not isinstance(review, dict) or review.get('sha256') != row.get('sha256'):
        return False
    if row.get('estado') != 'ok' or not row.get('sha256') or review.get('escuchado') is not True:
        return False
    for key in ('acento', 'naturalidad'):
        if type(review.get(key)) is not int or not 1 <= review[key] <= 5:
            return False
    if any(type(review.get(k)) is not int or review[k] < 0 for k in ERRORS):
        return False
    return isinstance(review.get('transcripcion'), str) and bool(review['transcripcion'].strip())


def evaluar(rows, reviews, etapa):
    ids = [r['id'] for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError('ids_duplicados')
    expected = 1 if etapa == 'references' else 5 if etapa == 'stability' else 10
    result = {}
    for voice in sorted({r['voz'] for r in rows}):
        group = [r for r in rows if r['voz'] == voice]
        rr = [reviews.get(r['id']) for r in group]
        complete = len(group) == expected and all(revision_valida(r, v) for r, v in zip(group, rr))
        if etapa == 'stability':
            complete = complete and all(type(v.get('identidad_estable')) is bool for v in rr)
        accent = sum(v['acento'] for v in rr) / expected if complete else None
        natural = sum(v['naturalidad'] for v in rr) / expected if complete else None
        no_errors = all(all(v[k] == 0 for k in ERRORS) for v in rr) if complete else False
        stable = all(v['identidad_estable'] for v in rr) if complete and etapa == 'stability' else None
        result[voice] = {'completa': complete, 'acento_media': accent, 'naturalidad_media': natural,
                         'aprobada': bool(complete and accent >= 4 and natural >= 4 and no_errors
                                          and (etapa != 'stability' or stable)),
                         'identidad_estable': stable, 'oyentes': 1}
    return result


class Qwen:
    """Misma interfaz del laboratorio; GPU externa explícita, nunca CPU implícita."""
    def __init__(self, config, etapa):
        import torch
        from huggingface_hub import snapshot_download
        from qwen_tts import Qwen3TTSModel
        if not torch.cuda.is_available():
            raise RuntimeError('gpu_no_disponible')
        self.torch, self.config, self.etapa = torch, config, etapa
        self.dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        spec = config['models']['design' if etapa == 'design' else 'base']
        start = time.perf_counter()
        local = snapshot_download(spec['id'], revision=spec['revision'])
        self.download_s = time.perf_counter() - start
        torch.cuda.synchronize()
        start = time.perf_counter()
        self.model = Qwen3TTSModel.from_pretrained(local, device_map='cuda:0', dtype=self.dtype,
                                                  attn_implementation='sdpa')
        torch.cuda.synchronize()
        self.load_s = time.perf_counter() - start

    def generar_audio(self, texto: str, voz: dict, ruta_salida: Path) -> dict:
        import numpy as np
        import soundfile as sf
        path = Path(ruta_salida)
        if path.exists():
            raise FileExistsError(path)
        torch = self.torch
        random.seed(voz['semilla'])
        np.random.seed(voz['semilla'])
        torch.manual_seed(voz['semilla'])
        torch.cuda.manual_seed_all(voz['semilla'])
        torch.cuda.synchronize()
        start = time.perf_counter()
        kwargs = dict(text=texto, language='Spanish', **self.config['generation'])
        if self.etapa in ('design', 'references'):
            wavs, sr = self.model.generate_voice_design(instruct=voz['descripcion'], **kwargs)
        elif self.etapa == 'chatterbox':
            wav = self.model.generate(texto, language_id='es', audio_prompt_path=voz['referencia'],
                                      **self.config['chatterbox_generation'])
            wavs, sr = [wav.detach().cpu().numpy().squeeze()], self.model.sr
        else:
            wavs, sr = self.model.generate_voice_clone(ref_audio=voz['referencia'],
                ref_text=voz['transcripcion_referencia'], x_vector_only_mode=False, **kwargs)
        torch.cuda.synchronize()
        elapsed = time.perf_counter() - start
        x = np.asarray(wavs[0])
        stats = inspeccionar(x, sr)
        # Preserve even invalid output; never normalize away clipping evidence.
        np.save(path.with_suffix('.npy'), x)
        if stats['duracion_audio'] is not None:
            sf.write(path, x, sr, subtype='FLOAT')
            y, decoded_sr = sf.read(path)
            if not np.array_equal(x.astype('float32'), y.astype('float32')) or decoded_sr != sr:
                raise ValueError('verificacion_wav_fallida')
        return {**stats, 'segundos_generacion': elapsed, 'sample_rate': sr,
                'factor_tiempo_real': elapsed / stats['duracion_audio'] if stats['duracion_audio'] else None,
                'sha256': sha(path) if path.exists() else None,
                'archivo': path.name if path.exists() else None,
                'raw_sha256': sha(path.with_suffix('.npy'))}


class Chatterbox(Qwen):
    def __init__(self, config, etapa):
        import torch
        from huggingface_hub import snapshot_download
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        if not torch.cuda.is_available():
            raise RuntimeError('gpu_no_disponible')
        self.torch, self.config, self.etapa, self.dtype = torch, config, 'chatterbox', torch.float32
        start = time.perf_counter()
        spec = config['models']['chatterbox']
        local = snapshot_download(spec['id'], revision=spec['revision'], allow_patterns=[
            've.pt', 't3_mtl23ls_v3.safetensors', 's3gen.pt', 'grapheme_mtl_merged_expanded_v1.json',
            'conds.pt', 'Cangjie5_TC.json'])
        self.download_s = time.perf_counter() - start
        torch.cuda.synchronize()
        start = time.perf_counter()
        self.model = ChatterboxMultilingualTTS.from_local(local, device='cuda', t3_model='v3')
        torch.cuda.synchronize()
        self.load_s = time.perf_counter() - start


def verificar(rows, root):
    for row in rows:
        if row.get('archivo') and sha(dentro(root, row['archivo'])) != row['sha256']:
            raise ValueError('hash_audio_distinto')


def generar(args):
    budget = leer(args.budget) if args.budget else None
    if not args.free_runtime_confirmed and not budget:
        raise ValueError('Confirmar runtime gratuito; gasto pagado no habilitado sin tarifa y apagado verificables')
    if budget:
        if not (0 < budget['usd_per_unit'] * budget['units_per_hour'] * budget['max_runtime_s'] / 3600 <= 10
                and budget['watchdog_armed'] is True and budget['rate_source'] and budget['observed_utc']):
            raise ValueError('presupuesto_no_verificado')
    config = leer(HERE / 'config.json')
    refs = {}
    use_chatterbox = args.stage == 'chatterbox'
    if args.stage == 'chatterbox':
        if not args.source:
            raise ValueError('chatterbox_requiere_referencias_sinteticas')
        source = Path(args.source)
        if leer(source / 'protocol.json')['stage'] != 'references':
            raise ValueError('solo_referencias_artificiales_de_este_piloto')
        parent = leer(source / 'manifest.json')
        verificar(parent, source)
        for row in parent:
            if row['estado'] == 'ok':
                refs[row['voz']] = {'referencia': str(dentro(source, row['archivo'])),
                    'reference_sha256': row['sha256'], 'reference_human_approval': None}
        if len(refs) != 2:
            raise ValueError('faltan_dos_referencias_tecnicamente_validas')
    if args.stage == 'stability':
        if not args.source or not args.review:
            raise ValueError('estabilidad_requiere_origen_y_revision')
        source = Path(args.source)
        parent = leer(source / 'manifest.json')
        parent_stage = leer(source / 'protocol.json')['stage']
        if parent_stage not in ('design', 'chatterbox'):
            raise ValueError('origen_debe_ser_perfil_completo')
        use_chatterbox = parent_stage == 'chatterbox'
        verificar(parent, source)
        reviews = leer(args.review)['registros']
        if leer(args.review).get('manifest_sha256') != sha(source / 'manifest.json'):
            raise ValueError('revision_de_otro_manifiesto')
        accepted = evaluar(parent, reviews, parent_stage)
        for voice, verdict in accepted.items():
            if verdict['aprobada']:
                row = sorted([r for r in parent if r['voz'] == voice],
                             key=lambda r: (-reviews[r['id']]['naturalidad'], r['id']))[0]
                refs[voice] = {'referencia': str(dentro(source, row['archivo'])),
                              'transcripcion_referencia': reviews[row['id']]['transcripcion'],
                              'reference_sha256': row['sha256'], 'parent_verdict': verdict}
        if not refs:
            raise ValueError('ningun_perfil_aprobado')
    run = Path(args.output).resolve()
    run.mkdir(parents=True, exist_ok=False)
    protocol = {**config, 'stage': args.stage, 'started_utc': datetime.now(timezone.utc).isoformat(),
                'source_run': str(Path(args.source).resolve()) if args.source else None,
                'source_review_sha256': sha(args.review) if args.review else None,
                'free_runtime_confirmed': args.free_runtime_confirmed, 'cost_usd': 0 if args.free_runtime_confirmed else None,
                'budget': budget, 'paid_cap_usd': 10,
                'clock_resolution_s': time.get_clock_info('perf_counter').resolution,
                'instrumentation_overhead_s': None, 'network': None, 'browser': None,
                'dictalibre_commit': None, 'generator_sha256': sha(__file__)}
    guardar(run / 'protocol.json', protocol)
    requirements_name = 'requirements-chatterbox.txt' if use_chatterbox else 'requirements.txt'
    shutil.copy2(HERE / requirements_name, run / requirements_name)
    rows = []
    guardar(run / 'manifest.json', rows)
    try:
        (run / 'pip-freeze.txt').write_text(subprocess.check_output([sys.executable, '-m', 'pip', 'freeze'], text=True))
        engine = Chatterbox(config, args.stage) if use_chatterbox else Qwen(config, 'design' if args.stage == 'references' else args.stage)
        guardar(run / 'environment.json', {'python': platform.python_version(), 'platform': platform.platform(),
            'gpu': engine.torch.cuda.get_device_name(0), 'cuda': engine.torch.version.cuda,
            'dtype': str(engine.dtype), 'model_load_s': engine.load_s, 'model_download_s': engine.download_s})
        started = time.perf_counter()
        cases = config['stability_cases' if args.stage == 'stability' else 'cases']
        if args.stage == 'references':
            cases = cases[:1]
        for voice, profile in config['voices'].items():
            if args.stage == 'stability' and voice not in refs:
                continue
            for case in cases:
                for seed in config['seeds'] if args.stage in ('design', 'chatterbox') else config['seeds'][:1]:
                    if time.perf_counter() - started > 3600:
                        raise TimeoutError('limite_una_hora_generacion')
                    ident = f"{voice}_{case['id']}_{seed}"
                    row = {'id': ident, 'case_id': case['id'], 'voz': voice, 'semilla': seed,
                           'particion': 'desarrollo', 'motor': 'chatterbox-v3' if use_chatterbox else 'qwen3-tts', 'stage': args.stage,
                           'guion_hablado': case['text'], 'texto_esperado': case['formatted'],
                           'descripcion': profile['descripcion'], 'acento_validado': None,
                           'estado': 'error', 'archivo': None, 'sha256': None,
                           'segundos_generacion': None, 'duracion_audio': None, 'factor_tiempo_real': None,
                           'reference_sha256': refs.get(voice, {}).get('reference_sha256')}
                    try:
                        row.update(engine.generar_audio(case['text'], {**profile, 'semilla': seed, **refs.get(voice, {})}, run / (ident + '.wav')))
                    except Exception as exc:
                        row['error'] = type(exc).__name__
                        print('SAMPLE_ERROR', ident, repr(exc), flush=True)
                    rows.append(row)
                    guardar(run / 'manifest.json', rows)
                    print('SAMPLE', ident, row['estado'], flush=True)
        guardar(run / 'summary.json', {'status': 'completed', 'attempted': len(rows),
            'technical_ok': sum(r['estado'] == 'ok' for r in rows), 'human_acceptance': None,
            'cost_usd': 0 if args.free_runtime_confirmed else None, 'cost_basis': 'ver protocolo; sin compra'})
    except BaseException as exc:
        guardar(run / 'summary.json', {'status': 'interrupted', 'error': type(exc).__name__,
            'attempted': len(rows), 'human_acceptance': None, 'cost_usd': 0 if args.free_runtime_confirmed else None})
        raise
    finally:
        if rows:
            campos = sorted(set().union(*(r.keys() for r in rows)))
            with (run / 'manifiesto.csv').open('w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, campos)
                writer.writeheader()
                writer.writerows({k: 'null' if v is None else v for k, v in r.items()} for r in rows)
            reproductor(run)


def reproductor(root):
    root = Path(root)
    rows = leer(root / 'manifest.json')
    verificar(rows, root)
    data = {'stage': leer(root / 'protocol.json')['stage'], 'manifest_sha256': sha(root / 'manifest.json'), 'audios': []}
    for row in rows:
        copy = dict(row)
        copy['audio'] = ('data:audio/wav;base64,' + base64.b64encode(dentro(root, row['archivo']).read_bytes()).decode()) if row.get('archivo') else None
        data['audios'].append(copy)
    encoded = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    template = (HERE / 'review.html').read_text(encoding='utf-8')
    (root / 'ESCUCHAR.html').write_text(template.replace('__DATOS_JSON__', encoded), encoding='utf-8')


def exportar(args):
    import soundfile as sf
    import numpy as np
    from scipy.signal import resample_poly
    root = Path(args.source)
    rows = leer(root / 'manifest.json')
    verificar(rows, root)
    review_file = leer(args.review)
    if review_file.get('manifest_sha256') != sha(root / 'manifest.json'):
        raise ValueError('revision_de_otro_manifiesto')
    reviews = review_file['registros']
    stage = leer(root / 'protocol.json')['stage']
    if stage == 'references':
        raise ValueError('referencias_candidatas_no_son_corpus')
    if stage == 'chatterbox':
        if not args.reference_review:
            raise ValueError('falta_revision_humana_de_referencias')
        source = Path(leer(root / 'protocol.json')['source_run'])
        parent = leer(source / 'manifest.json')
        verificar(parent, source)
        ref_review = leer(args.reference_review)
        if ref_review.get('manifest_sha256') != sha(source / 'manifest.json'):
            raise ValueError('revision_de_referencias_distinta')
        ref_verdict = evaluar(parent, ref_review['registros'], 'references')
        if not all(v['aprobada'] for v in ref_verdict.values()):
            raise ValueError('referencias_no_aprobadas')
    verdict = evaluar(rows, reviews, stage)
    selected = [r for r in rows if verdict[r['voz']]['aprobada']]
    if not selected:
        raise ValueError('sin_muestras_aprobadas_no_exportar')
    from review_workflow import rights_check
    if not getattr(args, 'rights', None):
        raise ValueError('falta_registro_de_permisos')
    rights = rights_check(root, leer(args.rights))
    if not rights['allowed']:
        raise ValueError('permisos_no_verificados: ' + ', '.join(rights['problems']))
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=False)
    exported = []
    for row in selected:
        src = dentro(root, row['archivo'])
        original = out / row['archivo']
        shutil.copy2(src, original)
        x, sr = sf.read(src)
        divisor = math.gcd(sr, 16000)
        y = resample_poly(x, 16000 // divisor, sr // divisor)
        # Keep no-clipping rule after resampling; do not silently adjust level.
        if inspeccionar(y, 16000)['estado'] != 'ok':
            raise ValueError('derivado_invalido_exportacion_incompleta')
        dest = out / (row['id'] + '_16k.wav')
        sf.write(dest, y, 16000, subtype='PCM_16')
        decoded, rate = sf.read(dest)
        if rate != 16000 or not np.isfinite(decoded).all() or np.max(np.abs(decoded)) >= 1:
            raise ValueError('derivado_pcm_invalido')
        exported.append({**row, 'transcripcion': reviews[row['id']]['transcripcion'],
            'original_sha256': sha(original), 'audio_16k': dest.name, 'sha256_16k': sha(dest),
            'revision': reviews[row['id']], 'perfil_estable': stage == 'stability',
            'training_whisper_executed': False})
    guardar(out / 'manifest.json', exported)
    guardar(out / 'approval.json', {'verdict': verdict, 'review_sha256': sha(args.review),
                                  'rights_sha256': sha(args.rights), 'rights_verdict': rights,
                                  'source_manifest_sha256': sha(root / 'manifest.json')})


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    gen = sub.add_parser('generate')
    gen.add_argument('--stage', choices=['design', 'references', 'chatterbox', 'stability'], default='references')
    gen.add_argument('--output', required=True)
    gen.add_argument('--source')
    gen.add_argument('--review')
    gen.add_argument('--free-runtime-confirmed', action='store_true')
    gen.add_argument('--budget', help='Evidencia de tarifa y watchdog, no autorización de compra')
    listen = sub.add_parser('listen')
    listen.add_argument('--source', required=True)
    exp = sub.add_parser('export')
    exp.add_argument('--source', required=True)
    exp.add_argument('--review', required=True)
    exp.add_argument('--output', required=True)
    exp.add_argument('--reference-review')
    exp.add_argument('--rights', help='Registro vinculado al lote: permisos comercial, ASR y redistribución')
    args = parser.parse_args()
    if args.command == 'generate':
        generar(args)
    elif args.command == 'listen':
        reproductor(args.source)
    else:
        exportar(args)


if __name__ == '__main__':
    main()
