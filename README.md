# Stremio AK for LG webOS

A community Stremio client for LG webOS TVs, focused on native playback, useful playback statistics, and buffering on devices with limited memory and storage.

This personal project extends [kieranbrown/stremio-webos](https://github.com/kieranbrown/stremio-webos), with selected interface and telemetry features adapted from [jrubimf/StremioR](https://github.com/jrubimf/StremioR). It uses Stremio's Theater frontend and streaming server. It is not affiliated with Stremio or LG.

## Features

- **Native TV playback:** preferred audio-language selection, additional subtitle sizes, and webOS keyboard fixes inherited from upstream.
- **Playback statistics:** an on-screen Stats button shows transfer speeds, connected peers, file availability, and separate native-player and read-ahead buffers.
- **Two playback modes:** use the TV's built-in streaming backend, or connect to a compatible Stremio server on a computer for disk caching.
- **Local server discovery:** find compatible servers on the local network, with progress, cancellation, and manual URL entry.
- **Adaptive read-ahead:** bounded RAM buffering in both modes, with additional prefetch into the external server's cache when available.
- **Playback recovery:** prepare media headers before playback and retry recoverable stalls in the integrated player.
- **Resource cleanup:** release read-ahead buffers when leaving playback and stop inactive stream engines.
- **Repeatable builds:** pinned dependency checksums, checked patches, automated tests, and IPK archive validation.

## Playback modes

The interface stays on the TV in both modes.

| Mode | Streaming backend | Media storage |
| --- | --- | --- |
| TV only | Runs on the TV; no computer required | RAM buffers; no movie disk cache |
| External server | Runs on a Mac, PC, or compatible server | Server disk cache, plus TV RAM buffers |

The backend supports HTTP media and BitTorrent streams supplied through Stremio. This fork does not distribute media files or provide a third-party content add-on list. Use sources you are authorized to access.

In TV mode, read-ahead targets up to **160 MiB**, alongside the backend's **45 MiB** memory ring. In external mode, TV read-ahead targets up to **192 MiB**, and server-side prefetch can request up to **6 GiB ahead** into the server's disk cache. These are buffer targets, not a limit on total app memory or a permanent download library. Sustained download speed must still meet the video's bitrate.

See [external-server setup](docs/MAC-SERVER.md) and [cache, downloads, and resume behavior](docs/DOWNLOADS-AND-RESUME.md).

## Compatibility

The development target is **LG OLED55C6PLA running webOS 26**, with an aarch64 streaming backend. Other TVs have not been validated by this fork. Native codec, HDR, and audio support depend on the TV and the selected media; a filename label does not establish compatibility.

The app has its own ID, `io.github.akdebug.stremio`, so it can be installed alongside the official client. See [device validation](docs/DEVICE-VALIDATION.md) for observations and test limits.

## Build and install

Requires Python 3, Node.js 20+, `curl`, `patch`, `ar`, and the LG webOS CLI. CI uses Node.js 24.

```sh
npm install -g @webos-tools/cli@3.2.6
make check
make package
```

Enable Developer Mode on the TV and configure it with `ares-setup-device`. Then install and launch using its configured device name:

```sh
make deploy DEVICE=myTV
```

The package is named `io.github.akdebug.stremio_<version>_all.ipk`. On first launch, choose a playback mode, save the configuration, and sign in using the normal Stremio account-link flow. Keep the Developer Mode session active.

| Command | Purpose |
| --- | --- |
| `make check` | Run automated tests without a TV |
| `make build` | Download pinned inputs, apply patches, and check JavaScript syntax |
| `make package` | Build, test, and validate the IPK |
| `make deploy DEVICE=myTV` | Package, install, and launch |
| `make restart DEVICE=myTV` | Close and relaunch the installed app |

## Development

Source lives in `app/`, `service/`, `patches/`, and `scripts/`. The frontend bundle, backend bundle, and media binaries are generated during the build. Make lasting changes in the source or patches rather than generated files.

- [Architecture and resource limits](docs/ARCHITECTURE.md)
- [Contributing and upstream changes](CONTRIBUTING.md)
- [Git workflow for selected upstream fixes](docs/GIT-WORKFLOW.md)
- [Changelog](CHANGELOG.md)

## Credits and licensing

Credit belongs to [kieranbrown/stremio-webos](https://github.com/kieranbrown/stremio-webos) for the webOS base, [jrubimf/StremioR](https://github.com/jrubimf/StremioR) for adapted source-picker and telemetry work, [Stremio](https://www.stremio.com/) and [NoobyGains/stremio-vidaa-tv](https://github.com/NoobyGains/stremio-vidaa-tv) for the frontend/server components, and [FFmpeg](https://ffmpeg.org/) for media tools.

The source is public. A repository-wide license has not yet been established for the inherited code; no blanket license is asserted over third-party work. See [licensing and release status](docs/RELEASE-READINESS.md) before redistributing builds.
