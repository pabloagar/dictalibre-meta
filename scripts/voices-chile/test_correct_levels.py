import unittest
import tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
import pilot
from correct_levels import correct,peak4

class LevelTests(unittest.TestCase):
    def test_gain_preserves_waveform_and_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);src=root/'src';src.mkdir()
            x=(1.2*np.sin(np.arange(2400)*.13)).astype('float32')
            sf.write(src/'a.wav',x,24000,subtype='FLOAT');np.save(src/'a.npy',x)
            h=pilot.sha(src/'a.wav')
            pilot.guardar(src/'manifest.json',[{'archivo':'a.wav','sha256':h,'raw_sha256':pilot.sha(src/'a.npy'),'case_id':'p01','variant':'base','text':'Prueba','steps':0,'estado':'error_recorte'}])
            gain=correct(src,root/'out');y,sr=sf.read(root/'out/corrected_a.wav')
            self.assertEqual(pilot.sha(src/'a.wav'),h)
            self.assertEqual(pilot.sha(root/'out/original_a.wav'),h)
            self.assertEqual(sr,24000);self.assertEqual(len(x),len(y))
            np.testing.assert_allclose(y/gain,x,atol=1e-7,rtol=1e-7)
            self.assertLessEqual(peak4(y),10**(-2/20)+1e-7)
            self.assertLess(gain,1)
    def test_invalid_audio_rejected(self):
        for x in [[],[0,0],[float('nan')],[float('inf')]]:
            with self.assertRaises(ValueError):peak4(x)
