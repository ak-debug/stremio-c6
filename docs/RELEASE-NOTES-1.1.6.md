# Stremio AK 1.1.5–1.1.6

Prepare cold torrent files before native playback. Fetch a late MP4 index when necessary and the initial 16 MiB of video, with shared jobs, cancellation, and a preparation deadline.

Startup media errors receive bounded in-app preparation/retry attempts before the existing LG player fallback. This addresses a case where warm media played but a cold index/opening-data fetch looked like unsupported video.

See [device validation](DEVICE-VALIDATION.md) for cold-start coverage limits, the [changelog](../CHANGELOG.md) for later recovery improvements, and [release status](RELEASE-READINESS.md).
