#!/usr/bin/env python3
"""Configure disk caching on an already-running Stremio desktop/service backend."""
import argparse
import json
from pathlib import Path
import shutil
import urllib.error
import urllib.request


def request(method, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request('http://127.0.0.1:11470/settings', data=data,
                                 headers={'Content-Type': 'application/json'}, method=method)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', required=True, help='Cache folder on an attached, writable disk')
    parser.add_argument('--cache-gib', type=int, default=10, help='Nominal cache target in GiB (default: 10; not a strict disk quota)')
    parser.add_argument('--check-only', action='store_true', help='Validate and print the proposed settings without changing anything')
    args = parser.parse_args()
    if not 1 <= args.cache_gib <= 1024:
        parser.error('--cache-gib must be between 1 and 1024')
    supplied = Path(args.cache_dir).expanduser()
    if not supplied.is_absolute():
        parser.error('--cache-dir must be an absolute path')
    destination = supplied.resolve()
    if str(supplied).startswith('/Volumes/'):
        parts = supplied.parts
        if len(parts) < 4 or not Path('/Volumes', parts[2]).is_mount():
            parser.error('The external volume is not mounted. Attach it first; no fallback folder will be created.')
    parent = destination
    while not parent.exists():
        parent = parent.parent
    if not parent.is_dir():
        parser.error('The cache parent is not a directory')
    target = args.cache_gib * 1024**3
    if shutil.disk_usage(parent).free < target + 5 * 1024**3:
        parser.error('Keep at least the selected cache target plus 5 GiB free; active files may require more.')
    before = request('GET').get('values', {})
    if not before.get('serverVersion'):
        parser.error('No compatible Stremio streaming server is running on this Mac')
    settings = {'cacheRoot': str(destination), 'cacheSize': target}
    print('Server:', before['serverVersion'])
    print('Proposed cache settings:', json.dumps(settings))
    if args.check_only:
        print('Check only: nothing changed.')
        return
    destination.mkdir(parents=True, exist_ok=True)
    probe = destination / '.stremio-ak-write-check'
    with probe.open('x') as stream:
        stream.write('write check')
    probe.unlink()
    result = request('POST', settings)
    if not result.get('success'):
        raise RuntimeError('The server did not accept the cache settings')
    after = request('GET').get('values', {})
    if Path(after.get('cacheRoot', '/')).resolve() != destination or after.get('cacheSize') != target:
        raise RuntimeError('The server did not retain the requested settings')
    print('Cache settings saved. Stop any existing stream before starting a new one on the TV.')
    print('The nominal cache target is not a disk quota; allow room for the complete active file.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, RuntimeError, urllib.error.URLError) as error:
        raise SystemExit(f'Configuration failed: {error}')
