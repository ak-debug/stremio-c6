# Stremio AK

Read README.md and docs/DEVICE-VALIDATION.md for scope and verified behavior. Source lives in app/, service/, scripts/ and patches/. service/www, service/server.js and service/bin are generated; rebuild with make build. make check runs proxy tests, make package builds a timestamp-checked IPK, make deploy DEVICE=lgtv installs and launches it.

The TV backend uses loopback port 11479; the frontend proxy uses 8082. External mode must not start the TV torrent engine. Keep all frontend streaming calls on location.origin and configure the backend through /ak/config. Do not expose an arbitrary file-serving endpoint, enlarge the memory ring without measurements, or claim USB caching on an ordinary Developer Mode TV.
