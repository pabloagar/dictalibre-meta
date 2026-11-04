"""Recover an explicitly exported backup from stdout in a private Colab notebook.

Fallback for broken Colab output/download JavaScript. Never executes notebook code.
"""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path


def recover(notebook, output):
    data = json.loads(Path(notebook).read_text(encoding='utf-8'))
    stdout = ''.join(''.join(o.get('text', [])) for c in data['cells'] for o in c.get('outputs', [])
                     if o.get('output_type') == 'stream' and o.get('name') == 'stdout')
    pattern = r'SFX_TRANSFER_BEGIN_(STABLE|FAILED)\s+([A-Za-z0-9+/=\r\n]+)\s+SFX_TRANSFER_END_\1 (\d+) ([a-f0-9]{64})'
    results = []; root = Path(output); root.mkdir(parents=True, exist_ok=True)
    for label, encoded, length, expected in re.findall(pattern, stdout):
        content = base64.b64decode(''.join(encoded.split()), validate=True)
        assert len(content) == int(length) and hashlib.sha256(content).hexdigest() == expected, 'Backup size/hash mismatch'
        path = root / ('sfx-stable-result.zip' if label == 'STABLE' else 'sfx-stable-failed01.zip')
        if path.exists(): assert path.read_bytes() == content, 'Existing different backup; preserve both'
        else: path.write_bytes(content)
        results.append({'file': path.name, 'bytes': len(content), 'sha256': expected})
    if not any(r['file'] == 'sfx-stable-result.zip' for r in results):
        raise ValueError('No complete Stable backup found; notebook output may be truncated')
    session = re.search(r'SFX_SESSION_INFO (\{[^\n]+\})', stdout)
    if session: (root / 'session-info.json').write_text(json.dumps(json.loads(session[1]), indent=2), encoding='utf-8')
    return results


if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--notebook', required=True); p.add_argument('--output', required=True)
    a = p.parse_args(); print(json.dumps(recover(a.notebook, a.output)))
