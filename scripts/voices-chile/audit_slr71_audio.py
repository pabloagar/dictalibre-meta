"""Download official archives for local inspection only, never synthesis or training."""
import argparse
import hashlib
import io
import time
import urllib.request
import zipfile
from pathlib import Path
import numpy as np
import soundfile as sf
import pilot


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--archives', nargs='+', help='Audit already downloaded ZIPs without network')
    parser.add_argument('--mirror', choices=['https://openslr.trmal.net', 'https://openslr.elda.org'], default='https://openslr.elda.org')
    args = parser.parse_args()
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=False)
    start = time.perf_counter()
    records, archives = [], []
    try:
        inputs = [Path(p) for p in args.archives] if args.archives else [root/n for n in ('es_cl_female.zip', 'es_cl_male.zip')]
        for dest in inputs:
            name = dest.name
            url = args.mirror + '/resources/71/' + name
            if not args.archives:
                with urllib.request.urlopen(url, timeout=60) as response, dest.open('wb') as out:
                    while chunk := response.read(64*1024):
                        out.write(chunk)
            archives.append({'url': None if args.archives else url, 'local_archive': str(dest.resolve()),
                             'sha256': pilot.sha(dest), 'bytes': dest.stat().st_size})
            print('DOWNLOADED', name, dest.stat().st_size, flush=True)
            with zipfile.ZipFile(dest) as z:
                for item in z.infolist():
                    if not item.filename.lower().endswith('.wav'):
                        continue
                    raw = z.read(item)  # CRC checked by zipfile; never extract untrusted paths.
                    row = {'archive': name, 'member': item.filename,
                           'sha256': hashlib.sha256(raw).hexdigest()}
                    try:
                        x, rate = sf.read(io.BytesIO(raw))
                        row.update(pilot.inspeccionar(np.asarray(x), rate), sample_rate=rate)
                    except Exception as e:
                        row.update(estado='decode_error', error=str(e), duracion_audio=None)
                    records.append(row)
            pilot.guardar(root/'audio_inventory.json', records)
        pilot.guardar(root/'audit.json', {'archives': archives, 'files': len(records),
            'audio_seconds': sum(r['duracion_audio'] or 0 for r in records),
            'technical_ok': sum(r['estado'] == 'ok' for r in records),
            'short_clip_candidates': sum(r['estado'] == 'ok' and 1 <= r['duracion_audio'] <= 12 for r in records),
            'wall_seconds_download_and_audit': time.perf_counter()-start,
            'listening_review': None, 'rights_for_training_verified': False,
            'training_executed': False, 'instrumentation_overhead_seconds': None})
        print((root/'audit.json').read_text(encoding='utf-8'), flush=True)
    except BaseException as e:
        pilot.guardar(root/'failure.json', {'error': str(e), 'archives': archives,
            'files_audited': len(records), 'elapsed_seconds': time.perf_counter()-start})
        raise


if __name__ == '__main__':
    main()
