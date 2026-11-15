# Stremio AK 1.1.0 — community test build

Unofficial webOS client fork based on kieranbrown/stremio-webos with selected source-picker and telemetry work adapted from jrubimf/StremioR. Stremio provides the Theater frontend and streaming server; FFmpeg provides the bundled media tools.

## Included

- Upstream webOS 26 detection, native audio-language, subtitle-size and keyboard fixes.
- Source grid, reported-seeder sorting and reduced UI effects.
- Torrent loading/Info telemetry with speeds, connected peers/seeders, known peers, connection limit, available file pieces and separate playable-buffer seconds.
- Standalone TV mode with Balanced/Fast profiles and the existing 45 MiB memory ring.
- External-server mode for a Mac, PC or NAS running a compatible Stremio backend. Disk cache is configured on that server; USB caching on the TV is not included.
- Corrected upload/seed statistics, dedicated loopback ports, HLS-v2 playlist path and backend cleanup on service exit.

## Tested

OLED55C6PLA, webOS SDK 11.2.0, firmware 43.21.98. Installation, account linking, restart/update, a real LAN torrent transfer with matching file hash, integrated 720p test-pattern playback, live telemetry, HLS master playlist response and external-server video/Range routing passed.

4K Dolby Vision, long-session memory behavior, actual internet-swarm reliability and permanent Mac external-disk caching have not been validated. This is not an official Stremio or LG release.

## Install and Mac support

See [build/install instructions](https://github.com/ak-debug/stremio-c6#build-and-install), [Mac server guide](https://github.com/ak-debug/stremio-c6/blob/main/docs/MAC-SERVER.md) and [device validation](https://github.com/ak-debug/stremio-c6/blob/main/docs/DEVICE-VALIDATION.md).

## Draft status

Not ready for public binary distribution: inherited licensing and bundled-component redistribution/source requirements remain to be established. See [release readiness](https://github.com/ak-debug/stremio-c6/blob/main/docs/RELEASE-READINESS.md). No new blanket license is asserted over inherited code.
