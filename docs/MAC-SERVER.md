# Use the TV interface with a Mac background server

Stremio AK has two operating modes. It is currently installed on the owner's TV in standalone TV / Balanced mode. A permanent Mac server has not been installed or configured by this project.

| Choice | What runs on the TV | What runs on the Mac | Storage |
| --- | --- | --- | --- |
| TV | Interface, torrent downloader, native video player | Nothing needed | Small TV RAM buffer |
| Mac / external server | Same interface and native video player | Background Stremio streaming/torrent service | Mac internal drive or attached HDD/SSD |

In Mac mode, selecting a torrent on the TV sends the request to the Mac. The Mac finds peers, downloads pieces and stores them in its cache. It serves the selected media over the home network. The TV decodes and displays it. Direct play sends the original compressed video without re-encoding; unsupported media can require remuxing or transcoding, so this does not guarantee Dolby Vision for every source.

You do not need to start the same movie on the Mac. The TV is the viewing interface. A normal NAS folder only holds files: it does not act as a Stremio torrent server. A NAS can replace the Mac if it can actually run a compatible Stremio streaming server. External mode is not a cloud-upload service or a permanent download/library manager.

## 1. Run a background service on the Mac

Use the official [Stremio Service releases](https://github.com/Stremio/stremio-service/releases/latest). Install the macOS `StremioService.dmg` and run Stremio Service. This is the server companion; it does not require a movie window. Its current upstream README and release are separate sources, so use the latest release page rather than the older version hardcoded in the README.

Alternatively, the [official macOS desktop app](https://www.stremio.com/downloads) can run its streaming server; choose the Apple Silicon/ARM download for an M2. Do not run two competing services on the same ports. Use the desktop/service server build, not this repository's `service/server.js`, which deliberately disables disk caching for the TV.

Allow macOS Local Network/firewall access if requested. Check `http://127.0.0.1:11470/settings` in a browser on the Mac. It should return JSON with `values.serverVersion`. Opening that address does not start a service that is not already running.

## 2. Choose the cache disk

Attach your HDD or SSD to the Mac and ensure the volume is mounted and writable. No formatting is required by this project. The service must be allowed to access the external volume if macOS requests permission. Do not eject the disk while streaming.

If the desktop app exposes cache settings, choose the disk and a nominal cache size there. Stremio [documents caching drive and cache-size settings](https://stremio.zendesk.com/hc/en-us/articles/360017301779-Stremio-options-explained).

For a service-only installation, the project includes a helper for its settings API. Replace `MySSD` below with the exact mounted volume name. From the repository folder:

```sh
python3 tools/configure-mac-server.py --cache-dir "/Volumes/MySSD/StremioCache" --cache-gib 10 --check-only
python3 tools/configure-mac-server.py --cache-dir "/Volumes/MySSD/StremioCache" --cache-gib 10
```

The first command only checks the proposed configuration. The second creates the cache folder and updates the already-running local server's `cacheRoot` and `cacheSize`, preserving other settings. It does not install or start a server, format a drive, or change the TV. It rejects an unmounted external volume and verifies the saved settings. Its syntax/help have been checked; it has not yet been validated against a permanent service installation on the owner's Mac.

A 10 GiB setting is not a strict quota. An active media file may exceed it, so allow room for the source size and OS headroom. This feature is a streaming cache, not a promise to download the entire film before playback or retain it permanently. HDD sequential throughput is usually sufficient; SSD can improve seeks and reduce noise. Neither fixes a slow swarm.

## 3. Connect the TV

1. On the Mac, open System Settings → Wi-Fi → Details and note its LAN IP address. A router DHCP reservation keeps it stable.
2. Put Mac and TV on the same normal network, not an isolated guest network. Keep the Mac awake, preferably powered with its lid open. The Terminal command `caffeinate -i` can prevent idle sleep while it is running; press Ctrl+C when finished.
3. On the TV open **Stremio AK → Settings → Server → Edit URL**. This opens Playback setup.
4. Choose **Mac / external server — use disk caching**.
5. Choose **Discover servers**, then select a verified result to fill the address. Or enter `http://MAC-LAN-IP:11470`, for example `http://192.168.0.100:11470`. Use your own personal server's address. Choose **Save and test connection**, then **Save and continue**.
6. Select a stream on the TV. The Mac downloads; the TV plays. The TV torrent engine is stopped in external mode.

The TV profile selector applies only in TV mode. Configure torrent speed/connection settings on the Mac server when using external mode; the TV does not overwrite another server's profile or cache settings.

The TV uses a local proxy to reach the selected backend consistently for torrent creation, media, track lookup, subtitles and statistics. If a particular installation needs HTTPS, use the exact LAN HTTPS endpoint generated by Stremio. No public internet port forwarding is needed.

Discovery is initiated only when you press its button. It reads server settings on HTTP port 11470, verifies the response shape and returns only the address, server version and cache-on/off status. It does not start torrents or change the selected backend. Search has progress, results and a Stop control. It is bounded to the TV's nearby private IPv4 addresses (up to two local /24 windows and 12 concurrent requests), skips the TV itself/VPN-style interfaces, and times out after 45 seconds. Guest-network isolation, a firewall, a different VLAN, IPv6-only servers, HTTPS-only servers or custom ports can prevent discovery; use manual entry where appropriate. Do not expect it to find every server on a large routed network.

Use a personal computer for a personal torrent server. When the Mac is the server, it receives torrent data, connects to peers, may upload pieces, and writes its configured cache to its disk or attached drive. An external disk does not isolate that activity from a managed corporate computer. The project's development/testing does not install a permanent Mac torrent server.

## Switch back

Return to Playback setup, select **TV — works without your Mac**, choose Balanced or Fast, and save. The Mac is no longer required for playback. If the Mac sleeps or the external disk disappears during external-server playback, that stream can stop; there is no automatic handover between torrent engines.

## What has actually been tested

On the owner's C6, external routing was tested with a temporary LAN server and a generated 720p clip; TV playback and HTTP Range delivery worked, and the local torrent engine stopped. This establishes the connection path. Permanent Mac service installation, external-drive caching, long sessions and 4K Dolby Vision still require their own validation. See [device validation](DEVICE-VALIDATION.md).
