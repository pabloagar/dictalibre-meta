"""Preserve the duplicate-checkpoint attempt and assemble the valid 80-clip comparison."""
import argparse
import shutil
from pathlib import Path
import pilot


def main():
    p = argparse.ArgumentParser()
    for name in ('first', 'retry', 'output'):
        p.add_argument('--' + name, required=True)
    a = p.parse_args()
    first, retry, output = map(Path, (a.first, a.retry, a.output))
    original = pilot.leer(first / 'manifest.json')
    replacement = pilot.leer(retry / 'manifest.json')
    old_protocol = pilot.leer(first / 'protocol.json')
    new_protocol = pilot.leer(retry / 'protocol.json')
    assert len(original) == 88 and len(replacement) == 40
    assert old_protocol['candidate_sha256'] == old_protocol['parent_sha256']
    assert new_protocol['parent_sha256'] == old_protocol['parent_sha256']
    assert new_protocol['candidate_sha256'] != old_protocol['parent_sha256']
    assert new_protocol['candidate_steps'] > new_protocol['parent_steps'] == old_protocol['parent_steps']
    by_id = {row['id']: row for row in replacement}
    assert len(by_id) == 40 and all(row['condition'] == 'candidate' for row in replacement)
    output.mkdir(parents=True, exist_ok=False)
    final = []
    for row in original:
        source_dir = retry if row['condition'] == 'candidate' else first
        selected = by_id[row['id']] if row['condition'] == 'candidate' else row
        assert selected['voice'] == row['voice'] and selected['phrase'] == row['phrase']
        assert selected['text'] == row['text'] and selected['reference_sha256'] == row['reference_sha256']
        if selected.get('archivo'):
            source = source_dir / selected['archivo']
            assert pilot.sha(source) == selected['sha256']
            target = output / selected['archivo']
            shutil.copy2(source, target)
            assert pilot.sha(target) == selected['sha256']
            raw_source = source.with_suffix('.npy')
            raw_target = target.with_suffix('.npy')
            assert pilot.sha(raw_source) == selected['raw_sha256']
            shutil.copy2(raw_source, raw_target)
            assert pilot.sha(raw_target) == selected['raw_sha256']
        final.append(selected)
    assert len(final) == 88
    pilot.guardar(output / 'manifest.json', final)
    pilot.guardar(output / 'protocol.json', {
        **old_protocol, 'candidate_sha256': new_protocol['candidate_sha256'],
        'candidate_steps': new_protocol['candidate_steps'],
        'candidate_selection': new_protocol['candidate_selection'],
        'retry_protocol_sha256': pilot.sha(retry / 'protocol.json'),
        'first_attempt_manifest_sha256': pilot.sha(first / 'manifest.json'),
        'retry_manifest_sha256': pilot.sha(retry / 'manifest.json'),
    })
    pilot.guardar(output / 'summary.json', {
        'attempted': 88, 'parent_candidate_attempted': 80,
        'technical_ok': sum(row['status'] == 'ok' for row in final),
        'first_attempt_discarded_from_comparison': True,
        'first_attempt_preserved': str(first), 'accent_validated': False,
    })
    print('MERGED', output, pilot.sha(output / 'manifest.json'))


if __name__ == '__main__':
    main()
