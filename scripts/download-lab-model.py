"""Download the pinned public OpenVINO conversion, without remote Python code."""
from pathlib import Path
import os, json
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['DO_NOT_TRACK'] = '1'
from huggingface_hub import snapshot_download
revision = '220761e60602a5ca694c409d5f424563b75d6820'
target = Path(__file__).resolve().parents[1] / 'models' / 'whisper-large-v3-fp16-ov'
snapshot_download('OpenVINO/whisper-large-v3-fp16-ov', revision=revision, local_dir=target)
(target / 'dicta-manifest.json').write_text(json.dumps({'repository':'OpenVINO/whisper-large-v3-fp16-ov','revision':revision}), encoding='utf-8')
print('Modelo descargado:', target)
