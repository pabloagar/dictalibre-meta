"""Experimental shared Qwen adapter and explicit next-token objective."""
import torch
from torch import nn
from torch.nn import functional as F


class QwenLoRA(nn.Module):
    def __init__(self, base, rank=8, alpha=16):
        super().__init__()
        self.base = base
        self.scale = alpha / rank
        self.adapter = nn.Module()
        self.adapter.lora_a = nn.Parameter(torch.empty(rank, base.in_features, device=base.weight.device))
        self.adapter.lora_b = nn.Parameter(torch.zeros(base.out_features, rank, device=base.weight.device))
        nn.init.kaiming_uniform_(self.lora_a, a=5 ** .5)

    @property
    def lora_a(self):
        return self.adapter.lora_a

    @property
    def lora_b(self):
        return self.adapter.lora_b

    def forward(self, x):
        original = self.base(x)
        update = F.linear(F.linear(x.to(self.lora_a.dtype), self.lora_a), self.lora_b)
        return original + (update * self.scale).to(original.dtype)


def attach(talker):
    talker.requires_grad_(False)
    targets = []
    for name, module in list(talker.model.named_modules()):
        if isinstance(module, nn.Linear) and name.split('.')[-1] in ('q_proj', 'v_proj'):
            parent, attr = name.rsplit('.', 1)
            setattr(talker.model.get_submodule(parent), attr, QwenLoRA(module))
            targets.append('model.' + name)
    if len(targets) != 56:
        raise ValueError('unexpected_qwen_1b7_targets:' + str(len(targets)))
    return targets


def next_codec_loss(logits, full_labels):
    # Inputs omit the final token. Shift labels exactly once here, never in the model.
    labels = full_labels[:, 1:]
    if logits.shape[:2] != labels.shape or not (labels != -100).any():
        raise ValueError('invalid_next_codec_alignment')
    return F.cross_entropy(logits.float().reshape(-1, logits.shape[-1]), labels.reshape(-1))


def embeddings(talker, batch, speaker_embedding):
    with torch.no_grad():
        ids = batch['input_ids']
        text = talker.model.text_embedding(ids[:, :, 0]) * batch['text_embedding_mask']
        codec = talker.model.codec_embedding(ids[:, :, 1]) * batch['codec_embedding_mask']
        codec[:, 6, :] = speaker_embedding
        result = text + codec
        for i, layer in enumerate(talker.code_predictor.get_input_embeddings()):
            result = result + layer(batch['codec_ids'][:, :, i+1]) * batch['codec_mask'].unsqueeze(-1)
    return result[:, :-1, :].detach().requires_grad_(True)
