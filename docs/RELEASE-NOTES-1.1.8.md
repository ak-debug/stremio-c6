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

## 1.2.0 — Keep the server busy on what plays next

- **Several segments in flight.** The read-ahead keeps 3 closed 16 MiB requests open at once instead of one, so Stremio's stream-priority window covers about 48 MiB ahead. Previously the window shrank to a few pieces at the end of each segment, and idle peers were put to work on Stremio's whole-file background download, which starts at the file's first missing piece, behind the player when resuming. Segments still complete normally and are delivered in order.
- **Pre-download on the Mac (`service/server-ahead.js`).** Once the TV buffer is full, or while paused under the paused-download lease, the service sends one-byte requests, one per piece and up to 24 MiB in flight, up to 6 GiB past the player. Each completes once the Mac has the piece, so the data lands in the Mac's disk cache without leaking streams or using TV memory. The piece size is derived from the server's selections in `/stats.json`. Stats shows "Mac pre-downloaded … (~N min)".
- **Mac settings:** `btMaxConnections` 200 and `btHandshakeTimeout` 6000 ms (default 20000). A peer that never completes a handshake now frees its slot after 6 s. Stremio's server never listens for incoming peer connections (`engine.listen` is never called), so port forwarding, UPnP and DMZ cannot help.

On device: the 30.7 GB Odyssey source played 44.4 s in 45 s with the TV read-ahead steady at 92–104 MiB, and the Mac downloading at 2–3 MiB/s from 13–52 peers. 28 automated tests.

## 1.2.1 — Review fixes

- Pre-download backs off for 30 s after 5 failed piece requests in a row, for example while the server restarts a torrent, then resumes. Before, it stopped for the rest of the session. A failed piece is requested again, and the "Mac pre-downloaded" figure stops at it rather than skipping past it.
- The read-ahead's 5-second check also nudges pre-download, so it resumes while the player is paused and no other events arrive.
- Stats marks the TV read-ahead as "full" when it has reached its memory limit.

29 automated tests, including pre-download recovering from failed pieces.

## 1.3.0 — Better TV mode, and free everything on leaving the player

Measured in TV mode on The Odyssey (30.7 GB): the TV downloaded 0.1–1.4 MiB/s, with 21 peers connected and 3 sending, against about 2.8 MiB/s needed. It had 406–434 MB of memory available, 207 MB of swap free and its processor 20–30% busy. Memory was not the limit; the download was.

- **TV peer settings:** both TV profiles use a 6 s handshake timeout instead of 20 s, as on the Mac, so slots held by dead peers free up sooner.
- **Read-ahead in TV mode, in memory only:** up to 160 MiB, always leaving at least 200 MiB of TV memory free. It requests 2 closed 8 MiB segments at a time to suit the TV server's 45 MiB memory ring, and never asks the TV server to pre-download. Nothing is written to disk. "Download fell behind" recovery now works in TV mode too.
- **Leaving the player clears everything:** the app tells the service (`POST /ak/leave`), which frees all read-ahead buffers at once and, about 1.5 s later, stops every torrent whose requests have closed, in both TV and Mac mode. In TV mode the 2-minute cleanup also applies to the TV's own server. Torrents kept for paused downloading are skipped.

The TV's built-in storage is deliberately not used for torrent data: streaming writes the whole file, 20–40 GB per 4K movie, to flash that can't be replaced, with 2.4 GB free.

31 automated tests, including TV-mode segments and leaving the player.

## 1.3.1 — Keep the buffer while a slow torrent starts

On the TV in TV mode, The Odyssey (30.8 GB, 0.3–1.1 MiB/s from 10–32 peers) took more than 15 s to send the first bytes after resuming at 45 minutes. The read-ahead frees buffers with no player attached after 15 s, and a request still waiting for its first data has none attached yet. The buffer was freed, and the player fell back to a direct, unbuffered stream from the TV server for the rest of the session: `/ak/status` showed no readers, while the TV server had an open selection to the end of the file. Buffers that a request is still waiting on are now never freed. The tests now require every server request to be a closed range; the previous check accepted an open range `bytes=N-` as closed.
