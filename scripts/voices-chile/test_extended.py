import unittest
import tempfile
import json
from pathlib import Path
import pilot
from build_comparison import build
from train_extended import schedule, check_budget


class ExtendedTests(unittest.TestCase):
    def test_player_preserves_utf8_and_checks_audio_hash(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            (root/'a.wav').write_bytes(b'test file, not playable audio')
            pilot.guardar(root/'manifest.json',[{'archivo':'a.wav','sha256':pilot.sha(root/'a.wav'),
                                               'text':'N\u00f3dulo de ocho mil\u00edmetros. </script>'}])
            build(root,root/'player.html','fixture')
            html=(root/'player.html').read_text(encoding='utf-8')
            raw=html.split('<script id="data" type="application/json">')[1].split('</script>')[0]
            self.assertEqual(json.loads(raw)['rows'][0]['text'],'N\u00f3dulo de ocho mil\u00edmetros. </script>')
            (root/'a.wav').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'audio_hash_mismatch'):
                build(root,root/'player.html','fixture')

    def test_schedule_covers_train_before_repetition_and_never_validation(self):
        rows=[{'id':f'{s}_{i}','speaker':s,'split':'train'} for s,n in [('a',3),('b',7)] for i in range(n)]
        rows.append({'id':'reserved','speaker':'c','split':'validation'})
        result=schedule(rows,23,42)
        self.assertEqual(len({r['id'] for r in result[:10]}),10)
        self.assertEqual(len({r['id'] for r in result[10:20]}),10)
        self.assertNotIn('reserved',[r['id'] for r in result])
        self.assertEqual(result,schedule(rows,23,42))

    def test_five_dollar_finite_budget_with_watchdog(self):
        b=dict(units_per_hour=1.15,usd_per_unit=.0999,max_runtime_s=3600,
               remaining_cap_usd=5,watchdog_armed=True,rate_source='test',observed_utc='test')
        check_budget(b)
        for key,value in [('remaining_cap_usd',5.01),('units_per_hour',float('nan')),
                          ('usd_per_unit',100),('watchdog_armed',False),('max_runtime_s',3601)]:
            with self.assertRaises(ValueError):
                check_budget({**b,key:value})


if __name__=='__main__':
    unittest.main()
