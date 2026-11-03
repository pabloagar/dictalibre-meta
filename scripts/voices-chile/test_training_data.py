import copy
import tempfile
import unittest
from pathlib import Path
import pilot
import training_data as data


class TrainingDataTests(unittest.TestCase):
    def test_provider_qc_never_becomes_human_review(self):
        import numpy as np
        import soundfile as sf
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m = self.fixture(root)
            m['purpose'] = 'private_research_smoke'
            for i, r in enumerate(m['rows']):
                sf.write(root/r['audio'], .1*np.sin(np.arange(16000)*(i+1)/30), 16000)
                r['audio_sha256'] = pilot.sha(root/r['audio'])
                r['transcript_provenance'] = 'provider_manual_qc'
            with self.assertRaisesRegex(ValueError, 'transcript_not_reviewed'):
                data.validate(m, root)
            self.assertTrue(data.validate(m, root, True)['audio_verified'])
            self.assertTrue(all(r['transcript_reviewed'] is False for r in m['rows']))
            m['purpose'] = 'commercial'
            with self.assertRaisesRegex(ValueError, 'transcript_not_reviewed'):
                data.validate(m, root, True)

    def test_research_scope_does_not_clear_commercial_or_default_gate(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'manifest.json'
            p.write_text('{}')
            rights = {'manifest_sha256': pilot.sha(p), 'scope':'private_research_smoke',
                'copyright_basis':'CC BY-SA 4.0', 'source':'https://openslr.org/71/',
                'evidence':['provider TTS publication'], 'reviewed_on':'2026-11-03',
                'commercial_use':{'status':'unverified'}}
            data.check_training_rights(p, rights, True)
            with self.assertRaisesRegex(ValueError, 'unverified'):
                data.check_training_rights(p, rights)
            rights['commercial_use']['status'] = 'verified'
            with self.assertRaisesRegex(ValueError, 'research_basis'):
                data.check_training_rights(p, rights, True)

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
