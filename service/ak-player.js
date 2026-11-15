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
            var item = getSelected(), stream = item && item.stream;
            var base = getServerUrl() || location.origin;
            var seconds = bufferSeconds();
            var prefix = (el.dataset.info ? 'Live stats · Stats again or Back to close\n' : '') + (seconds === null ? '' : 'Playable buffer ' + seconds.toFixed(1) + ' s\n');
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
                var now = Date.now();
                // Derive upload from cumulative bytes: older server builds misreport uploadSpeed.
                var upload = previous && previous.key === key && data.uploaded >= previous.uploaded ?
                    (data.uploaded - previous.uploaded) * 1000 / Math.max(1, now - previous.time) : null;
                previous = { key: key, uploaded: data.uploaded || 0, time: now };
                var lines = [prefix + '↓ ' + size(data.downloadSpeed) + '/s    ↑ ' + (upload === null ? 'measuring…' : size(upload) + '/s'),
                    'Connected peers ' + (data.peers || 0) + '    Unchoked ' + (data.unchoked || 0) +
                    (typeof data.seeders === 'number' ? '    Seeders ' + data.seeders : ''),
                    'Known peers ' + (data.unique || 0) + '    Connection limit ' + (data.swarmSize || 0) + '    Downloaded ' + size(data.downloaded)];
                if (data.streamLen) lines.push('File pieces available ' + ((data.streamProgress || 0) * 100).toFixed(1) + '%');
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
    // Route the WASM core, tracks, subtitles and telemetry through one selected backend.
    var syncing = false;
    var sync = setInterval(async function() {
        if (!window.core || syncing) return;
        syncing = true;
        try {
            var state = await window.core.getState('ctx');
            if (!state || !state.profile || !state.profile.settings) return;
            // The core canonicalizes server URLs with a trailing slash.
            var endpoint = location.origin + '/';
            var settings = Object.assign({}, state.profile.settings, { streamingServerUrl: endpoint });
            if (state.profile.settings.streamingServerUrl !== endpoint) {
                await window.core.dispatch({ action: 'Ctx', args: { action: 'UpdateSettings', args: settings } }, 'ctx');
                await window.core.dispatch({ action: 'StreamingServer', args: { action: 'Reload' } }, 'streaming_server');
            }
        } catch (error) { console.warn('Server setup sync:', error.message); }
        finally { syncing = false; }
    }, 2000);
    fetch('/ak/config').then(function(r) { return r.json(); }).then(function(data) {
        if (!data.configured) location.replace('/setup.html');
        window.__AK_BACKEND_LABEL__ = data.config.mode === 'external' ? 'Mac / external server' : 'TV streaming server';
    }).catch(function(error) { console.warn('Playback setup unavailable:', error.message); });
})();
