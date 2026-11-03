import copy
import tempfile
import unittest
from pathlib import Path
import pilot
import training_data as data


class TrainingDataTests(unittest.TestCase):
    def fixture(self, root):
        p = root/'index.tsv'
        lines = [f'clf_{s:05}_{i:011}\tFrase del hablante {s} ejemplo {i}' for s in range(6) for i in range(3)]
        lines += [f'clf_{s:05}_99999999999\tFrase compartida' for s in range(6)]
        p.write_text('\n'.join(lines), encoding='utf-8')
        return data.inventory([p])

    def test_speaker_and_text_disjoint(self):
        with tempfile.TemporaryDirectory() as d:
            manifest = self.fixture(Path(d))
            self.assertEqual(data.validate(manifest)['partitions']['excluded_shared_text'], 6)
            self.assertEqual(manifest, self.fixture(Path(d)))
            altered = copy.deepcopy(manifest)
            tr = next(r for r in altered['rows'] if r['split'] == 'train')
            va = next(r for r in altered['rows'] if r['split'] == 'validation')
            va['speaker'] = tr['speaker']
            with self.assertRaisesRegex(ValueError, 'leak'):
                data.validate(altered)

    def test_permission_is_bound_and_separate_from_commercial(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'manifest.json'
            pilot.guardar(path, self.fixture(Path(d)))
            rights = {'manifest_sha256': pilot.sha(path)}
            with self.assertRaisesRegex(ValueError, 'unverified'):
                data.check_training_rights(path, rights)
            for purpose in ('tts_adaptation', 'voice_conditioning'):
                rights[purpose] = {'status':'verified', 'evidence':'test fixture', 'reviewer':'test', 'reviewed_on':'2026-11-03'}
            data.check_training_rights(path, rights)
            path.write_text('{}')
            with self.assertRaisesRegex(ValueError, 'mismatch'):
                data.check_training_rights(path, rights)
