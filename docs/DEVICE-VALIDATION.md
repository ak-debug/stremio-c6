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

## Update 1.1.2 — on-screen Stats and actual 4K HDR observation

Installed 1.1.2 with a Stats button in the existing playback controls. On the owner's working stream, a live test opened the panel and closed it with Back; media source and route remained identical, playback advanced, and paused state remained false. The native player reported 3840×2160. All nine automated tests, generated JavaScript syntax checks and archive timestamp checks passed.

## 1.1.3 — pause downloads and exact-source restart test

Installed the packaged 1.1.3 build after 13 automated tests, generated JavaScript checks and IPK timestamp verification passed. No software was installed on the Mac and no remote server settings were changed.

The owner explicitly chose Torrentio 4K HDR / Rutracker, listed as 24.01 GB (server file length 25,777,506,350 bytes). Captured that exact torrent/file and the 1360.977-second position, closed the app, installed the update and relaunched. Clicked The Odyssey in the normal Continue Watching row, then its Continue Watching option. Torrent hash, file index, movie and video identifiers all matched the captured source. Playback loaded at 3840×2160 and 1361.916 seconds. No source-order or separate history-section patch was required.

Paused at 1373.962 seconds. The external-server pause lease activated and returned successful HEAD requests. Over 210 seconds, the movie stayed paused at the same position; engine presence remained true in every sample; the downloaded counter rose from 1,030,686,766 to 1,632,241,710 bytes and file-piece availability rose from 3.978% to 6.307%. The owner confirmed the screensaver was showing; downloading continued during it, rising from 1,482,803,246 to 1,632,241,710 bytes in subsequent samples without reset. Normal screensaver policy was retained.

After the owner woke the TV and pressed Play, the pause-only lease was inactive, playback was unpaused and advancing (1385.550 to 1386.554 seconds), the same torrent/file remained selected and the native video was 3840×2160, readyState 4, with no media error. The external backend remained selected and the local TV torrent engine was off.

This validates this TV/server/source combination over a short pause/screensaver cycle. It does not establish permanent cache retention, a durable full-movie Downloads library, indefinite background operation if webOS suspends the UI, or all-source compatibility.

Before installation, live playback inspection reported 3840×2160 native/direct HEVC playback with no media error. The owner checked the LG Picture menu and confirmed HDR mode. This verifies 4K decode plus user-observed HDR activation for that particular stream. It does not verify Dolby Vision, a particular bit depth, source authenticity/mastering, AV sync, long-session memory behavior or frame-drop rate; the platform's frame counters returned unusable zero totals. The detailed pipeline query was denied by the TV.

An attempted maintenance restore of a saved pre-update route did not successfully restore the working stream and showed a player error. The owner selected a working source manually. That source was then preserved during all Stats tests and the maintenance checkpoint removed. Its torrent hash/file index matched the TV's local saved stream-history entry. No claim of successful automatic exact-source reopening is made.

## 1.1.4 — track lookup and polling fixes; Mac Fast profile

Installed 1.1.4 over SSH with the developer key, because Homebrew Node on the development Mac was blocked from the LAN (EHOSTUNREACH for every local address while `curl`/`nc` worked). That breaks the `ares-*` tools until macOS Local Network access is allowed for Node. Launch required `luna-send-pub -i`; `-n 1` printed nothing.

Continue Watching → The Odyssey resumed the 25,777,506,350-byte source at 1094.9 s in native 3840×2160, readyState 4, no media error, about 2 seconds after selection. Four native audio tracks produced one `/tracks/` request. The Mac engine used the new 200-connection profile, but only 10–17 peers connected (67 known), giving about 0.7–3.4 MiB/s; this swarm is now the limit. The pause lease activated after the owner paused and the Mac kept downloading. See [1.1.4 notes](RELEASE-NOTES-1.1.4.md).

## 1.1.5 / 1.1.6 — "Video is not supported" on MP4 torrents; wired TV

Reproduced the LG media player hand-off with Resident Evil (2026) 4K iTunes MP4 releases. The native player raised error 4, Stremio code 83, while a cold torrent was still fetching an index stored at the end of the file. The same file type played in-app once warm. 1.1.5 prepared the 19.4 MiB end-of-file index in about 36 s, but the player still timed out after 40 s per attempt without the opening video data. It played in-app at 3832×1600 on the fourth attempt, with no hand-off. 1.1.5's retry counter never stopped; 1.1.6 fixes that and also prefetches the opening 16 MiB. 1.1.6 is installed. Its full cold-start playback test is still pending.

Cached-data delivery from the Mac server rose from 3.2–4.5 MB/s with the TV on Wi-Fi to 7.7–9.1 MB/s with the TV wired (now 192.168.0.102). The TV proxy added no measurable overhead. A Wi-Fi computer measured 1.8–6.9 MB/s from the same server, so the server's Wi-Fi link is the likely next limit for high-bitrate remuxes.

## 1.1.7 / 1.1.8 — Buffering with the file already on the Mac

During Resident Evil 4K at about 31%, the Mac had the file downloaded without gaps up to about 77%, and the TV was wired. 1.1.7's read-ahead filled to its 192 MiB limit, then drained when Mac delivery fell to 1–1.8 MB/s, and later to 0.02–0.35 MB/s. TCP connect to the Mac took 7–80 ms, but `/settings` took 1.4–4.2 s: the Stremio server was overloaded by 96 leaked selections on the torrent. Requests to the live server confirmed the leak: a `HEAD` and an aborted open range each added a selection, a completed 64 KiB closed range did not, and none expired after 35 s. Removing and recreating the engine dropped it to 2 selections with progress kept (78.6%) and `/settings` at 0.02–0.08 s. The read-ahead then refilled to about 192 MiB, and a 20 s in-page sample showed 1 s of playback per second with no `waiting` events. 1.1.8 removes the leaking request patterns and stops torrents after playback.

1.1.8 installed and verified: the Mac server (4.22.4) answered in 0.02–0.1 s with settings kept (100 connections, 30 GiB cache). Cached delivery to the TV ran at 10.7–10.9 MB/s. The cleanup stopped a test torrent by itself about 2 minutes after its last TV request; the log shows "stopped after playback".

## Soft speed limit capped cold 4K torrents

On The Odyssey (2026) 4K UHD BDRip, a single 39.3 GB file of 2 h 52 min (about 3.8 MB/s average), the 1.1.8 read-ahead filled to about 206 MB (~57 s), then drained. Loopback and LAN delivery were fine. The torrent was fresh, and the Mac downloaded it at about 5 MiB/s from 12 of 265 known peers. EngineFS `updateSwarmCap` pauses the swarm, so it stops adding peers, when download speed is above `btDownloadSpeedSoftLimit` (4 MiB/s) and more than `btMinPeersForStable` (10) peers are unchoked. The Mac's soft limit was raised to 16 MiB/s (16777216). It only applies to newly created engines, so the engine was restarted. The swarm then stayed unpaused, but speed only reached 4.9–6.5 MiB/s from 3–18 peers. Every observation so far tops out at about 5–6.5 MiB/s in total (two torrents at about 2.5 MiB/s each earlier), which points at the swarm or the Mac's internet or Wi-Fi link rather than the LAN.

## 1.2.0 on device

On the 30.7 GB Odyssey source (MUSHR00M), with the Mac at 200 connections and a 6 s handshake timeout, the player advanced 44.4 s in 45 s of wall time with no stalls. Its own buffer held 10–13 s, and the TV read-ahead held steady at 92–104 MiB, where 1.1.9 had sat at 0. The Mac had three stream-priority windows open, one per in-flight segment, about 96 pieces of 512 KiB. It downloaded at 2–3 MiB/s from 13–52 peers, trying about 67 connections a second. Mac pre-download had not started, because the TV buffer never reached its limit, as designed.
