import json
import tempfile
import unittest
from pathlib import Path
import pilot
import review_workflow as workflow


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'secret_voice.wav').write_bytes(b'fixture audio payload')
        self.row = {'id': 'secret_voice_seed_42', 'voz': 'secret_voice', 'motor': 'chatterbox',
                    'estado': 'ok', 'archivo': 'secret_voice.wav', 'sha256': pilot.sha(self.root / 'secret_voice.wav'),
                    'guion_hablado': 'No hay derrame.', 'duracion_audio': 2, 'segundos_generacion': 3}
        pilot.guardar(self.root / 'manifest.json', [self.row])
        pilot.guardar(self.root / 'protocol.json', {'stage': 'chatterbox', 'models': {'test': 'pinned'}})

    def test_rights_fail_closed_and_bound_to_protocol(self):
        registry = workflow.rights_template(self.root)
        self.assertFalse(workflow.rights_check(self.root, registry)['allowed'])
        for asset in registry['assets'].values():
            for p in asset.values():
                p.update(status='verified', evidence='fixture', reviewer='test', reviewed_on='2026-11-03')
        self.assertTrue(workflow.rights_check(self.root, registry)['allowed'])
        registry['assets']['weights']['asr_training']['status'] = 'conditional'
        self.assertFalse(workflow.rights_check(self.root, registry)['allowed'])
        registry['assets']['weights']['asr_training']['status'] = 'verified'
        pilot.guardar(self.root / 'protocol.json', {'stage': 'chatterbox', 'models': {'test': 'changed'}})
        self.assertFalse(workflow.rights_check(self.root, registry)['allowed'])

    def test_blind_package_has_no_identity_and_import_is_bound(self):
        out = self.root / 'package'
        workflow.blind(self.root, out, 'listener1', 1)
        html = (out / 'para_oyente/ESCUCHAR.html').read_text(encoding='utf-8')
        self.assertNotIn('secret_voice', html)
        self.assertNotIn('chatterbox', html)
        keypath = out / 'CLAVE_PRIVADA.json'
        review = {'evaluador': 'listener1', 'manifest_sha256': pilot.sha(self.root / 'manifest.json'),
                  'blind_key_sha256': pilot.sha(keypath), 'registros': {'M001': {'sha256': self.row['sha256']}}}
        rp = self.root / 'review.json'
        pilot.guardar(rp, review)
        workflow.import_review(self.root, keypath, rp, self.root / 'imported.json')
        self.assertIn(self.row['id'], pilot.leer(self.root / 'imported.json')['registros'])
        review['evaluador'] = 'another_listener'
        pilot.guardar(rp, review)
        with self.assertRaises(ValueError):
            workflow.import_review(self.root, keypath, rp, self.root / 'bad.json')

    def test_absent_human_metrics_remain_null(self):
        result = workflow.report(self.root, [])
        self.assertIsNone(result['accent_mean'])
        self.assertIsNone(result['human_approved_samples'])
        self.assertEqual(result['aggregate_rtf'], 1.5)

    def test_critical_error_prevents_panel_acceptance(self):
        paths = []
        for i in range(3):
            review = {'sha256': self.row['sha256'], 'escuchado': True, 'acento': 5, 'naturalidad': 5,
                      'transcripcion': 'No hay derrame.', **{k: 0 for k in pilot.ERRORS}}
            if i == 2:
                review['lateralidad'] = 1
            p = self.root / f'r{i}.json'
            pilot.guardar(p, {'evaluador': str(i), 'manifest_sha256': pilot.sha(self.root / 'manifest.json'),
                             'registros': {self.row['id']: review}})
            paths.append(p)
        result = workflow.report(self.root, paths)
        self.assertEqual(result['human_approved_samples'], 0)
        self.assertAlmostEqual(result['errors_per_100_reviewed_samples']['lateralidad'], 100/3)
        with self.assertRaises(ValueError):
            workflow.report(self.root, paths + paths[:1])


if __name__ == '__main__':
    unittest.main()
