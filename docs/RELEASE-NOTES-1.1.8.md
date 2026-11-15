# 1.1.7 / 1.1.8 — TV read-ahead; stop leaked torrents on the Mac server

## Problem

Long 4K sessions buffered even though the file was already downloaded on the Mac. Measured on the owner's C6 (wired) with the external Mac server, during Resident Evil (2026) 4K DV MP4, 16.8 GB, about 24 Mbit/s average:

- The webOS native player only buffers about 8–10 s ahead. Any stall on the server side shows up as buffering.
- Stremio's server (4.20.x EngineFS) leaks one never-closed stream and selection for every `HEAD` request and every media request aborted mid-transfer. A small closed range that completes does not leak. Leaked streams keep the torrent "active", so the server's own 2-minute engine timeout never fires. The torrent keeps downloading the whole file in the background, and leaked selections pile up.
- After a session with retries, seeks and paused-download keep-alives (a `HEAD` every 20 s), the torrent had 96 selections. The server took 1.4–4.2 s to answer `/settings` (normally 0.02–0.08 s). Video delivery dropped to 0.02–0.35 MB/s although the network was fine: TCP connect took 7–80 ms, and the TV had received 10 MB/s minutes earlier. A second, unwatched 20.58 GB torrent from earlier testing was also still downloading.
- Restarting the engine (`/<infoHash>/remove`, cached data kept) brought the torrent back to 2 selections and answers back to 0.02–0.08 s. The 1.1.7 read-ahead then refilled to about 192 MiB and playback ran at real time with no `waiting` events.

The Mac server's `btMaxConnections` was also lowered from 200 to 100 to reduce server CPU load. The download speed limits and the 30 GB cache are unchanged.

## Changes

- **TV read-ahead (1.1.7, `service/read-ahead.js`).** In Mac-server mode, the TV service reads the playing file ahead of the native player into memory. It holds up to 192 MiB, about 60 s at 24 Mbit/s, and always leaves 200 MiB of TV memory free; the minimum is 32 MiB. Reconnects to the same position join the buffer, and skips start a new one. Small closed index probes pass straight through. Lost connections retry up to 5 times.
- **Leak-free requests (1.1.8).** The read-ahead fetches fixed 16 MiB ranges that always complete; a skip lets the in-flight range finish and discards it. The paused-download keep-alive sends a complete one-byte `GET` instead of `HEAD`. The prepare step no longer cuts off completed ranges.
- **Engine cleanup (1.1.8, `service/engine-cleanup.js`).** The proxy counts TV requests per torrent. Two minutes after the last one closes, it asks the Mac server to stop that torrent; its cached data stays. Torrents held by the paused-download keep-alive are skipped. As a safety net, if a torrent in use builds up 40 or more leftover selections, it is restarted, at most once every 10 minutes and only while the TV has at least 48 MiB read ahead to cover the reconnect. Recent actions appear in `/ak/status`.
- **Stats.** The player stats show "TV read-ahead … MiB (~N s)" alongside the native player's own playable buffer.

## Tests

24 automated tests: exact bytes through the read-ahead from the start and after a seek, filling to the limit and stopping, closed segments only, small probes passed through, reconnecting after a dropped connection, cleanup after playback with a new request cancelling it, paused-download keep-alive exemption, and rate-limited leak refresh.

## 1.1.9 — Recover in-app when a playing torrent falls behind

On The Odyssey (2026), a 39.3 GB UHD BDRip MKV, the Mac downloaded 2.5–6.5 MiB/s from 3–18 peers, below the file's ~3.8 MB/s average bitrate. The read-ahead emptied, and the native player raised a media error after it starved. After two in-app retries, the upstream code handed the stream to LG's media player.

- Once a stream has played, media errors 3/4 are treated as the download falling behind. The player retries in-app up to 30 times and never hands off to the LG media player. Before each reload, it waits up to 90 s until the service has 48 MiB read ahead from where playback stopped. The status reads "Download fell behind · buffering X / 48 MiB". Streams that never played keep the 1.1.6 behaviour: prepare, two retries, then hand-off.
- A read-ahead buffer that has served at least 64 MiB keeps filling for 90 s after its player disconnects, and keeps 32 MiB already played, so a reloading player resumes from memory. Re-reads of the first 64 MiB (the header a reloading player fetches) no longer discard it. Other idle buffers are freed after 15 s.

25 automated tests, including resuming from the buffer after a reconnect.
