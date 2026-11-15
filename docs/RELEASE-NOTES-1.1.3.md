# 1.1.3 — Keep external torrent downloads active while paused

The TV now renews a small service-side lease while a loaded torrent is paused. The service sends an open-ended HEAD request every 20 seconds to the selected external server, keeping the official server's torrent engine active and selecting the movie file for continued downloading. HEAD responses carry no movie body into TV RAM.

- Requires external-server disk caching. Does not enable caching or change settings on the Mac.
- Stops on play, leaving the player, changing servers, service shutdown or lease expiry. A page-exit beacon stops promptly when delivered; a 90-second lease, checked every 20 seconds, handles abrupt UI termination. Downloads may stop if the TV suspends UI heartbeats for longer than that lease.
- Stats distinguishes **Downloaded this session** from **File pieces available** and the native player's **Playable buffer**.
- Retains normal webOS screensaver behavior. Does not disable OLED protection or raise the TV's media-buffer allocation.
- Keeps using ordinary server cache. It is not a permanent download queue or saved-movie catalog. Cache use on the Mac can grow substantially, potentially to the selected movie's size; use a personal machine and sufficient free space.

Automated checks cover header-only keep-alive requests, expiry/renewal, cancellation, server changes, required disk caching, input validation and API origin protection.

## Source resume investigation

The initial app-restart test selected the same torrent/file as the machine state captured before that test, but that approximately 36.6 GiB source failed playback. The owner identified the intended working source as Torrentio 4K HDR / Rutracker, listed at 24.01 GB, and selected it manually. Its actual server file size was 25,777,506,350 bytes. These are different torrents. Do not describe the first test as a successful playback resume.

The subsequent 1.1.3 close/install/reopen test used that explicitly identified 24.01 GB source. The app's normal Continue Watching action selected the exact same torrent and file, and native 3840×2160 playback resumed near the captured position. See [device validation](DEVICE-VALIDATION.md) for measurements.

The pause/screensaver test then kept the engine alive for over 210 seconds, with a monotonically rising download counter. Downloading continued after the owner confirmed the screensaver was visible. Waking and pressing Play resumed the same 4K stream and deactivated the pause-only lease.
