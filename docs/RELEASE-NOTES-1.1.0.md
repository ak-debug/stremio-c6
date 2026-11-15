# Stremio AK 1.1.0

Initial community fork with separate application/service IDs, TV and external-server modes, Balanced/Fast TV profiles, playback telemetry, and an adapted source picker. Retains upstream audio-language, subtitle-size, keyboard, and webOS-version fixes.

Build inputs are pinned and checked. Backend changes correct statistics, enable the HLS-v2 route, use dedicated loopback ports, and clean up child processes on service exit.

See [device validation](DEVICE-VALIDATION.md), [setup](../README.md#build-and-install), and [licensing/release status](RELEASE-READINESS.md). This is an unofficial build; synthetic tests do not establish universal playback compatibility.
