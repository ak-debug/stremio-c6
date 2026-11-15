# Existing Mac server, saved downloads and exact-source history

Findings checked against the owner's selected official server 4.22.4 and the TV's actual runtime state on 15 November 2026. Version 1.1.3 adds continued downloading while paused on a disk-cached external server; it does not add a permanent download manager.

## Reuse the official app

The existing official Stremio desktop app can remain the streaming server. No second Stremio server app is required. The TV points to its LAN endpoint and uses it for torrents and cache; the TV still supplies the viewing interface.

Signing into the same account does not publish files on one computer to the other. Library/watch history, a server disk cache, saved downloads and the TV's local exact-stream history are different state.

## What the current server exposes

- Disk caching is enabled, with a nominal 2 GiB target. The target is not a promise of a complete movie or a strict disk quota.
- Local Files indexing is disabled (`localAddonEnabled=false`). Its `/local-addon/manifest.json` currently exposes no catalog and identifies itself as Local Files without catalog support. Therefore the TV cannot browse a saved-file catalog from it as currently configured.
- The inspected official desktop server has a downloader interface mounted beneath a `SERVER_IPC_KEY` path. It is not an ordinary unauthenticated LAN download-queue endpoint. Do not guess, expose or bypass that key to make a TV control work.
- The server's cached-mode torrent reader can preselect a whole file for download when it receives an open-ended Range request. This is not a durable download manager: idle engines can be paused/destroyed and cache cleanup can remove inactive files. It should not be advertised as a permanent Downloads library.

## Practical choices

1. **Streaming/cache only:** use the existing app/server and select the same torrent on TV. In 1.1.3, pausing a loaded torrent renews a service-side lease that keeps the external engine alive through ordinary screensaver operation. The lease expires if UI heartbeats stop, and playback/navigation cancels it. Server cache can reduce repeat downloads, but availability depends on cache retention and piece completeness. Cache use can grow to a movie's size; the nominal cache target is not a hard space limit.
2. **Permanent Mac-initiated files:** use a supported download/save action on the Mac to store a complete file in a chosen folder. A TV Downloads browser would need a file catalog and playable server URLs. The official Local Files add-on can index recognized local media, but must be enabled and may need a Stremio restart; non-recognized files are not guaranteed to appear. Do not enable a filesystem scan on a corporate machine without appropriate authorization.
3. **TV-initiated durable jobs:** requires an explicitly supported remote job API or a small companion integration on the personal server. The current streaming-server URL alone does not expose the protected official download manager to the TV. This is additional functionality, not already provided by the shared login.

The official [local add-on source](https://github.com/Stremio/stremio-local-addon) describes indexing and catalog behavior. Stremio's [settings guide](https://stremio.zendesk.com/hc/en-us/articles/360017301779-Stremio-options-explained) describes cache and local add-on options.

## Exact source and watch position

The TV has an existing local `streams` store. Runtime verification found a saved entry whose movie ID, video ID, torrent hash and file index matched the owner's currently working source. Stremio's core stores these stream entries per video in local storage. This is separate from account-synced library progress and is not proof of cross-device exact-source syncing or guaranteed successful automatic reopening.

An earlier attempted pre-update route restore did not reliably restart the working source. The temporary upgrade checkpoint was removed. A subsequent 1.1.2 app-restart test reproduced the torrent/file captured at that moment, but it was a larger source than the one the owner intended and failed playback. Neither test demonstrated successful resume of the intended source.

For the 1.1.3 test, the owner explicitly identified and selected Torrentio 4K HDR / Rutracker, listed as 24.01 GB. After capturing that selection and position, closing the app, installing 1.1.3 and reopening it, the normal **Continue Watching → The Odyssey → Continue Watching** action selected the same torrent hash and file index. Native playback loaded at 3840×2160 and 1361.916 seconds, compared with the pre-close position of 1360.977 seconds. This is a successful exact-source and position resume test for that source on this TV. No source-order patch or separate Last Selected section was needed.

## Buffer and downloaded-counter meanings

**Playable buffer** is `HTMLVideoElement.buffered.end - currentTime` for the range containing the current position. It measures the TV media pipeline, not all downloaded torrent data on the Mac; a value that remains around several seconds while paused is expected. Torrent pieces on disk may be noncontiguous or outside the current playback range.

**Downloaded this session** comes from the current engine's cumulative network-transfer counter. It resets when that engine is recreated. **File pieces available** is a separate bitfield measurement of current file-piece availability, not proof of durable retention or contiguous playback time.

In the pre-fix observation, the paused video's time remained 1161.397 seconds and its native buffer stayed loaded while the server engine disappeared after approximately two minutes. Waking the screensaver did not itself recreate the engine, change the video time or raise a page visibility event. The inspected official server sets `ENGINE_TIMEOUT=120000` and destroys inactive engines. The 1.1.3 HEAD lease addresses that server inactivity without disabling the screensaver.
