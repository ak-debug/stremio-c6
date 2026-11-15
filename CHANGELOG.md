# Changelog

This history summarizes changes in the community fork. Device observations and remaining checks are documented separately in [device validation](docs/DEVICE-VALIDATION.md).

## Unreleased

- Reorganize documentation around features, setup, architecture, and contribution guidance.
- Remove personal viewing details and stale machine-specific setup notes.
- Correct buffer targets, request parallelism, memory-reserve wording, and package naming.

## 1.3.2

- Keep four closed 8 MiB requests in flight in TV mode, widening the engine's playback-priority window while remaining within its 45 MiB ring.

## 1.3.1

- Retain read-ahead readers while clients wait for a slow first response, preventing an unintended fallback to unbuffered delivery.
- Tighten regression checks to reject open-ended backend ranges.

## 1.3.0

- Enable TV-only read-ahead with a 160 MiB target and 8 MiB segments.
- Shorten TV peer handshake timeout to six seconds.
- Release buffers on leaving playback and schedule prompt cleanup of inactive engines.

## 1.2.1

- Retry server-cache prefetch after repeated failures with a 30-second backoff.
- Keep failed pieces as progress boundaries and resume prefetch while paused.
- Label a full TV read-ahead buffer in Stats.

## 1.2.0

- Fetch three closed 16 MiB segments concurrently in external mode to widen playback priority.
- Request up to 6 GiB ahead into the external server's cache using bounded one-byte piece probes.
- Display server-cache prefetch separately from TV RAM buffering.

## 1.1.9

- Retry starvation-related media errors in the integrated player after playback has started, waiting for read-ahead before reloading.
- Retain a recently used buffer through short reconnects and keep a small history for reloads.
- Recovery remains bounded; it is not a guarantee against eventual playback failure or hand-off.

## 1.1.7–1.1.8

- Add external-mode TV read-ahead with a 192 MiB target.
- Replace leaking HEAD/open-range patterns with completed closed-range requests.
- Stop idle engines after playback and recover engines with excessive leftover selections.

## 1.1.5–1.1.6

- Prepare MP4 index/header data and initial video bytes before native playback.
- Add bounded startup retries before the existing external-player fallback.

## 1.1.4

- Share track lookups per stream and debounce native audio-track updates.
- Reduce core-state polling and duplicate hidden telemetry requests.

## 1.1.3

- Add expiring external-server pause leases for continued caching through the normal TV screensaver.
- Verify existing same-source Continue Watching behavior in one device restart test; no source-history patch added.

## 1.1.2

- Add a remote-accessible Stats control during playback, with Back to dismiss.

## 1.1.1

- Add bounded, cancellable local server discovery alongside manual URL entry.

## 1.1.0

- Establish separate app/service IDs for side-by-side installation.
- Add TV/external-server selection, TV profiles, telemetry, and an adapted source picker.
- Retain upstream native audio, subtitle-size, keyboard, and webOS-version fixes.
- Correct bundled upload/seeder statistics and add backend lifecycle handling.
- Pin downloaded inputs and validate patches, JavaScript syntax, and IPK timestamps.
