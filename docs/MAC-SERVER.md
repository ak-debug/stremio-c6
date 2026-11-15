# External-server setup

Use the TV for browsing and playback while a compatible Stremio server handles network transfers and disk caching on a Mac or another computer. The server sends media over the local network; the TV still decodes and displays it.

Direct playback preserves the compressed video. Unsupported media may need remuxing or transcoding, so an external server does not guarantee Dolby Vision for every source. A plain NAS folder is not a streaming backend; a NAS must run a compatible server to use this mode.

## 1. Start the server

Either use the existing [official Stremio desktop app](https://www.stremio.com/downloads), or install the macOS companion from [Stremio Service releases](https://github.com/Stremio/stremio-service/releases/latest). Apple Silicon Macs should use the appropriate ARM build when available. Do not run two servers on the same port.

The desktop app's server can be reused without playing the same media on the Mac. Do not copy this repository's generated `service/server.js` to the computer: that webOS build deliberately disables disk caching.

Allow local-network/firewall access if requested, and check `http://127.0.0.1:11470/settings` on the server computer. A compatible response contains `values.serverVersion`. This check does not start a stopped server.

## 2. Configure caching

Use the desktop app's cache settings when available. An HDD or SSD can be attached to the server computer; TV USB caching is not implemented. Keep the drive mounted and writable while streaming. See [Stremio's settings guide](https://stremio.zendesk.com/hc/en-us/articles/360017301779-Stremio-options-explained).

For a service installation that exposes the settings API, this repository includes a helper. Replace the volume name and size with your own choices, then review the dry run before applying:

```sh
python3 tools/configure-mac-server.py --cache-dir "/Volumes/MySSD/StremioCache" --cache-gib 10 --check-only
python3 tools/configure-mac-server.py --cache-dir "/Volumes/MySSD/StremioCache" --cache-gib 10
```

The second command creates the cache folder and updates `cacheRoot`/`cacheSize` on the already-running local server, preserving other settings and verifying the response. It does not install a server or format a drive. The helper's syntax/help have been checked; permanent background-service and external-drive deployment still need separate validation.

Cache size is a cleanup target, not a strict quota. An active file may exceed it. Leave enough space for the media and operating system. Prefetch and cached data are not permanent download jobs; see [cache and downloads](DOWNLOADS-AND-RESUME.md).

## 3. Connect the TV

1. Put the TV and server on the same non-isolated network. Note the server's LAN IP; a router DHCP reservation can keep it stable.
2. Keep the server awake. On macOS, `caffeinate -i` prevents idle sleep while running; press Ctrl+C to stop it. Lid-close sleep is a separate behavior.
3. Open **Stremio AK → Settings → Server → Edit URL** on the TV.
4. Choose **Mac / external server — use disk caching**.
5. Choose **Discover servers** and select a verified result, or enter `http://SERVER-LAN-IP:11470`. For HTTPS, use the exact endpoint supplied by Stremio.
6. Choose **Save and test connection**, then **Save and continue**. Select media on the TV.

The local TV engine stops in external mode. TV Balanced/Fast settings apply only to TV mode; configure the external backend's profile and cache on that server. Keep its endpoint on a trusted network; internet port forwarding is not needed.

## Discovery limits

Search runs only when requested. It checks compatible HTTP settings responses on port 11470, displaying address, server version, and cache status. Selecting a result fills the address; saving is explicit. Search does not start streams or change server settings.

The search covers up to two nearby private IPv4 /24 windows, with 12 concurrent requests and a 45-second deadline. Progress and Stop are available. Guest isolation, firewalls, routed networks, IPv6-only servers, HTTPS-only servers, or custom ports may require manual entry.

## Switch back to TV mode

Return to Playback setup, choose **TV — works without your Mac**, select Balanced or Fast, and save. There is no automatic engine handover if an external server sleeps or its disk disconnects mid-playback.

The server receives the network traffic and stores its cache on its own drive. Use a machine appropriate for that activity. Installation does not isolate the server from the computer's management or network policies.
