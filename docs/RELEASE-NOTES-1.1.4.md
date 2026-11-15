# 1.1.4 — Playback performance fixes

## Mac server profile (configuration, not app code)

The owner's Mac server (official Stremio 4.22.4 at 192.168.0.103) was on Stremio's default torrent profile: 55 connections, 2.5 MiB/s soft limit and 3.5 MiB/s hard limit. In disk-cache mode the server applies the hard limit to every torrent engine as a download throttle. This is about 29 Mbit/s. The 1.1.3 pause test measured about 2.7 MiB/s, matching the cap. A 24 GB 4K film averages about 21 Mbit/s, and its peaks are higher, so playback could catch up to the download.

With the owner's approval, the server settings were changed over the LAN to Stremio's Fast values. Other settings were unchanged and the change was read back afterwards:

| Setting | Before | After |
| --- | --- | --- |
| btMaxConnections | 55 | 200 |
| btDownloadSpeedSoftLimit | 2.5 MiB/s | 4 MiB/s |
| btDownloadSpeedHardLimit | 3.5 MiB/s | 37.5 MiB/s |
| btMinPeersForStable | 5 | 10 |
| cacheSize | 2 GiB | 30 GiB |

The cache location is unchanged (the Mac's internal disk). Existing torrent engines keep their old options until recreated, so restart a stream after changing them. The cache size is a cleanup target, not a quota; keep enough free space on that disk. You can revert in Stremio desktop → Settings → Streaming.

## App changes

- **Track lookup shared per stream.** The audio-track patch fetched the server's `/tracks/` data once for every native `addtrack` event, in addition to the player's own lookup. Each lookup makes the server read the media header, which competes with the playback position for torrent pieces during startup or resume. Lookups for the same stream now share one request, and callers receive separate copies. The native track list is rebuilt once after the last `addtrack` event, not once per track.
- **Less core polling.** The streaming-server URL check serialized the WASM core's `ctx` state across the worker boundary every 2 seconds, including throughout playback. It now checks every 2 seconds until the URL is confirmed three times, then every 30 seconds and after navigation. It never checks during playback.
- **No duplicate stats polling.** The hidden loading-overlay stats panel no longer fetches `stats.json` while the visible Stats panel is open.

All patches apply with zero fuzz, the 13 automated tests pass and generated JavaScript passes syntax checks. The shared track lookup was checked against the built chunk with a stubbed fetch: five concurrent callers made one request, a later call used the cached result and a new stream URL made a new request.

## On-TV result

Installed on the C6 and resumed The Odyssey through Continue Watching (same 25,777,506,350-byte Rutracker source). Native 3840×2160 playback started about 2 seconds after selection at 1094.9 s, readyState 4, no media error. The file exposes 4 native audio tracks; the page made exactly one `/tracks/` request, where the previous patch would have made one plus one per track. The core server URL remained `http://127.0.0.1:8082/`.

The recreated Mac engine reported `swarmConnections` 200, confirming the new profile. Throughput then ranged from about 0.7 to 3.4 MiB/s with only 10–17 connected peers (67 known) and 2–6 unchoked. With connections far below the new limit, this torrent's swarm, not the server cap, now limits speed. The film needs about 2.4 MiB/s on average. After the owner paused, the pause lease was active and the Mac continued downloading at about 1–1.3 MiB/s.

`1477.chunk.js` contains a hardcoded third-party `/tracks/` host. That chunk is not in the frontend runtime's chunk map, so the webOS player does not load it.
