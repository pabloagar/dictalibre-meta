"""Freeze four training speakers and text-disjoint utterance validation, privately."""
import argparse
import hashlib
from pathlib import Path
import pilot
import training_data

SPEAKERS = {'F3': 'clf_01523', 'F4': 'clf_02484', 'M4': 'clm_00610', 'M5': 'clm_02484'}


def select(manifest, previous):
    test_keys = {training_data.text_key(p['text']) for p in previous['phrases']}
    old_refs = {r['label']: r for r in previous['references']}
    refs, selected = [], []
    for label, speaker in SPEAKERS.items():
        rows = [dict(r) for r in manifest['rows'] if r['speaker'] == speaker and r['split'] == 'train'
                and r['text_key'] not in test_keys]
        ref_id = old_refs[label]['reference_id'] if label in old_refs else min(
            rows, key=lambda r: (abs(r['duration_seconds'] - 5), r['id']))['id']
        ref = next(r for r in rows if r['id'] == ref_id)
        refs.append({'label': label, 'speaker': speaker, 'reference_id': ref_id,
                     'reference_audio': ref['audio'], 'reference_sha256': ref['audio_sha256'],
                     'reference_text': ref['text'], 'split': 'seen_speaker_heldout_reference'})
        for row in rows:
            if row['text_key'] == ref['text_key']:
                row['qwen_split'] = 'reference'
            else:
                h = hashlib.sha256(('20261104:' + row['text_key']).encode()).hexdigest()
                row['qwen_split'] = 'validation' if int(h[:8], 16) % 10 == 0 else 'train'
            row['label'] = label
            selected.append(row)
    # Reference phrases must be excluded for every speaker, including variants.
    ref_keys = {r['text_key'] for r in selected if r['qwen_split'] == 'reference'}
    for row in selected:
        if row['text_key'] in ref_keys:
            row['qwen_split'] = 'reference'
    for label in SPEAKERS:
        assert all(sum(r['label'] == label and r['qwen_split'] == s for r in selected) >= n
                   for s, n in [('train', 30), ('validation', 3)])
    for field in ('text_key', 'audio_sha256'):
        assert not ({r[field] for r in selected if r['qwen_split'] == 'train'} &
                    {r[field] for r in selected if r['qwen_split'] != 'train'})
    return {'seed': 20261104, 'references': refs, 'phrases': previous['phrases'], 'rows': selected,
            'source': manifest['source'], 'purpose': 'private_research_adaptation',
            'method': 'shared_rank8_qv_talker_adapter_primary_codec_objective',
            'max_steps': 600, 'eval_every': 100, 'patience': 3, 'lr': 0.00001,
            'max_runtime_seconds': 7200, 'paid_cap_usd': 5,
            'heldout_speakers': False, 'commercial_ready': False, 'human_validated': False}


def main():
    parser = argparse.ArgumentParser()
    for name in ('manifest', 'rights', 'previous', 'output'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    training_data.check_training_rights(args.manifest, pilot.leer(args.rights), True)
    protocol = select(pilot.leer(args.manifest), pilot.leer(args.previous))
    protocol['source_manifest_sha256'] = pilot.sha(args.manifest)
    protocol['rights_sha256'] = pilot.sha(args.rights)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=False)
    pilot.guardar(out / 'protocol.json', protocol)
    print({label: {s: sum(r['label'] == label and r['qwen_split'] == s for r in protocol['rows'])
                   for s in ('train', 'validation', 'reference')} for label in SPEAKERS})


if __name__ == '__main__':
    main()
