import unittest
from prepare_qwen_shared import SPEAKERS, select
from training_data import text_key


class ProtocolTests(unittest.TestCase):
    def test_references_text_variants_and_evaluation_never_enter_training(self):
        rows=[];refs=[]
        for label,speaker in SPEAKERS.items():
            for i in range(100):
                text='frase compartida '+str(i)
                rows.append({'id':speaker+'_'+str(i),'speaker':speaker,'split':'train','text':text,
                    'text_key':text_key(text),'audio':speaker+'_'+str(i)+'.wav',
                    'audio_sha256':speaker+'_'+str(i),'duration_seconds':5})
            if label!='M5':refs.append({'label':label,'reference_id':speaker+'_0'})
        previous={'references':refs,'phrases':[{'id':'p01','text':'frase compartida 99'}]}
        result=select({'rows':rows,'source':'https://openslr.org/71/'},previous)
        self.assertEqual(result,select({'rows':rows,'source':'https://openslr.org/71/'},previous))
        self.assertEqual(len(result['references']),4)
        self.assertFalse(any(r['text_key']==text_key(previous['phrases'][0]['text']) for r in result['rows']))
        train={r['text_key'] for r in result['rows'] if r['qwen_split']=='train'}
        held={r['text_key'] for r in result['rows'] if r['qwen_split']!='train'}
        self.assertFalse(train&held)
        self.assertEqual({r['speaker'] for r in result['rows'] if r['qwen_split']=='train'},set(SPEAKERS.values()))


if __name__=='__main__':unittest.main()
