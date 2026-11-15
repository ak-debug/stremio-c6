# Stremio AK for LG C6 / webOS 26

Personal fork of [kieranbrown/stremio-webos](https://github.com/kieranbrown/stremio-webos) with selected features adapted from [jrubimf/StremioR](https://github.com/jrubimf/StremioR). Theater frontend and streaming server are from Stremio. This is an unofficial community build.

App ID: `io.github.akdebug.stremio`. Service ID: `io.github.akdebug.stremio.server`. Installs alongside the official client. Target: OLED55C6PLA, webOS 26, aarch64. Playback quality and torrent speed depend on the media, network and TV decoder.

## Choose how to use it

| Mode | TV | Mac / other computer |
| --- | --- | --- |
| TV only | Browse, download torrents and play video | Not required |
| Mac / external server | Browse and play video | Background service downloads torrents and caches to its HDD/SSD |

The TV app is installed and working. A permanent Mac service has **not** been installed/configured. You can use the TV interface in either mode; external mode does not require starting a movie on the computer. A plain NAS share is not a torrent server. Follow the [Mac server guide](docs/MAC-SERVER.md) for installation, disk-cache setup and TV connection steps.

The source is public, but inherited licensing is not yet explicit and there is no public binary release. See [release readiness](docs/RELEASE-READINESS.md) before redistributing a build as open source.

## Features

- Upstream webOS 26 detection, preferred native audio language, smaller subtitle presets and keyboard fixes.
- StremioR source grid, parsed seeder sorting and reduced animation/blur effects.
- Loading telemetry: download speed, measured upload speed, connected peers/seeders, known peers, connection limit, cumulative bytes, file-piece availability and native playable-buffer seconds when available. Press OK during playback and choose Stats to toggle the panel; Back closes it. The optional remote Info key also works.
- Playback setup under Settings → Server: standalone TV engine or a Mac/external Stremio server, consistently routed through one loopback proxy for tracks, torrents, subtitles and media.
- TV Balanced profile (100 connections; 15 MiB/s hard throttle parameter) and selectable Fast profile (200; 37.5 MiB/s), both with a 6 s peer handshake timeout. Both keep the original 45 MiB RAM ring. No flash torrent caching: nothing is written to the TV's storage.
- The TV engine starts on demand and stops when switching to external mode, when the service exits, or after two minutes with no proxy traffic and no active media requests.
- Separate loopback ports: frontend 8082, backend 11479. Bundled server upload-stat fix, connected-seeder count and enabled HLS-v2 route. Direct playback remains preferred; TV software transcoding of 4K is not a performance target.
- Discover servers in Playback setup: cancellable local IPv4 search for compatible HTTP Stremio servers on port 11470. Select a verified result to fill the address; saving is explicit. Custom ports/HTTPS-only endpoints remain available through manual entry.
- Keep downloading while paused on a disk-cached external server, including during the normal TV screensaver. Complete one-byte keep-alive requests keep the torrent active on the Mac; playback/navigation stops this lease. This uses ordinary server cache, not a permanent Downloads library. See [pause and cache behavior](docs/RELEASE-NOTES-1.1.3.md).
- The TV reads ahead of the player into memory in both modes: up to about 190 MiB from a Mac (3 segments of 16 MiB in flight) and 160 MiB from the TV engine (2 of 8 MiB), always leaving 200 MiB of TV memory free. Stats shows "TV read-ahead". See [1.1.8–1.3.0 notes](docs/RELEASE-NOTES-1.1.8.md).
- Mac mode pre-downloads up to 6 GiB ahead into the Mac's disk cache once the TV buffer is full or playback is paused, with one-byte piece requests (Stats: "Mac pre-downloaded").
- A playing stream that falls behind the download recovers in the app's player ("Download fell behind · buffering") instead of handing off to the LG media player.
- Leaving the player frees its buffers at once and stops its torrents about 1.5 s later; otherwise torrents stop 2 minutes after their last request, so leaked requests cannot slow the server.
- Torrent files are prepared before playback (MP4 index at end of file, opening video), with in-app retries before the LG media player hand-off. See [1.1.6 notes](docs/RELEASE-NOTES-1.1.6.md).
- One shared `/tracks/` lookup per stream, and no core-state polling during playback. See [1.1.4 notes](docs/RELEASE-NOTES-1.1.4.md).
- Checksummed frontend/server/FFmpeg, fail-fast patches, syntax validation, proxy tests and IPK timestamp validation.

## Build and install

Requires Python 3, Node 20+, curl, patch, ar, and `@webos-tools/cli@3.2.6`. Node 24 is used in CI. The compatibility shim also supports the newer Node installed on the development Mac.

```sh
npm install -g @webos-tools/cli@3.2.6
make package
make deploy DEVICE=lgtv
```

Configure your TV in Developer Mode using LG's CLI first. `make deploy` installs and launches; it does not authenticate to a Stremio account. On first launch choose TV or Mac server, save, then sign in normally. Renew the Developer Mode session before expiry.

Generated output: `io.github.akdebug.stremio_1.1.8_all.ipk`. Download caches are under `.build/downloads`; frontend/server/binaries are generated under `service/`. Never edit generated bundles to make persistent changes; use `patches/` or `scripts/build.py`.

## HDD / SSD and the M2 MacBook Air

For disk caching attach the drive to the Mac, not the TV. LG's [developer guidance](https://forum.webostv.developer.lge.com/t/webos-internal-storage-and-usb/27902) says ordinary TV apps cannot access USB. This Developer Mode build does not request root or modify platform permissions.

Run the official desktop Stremio streaming service on the Mac. Use the desktop build; the bundled webOS server disables disk caching. Give the Mac a DHCP reservation and allow local network/firewall access. In TV Playback setup choose Mac / external server and enter `http://MAC-LAN-IP:11470`, or the exact remote HTTPS endpoint generated by desktop Stremio. The Mac must remain awake. Do not forward these server ports to the public internet.

Choose the external drive as the cache location in the desktop server settings when available. HDD sequential speed is usually sufficient for film playback; SSD is quieter and handles seeks better. Check the drive is writable on macOS, retain free space for the active media file and OS, and never format an existing drive just for this app. Stremio's cache-size selection is not a strict disk quota.

For the built-in TV speakers start with 4K HEVC Main10 + DD+/E-AC3 audio. Test Dolby Vision with the TV indicator; a filename tag does not establish supported profile/container or successful DV output. Full disc remuxes may exceed LG's published [60 Mbps HEVC webOS 26 compatibility envelope](https://webostv.developer.lge.com/develop/specifications/video-audio-260). Serving from the Mac preserves original media only when no video transcode is needed.

## Validation

`make check` tests remote-address validation, Range/media streaming, POST forwarding, static revalidation, config persistence/origin checks and cancellation when the player disconnects. `make build` verifies downloads and checks all generated JavaScript syntax. `make package` checks IPK tar timestamps.

See [device validation](docs/DEVICE-VALIDATION.md) for actual on-TV observations and remaining playback checks. No build can guarantee uninterrupted live torrent playback from an underperforming swarm.
