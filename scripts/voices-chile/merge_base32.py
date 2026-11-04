"""Create a separate complete ABC batch, verifying every raw artifact."""
import argparse
import shutil
from pathlib import Path
import pilot


def main():
    parser = argparse.ArgumentParser()
    for name in ('existing', 'generated', 'output'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    old, new, out = map(Path, (args.existing, args.generated, args.output))
    old_protocol = pilot.leer(old / 'protocol.json')
    new_protocol = pilot.leer(new / 'protocol.json')
    for key in ('model', 'generation', 'seed'):
        assert old_protocol[key] == new_protocol[key], 'protocol_mismatch:' + key
    sources = [(old, pilot.leer(old / 'manifest.json')), (new, pilot.leer(new / 'manifest.json'))]
    assert [len(rows) for _, rows in sources] == [88, 32]
    rows = [r for _, batch in sources for r in batch]
    assert len({(r['condition'], r['voice'], r['phrase']) for r in rows}) == 120
    expected = {(condition, voice, phrase)
                for condition in ('base_control', 'parent', 'candidate')
                for voice in ('F1', 'F2', 'F3', 'F4', 'M1', 'M2', 'M3', 'M4')
                for phrase in ('p01', 'p02', 'p03', 'p04', 'p05')}
    assert {(r['condition'], r['voice'], r['phrase']) for r in rows} == expected
    assert all(r['condition'] == 'base_control' and r['steps'] == 0 and
               r['adapter_sha256'] is None and r['phrase'] != 'p03' for r in sources[1][1])
    for condition in ('base_control', 'parent', 'candidate'):
        assert sum(r['condition'] == condition for r in rows) == 40
    for folder, batch in sources:
        for row in batch:
            source = pilot.dentro(folder, row['archivo'])
            assert pilot.sha(source) == row['sha256']
            assert pilot.sha(source.with_suffix('.npy')) == row['raw_sha256']
    out.mkdir(parents=True, exist_ok=False)
    for folder, batch in sources:
        for row in batch:
            source = folder / row['archivo']
            shutil.copy2(source, out / source.name)
            shutil.copy2(source.with_suffix('.npy'), out / source.with_suffix('.npy').name)
    shutil.copytree(old / 'references', out / 'references')
    shutil.copy2(old / 'protocol.json', out / 'previous_protocol.json')
    shutil.copy2(old / 'protocol.json', out / 'eight_voice_protocol.json')
    shutil.copy2(new / 'protocol.json', out / 'base32_protocol.json')
    pilot.guardar(out / 'manifest.json', rows)
    pilot.guardar(out / 'provenance.json', {
        'source_manifest_sha256': [pilot.sha(folder / 'manifest.json') for folder, _ in sources],
        'conditions_steps': {'base_control': 0, 'parent': 4020, 'candidate': 4770},
        'separate_generation_sessions': True, 'human_evaluation_complete': False,
        'commercial_ready': False, 'instrumentation_overhead_seconds': None,
    })
    print('MERGED', len(rows), pilot.sha(out / 'manifest.json'))


if __name__ == '__main__':
    main()
