import json
import base64
import hashlib
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
import numpy as np
import soundfile as sf
from run_demo import inspect_audio, sha, write
from build_review import build
from run_gpu import download_snapshot, normalize_hf_token
from recover_notebook import recover


class SfxTests(unittest.TestCase):
    def test_notebook_recovery_checks_bytes_without_executing_source(self):
        with tempfile.TemporaryDirectory(prefix='sfx-transfer-') as folder:
            root=Path(folder); raw=b'synthetic-backup-fixture'; checksum=hashlib.sha256(raw).hexdigest()
            stdout='SFX_TRANSFER_BEGIN_STABLE\n'+base64.b64encode(raw).decode()+'\nSFX_TRANSFER_END_STABLE '+str(len(raw))+' '+checksum+'\n'
            notebook={'cells':[{'source':['raise RuntimeError("must not execute")'], 'outputs':[{'output_type':'stream','name':'stdout','text':[stdout]}]}]}
            write(root/'fixture.ipynb',notebook); result=recover(root/'fixture.ipynb',root/'out')
            self.assertEqual((root/'out/sfx-stable-result.zip').read_bytes(),raw)
            self.assertEqual(result[0]['sha256'],checksum)
            notebook['cells'][0]['outputs'][0]['text']=[stdout.replace(checksum,'0'*64)]
            write(root/'fixture.ipynb',notebook)
            with self.assertRaises(AssertionError):recover(root/'fixture.ipynb',root/'out2')

    def test_gated_download_uses_explicit_token_despite_anonymous_probe_environment(self):
        received = []
        def download(*args, **kwargs): received.append(kwargs); return 'snapshot-path'
        fixture = 'hf_' + 'A'*24
        with patch.dict('os.environ', {'HF_TOKEN':fixture, 'HF_HUB_DISABLE_IMPLICIT_TOKEN':'1'}):
            spec = {'model':'official/model', 'model_head_at_preparation':'fixed-revision'}
            self.assertEqual(download_snapshot(spec, 'stable', download), 'snapshot-path')
            download_snapshot(spec, 'moss', download)
        self.assertEqual(received[0]['token'], fixture)
        self.assertEqual(received[0]['revision'], 'fixed-revision')
        self.assertIs(received[1]['token'], False)

    def test_credential_paste_whitespace_is_normalized_without_accepting_extra_text(self):
        self.assertEqual(normalize_hf_token(' hf_'+'A'*12+'\n'+'B'*12+' '), 'hf_'+'A'*12+'B'*12)
        with self.assertRaises(ValueError): normalize_hf_token('not a credential')
        with self.assertRaises(ValueError): normalize_hf_token('hf_'+'A'*24+'; extra')

    def test_audio_checks_distinguish_silence_duration_and_full_scale(self):
        with tempfile.TemporaryDirectory(prefix='sfx-qc-') as folder:
            p = Path(folder) / 'fixture.wav'
            sf.write(p, np.zeros(40000), 8000, subtype='FLOAT')
            self.assertTrue(inspect_audio(p, 5)['silent'])
            signal = np.sin(np.arange(40000) * 0.1).astype('float32') * 1.1
            sf.write(p, signal, 8000, subtype='FLOAT')
            stats = inspect_audio(p, 5)
            self.assertTrue(stats['finite']); self.assertGreater(stats['samples_at_full_scale'], 0)
            self.assertFalse(inspect_audio(p, 4)['technical_ok'])

    def fixture(self, folder):
        root = Path(folder); protocol = Path(__file__).with_name('protocol.json')
        data = np.zeros((40000, 2), dtype='float32'); data[200:1000] = 0.8
        file = root / 'wood.wav'; sf.write(file, data, 8000, subtype='FLOAT')
        manifest = {'engine':'stable', 'source':{'served_model_revision':None},
            'commercial_release_status':'pending_review', 'rows':[{'case':'wood', 'file':file.name,
            'sha256':sha(file), 'status':'ok'}]}
        write(root / 'manifest.json', manifest)
        return root, protocol, manifest

    def test_partial_review_preserves_original_and_limits_listening_copy(self):
        with tempfile.TemporaryDirectory(prefix='sfx-review-') as folder:
            root, protocol, manifest = self.fixture(folder)
            result = build(protocol, {'stable':root/'manifest.json'}, root/'out')
            self.assertEqual(result['available'], 1); self.assertEqual(result['expected'], 10)
            self.assertEqual(len(result['cases']), 5)
            row = result['rows'][0]; self.assertEqual(sha(root/'out'/row['original']), manifest['rows'][0]['sha256'])
            copy, _ = sf.read(root/'out'/row['playback'])
            self.assertLessEqual(float(np.max(np.abs(copy))), 10**(-3/20)+1e-6)
            self.assertEqual(row['rights_status'], 'pending_review')

    def test_tampered_original_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix='sfx-hash-') as folder:
            root, protocol, manifest = self.fixture(folder)
            (root/'wood.wav').write_bytes(b'tampered')
            with self.assertRaisesRegex(AssertionError, 'hash mismatch'):
                build(protocol, {'stable':root/'manifest.json'}, root/'out')


if __name__ == '__main__': unittest.main()
