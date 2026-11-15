# Stremio AK 1.1.1 — local server discovery

Adds **Discover servers** to Playback setup alongside manual address entry. Search verifies compatible Stremio HTTP servers on port 11470, displays their address/version/cache status, and lets the user fill the address by selecting a result. The server is changed only after saving.

Includes progress, Stop, bounded parallelism, cancellation on leaving setup, response-size/deadline limits, and private-IPv4/subnet restrictions. Manual entry remains necessary for HTTPS-only/custom-port servers or networks that block discovery. This is not a guarantee of discovering every server on every routed/VLAN network.

The existing TV-only and external-server modes, torrent telemetry, source picker, audio/subtitle/webOS fixes and 45 MiB TV ring buffer are retained. No permanent Mac server or USB-TV cache is installed by this update.

Nine automated tests cover discovery planning, compatible-server identification, response limits/timeouts, cancellation, concurrency, missing interfaces and the existing streaming proxy behavior. Actual model observations are recorded in [device validation](DEVICE-VALIDATION.md).

Unofficial community fork of kieranbrown/stremio-webos with selected jrubimf/StremioR contributions. Public binary publication remains pending the [inherited licensing and redistribution review](RELEASE-READINESS.md).
