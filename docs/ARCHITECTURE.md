# Architecture

## Request flow

```text
Stremio TV interface + native webOS player
                    |
          TV proxy (127.0.0.1:8082)
                    |
        +-----------+------------------+
        |                              |
 TV mode                         External mode
 Bundled backend                 Compatible Stremio server
 127.0.0.1:11479                  Selected LAN/HTTPS URL
 RAM-only media buffer           Server-managed disk cache
```

Frontend requests use the proxy's origin so media, subtitles, tracks, engine creation, and statistics all reach the selected backend. The local backend starts on demand in TV mode and stops when external mode is selected. The TV remains the viewing interface; an external server does not require starting playback on its desktop.

## Buffering and cleanup

| Setting | TV mode | External mode |
| --- | --- | --- |
| TV proxy read-ahead target | Up to 160 MiB | Up to 192 MiB |
| Parallel closed-range requests | 4 × 8 MiB | 3 × 16 MiB |
| Backend media storage | 45 MiB memory ring | Server's configured disk cache |
| Additional server-side prefetch | Disabled | Up to 6 GiB ahead |

Read-ahead adjusts to the TV's reported available system memory, with a 200 MiB reserve target and a 32 MiB minimum buffer. This is not a guarantee of 200 MiB free memory, a per-app memory measurement, or a hard cap on total process memory. Decoding, the interface, backend, retained history, and in-flight requests also consume memory.

The TV backend is configured with disk caching disabled. This prevents movie-cache accumulation on TV flash; app files, configuration, and metadata are separate. USB media caching is not implemented.

Leaving the player releases read-ahead buffers immediately and schedules engine cleanup after about 1.5 seconds. Removal waits for tracked requests to close; otherwise the idle cleanup timer is two minutes. In-flight range requests are allowed to finish and their data is discarded, avoiding a backend selection leak. Page-exit notifications are best effort.

In external mode, pausing renews a service-side lease through UI heartbeats. Completed one-byte requests keep the external engine active during an ordinary screensaver. Playback or navigation stops the lease; missing heartbeats allow it to expire. Server-side prefetch uses bounded piece probes to fill the server cache without transferring the movie body into TV RAM. Neither mechanism creates durable download jobs.

## TV profiles

| Parameter | Balanced | Fast |
| --- | --- | --- |
| Maximum connections | 100 | 200 |
| Soft download-speed threshold | 4 MiB/s | 4 MiB/s |
| Hard download-speed parameter | 15 MiB/s | 37.5 MiB/s |
| Peer handshake timeout | 6 s | 6 s |
| Request timeout | 4 s | 4 s |

These are engine settings, not promised throughput. The soft threshold affects swarm growth, and the server's throttling behavior depends on its storage mode. External servers retain their own profile and cache configuration; selecting a TV profile does not reconfigure them.

## Source map

| File | Responsibility |
| --- | --- |
| `service/launch.js` | webOS service registration and shutdown |
| `service/proxy.js` | Backend selection, profiles, request routing, lifecycle endpoints |
| `service/read-ahead.js` | RAM buffers, closed ranges, seeks, reconnects, memory budget |
| `service/server-ahead.js` | External-cache piece prefetch and retry/backoff |
| `service/paused-download.js` | Expiring external-server pause lease |
| `service/engine-cleanup.js` | Request tracking, idle cleanup, excessive-selection recovery |
| `service/prepare.js` | Header/index and initial media preparation |
| `service/discovery.js` | Bounded local server search |
| `service/ak-player.js` | Stats, preparation/recovery hooks, pause and player-exit notifications |
| `patches/` | Integration with the pinned Theater bundle |
| `scripts/build.py` | Verified downloads, patch application, backend changes, syntax checks |

The build generates `service/www/`, `service/server.js`, and `service/bin/`; these are ignored by Git. Build inputs are pinned in `scripts/build.py`. App and service versions live in `app/appinfo.json` and `service/package.json`.
