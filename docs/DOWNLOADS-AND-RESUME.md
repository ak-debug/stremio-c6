# Existing Mac server, saved downloads and exact-source history

Findings checked against the owner's selected official server 4.22.4 and the TV's actual runtime state on 15 November 2026. No permanent-download feature is asserted to be included in 1.1.2.

## Reuse the official app

The existing official Stremio desktop app can remain the streaming server. No second Stremio server app is required. The TV points to its LAN endpoint and uses it for torrents and cache; the TV still supplies the viewing interface.

Signing into the same account does not publish files on one computer to the other. Library/watch history, a server disk cache, saved downloads and the TV's local exact-stream history are different state.

## What the current server exposes

- Disk caching is enabled, with a nominal 2 GiB target. The target is not a promise of a complete movie or a strict disk quota.
- Local Files indexing is disabled (`localAddonEnabled=false`). Its `/local-addon/manifest.json` currently exposes no catalog and identifies itself as Local Files without catalog support. Therefore the TV cannot browse a saved-file catalog from it as currently configured.
- The inspected official desktop server has a downloader interface mounted beneath a `SERVER_IPC_KEY` path. It is not an ordinary unauthenticated LAN download-queue endpoint. Do not guess, expose or bypass that key to make a TV control work.
- The server's cached-mode torrent reader can preselect a whole file for download when it receives an open-ended Range request. This is not a durable download manager: idle engines can be paused/destroyed and cache cleanup can remove inactive files. It should not be advertised as a permanent Downloads library.

## Practical choices

1. **Streaming/cache only:** use the existing app/server and select the same torrent on TV. Server cache can reduce repeat downloads, but availability depends on cache retention and piece completeness.
2. **Permanent Mac-initiated files:** use a supported download/save action on the Mac to store a complete file in a chosen folder. A TV Downloads browser would need a file catalog and playable server URLs. The official Local Files add-on can index recognized local media, but must be enabled and may need a Stremio restart; non-recognized files are not guaranteed to appear. Do not enable a filesystem scan on a corporate machine without appropriate authorization.
3. **TV-initiated durable jobs:** requires an explicitly supported remote job API or a small companion integration on the personal server. The current streaming-server URL alone does not expose the protected official download manager to the TV. This is additional functionality, not already provided by the shared login.

The official [local add-on source](https://github.com/Stremio/stremio-local-addon) describes indexing and catalog behavior. Stremio's [settings guide](https://stremio.zendesk.com/hc/en-us/articles/360017301779-Stremio-options-explained) describes cache and local add-on options.

## Exact source and watch position

The TV has an existing local `streams` store. Runtime verification found a saved entry whose movie ID, video ID, torrent hash and file index matched the owner's currently working source. Stremio's core stores these stream entries per video in local storage. This is separate from account-synced library progress and is not proof of cross-device exact-source syncing or guaranteed successful automatic reopening.

An attempted pre-update route restore did not reliably restart the working source. The owner selected a working stream manually; no further source changes were made during the Stats-button validation. The temporary upgrade checkpoint was removed. Do not claim an end-to-end automatic exact-source resume test passed.
