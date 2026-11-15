# Stremio AK 1.1.4

- Share one server track lookup per stream rather than repeating it for every native audio-track event.
- Debounce track-list rebuilding until the native events settle.
- Avoid core-state polling during playback and reduce settled configuration polling.
- Stop duplicate hidden loading-telemetry polling while the visible Stats panel is active.

These changes reduce header reads and worker/server traffic during playback. External-server configuration remains separate from TV profiles; this release does not automatically reconfigure another computer.

See [validation](DEVICE-VALIDATION.md), [architecture](ARCHITECTURE.md), and [release status](RELEASE-READINESS.md).
