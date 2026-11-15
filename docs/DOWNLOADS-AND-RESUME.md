# Cache, downloads, and resume

## Three different buffers

- **Playable buffer:** media already buffered by the TV's native video element at the current position. It may remain around several seconds even when much more data has downloaded elsewhere.
- **TV read-ahead:** data fetched by the TV proxy ahead of playback, held in RAM. The target is up to 160 MiB in TV mode or 192 MiB in external mode, subject to the memory budget.
- **External-server cache:** media pieces stored on the server's disk. The TV can request up to 6 GiB ahead once its RAM buffer is full or during an external-server pause lease.

Downloaded pieces can be noncontiguous or outside the current playback range. Total downloaded bytes do not establish how many seconds are playable.

## Pausing and the screensaver

In external mode, the TV renews a pause lease while a loaded stream is paused. The service uses completed one-byte GET requests every 20 seconds to keep the server engine active. The lease expires after 90 seconds without renewal. It stops on playback or navigation. Normal screensaver behavior is retained; indefinite background operation after webOS suspends the interface is not promised.

TV-only mode can fill its bounded RAM read-ahead while paused. It has no movie disk cache, so it cannot accumulate a whole film in the way a disk-cached server can.

Leaving playback releases RAM buffers and schedules cleanup of inactive engines. On an external server, removing the engine preserves cache files for that server's own retention policy.

## Cache is not a permanent download library

The existing official Stremio desktop app can act as the external server; a second server installation is not required. Selecting media on the TV requests it from that backend.

The app does not currently offer durable download jobs, a completed-downloads catalog, or a permanent Downloads library. The server's nominal cache-size setting is a cleanup target, not a strict disk quota or a promise to retain a full file. The same Stremio account can synchronize library/watch progress; it does not publish one computer's files to the TV.

A future permanent-download feature would need a supported job API and a catalog of playable server URLs. The official desktop downloader's protected IPC interface is not an ordinary public LAN API.

## Resume and source history

Stremio's existing local stream history stores the selected stream per video, separately from account-synchronized library progress. One on-device restart test confirmed that normal Continue Watching reopened the same source and file index near the captured playback position. No separate source-order or Last Selected patch was added.

This observation is not a guarantee that every failed attempt preserves the intended source, or that exact source selection synchronizes across devices. See [device validation](DEVICE-VALIDATION.md).

## Reading the statistics

- **Downloaded this session** is the current engine's cumulative network counter. Recreating the engine can reset it.
- **File pieces available** measures pieces known for the selected file; it does not prove permanent retention or contiguous playback time.
- **TV read-ahead** is separate from the native playable buffer. A “full” label means the read-ahead has reached its current target.
- **Mac pre-downloaded** estimates server-side availability ahead of playback. It describes cache prefetch, not a saved download job.

For setup and disk selection, see the [external-server guide](MAC-SERVER.md).
