#!/usr/bin/env python3
"""Reproducible pinned downloads, fail-fast patches, and isolated TV backend."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.build/downloads'
CACHE.mkdir(parents=True, exist_ok=True)


def download(name, url, digest):
    destination = CACHE / name
    if not destination.exists():
        temporary = destination.with_suffix('.partial')
        subprocess.run(['curl', '--fail', '--location', '--retry', '3', '--silent', '--show-error', url, '-o', str(temporary)], check=True)
        temporary.replace(destination)
    if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
        raise RuntimeError(f'Checksum mismatch: {destination}. Remove this download and investigate.')
    return destination


frontend = download('frontend.tar.gz', 'https://github.com/NoobyGains/stremio-vidaa-tv/archive/208d437e5138adff0865443a2a88c4fcee84ece6.tar.gz', '1882d5aee965f7ee18353b5977ced335f05257751e83f4adc7516c5f74415bd2')
server = download('server.js', 'https://dl.strem.io/server/v4.20.17/webos/server.js', 'ecef1b5a4f67f5fd94ffc0c39e7567d6a6efdd46849ea7a2da48ccc84bd49c1d')
ffmpeg = download('ffmpeg.tar.xz', 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-7.0.2-arm64-static.tar.xz', 'f4149bb2b0784e30e99bdda85471c9b5930d3402014e934a5098b41d0f7201b1')

www = ROOT / 'service/www'
shutil.rmtree(www, ignore_errors=True)
www.mkdir()
with tarfile.open(frontend) as archive:
    for member in archive:
        parts = Path(member.name).parts
        if member.isfile() and len(parts) == 2 and Path(parts[-1]).suffix in {'.js', '.wasm', '.ttf', '.png', '.svg'}:
            (www / parts[-1]).write_bytes(archive.extractfile(member).read())
for patch in sorted((ROOT / 'patches').glob('*.patch')):
    print('Applying', patch.name, flush=True)
    subprocess.run(['patch', '--batch', '--fuzz=0', '-p0', '-d', str(www), '-i', str(patch)], check=True)
for name in ['index.html', 'setup.html', 'setup.js', 'picker.css', 'picker.js', 'ak-player.js']:
    shutil.copyfile(ROOT / 'service' / name, www / name)

binary_dir = ROOT / 'service/bin'
binary_dir.mkdir(exist_ok=True)
with tarfile.open(ffmpeg) as archive:
    for member in archive:
        if member.isfile() and Path(member.name).name in {'ffmpeg', 'ffprobe'}:
            target = binary_dir / Path(member.name).name
            target.write_bytes(archive.extractfile(member).read())
            target.chmod(0o755)
        elif member.isfile() and Path(member.name).name in {'GPLv3.txt', 'readme.txt'}:
            (binary_dir / Path(member.name).name).write_bytes(archive.extractfile(member).read())
assert all((binary_dir / name).exists() for name in ['ffmpeg', 'ffprobe'])

source = server.read_text()
def replace_once(old, new):
    global source
    if source.count(old) != 1:
        raise RuntimeError(f'Server patch anchor changed: {old[:90]}')
    source = source.replace(old, new, 1)

replace_once('uploadSpeed:e.swarm.downloadSpeed()', 'uploadSpeed:e.swarm.uploadSpeed()')
replace_once('peers:e.swarm.wires.length,', 'peers:e.swarm.wires.length,seeders:e.swarm.wires.filter(function(w){return w.isSeeder}).length,')
# Wire bitfields include padding to whole bytes; do not require their array length to equal the piece count.
replace_once('if(wire.peerPieces.length===torrent.pieces.length)', 'if(wire.peerPieces.length>=torrent.pieces.length)')
replace_once('process.env.HLS_V2_DISABLED=1,process.env.UNITY_ENV', 'process.env.HLS_V2_DISABLED="",process.env.UNITY_ENV')
replace_once('server.listen(port),server.on("error",(function(err){port++<11474?(console.warn(err),server.listen(port)):console.error(err)}))', 'server.listen(port,"127.0.0.1"),server.on("error",(function(err){console.error(err);process.exit(1)}))')
# All backend-internal loopback references must use the same dedicated port.
source = source.replace('11470', '11479')
# A forcibly killed webOS parent must not leave an orphan backend holding its port.
source = ('if(process.env.STREMIO_AK_PARENT_PID){setInterval(function(){'
          'if(process.ppid!==Number(process.env.STREMIO_AK_PARENT_PID))process.exit(0);'
          '},2000).unref();}\n') + source
(ROOT / 'service/server.js').write_text(source)
for file in [*(ROOT / 'service').glob('*.js'), *www.glob('*.js')]:
    subprocess.run(['node', '--check', str(file)], check=True, capture_output=True)
print('Pinned downloads, all patches and JavaScript syntax verified.')
