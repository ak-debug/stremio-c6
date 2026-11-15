// Loading telemetry adapted from StremioR. File progress and playable buffer are separate.
(function() {
    'use strict';
    window.__STREMIO_SERVER_URL__ = location.origin;
    window.__openSetup = function() { location.href = '/setup.html'; };
    var selected, serverUrl;
    function size(bytes) {
        bytes = Number(bytes) || 0;
        return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MiB' : Math.round(bytes / 1024) + ' KiB';
    }
    function bufferSeconds() {
        var video = Array.from(document.querySelectorAll('video')).find(function(v) { return v.readyState > 0; });
        if (!video) return null;
        for (var i = 0; i < video.buffered.length; i++) {
            if (video.buffered.start(i) <= video.currentTime + 0.1 && video.buffered.end(i) >= video.currentTime) {
                return Math.max(0, video.buffered.end(i) - video.currentTime);
            }
        }
        return 0;
    }
    // The service reads ahead of the native player, whose own buffer stays around 10 s.
    function readAheadText(status, key) {
        var readers = status && status.readAhead && status.readAhead.readers || [];
        var reader = readers.find(function(r) { return r.file === '/' + key.toLowerCase() && r.clients && typeof r.ahead === 'number'; });
        if (!reader) return '';
        var video = Array.from(document.querySelectorAll('video')).find(function(v) { return v.readyState > 0; });
        var seconds = video && video.duration > 0 && reader.total ? reader.ahead / (reader.total / video.duration) : null;
        var text = 'TV read-ahead ' + size(reader.ahead) + (seconds === null ? '' : ' (~' + Math.round(seconds) + ' s)') + (reader.paused ? ' · full' : '') + '\n';
        if (typeof reader.serverAhead === 'number' && reader.serverAhead > reader.ahead + 32 * 1048576) {
            var mac = seconds === null ? null : reader.serverAhead / (reader.total / video.duration);
            text += 'Mac pre-downloaded ' + size(reader.serverAhead) + (mac === null ? '' : ' (~' + (mac >= 120 ? Math.round(mac / 60) + ' min' : Math.round(mac) + ' s') + ')') + '\n';
        }
        return text;
    }
    function panel(getSelected, getServerUrl) {
        var el = document.createElement('div');
        el.className = 'torrent-stats';
        var attached = false, ticks = 0, timer, previous = null, controller, stopped = false;
        function stop() { stopped = true; clearTimeout(timer); if (controller) controller.abort(); }
        el.__stop = stop;
        async function tick() {
            if (stopped) return;
            ticks++;
            if (el.isConnected) attached = true;
            else if (attached || ticks > 10) return stop();
            // The live Stats panel already polls; the hidden loading copy need not duplicate it.
            if (!el.dataset.info && document.body.classList.contains('ak-info-open')) { timer = setTimeout(tick, 1000); return; }
            var item = getSelected(), stream = item && item.stream;
            var base = getServerUrl() || location.origin;
            var seconds = bufferSeconds();
            var prefix = (el.dataset.info ? 'Live stats · Stats again or Back to close\n' : '') + (window.__AK_PREPARE_STATUS__ ? window.__AK_PREPARE_STATUS__ + '\n' : '') + (seconds === null ? '' : 'Playable buffer ' + seconds.toFixed(1) + ' s\n');
            if (!stream || !stream.infoHash) {
                el.textContent = prefix + 'Direct stream';
                timer = setTimeout(tick, 1000); return;
            }
            var key = stream.infoHash + '/' + (typeof stream.fileIdx === 'number' ? stream.fileIdx : '');
            var url = base.replace(/\/$/, '') + '/' + key + (key.endsWith('/') ? '' : '/') + 'stats.json';
            controller = new AbortController();
            var deadline = setTimeout(function() { controller.abort(); }, 3500);
            try {
                var reply = await fetch(url, { signal: controller.signal, cache: 'no-store' });
                if (!reply.ok) throw new Error('HTTP ' + reply.status);
                var data = await reply.json();
                if (!data || typeof data.downloadSpeed !== 'number') throw new Error('Connecting to peers');
                var status = await fetch('/ak/status', { signal: controller.signal, cache: 'no-store' }).then(function(r) { return r.json(); }).catch(function() { return null; });
                prefix += readAheadText(status, key);
                var now = Date.now();
                // Derive upload from cumulative bytes: older server builds misreport uploadSpeed.
                var upload = previous && previous.key === key && data.uploaded >= previous.uploaded ?
                    (data.uploaded - previous.uploaded) * 1000 / Math.max(1, now - previous.time) : null;
                previous = { key: key, uploaded: data.uploaded || 0, time: now };
                var lines = [prefix + '↓ ' + size(data.downloadSpeed) + '/s    ↑ ' + (upload === null ? 'measuring…' : size(upload) + '/s'),
                    'Connected peers ' + (data.peers || 0) + '    Unchoked ' + (data.unchoked || 0) +
                    (typeof data.seeders === 'number' ? '    Seeders ' + data.seeders : ''),
                    'Known peers ' + (data.unique || 0) + '    Connection limit ' + (data.swarmSize || 0) + '    Downloaded this session ' + size(data.downloaded)];
                if (data.streamLen) lines.push('File pieces available ' + ((data.streamProgress || 0) * 100).toFixed(1) + '%');
                if (window.__AK_PAUSED_DOWNLOAD__) lines.push(window.__AK_PAUSED_DOWNLOAD__);
                el.textContent = lines.join('\n');
            } catch (error) {
                el.textContent = prefix + (error.name === 'AbortError' ? 'Stats timed out' : 'Stats unavailable: ' + error.message);
            } finally {
                clearTimeout(deadline); controller = null;
                if (!stopped && (el.isConnected || !attached)) timer = setTimeout(tick, 1000);
            }
        }
        tick();
        return el;
    }
    window.__torrentStats = function(getSelected, getServerUrl) {
        selected = getSelected; serverUrl = getServerUrl;
        return panel(getSelected, getServerUrl);
    };
    var infoPanel;
    function closeInfo() {
        if (infoPanel) { infoPanel.__stop(); infoPanel.remove(); infoPanel = null; }
        document.body.classList.remove('ak-info-open');
        document.querySelectorAll('.ak-stats-control').forEach(function(button) { button.setAttribute('aria-pressed', 'false'); });
    }
    window.__toggleTorrentStats = function(getSelected, getServerUrl) {
        if (typeof getSelected === 'function') selected = getSelected;
        if (typeof getServerUrl === 'function') serverUrl = getServerUrl;
        if (!selected || !location.hash.startsWith('#/player/')) return false;
        if (infoPanel && infoPanel.isConnected) { closeInfo(); return false; }
        else {
            infoPanel = panel(selected, serverUrl); infoPanel.dataset.info = 'true'; infoPanel.style.zIndex = '10000';
            document.body.classList.add('ak-info-open'); document.body.appendChild(infoPanel);
            document.querySelectorAll('.ak-stats-control').forEach(function(button) { button.setAttribute('aria-label', 'Stats'); button.setAttribute('aria-pressed', 'true'); });
            return true;
        }
    };
    document.addEventListener('keydown', function(event) {
        if (event.keyCode === 461 && infoPanel && infoPanel.isConnected) {
            event.preventDefault(); event.stopImmediatePropagation(); closeInfo(); return;
        }
        if (event.keyCode !== 457 || !selected || !location.hash.startsWith('#/player/')) return;
        event.preventDefault(); event.stopImmediatePropagation(); window.__toggleTorrentStats();
    }, true);
    window.addEventListener('hashchange', function() {
        if (!location.hash.startsWith('#/player/')) { closeInfo(); selected = null; serverUrl = null; }
    });
    // Before the native player opens a torrent, have the service warm the file and fetch an
    // MP4 index stored at the end. Never blocks playback on failure.
    var prepareController = null;
    function torrentPath(url) {
        try {
            var parsed = new URL(url, location.href);
            return parsed.origin === location.origin && /^\/[a-f0-9]{40}\/\d+$/i.test(parsed.pathname) ? parsed.pathname + parsed.search : null;
        } catch (_) { return null; }
    }
    window.__akPrepare = function(url) {
        var path = torrentPath(url);
        if (!path) return Promise.resolve();
        if (prepareController) prepareController.abort();
        var controller = prepareController = new AbortController(), started = Date.now();
        window.__AK_PREPARE_STATUS__ = 'Preparing torrent file…';
        var poll = setInterval(function() {
            fetch('/ak/prepare', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(function(data) {
                var job = (data.jobs || [])[0];
                if (!job || controller !== prepareController) return;
                var waited = Math.round((Date.now() - started) / 1000) + ' s';
                window.__AK_PREPARE_STATUS__ = 'Preparing file: ' + job.phase + (job.target ? ' ' + size(job.bytes) + ' / ' + size(job.target) : '') + ' · ' + waited;
            }).catch(function() {});
        }, 1000);
        return fetch('/ak/prepare', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: path }), signal: controller.signal
        }).then(function(r) { return r.json(); }).catch(function() {}).then(function() {
            clearInterval(poll);
            if (controller === prepareController) { prepareController = null; window.__AK_PREPARE_STATUS__ = ''; }
        });
    };
    // A cold torrent can make the native player report an unsupported source before data
    // arrives. Retry torrent streams in-app before the LG media player hand-off. Once a stream
    // has played, an error means the download fell behind: keep recovering in-app.
    window.__akShouldRetry = function(url, attempt, played) { return !!torrentPath(url) && attempt <= (played ? 30 : 2); };
    // Before reloading a stream that had played, wait (up to 90 s) until the service has read
    // ahead enough from where the player stopped.
    window.__akRecover = function(url) {
        var path = torrentPath(url);
        if (!path) return Promise.resolve();
        if (prepareController) prepareController.abort();
        var controller = prepareController = new AbortController(), started = Date.now(), file = path.split('?')[0].toLowerCase();
        var target = 48 * 1048576;
        window.__AK_PREPARE_STATUS__ = 'Download fell behind · waiting for the server…';
        return new Promise(function(resolve) {
            function finish() { clearInterval(poll); if (controller === prepareController) { prepareController = null; window.__AK_PREPARE_STATUS__ = ''; } resolve(); }
            var poll = setInterval(function() {
                if (controller.signal.aborted || Date.now() - started > 90000) return finish();
                fetch('/ak/status', { cache: 'no-store', signal: controller.signal }).then(function(r) { return r.json(); }).then(function(data) {
                    var reader = (data.readAhead && data.readAhead.readers || []).find(function(r) { return r.file === file && typeof r.ahead === 'number'; });
                    if (!reader) return finish();
                    if (reader.ahead >= target || reader.done) return finish();
                    window.__AK_PREPARE_STATUS__ = 'Download fell behind · buffering ' + size(reader.ahead) + ' / ' + size(target) + ' · ' + Math.round((Date.now() - started) / 1000) + ' s';
                }).catch(function() {});
            }, 1000);
        });
    };
    window.addEventListener('hashchange', function() {
        if (!location.hash.startsWith('#/player/') && prepareController) { prepareController.abort(); prepareController = null; window.__AK_PREPARE_STATUS__ = ''; }
    });
    // Renew a service-side lease while paused; the service keeps the Mac engine alive
    // even between TV UI ticks. Stop on play, navigation or app exit. No TV disk cache.
    var pauseBusy = false, pauseActive = false, pauseKey = '', pauseRenewed = 0, external = false;
    function stopPausedDownload() {
        if (!pauseActive && !pauseKey) return;
        pauseActive = false; pauseKey = ''; pauseRenewed = 0; window.__AK_PAUSED_DOWNLOAD__ = '';
        fetch('/ak/paused-download', { method: 'DELETE', keepalive: true }).catch(function() {});
    }
    async function syncPausedDownload() {
        if (pauseBusy) return;
        var video = document.querySelector('video'), item = selected && selected(), stream = item && item.stream;
        if (!external || !location.hash.startsWith('#/player/') || !video || !video.paused || video.readyState < 1 || video.ended || video.error || !stream || !stream.infoHash) {
            stopPausedDownload(); return;
        }
        var fileIdx = stream.fileIdx;
        if (!Number.isInteger(fileIdx)) {
            try {
                var match = new URL(video.currentSrc).pathname.match(/^\/([a-f0-9]{40})\/(\d+)(?:\/|$)/i);
                if (match && match[1].toLowerCase() === stream.infoHash.toLowerCase()) fileIdx = Number(match[2]);
            } catch (_) {}
        }
        if (!Number.isInteger(fileIdx)) return;
        var key = stream.infoHash + '/' + fileIdx;
        if (pauseActive && key === pauseKey && Date.now() - pauseRenewed < 20000) return;
        pauseBusy = true;
        try {
            var response = await fetch('/ak/paused-download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ infoHash: stream.infoHash, fileIdx: fileIdx }) });
            var status = await response.json();
            if (!response.ok) throw new Error(status.error || 'Server unavailable');
            pauseActive = status.active; pauseKey = key; pauseRenewed = Date.now();
            window.__AK_PAUSED_DOWNLOAD__ = status.error ? 'Paused download: ' + status.error : status.lastSuccess ? 'Mac download kept active while paused' : 'Starting Mac paused download…';
            if (!video.paused || !location.hash.startsWith('#/player/')) stopPausedDownload();
        } catch (error) {
            window.__AK_PAUSED_DOWNLOAD__ = 'Paused download: ' + error.message;
        } finally { pauseBusy = false; }
    }
    document.addEventListener('pause', syncPausedDownload, true);
    document.addEventListener('play', stopPausedDownload, true);
    // Leaving the player frees its memory buffers and stops its torrents right away.
    window.addEventListener('hashchange', function(event) {
        if (location.hash.startsWith('#/player/')) return;
        stopPausedDownload();
        if (/#\/player\//.test(event.oldURL || '')) navigator.sendBeacon('/ak/leave', '');
    });
    window.addEventListener('pagehide', function() {
        navigator.sendBeacon('/ak/paused-download', JSON.stringify({ stop: true }));
        navigator.sendBeacon('/ak/leave', '');
    });
    setInterval(syncPausedDownload, 5000);
    // Route the WASM core, tracks, subtitles and telemetry through one selected backend.
    // Each check serializes core state across the worker boundary, so check every 2 s only
    // until the URL is confirmed, then every 30 s and after navigation, never during playback.
    var syncing = false, confirmed = 0, nextSync = 0;
    async function syncServer() {
        if (!window.core || syncing) return;
        syncing = true;
        try {
            var state = await window.core.getState('ctx');
            if (!state || !state.profile || !state.profile.settings) return;
            // The core canonicalizes server URLs with a trailing slash.
            var endpoint = location.origin + '/';
            var settings = Object.assign({}, state.profile.settings, { streamingServerUrl: endpoint });
            if (state.profile.settings.streamingServerUrl !== endpoint) {
                confirmed = 0;
                await window.core.dispatch({ action: 'Ctx', args: { action: 'UpdateSettings', args: settings } }, 'ctx');
                await window.core.dispatch({ action: 'StreamingServer', args: { action: 'Reload' } }, 'streaming_server');
            } else confirmed++;
        } catch (error) { console.warn('Server setup sync:', error.message); }
        finally { syncing = false; }
    }
    setInterval(function() {
        if (location.hash.startsWith('#/player/') || Date.now() < nextSync) return;
        nextSync = Date.now() + (confirmed >= 3 ? 30000 : 2000);
        syncServer();
    }, 2000);
    window.addEventListener('hashchange', function() { nextSync = 0; });
    fetch('/ak/config').then(function(r) { return r.json(); }).then(function(data) {
        if (!data.configured) location.replace('/setup.html');
        external = data.config.mode === 'external';
        window.__AK_BACKEND_LABEL__ = data.config.mode === 'external' ? 'Mac / external server' : 'TV streaming server';
    }).catch(function(error) { console.warn('Playback setup unavailable:', error.message); });
})();
