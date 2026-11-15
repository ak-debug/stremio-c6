// Adapted from jrubimf/StremioR, pinned a31b4abc.
        // Sort streams by seeders (Torrentio/MediaFusion "👤 123", or "Seeders: 123"); streams without a count keep their order at the end.
        window.__sortStreams = function(streams) {
            return streams.map(function(s, i) {
                var m = /(?:👤|seeders?:?|seeds?:?)\s*(\d+)/i.exec((s.description || s.title || '') + ' ' + (s.name || ''));
                return { s: s, i: i, p: m ? +m[1] : -1 };
            }).sort(function(a, b) { return b.p - a.p || a.i - b.i; }).map(function(x) { return x.s; });
        };

        // Stream card body built from Torrentio's description ("[pack]\nfile\n👤 12 💾 1.4 GB ⚙️ src\nMulti Audio / 🇬🇧 / 🇫🇷"):
        // stats first, then quality tags from the file name, then languages, then the file name (which used to push the rest out).
        var LANG = { GB: 'EN', US: 'EN', ES: 'ES', MX: 'ES-LA', PT: 'PT', BR: 'PT-BR', FR: 'FR', DE: 'DE', IT: 'IT', RU: 'RU', UA: 'UK', PL: 'PL', NL: 'NL',
            JP: 'JA', KR: 'KO', CN: 'ZH', TW: 'ZH-TW', IN: 'HI', SA: 'AR', TR: 'TR', SE: 'SV', DK: 'DA', NO: 'NO', FI: 'FI', GR: 'EL', CZ: 'CS', HU: 'HU', RO: 'RO', IL: 'HE', TH: 'TH', VN: 'VI', ID: 'ID' };
        var TAGS = [[/\b(2160p|4k|uhd)\b/i, '4K'], [/\b1080p\b/i, '1080p'], [/\b720p\b/i, '720p'], [/\b(480p|576p)\b/i, 'SD'],
            [/\b(dv|dovi|dolby[ .]?vision)\b/i, 'DV'], [/\bhdr10(\+|plus)/i, 'HDR10+'], [/\bhdr(10)?\b/i, 'HDR'],
            [/\bremux\b/i, 'REMUX'], [/\b(blu-?ray|bdrip|brrip)\b/i, 'BluRay'], [/\bweb-?(dl|rip)?\b/i, 'WEB'],
            [/\b(x265|hevc|h\.?265)\b/i, 'HEVC'], [/\bav1\b/i, 'AV1'], [/\b(x264|h\.?264|avc)\b/i, 'H.264'], [/\b10[ -]?bit\b/i, '10bit'],
            [/\batmos\b/i, 'Atmos'], [/\btrue-?hd\b/i, 'TrueHD'], [/\bdts(-?hd|-?x)?\b/i, 'DTS'], [/\b(ddp|dd\+|eac3)/i, 'DD+'], [/(^|[^\d.])7\.1(?!\d)/, '7.1'], [/(^|[^\d.])5\.1(?!\d)/, '5.1']];
        window.__streamCard = function(stream) {
            var lines = (stream.description || stream.title || '').split('\n'), stat = -1;
            for (var i = 0; i < lines.length; i++) if (/👤|💾/.test(lines[i])) { stat = i; break; }
            var statLine = stat >= 0 ? lines[stat] : '', files = stat >= 0 ? lines.slice(0, stat) : lines,
                langLine = stat >= 0 ? lines.slice(stat + 1).join(' / ') : '',
                seeds = /👤\s*(\d+)/.exec(statLine), size = /💾\s*([\d.,]+\s*[KMGT]i?B)/i.exec(statLine), src = /⚙️\s*(.+)$/.exec(statLine);
            var text = files.join(' ') + ' ' + (stream.name || ''), tags = [], seen = {};
            TAGS.forEach(function(t) { if (t[0].test(text) && !seen[t[1]]) { seen[t[1]] = 1; tags.push(t[1]); } });
            if (seen.HDR && seen['HDR10+']) tags.splice(tags.indexOf('HDR'), 1);
            var langs = langLine.replace(/([\uD83C][\uDDE6-\uDDFF]){2}/g, function(f) {
                var cc = String.fromCharCode(f.charCodeAt(1) - 0xDDE6 + 65, f.charCodeAt(3) - 0xDDE6 + 65);
                return LANG[cc] || cc;
            }).split(/\s*\/\s*/).filter(Boolean).join(' · ');
            var root = document.createElement('div');
            function row(cls, txt) { if (!txt) return; var d = document.createElement('div'); d.className = cls; d.textContent = txt; root.appendChild(d); return d; }
            root.className = 'sc';
            var n = seeds ? +seeds[1] : -1, s = row('sc-stats', [seeds && '👤 ' + seeds[1], size && '💾 ' + size[1], src && '⚙ ' + src[1].trim()].filter(Boolean).join('    '));
            if (s && n >= 0) s.style.color = n >= 50 ? '#5fe08f' : n >= 10 ? '#f0d36a' : '#f07a6a';
            row('sc-tags', tags.join('  '));
            row('sc-langs', langs && '🗣 ' + langs);
            row('sc-file', files[files.length - 1]);
            if (!root.firstChild) row('sc-file', stream.description || '');
            return root;
        };

