"""Local-only review preparation, rights gate and descriptive baseline metrics."""
import argparse
import base64
import json
import random
import re
from pathlib import Path
import pilot

PURPOSES = ('synthesize', 'commercial_use', 'asr_training', 'redistribute')


def bindings(root):
    root = Path(root)
    rows = pilot.leer(root / 'manifest.json')
    protocol = pilot.leer(root / 'protocol.json')
    # Preserve the complete upstream configuration, including Qwen for synthetic references.
    return {'manifest_sha256': pilot.sha(root / 'manifest.json'),
            'protocol_sha256': pilot.sha(root / 'protocol.json'),
            'models': protocol.get('models'),
            'references': sorted({r['reference_sha256'] for r in rows if r.get('reference_sha256')})}


def rights_template(root):
    b = bindings(root)
    assets = ['code', 'weights', 'input_text', 'output_terms', 'voice_identity']
    assets += ['reference:' + h for h in b['references']]
    return {'version': 1, 'binding': b, 'assets': {a: {
        p: {'status': 'unverified', 'evidence': None, 'reviewer': None, 'reviewed_on': None}
        for p in PURPOSES} for a in assets},
        'note': 'Pending is not prohibition. Evidence must cover the entire upstream chain.'}


def rights_check(root, registry, purposes=('commercial_use', 'asr_training', 'redistribute')):
    required = rights_template(root)
    problems = []
    if registry.get('binding') != required['binding']:
        problems.append('binding_mismatch')
    for asset in required['assets']:
        for purpose in purposes:
            value = registry.get('assets', {}).get(asset, {}).get(purpose, {})
            if value.get('status') != 'verified' or not all(
                isinstance(value.get(k), str) and value[k].strip()
                for k in ('evidence', 'reviewer', 'reviewed_on')):
                problems.append(f'{asset}:{purpose}:not_verified')
    return {'allowed': not problems, 'problems': problems,
            'scope': list(purposes), 'legal_opinion': False}


def blind(root, output, evaluator, seed):
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,40}', evaluator):
        raise ValueError('usar_identificador_anonimo')
    root, output = Path(root), Path(output)
    rows = pilot.leer(root / 'manifest.json')
    pilot.verificar(rows, root)
    if len({r['id'] for r in rows}) != len(rows):
        raise ValueError('ids_duplicados')
    random.Random(seed).shuffle(rows)
    output.mkdir(parents=True, exist_ok=False)
    public = output / 'para_oyente'
    public.mkdir()
    mapping, audios = {}, []
    for i, row in enumerate(rows, 1):
        alias = f'M{i:03}'
        mapping[alias] = {'id': row['id'], 'sha256': row['sha256']}
        audios.append({'id': alias, 'voz': alias, 'case_id': '', 'semilla': '',
            'estado': row['estado'], 'sha256': row['sha256'], 'guion_hablado': row['guion_hablado'],
            'audio': 'data:audio/wav;base64,' + base64.b64encode(
                pilot.dentro(root, row['archivo']).read_bytes()).decode() if row.get('archivo') else None})
    key = {'version': 1, 'evaluator': evaluator, 'order_seed': seed, 'mapping': mapping,
           'binding': bindings(root), 'stage': pilot.leer(root / 'protocol.json')['stage']}
    pilot.guardar(output / 'CLAVE_PRIVADA.json', key)
    data = {'stage': 'stability' if key['stage'] == 'stability' else 'blind', 'manifest_sha256': key['binding']['manifest_sha256'],
            'evaluator': evaluator, 'blind_key_sha256': pilot.sha(output / 'CLAVE_PRIVADA.json'),
            'audios': audios, 'blind': True}
    template = (pilot.HERE / 'review.html').read_text(encoding='utf-8')
    template = template.replace("row.voz+' · '+row.case_id+' · semilla '+row.semilla", "row.id")
    template = template.replace('Voces artificiales por descripción.', 'Evaluación con identidad del motor oculta.')
    (public / 'ESCUCHAR.html').write_text(template.replace('__DATOS_JSON__',
        json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')), encoding='utf-8')
    return {'samples': len(audios), 'evaluator': evaluator, 'ratings': None}


def import_review(root, keypath, reviewpath, output):
    key, review = pilot.leer(keypath), pilot.leer(reviewpath)
    if key['binding'] != bindings(root) or review.get('manifest_sha256') != key['binding']['manifest_sha256']:
        raise ValueError('revision_de_otro_lote')
    if review.get('blind_key_sha256') != pilot.sha(keypath) or review.get('evaluador') != key['evaluator']:
        raise ValueError('revision_de_otro_oyente')
    records = review['registros']
    if set(records) != set(key['mapping']):
        raise ValueError('muestras_distintas')
    restored = {}
    for alias, record in records.items():
        original = key['mapping'][alias]
        if record.get('sha256') != original['sha256']:
            raise ValueError('hash_distinto')
        restored[original['id']] = record
    if Path(output).exists():
        raise FileExistsError(output)
    pilot.guardar(output, {**review, 'stage': key['stage'], 'registros': restored, 'source_review_sha256': pilot.sha(reviewpath)})


def report(root, reviewpaths):
    root = Path(root)
    rows = pilot.leer(root / 'manifest.json')
    pilot.verificar(rows, root)
    observations, evaluators, listener_results = [], set(), []
    for path in reviewpaths:
        review = pilot.leer(path)
        evaluator = review.get('evaluador')
        if not evaluator or evaluator in evaluators:
            raise ValueError('oyente_ausente_o_duplicado')
        evaluators.add(evaluator)
        if review.get('manifest_sha256') != pilot.sha(root / 'manifest.json'):
            raise ValueError('revision_de_otro_lote')
        observations.append(review['registros'])
        complete = [review['registros'][r['id']] for r in rows
                    if pilot.revision_valida(r, review['registros'].get(r['id']))]
        listener_results.append({'evaluator': evaluator, 'complete_samples': len(complete),
            'accent_mean': sum(v['acento'] for v in complete) / len(complete) if complete else None,
            'naturalness_mean': sum(v['naturalidad'] for v in complete) / len(complete) if complete else None})
    reviewed = [(r, obs[r['id']]) for obs in observations for r in rows
                if pilot.revision_valida(r, obs.get(r['id']))]
    approved = [r for r in rows if len(observations) >= 3 and all(
        pilot.revision_valida(r, obs.get(r['id'])) and all(obs[r['id']][k] == 0 for k in pilot.ERRORS)
        for obs in observations) and all(sum(obs[r['id']][k] for obs in observations) / len(observations) >= 4
                                        for k in ('acento', 'naturalidad'))]
    generation = [r.get('segundos_generacion') for r in rows]
    duration = [r.get('duracion_audio') for r in rows]
    total_gen = sum(generation) if all(v is not None for v in generation) else None
    total_dur = sum(duration) if all(v is not None for v in duration) else None
    return {'version': 1, 'binding': bindings(root), 'samples': len(rows),
        'technical_ok': sum(r['estado'] == 'ok' for r in rows), 'listeners': len(evaluators),
        'complete_sample_reviews': len(reviewed), 'human_approved_samples': len(approved) if observations else None,
        'listener_results': listener_results,
        'accent_disagreement_range_by_sample': {r['id']: (
            max(obs[r['id']]['acento'] for obs in observations) - min(obs[r['id']]['acento'] for obs in observations))
            if len(observations) >= 2 and all(pilot.revision_valida(r, obs.get(r['id'])) for obs in observations)
            else None for r in rows},
        'approved_audio_seconds': sum(r['duracion_audio'] for r in approved) if observations else None,
        'accent_mean': sum(v['acento'] for _, v in reviewed) / len(reviewed) if reviewed else None,
        'naturalness_mean': sum(v['naturalidad'] for _, v in reviewed) / len(reviewed) if reviewed else None,
        'errors_per_100_reviewed_samples': {k: 100 * sum(v[k] for _, v in reviewed) / len(reviewed)
            if reviewed else None for k in pilot.ERRORS},
        'generation_seconds': total_gen, 'audio_seconds': total_dur,
        'aggregate_rtf': total_gen / total_dur if total_gen is not None and total_dur else None,
        'cost_per_approved_minute_usd': None, 'invoiced_cost_usd': None,
        'instrumentation_overhead_seconds': None,
        'note': 'Descriptive, not independent observations or ASR evidence. Approval is not export permission.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['prepare', 'report', 'import-review'])
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--reviews', nargs='*', default=[])
    parser.add_argument('--key')
    args = parser.parse_args()
    out = Path(args.output)
    if args.command == 'prepare':
        out.mkdir(parents=True, exist_ok=False)
        pilot.guardar(out / 'rights.json', rights_template(args.source))
        pilot.guardar(out / 'baseline.json', report(args.source, []))
        pilot.guardar(out / 'reference_candidates.json', {'version': 1, 'candidates': [],
            'required_fields': ['id', 'audio_sha256', 'source', 'rights', 'style', 'listener_reviews'],
            'acceptance': 'Three Chilean listeners; accent and naturalness mean >=4; rights separately verified.',
            'existing_qwen_references': {'feedback': 'ninguna chilena', 'source': 'responsable, 2026-11-03',
                                         'approved': False, 'scores': None}})
        for i in range(1, 4):
            blind(args.source, out / f'oyente_{i}', f'oyente_{i}', 20261103+i)
    elif args.command == 'report':
        if out.exists():
            raise FileExistsError(out)
        pilot.guardar(out, report(args.source, args.reviews))
    else:
        if not args.key or len(args.reviews) != 1:
            raise ValueError('se_requiere_clave_y_una_revision')
        import_review(args.source, args.key, args.reviews[0], out)


if __name__ == '__main__':
    main()
