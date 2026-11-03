"""Prepare a private SLR71 inventory and audit leakage before any GPU allocation."""
import argparse
import hashlib
import re
import unicodedata
from pathlib import Path
from collections import Counter, defaultdict
import pilot


def text_key(text):
    text = unicodedata.normalize('NFKC', text).casefold()
    return ' '.join(re.findall(r'\w+', text))


def inventory(indices, seed=20261103):
    rows, ids = [], set()
    for path in indices:
        for number, line in enumerate(Path(path).read_text(encoding='utf-8-sig').splitlines(), 1):
            ident, text = line.split('\t', 1)
            if not re.fullmatch(r'cl[fm]_\d+_\d+', ident) or not text.strip() or ident in ids:
                raise ValueError(f'index_invalid:{Path(path).name}:{number}')
            ids.add(ident)
            rows.append({'id': ident, 'speaker': '_'.join(ident.split('_')[:2]),
                         'text': text, 'text_key': text_key(text), 'audio': ident + '.wav',
                         'audio_sha256': None, 'transcript_reviewed': False})
    speakers = sorted({r['speaker'] for r in rows},
                      key=lambda s: hashlib.sha256(f'{seed}:{s}'.encode()).hexdigest())
    if len(speakers) < 4:
        raise ValueError('at_least_four_speakers_required')
    n = max(1, len(speakers)//5)
    assignment = {s: 'validation' if i < n else 'train' for i, s in enumerate(speakers)}
    text_splits = defaultdict(set)
    for r in rows:
        r['split'] = assignment[r['speaker']]
        text_splits[r['text_key']].add(r['split'])
    # Shared scripts are excluded, never move a speaker to the other partition.
    for r in rows:
        if len(text_splits[r['text_key']]) > 1:
            r['split'] = 'excluded_shared_text'
    return {'version': 1, 'source': 'https://openslr.org/71/', 'license': 'CC BY-SA 4.0',
            'seed': seed, 'indices': [{'name': Path(p).name, 'sha256': pilot.sha(p)} for p in indices],
            'rows': rows, 'purpose': 'candidate_inventory_not_training_authorization'}


def validate(manifest, audio_root=None):
    rows = [r for r in manifest['rows'] if r['split'] in ('train', 'validation')]
    if len({r['id'] for r in manifest['rows']}) != len(manifest['rows']):
        raise ValueError('duplicate_ids')
    train, valid = ([r for r in rows if r['split'] == s] for s in ('train', 'validation'))
    if len({r['speaker'] for r in train}) < 2 or not valid:
        raise ValueError('insufficient_partition_coverage')
    for field in ('speaker', 'text_key'):
        if {r[field] for r in train} & {r[field] for r in valid}:
            raise ValueError(f'partition_leak:{field}')
    if ({r['audio_sha256'] for r in train if r.get('audio_sha256')} &
            {r['audio_sha256'] for r in valid if r.get('audio_sha256')}):
        raise ValueError('partition_leak:audio_sha256')
    if any(r['text_key'] != text_key(r['text']) for r in rows):
        raise ValueError('text_key_mismatch')
    if audio_root:
        import soundfile as sf
        import numpy as np
        for r in rows:
            p = pilot.dentro(audio_root, r['audio'])
            if not r.get('audio_sha256') or pilot.sha(p) != r['audio_sha256']:
                raise ValueError('audio_hash_missing_or_changed:' + r['id'])
            x, sr = sf.read(p)
            if pilot.inspeccionar(np.asarray(x), sr)['estado'] != 'ok' or not 1 <= len(x)/sr <= 12:
                raise ValueError('audio_invalid_or_outside_1_to_12_seconds:' + r['id'])
            if r.get('transcript_reviewed') is not True:
                raise ValueError('transcript_not_reviewed:' + r['id'])
    return {'rows': len(manifest['rows']), 'speakers': len({r['speaker'] for r in manifest['rows']}),
            'partitions': dict(Counter(r['split'] for r in manifest['rows'])),
            'audio_verified': bool(audio_root), 'duration_seconds': None}


def check_training_rights(manifest_path, rights):
    if rights.get('manifest_sha256') != pilot.sha(manifest_path):
        raise ValueError('rights_manifest_mismatch')
    for purpose in ('tts_adaptation', 'voice_conditioning'):
        permission = rights.get(purpose, {})
        if permission.get('status') != 'verified' or not all(
                isinstance(permission.get(k), str) and permission[k].strip()
                for k in ('evidence', 'reviewer', 'reviewed_on')):
            raise ValueError('training_rights_unverified:' + purpose)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--indices', nargs='+', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=False)
    manifest = inventory(args.indices)
    pilot.guardar(out/'manifest.json', manifest)
    pilot.guardar(out/'audit.json', validate(manifest))
    pending = {'status': 'unverified', 'evidence': None, 'reviewer': None, 'reviewed_on': None}
    pilot.guardar(out/'rights.json', {'manifest_sha256': pilot.sha(out/'manifest.json'),
        'tts_adaptation': pending, 'voice_conditioning': pending,
        'commercial_use': pending, 'asr_training': pending, 'redistribute': pending})
    print((out/'audit.json').read_text(encoding='utf-8'))


if __name__ == '__main__':
    main()
