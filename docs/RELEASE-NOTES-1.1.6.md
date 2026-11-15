# 1.1.6 — Prepare torrent files before playback; retry in-app

## Problem

Some streams opened LG's media player and left Stremio on a "Video is not supported" error screen. Reproduced on the C6 with Resident Evil (2026) 4K iTunes WEB-DL MP4 releases. The native player reported media error 4, and Stremio's error code 83. The upstream webOS player then hands the URL to `com.webos.app.photovideo`.

The formats themselves are supported. A warm copy of the same file type (HEVC HDR, E-AC-3 5.1, MP4) played in-app at 3832×1600. The failing files store their index (`moov`) at the end, after an 18–22 GB `mdat`. On a cold torrent, the native player must wait for the head, a 19.4 MiB index at the end and the opening video data. It gives up after about 40 seconds. By the time LG's player retries, the Mac has fetched more of the file, so the LG player works.

## Changes

- **Prepare step.** For torrent streams on the TV origin, the service (`POST /ak/prepare`) first waits for the file head. If the file is an MP4, it walks the top-level boxes and reads the index wherever it is. If the index follows the media data, it also reads the first 16 MiB of video. The reads go through the selected backend, so the torrent engine fetches and caches those pieces before the native player starts. Concurrent requests share one job; the job is cancelled when the last caller leaves and is cached for 5 minutes. The overall limit is 150 seconds; on failure, playback proceeds normally. Other containers only wait for the head.
- **Status.** The loading panel shows the prepare phase, bytes and elapsed time, for example "fetching MP4 index from end of file 12.0 MiB / 19.4 MiB".
- **In-app retry.** On media error 3 or 4 for a torrent stream, the player prepares again and reloads the same stream at the last position, up to two times. After that, the original LG media player hand-off and error still apply. Attempts are counted on the video element, because Stremio freezes stream objects. The interim 1.1.5 test build stored the counter on the stream object, so it never stopped retrying.

## Measurements (owner's C6, external Mac server)

With 1.1.5, the prepare step fetched the 19.4 MiB end-of-file index of the 20.58 GB BTM MULTi release in about 36 seconds. The native player still timed out after 40 seconds per attempt because the opening video data was not yet available. It started at 3832×1600 on the fourth attempt, after the opening data had been fetched separately. No LG media player launched. 1.1.6 adds that opening-data fetch to the prepare step. 1.1.6 is installed; its full cold-start playback test is pending.

Delivery from the Mac server was 2.8–4.5 MB/s even for cached data: TV through the proxy 3.2 MB/s, TV directly 4.5 MB/s, another LAN computer 2.8–4.4 MB/s. This film averages about 26 Mbit/s. The common factor is the server computer's network link, which is also carrying the torrent download. A wired connection for the server is recommended for 4K.

Automated checks: 18 tests, including MP4 box parsing, end-of-file index and opening-video reads, no extra read when the index is at the start, non-MP4 handling, shared jobs, cancellation and API origin protection.
