# Stremio AK 1.1.7–1.1.8

- Add TV-side RAM read-ahead in external-server mode with a 192 MiB target, separate from the native player's small buffer.
- Use completed closed-range media requests and one-byte GET pause probes to avoid leaked backend selections.
- Track active requests and remove idle engines after playback, preserving external cache data.
- Recover an active engine with excessive leftover selections only when enough TV read-ahead is available and the refresh cooldown permits it.
- Display TV read-ahead separately in Stats.

The adaptive memory reserve is a target, not a total app-memory cap or a guarantee of free memory. Later versions add parallel requests, external-cache prefetch, playback recovery, and TV-only read-ahead; see the [changelog](../CHANGELOG.md).

See [architecture](ARCHITECTURE.md), [device validation](DEVICE-VALIDATION.md), and [release status](RELEASE-READINESS.md).
