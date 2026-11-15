# Device validation

Development observations were recorded on **LG OLED55C6PLA**, webOS SDK 11.2.0, firmware 43.21.98, aarch64, Chromium 132, and Node.js 20.12.2. The bundled backend is Stremio 4.20.17; external tests also used an official desktop server 4.22.4.

These are observations across development versions, not certification of every feature on the latest build. The latest source version is 1.3.2; a fresh installed-version check and extended memory/stability run remain separate work.

## Automated verification

`make check` currently passes 32 tests covering proxy/configuration behavior, Range responses, cancellation, discovery, preparation, pause leases, read-ahead bytes/seeks/reconnects, bounded parallel requests, prefetch retries, player-exit cleanup, and slow first-byte responses. The tests run without a TV and do not measure native decoding or total app memory.

Build/package checks have also verified pinned inputs, zero-fuzz patch application, generated JavaScript syntax, executable media tools, and positive IPK archive timestamps. Run `make package` to repeat the full packaging checks for a new artifact.

## Device observations

| Area | Evidence | Scope |
| --- | --- | --- |
| Installation and lifecycle | Install, account linking, updates, restart, and backend shutdown tested | C6 development builds; not every webOS model |
| Synthetic media | Generated 3-second 1280×720 H.264 clip played in the integrated player | Short playback only |
| P2P transfer | Private LAN test transferred all 2,370,439 bytes with a matching SHA-256 | Generated fixture; not internet swarm reliability |
| Telemetry | Test reported one connected peer/seeder and a 45 MiB backend ring | Controlled fixture |
| External routing | Correct HTTP 206 bytes and native playback through a LAN backend; local engine stopped | Routing, not a permanent server installation |
| Discovery (1.1.1) | Compatible server detected; selecting a result filled the URL without saving; Stop cancelled search | Nearby IPv4 HTTP servers on port 11470 |
| Stats control (1.1.2) | Panel opened/closed while route, source, pause state, and playback were preserved | One working playback session |
| 4K HDR | Native player reported 3840×2160; TV Picture settings showed HDR mode | One source; not Dolby Vision or audio certification |
| Resume (1.1.3) | Continue Watching matched captured source/file index; position changed from 1360.977 s to 1361.916 s | One controlled restart; no history patch |
| Paused screensaver (1.1.3) | Same paused position and engine; downloaded bytes rose from about 1.03 GB to 1.63 GB over 210 s | Short external-server cycle; keep-alive later changed from HEAD to completed GET |
| Track lookups (1.1.4) | Four native audio-track events produced one shared server lookup | One playback startup |
| Read-ahead (1.2.0) | Player advanced 44.4 s in 45 s; TV read-ahead stayed at 92–104 MiB | Short external-server sample |

## Regressions investigated

- **Orphan backend process:** an early child survived a service update and held its port. Parent-exit cleanup and a backend parent-PID watchdog were added; a subsequent update launched successfully without a power reset.
- **Cold MP4 startup:** a late-file index and missing opening video could produce an unsupported-media hand-off even though the warm file played. Preparation now fetches the index and initial video; long cold-start coverage remains incomplete.
- **Leaked server selections:** HEAD and aborted open-range requests accumulated selections in the inspected backend. One observation had 96 selections and slow settings responses; removing/recreating the engine reduced this to two. Completed closed ranges, GET pause probes, and explicit engine cleanup address the request patterns.
- **Slow first bytes:** a TV-mode response took over 15 seconds to begin, outliving the old idle-reader timer. Version 1.3.1 keeps readers with waiting clients, with regression coverage.
- **Narrow TV priority window:** some peers ran out of requested pieces with two 8 MiB windows. Version 1.3.2 uses four windows within the backend's 45 MiB ring. The code change and synthetic tests do not establish long-session device stability.

## Limits and remaining checks

- Internet transfer rates can remain below the media bitrate even with available TV memory and CPU. More connections or buffering cannot guarantee uninterrupted playback.
- Complete an extended TV-only run on 1.3.2, including pause, seek, source changes, exit cleanup, and peak process memory.
- Validate representative audio languages, subtitle formats, codec/container combinations, and external-drive cache behavior separately.
- Dolby Vision, Atmos, frame-drop rates, AV sync, and universal 4K compatibility have not been established. Detailed HDR-state access was denied and frame counters were unusable; the HDR observation above came from the TV settings.
- Developer Mode USB caching and changes to TV permissions are not part of this build.
