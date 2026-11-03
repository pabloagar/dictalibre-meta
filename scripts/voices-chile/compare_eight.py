"""Private research comparison: eight fixed references, five fixed texts, two adapters."""
import argparse
from pathlib import Path
import pilot


def main():
    parser = argparse.ArgumentParser()
    for name in ('data', 'protocol', 'parent', 'candidate', 'output'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    from lora_core import attach, load_adapter
    from safetensors.torch import load_file

    data, parent, candidate = map(Path, (args.data, args.parent, args.candidate))
    out = Path(args.output)
    spec = pilot.leer(args.protocol)
    assert len(spec['references']) == 8 and len(spec['phrases']) == 5
    assert spec['status'] == 'prepared_not_generated'
    rows = pilot.leer(data / 'manifest.json')['rows']
    by_id = {row['id']: row for row in rows}
    for ref in spec['references']:
        row = by_id[ref['reference_id']]
        assert row['speaker'] == ref['speaker'] and row['split'] == ref['split']
        assert row['audio_sha256'] == ref['reference_sha256']
        assert pilot.sha(data / 'audio' / row['audio']) == ref['reference_sha256']
    parent_cfg = pilot.leer(parent.with_name('adapter_config.json'))
    candidate_cfg = pilot.leer(candidate.with_name('adapter_config.json'))
    assert pilot.sha(parent) == parent_cfg['adapter_sha256']
    assert pilot.sha(candidate) == candidate_cfg['adapter_sha256']
    assert parent_cfg['base_model'] == candidate_cfg['base_model']
    assert parent_cfg['manifest_sha256'] == candidate_cfg['manifest_sha256'] == pilot.sha(data / 'manifest.json')
    summary = pilot.leer(candidate.with_name('summary.json'))
    assert summary['status'] == 'completed' and summary['steps_completed'] > 0
    selection = 'best_validation'
    candidate_steps = candidate_cfg['steps']
    if summary['best_step'] == 0:
        # Keep the validation winner (the parent), yet compare a genuinely trained
        # checkpoint. This is exploratory and must not be called an improvement.
        candidate = candidate.with_name('last.safetensors')
        assert candidate.is_file()
        candidate_steps = parent_cfg['steps'] + summary['steps_completed']
        selection = 'last_despite_no_validation_gain'

    out.mkdir(parents=True, exist_ok=False)
    config = pilot.leer(pilot.HERE / 'config.json')
    engine = pilot.Chatterbox(config, 'chatterbox')
    attach(engine.model.t3)
    pilot.guardar(out / 'protocol.json', {
        **spec, 'status': 'generating', 'model': config['models']['chatterbox'],
        'generation': config['chatterbox_generation'], 'seed': spec['seed'],
        'parent_sha256': pilot.sha(parent), 'candidate_sha256': pilot.sha(candidate),
        'parent_steps': parent_cfg['steps'], 'candidate_steps': candidate_steps,
        'candidate_selection': selection,
        'model_download_seconds': engine.download_s, 'model_load_seconds': engine.load_s,
        'instrumentation_overhead_seconds': None, 'accent_validated': False,
        'commercial_ready': False,
    })
    results = []
    conditions = [('base_control', None, 0), ('parent', parent, parent_cfg['steps']),
                  ('candidate', candidate, candidate_steps)]
    for condition, adapter, steps in conditions:
        if adapter:
            load_adapter(engine.model.t3, load_file(str(adapter)))
        engine.model.t3.eval()
        for ref in spec['references']:
            for phrase in spec['phrases']:
                if condition == 'base_control' and phrase['id'] != 'p03':
                    continue
                ident = f"{condition}_{ref['label']}_{phrase['id']}"
                record = {
                    'id': ident, 'condition': condition, 'voice': ref['label'],
                    'speaker': ref['speaker'], 'speaker_split': ref['split'],
                    'phrase': phrase['id'], 'text': phrase['text'], 'steps': steps,
                    'reference_id': ref['reference_id'],
                    'reference_sha256': ref['reference_sha256'],
                    'adapter_sha256': pilot.sha(adapter) if adapter else None,
                    'status': 'error',
                }
                try:
                    record.update(engine.generar_audio(
                        phrase['text'], {'semilla': spec['seed'],
                                         'referencia': str(data / 'audio' / ref['reference_audio'])},
                        out / (ident + '.wav')))
                    record['status'] = record['estado']
                except Exception as exc:
                    record['error'] = f'{type(exc).__name__}: {exc}'
                results.append(record)
                pilot.guardar(out / 'manifest.json', results)
                print('GENERATED', ident, record['status'], flush=True)
    pilot.guardar(out / 'summary.json', {
        'attempted': len(results), 'expected': 88,
        'parent_candidate_attempted': sum(r['condition'] != 'base_control' for r in results),
        'technical_ok': sum(r['status'] == 'ok' for r in results),
        'complete': len(results) == 88,
        'accent_validated': False, 'commercial_ready': False,
    })


if __name__ == '__main__':
    main()
