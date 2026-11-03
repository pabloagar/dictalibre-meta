"""Small explicit LoRA layers. No downloaded trainer or implicit model mutation."""
import math
import torch
from torch import nn
from torch.nn import functional as F


class LoRALinear(nn.Module):
    def __init__(self, base, rank=8, alpha=16):
        super().__init__()
        self.base = base
        self.base.requires_grad_(False)
        self.scale = alpha / rank
        self.lora_a = nn.Parameter(torch.empty(rank, base.in_features, device=base.weight.device))
        self.lora_b = nn.Parameter(torch.zeros(base.out_features, rank, device=base.weight.device))
        nn.init.kaiming_uniform_(self.lora_a, a=math.sqrt(5))

    def forward(self, x):
        return self.base(x) + F.linear(F.linear(x, self.lora_a), self.lora_b) * self.scale


def attach(model, rank=8, alpha=16):
    model.requires_grad_(False)
    names = []
    for name, module in list(model.named_modules()):
        if isinstance(module, nn.Linear) and name.split('.')[-1] in ('q_proj', 'v_proj'):
            parent_name, attr = name.rsplit('.', 1) if '.' in name else ('', name)
            parent = model.get_submodule(parent_name) if parent_name else model
            setattr(parent, attr, LoRALinear(module, rank, alpha))
            names.append(name)
    if not names:
        raise ValueError('no_lora_targets_found')
    return names


def adapter_state(model):
    return {n: p.detach().cpu().clone() for n, p in model.named_parameters() if p.requires_grad}


def load_adapter(model, state):
    expected = {n for n, p in model.named_parameters() if p.requires_grad}
    if set(state) != expected:
        raise ValueError('adapter_keys_mismatch')
    with torch.no_grad():
        for name, param in model.named_parameters():
            if name in state:
                if param.shape != state[name].shape or not torch.isfinite(state[name]).all():
                    raise ValueError('adapter_invalid:' + name)
                param.copy_(state[name])


def speech_loss(logits, full_tokens):
    # Input is BOS,t0,...,tn; target is t0,...,tn,EOS. Predict next, not same token.
    targets = full_tokens[:, 1:]
    if logits.shape[:2] != targets.shape:
        raise ValueError('speech_target_shape_mismatch')
    return F.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))
