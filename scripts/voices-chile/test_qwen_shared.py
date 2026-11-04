"""CPU checks for leakage, speaker preservation and the experimental objective."""
import unittest
import torch
from torch import nn
from qwen_shared_core import QwenLoRA, next_codec_loss


class SharedTests(unittest.TestCase):
    def test_zero_adapter_preserves_base_and_updates_without_changing_base(self):
        base=nn.Linear(3,4,dtype=torch.bfloat16);base.requires_grad_(False)
        layer=QwenLoRA(base);x=torch.randn(2,3,dtype=torch.bfloat16)
        self.assertEqual(next(layer.parameters()).dtype,torch.bfloat16)
        before=base.weight.detach().clone()
        self.assertTrue(torch.equal(layer(x),base(x)))
        optimizer=torch.optim.AdamW([layer.lora_a,layer.lora_b],lr=.01)
        layer(x).float().square().mean().backward();optimizer.step()
        self.assertTrue(torch.equal(base.weight,before))
        self.assertTrue(torch.any(layer.lora_b!=0))
        self.assertEqual(layer(x).dtype,torch.bfloat16)

    def test_labels_shift_once_and_ignore_text_tokens(self):
        logits=torch.tensor([[[0.,0.],[12.,-12.],[-12.,12.]]],requires_grad=True)
        labels=torch.tensor([[-100,-100,0,1]])
        loss=next_codec_loss(logits,labels)
        self.assertLess(float(loss.detach()),.001)
        loss.backward();self.assertTrue(torch.equal(logits.grad[:,0],torch.zeros(1,2)))
        with self.assertRaises(ValueError):next_codec_loss(logits,labels[:,:-1])


if __name__=='__main__':unittest.main()
