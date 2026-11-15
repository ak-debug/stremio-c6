(function() {
    'use strict';
    var mode = document.getElementById('mode'), profile = document.getElementById('profile'), url = document.getElementById('url'), status = document.getElementById('status');
    var busy = false;
    function update() {
        document.getElementById('local').hidden = mode.value !== 'tv';
        document.getElementById('external').hidden = mode.value !== 'external';
    }
    mode.addEventListener('change', update);
    async function save(test) {
        if (busy) return;
        busy = true; status.textContent = 'Saving…';
        try {
            var response = await fetch('/ak/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: mode.value, profile: profile.value, serverUrl: url.value.trim() }) });
            var data = await response.json(); if (!response.ok) throw new Error(data.error);
            if (test) {
                status.textContent = 'Connecting…';
                response = await fetch('/ak/check'); data = await response.json();
                if (!response.ok) throw new Error(data.error);
                status.textContent = 'Connected — server ' + data.version + (mode.value === 'external' ? '. Disk cache is controlled on the Mac.' : '. RAM buffering is active.');
            } else location.href = '/';
        } catch (error) { status.textContent = error.message; }
        finally { busy = false; }
    }
    document.getElementById('save').onclick = function() { save(false); };
    document.getElementById('check').onclick = function() { save(true); };
    document.getElementById('cancel').onclick = function() { location.href = '/'; };
    // Ordinary form controls need explicit D-pad focus movement on TV.
    document.addEventListener('keydown', function(event) {
        if (event.keyCode === 461) { event.preventDefault(); location.href = '/'; return; }
        var controls = Array.from(document.querySelectorAll('select,input,button')).filter(function(el) { return el.offsetParent !== null; });
        if (event.target.tagName === 'SELECT' && [37,39].includes(event.keyCode)) {
            event.preventDefault();
            var select = event.target;
            select.selectedIndex = (select.selectedIndex + (event.keyCode === 39 ? 1 : select.options.length - 1)) % select.options.length;
            select.dispatchEvent(new Event('change')); return;
        }
        if (event.target.tagName === 'INPUT' && [37,39].includes(event.keyCode)) return;
        if (['SELECT','INPUT'].includes(event.target.tagName) && event.keyCode === 13) {
            event.preventDefault(); controls[(controls.indexOf(event.target) + 1) % controls.length].focus(); return;
        }
        var index = controls.indexOf(document.activeElement), step = [39,40].includes(event.keyCode) ? 1 : [37,38].includes(event.keyCode) ? -1 : 0;
        if (step) { event.preventDefault(); controls[(index + step + controls.length) % controls.length].focus(); }
    });
    fetch('/ak/config').then(function(r) { return r.json(); }).then(function(data) {
        mode.value = data.config.mode; profile.value = data.config.profile; url.value = data.config.serverUrl || ''; update(); mode.focus();
    }).catch(function(error) { status.textContent = error.message; });
})();
