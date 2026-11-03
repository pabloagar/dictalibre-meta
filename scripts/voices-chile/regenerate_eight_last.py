"""Retry only the 40 genuinely trained candidate generations after a duplicate-best run."""
import argparse
from pathlib import Path
import pilot


def main():
    p = argparse.ArgumentParser()
    for name in ('protocol', 'references', 'last', 'parent-config', 'run-summary', 'output'):
        p.add_argument('--' + name, required=True)
    a = p.parse_args()
    from lora_core import attach, load_adapter
    from safetensors.torch import load_file

    protocol = pilot.leer(a.protocol)
    parent = pilot.leer(a.parent_config)
    summary = pilot.leer(a.run_summary)
    last = Path(a.last)
    refs = Path(a.references)
    out = Path(a.output)
    assert len(protocol['references']) == 8 and len(protocol['phrases']) == 5
    assert summary['status'] == 'completed' and summary['best_step'] == 0
    assert summary['steps_completed'] == 750 and parent['steps'] == 4020
    assert pilot.sha(last) != parent['adapter_sha256']
    for ref in protocol['references']:
        assert pilot.sha(refs / ref['reference_audio']) == ref['reference_sha256']
    out.mkdir(parents=True, exist_ok=False)
    config = pilot.leer(pilot.HERE / 'config.json')
    assert config['models']['chatterbox'] == parent['base_model']
    engine = pilot.Chatterbox(config, 'chatterbox')
    attach(engine.model.t3)
    load_adapter(engine.model.t3, load_file(str(last)))
    engine.model.t3.eval()
    pilot.guardar(out / 'protocol.json', {
        'purpose': 'replace_duplicate_parent_candidate_only',
        'candidate_selection': 'last_despite_no_validation_gain',
        'parent_sha256': parent['adapter_sha256'], 'candidate_sha256': pilot.sha(last),
        'parent_steps': parent['steps'], 'candidate_steps': parent['steps'] + summary['steps_completed'],
        'seed': protocol['seed'], 'model': config['models']['chatterbox'],
        'generation': config['chatterbox_generation'],
        'model_download_seconds': engine.download_s, 'model_load_seconds': engine.load_s,
        'instrumentation_overhead_seconds': None, 'accent_validated': False,
        'commercial_ready': False,
    })
    results = []
    for ref in protocol['references']:
        for phrase in protocol['phrases']:
            ident = f"candidate_{ref['label']}_{phrase['id']}"
            row = {'id': ident, 'condition': 'candidate', 'voice': ref['label'],
                   'speaker': ref['speaker'], 'speaker_split': ref['split'],
                   'phrase': phrase['id'], 'text': phrase['text'],
                   'steps': parent['steps'] + summary['steps_completed'],
                   'reference_id': ref['reference_id'],
                   'reference_sha256': ref['reference_sha256'],
                   'adapter_sha256': pilot.sha(last), 'status': 'error'}
            try:
                row.update(engine.generar_audio(
                    phrase['text'], {'semilla': protocol['seed'],
                                     'referencia': str(refs / ref['reference_audio'])},
                    out / (ident + '.wav')))
                row['status'] = row['estado']
            except Exception as exc:
                row['error'] = f'{type(exc).__name__}: {exc}'
            results.append(row)
            pilot.guardar(out / 'manifest.json', results)
            print('GENERATED', ident, row['status'], flush=True)
    pilot.guardar(out / 'summary.json', {
        'expected': 40, 'attempted': len(results),
        'technical_ok': sum(r['status'] == 'ok' for r in results),
        'complete': len(results) == 40, 'accent_validated': False,
    })


if __name__ == '__main__':
    main()
