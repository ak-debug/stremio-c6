# OLED55C6PLA validation

Date: 15 November 2026. Target: LG OLED55C6PLA, webOS SDK 11.2.0, firmware 43.21.98, aarch64, Chromium 132, Node.js 20.12.2. App `io.github.akdebug.stremio`, version 1.1.0.

## Verified

- IPK built with `@webos-tools/cli@3.2.6`; all archive-member timestamps positive; bundled FFmpeg and FFprobe have mode 0755 and execute on the TV.
- All pinned source patches apply with zero fuzz; all generated JavaScript passes syntax checks; three proxy tests pass (configuration validation, streaming/Range/POST/static/persistence/origin behavior, and cancellation).
- Installation and launch succeed. The first-run setup screen fits the 1920×1080 UI, has visible focus, and the TV connection test returns server 4.20.17 with cacheSize 0.
- User signed in through the TV link flow. Sign-in survived app updates and a real power restart. Home UI and imported picker helpers load.
- Source helper sorts a synthetic list with reported seed counts 70, 2 and unknown into that order and renders quality/language/file details.
- With the final URL normalization fix, observing the app for 6.5 seconds recorded zero unsolicited settings updates or streaming-server reloads.
- Generated a 3-second 1280×720 H.264 test-pattern video. Native TV playback advances without a decoder error.
- Created a private test torrent for that generated pattern and served it from a temporary LAN tracker/seeder. The TV torrent engine downloaded all 2,370,439 bytes; SHA-256 matched the original. Stats reported one connected peer, one connected seeder, and a 47,185,920-byte (45 MiB) memory ring.
- Opened that torrent in the actual Stremio player: 1280×720, duration 3 s, playback time advancing, no media error. The loading/Info telemetry showed speeds, peers, seeder count, downloaded bytes, available file pieces and playable-buffer seconds. File progress is labeled separately from buffer duration.
- The enabled HLS-v2 master endpoint returned HTTP 200 and an `#EXTM3U` playlist for the generated clip. This is a playlist/probe check, not a 4K transcoding or HDR-preservation test.
- Switched to an external LAN test endpoint: localRunning became false; the TV proxy returned the correct 206 Range response and bytes. The TV played the generated video through this external route, without a decoder error. This validates external routing, not a production Mac torrent server or its disk cache.
- Switched back to standalone TV / Balanced mode after testing. The temporary external endpoint is not the saved playback server.

## Startup issue found and corrected

An early development build spawned a backend child process without shutdown handling. During an update the child survived its parent and held the service name/port. Standby did not clear it; TV uptime and unchanged PID confirmed this. A physical power disconnect cleared the early process.

The corrected build kills the backend on parent exit/service shutdown and gives the backend its own parent-PID watchdog. A subsequent package update with the corrected backend running was followed by a successful launch and torrent playback, without another power reset.

Additional source fixes correct the bundled server's uploadSpeed expression and its seeder check: wire bitfield arrays can include byte-padding slots, so their length must be at least the torrent piece count rather than exactly equal.

## Remaining playback checks

No claims of buffer-free internet torrents, a particular throughput ceiling, long-session memory stability, 4K decode, HDR10/Dolby Vision activation, Atmos output, language selection across real multi-track files, or subtitle format compatibility have been established by the short synthetic tests. Test these on representative content on the TV. The user currently uses the built-in speakers.

The Mac production background service and external HDD/SSD cache have not been installed/configured. The user can operate entirely from the TV interface once a compatible background server is running; a NAS shared folder alone cannot download live torrent pieces.

No TV root or USB permission changes were made. USB disk caching is not exposed in this Developer Mode build. HDD/SSD caching belongs on the Mac/server.

## Update 1.1.1 — server discovery

Installed and launched 1.1.1 on the same C6. All nine automated tests and IPK timestamp checks pass. The TV's own network search enumerated 253 nearby addresses and found both a temporary HTTP metadata fixture and a separate live Stremio 4.22.4 server. The fixture did not contain a torrent engine or download/cache any content and was removed after testing.

The new Playback setup screen fits the 1920×1080 viewport with discovery results and Save controls visible. Selecting a result populated the URL without changing saved TV-only mode. The Stop control aborted a subsequent search after 13 of 253 checks. The existing TV backend connection check still returned server 4.20.17 with cacheSize 0. No new torrent playback or personal-server configuration was performed for this update.

Search verifies compatible settings responses on HTTP port 11470. It does not claim to find HTTPS-only, custom-port, IPv6-only or isolated/routed servers; manual entry remains available. Discovery results do not identify whether a computer is personal or corporate—choose an appropriate machine yourself before saving.
