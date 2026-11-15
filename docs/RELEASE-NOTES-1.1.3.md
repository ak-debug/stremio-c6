# Stremio AK 1.1.3

Adds a service-side pause lease for a disk-cached external server. UI heartbeats renew the lease while paused; playback/navigation stops it and missing heartbeats allow it to expire. Normal TV screensaver policy is retained.

A short on-device pause/screensaver test preserved the engine and playback position while downloaded bytes increased. A controlled restart also confirmed that existing Continue Watching selected the captured source and position. No source-history patch was introduced.

The original HEAD keep-alive was replaced with completed one-byte GET requests in 1.1.8 to avoid leaked server selections. This is streaming-cache behavior, not a permanent download manager. See [cache and resume](DOWNLOADS-AND-RESUME.md), [validation](DEVICE-VALIDATION.md), and [release status](RELEASE-READINESS.md).
