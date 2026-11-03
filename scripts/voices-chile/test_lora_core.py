import importlib.util
import tempfile
import unittest
from pathlib import Path

HAS_TORCH = importlib.util.find_spec('torch') is not None


@unittest.skipUnless(HAS_TORCH, 'Run with isolated CPU torch environment; no GPU required')
class LoRATests(unittest.TestCase):
    def test_only_adapter_changes_and_reload_preserves_output(self):
        import torch
        from lora_core import attach, adapter_state, load_adapter
        torch.manual_seed(4)
        model = torch.nn.ModuleDict({'q_proj': torch.nn.Linear(3, 5), 'v_proj': torch.nn.Linear(3, 5)})
        x = torch.randn(2, 3)
        baseline = model['q_proj'](x).detach()
        frozen = {k: v.clone() for k,v in model.state_dict().items()}
        attach(model, rank=2, alpha=4)
        self.assertTrue(torch.equal(baseline, model['q_proj'](x)))
        opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=.01)
        for _ in range(3):
            opt.zero_grad()
            (model['q_proj'](x).square().mean() + model['v_proj'](x).square().mean()).backward()
            opt.step()
        for key, value in frozen.items():
            module, parameter = key.split('.')
            self.assertTrue(torch.equal(value, getattr(model[module].base, parameter)))
        expected = model['q_proj'](x).detach()
        self.assertFalse(torch.equal(expected, baseline))
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'adapter.pt'
            torch.save(adapter_state(model), path)
            for name, p in model.named_parameters():
                if p.requires_grad:
                    p.data.zero_()
            load_adapter(model, torch.load(path, weights_only=True))
            self.assertTrue(torch.equal(expected, model['q_proj'](x)))

    def test_next_token_loss_alignment(self):
        import torch
        from lora_core import speech_loss
        sequence = torch.tensor([[0, 1, 2, 3]])
        logits = torch.full((1, 3, 4), -20.)
        logits[0, torch.arange(3), sequence[0, 1:]] = 20
        self.assertLess(speech_loss(logits, sequence).item(), 1e-5)
        self.assertGreater(speech_loss(logits.flip(1), sequence).item(), 1)
