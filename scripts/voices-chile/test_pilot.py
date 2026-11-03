import copy
import tempfile
import unittest
from types import SimpleNamespace
from pathlib import Path
import numpy as np
import pilot


class Tests(unittest.TestCase):
    def setUp(self):
        self.rows = [{'id': str(i), 'voz': 'v', 'estado': 'ok', 'sha256': str(i)} for i in range(10)]
        self.reviews = {r['id']: {'sha256': r['sha256'], 'escuchado': True,
            'acento': 4, 'naturalidad': 4, 'transcripcion': 'Texto.',
            **{k: 0 for k in pilot.ERRORS}} for r in self.rows}

    def test_valid_complete_profile(self):
        self.assertTrue(pilot.evaluar(self.rows, self.reviews, 'design')['v']['aprobada'])

    def test_pending_and_missing_cannot_pass(self):
        self.assertFalse(pilot.evaluar(self.rows, {}, 'design')['v']['aprobada'])
        self.assertFalse(pilot.evaluar(self.rows[:-1], self.reviews, 'design')['v']['aprobada'])

    def test_errors_hash_and_boolean_scores_block(self):
        for key, value in [('sha256', 'wrong'), ('negaciones', 1), ('naturalidad', True), ('acento', None), ('transcripcion', '')]:
            reviews = copy.deepcopy(self.reviews)
            reviews['0'][key] = value
            self.assertFalse(pilot.evaluar(self.rows, reviews, 'design')['v']['aprobada'])

    def test_stability_requires_identity_judgment(self):
        rows = self.rows[:5]
        self.assertFalse(pilot.evaluar(rows, self.reviews, 'stability')['v']['aprobada'])
        for r in self.reviews.values():
            r['identidad_estable'] = True
        self.assertTrue(pilot.evaluar(rows, self.reviews, 'stability')['v']['aprobada'])
        self.reviews['0']['identidad_estable'] = False
        self.assertFalse(pilot.evaluar(rows, self.reviews, 'stability')['v']['aprobada'])

    def test_audio_invalid_silence_and_clipping(self):
        for x in [[], [float('nan')], [0, 0], [-1, .1], [[.1, .2]]]:
            self.assertNotEqual(pilot.inspeccionar(np.asarray(x), 24000)['estado'], 'ok')
        self.assertEqual(pilot.inspeccionar(np.array([.1, -.2]), 24000)['estado'], 'ok')

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                pilot.dentro(d, '../outside.wav')

    def test_hash_tampering(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'a.wav'
            p.write_bytes(b'first')
            rows = [{'archivo': 'a.wav', 'sha256': pilot.sha(p)}]
            p.write_bytes(b'changed')
            with self.assertRaises(ValueError):
                pilot.verificar(rows, d)

    def test_export_requires_review_and_preserves_originals(self):
        import soundfile as sf
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            rows = []
            reviews = {}
            for i in range(10):
                audio = root / f'{i}.wav'
                sf.write(audio, .1 * np.sin(np.arange(2400) * .1), 24000, subtype='FLOAT')
                row = {**self.rows[i], 'archivo': audio.name, 'sha256': pilot.sha(audio), 'particion': 'desarrollo'}
                rows.append(row)
                reviews[str(i)] = {**self.reviews[str(i)], 'sha256': row['sha256']}
            pilot.guardar(root / 'manifest.json', rows)
            pilot.guardar(root / 'protocol.json', {'stage': 'design'})
            review = root / 'review.json'
            pilot.guardar(review, {'manifest_sha256': pilot.sha(root / 'manifest.json'), 'registros': {}})
            args = SimpleNamespace(source=root, review=review, output=root/'export', reference_review=None)
            with self.assertRaises(ValueError):
                pilot.exportar(args)
            self.assertFalse(args.output.exists())
            pilot.guardar(review, {'manifest_sha256': pilot.sha(root / 'manifest.json'), 'registros': reviews})
            with self.assertRaisesRegex(ValueError, 'permisos'):
                pilot.exportar(args)
            from review_workflow import rights_template
            registry = rights_template(root)
            for asset in registry['assets'].values():
                for permission in asset.values():
                    permission.update(status='verified', evidence='synthetic test fixture', reviewer='test', reviewed_on='2026-11-03')
            args.rights = root / 'rights.json'
            pilot.guardar(args.rights, registry)
            pilot.exportar(args)
            exported = pilot.leer(args.output / 'manifest.json')
            self.assertEqual(len(exported), 10)
            self.assertEqual(pilot.sha(args.output/'0.wav'), rows[0]['sha256'])
            audio, sr = sf.read(args.output/'0_16k.wav')
            self.assertEqual(sr, 16000)
            self.assertEqual(len(audio), 1600)


if __name__ == '__main__':
    unittest.main()
