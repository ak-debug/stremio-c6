const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createApp } = require('../service/proxy');
const { parseRange } = require('../service/read-ahead');

const HASH = 'cd'.repeat(20), MiB = 1048576;
async function listen(server) {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
}
// Range server; `cut` drops the first large response after that many bytes.
function backendFor(file, log, cut) {
    let dropped = false;
    return http.createServer((req, res) => {
        const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || 'bytes=0-');
        const start = Number(m[1]), end = m[2] ? Math.min(Number(m[2]), file.length - 1) : file.length - 1;
        log.push(req.headers.range);
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${file.length}`, 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4', 'transferMode.dlna.org': 'Streaming' });
        if (cut && !dropped && end - start > MiB) { dropped = true; res.write(file.subarray(start, start + cut)); return setTimeout(() => res.destroy(), 20); }
        res.end(file.subarray(start, end + 1));
    });
}
async function setup(file, cut, readAheadOptions) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stremio-ak-ra-'));
    const log = [];
    const backend = backendFor(file, log, cut);
    const target = await listen(backend);
    const proxy = createApp({ www: directory, configFile: path.join(directory, 'config.json'), target, ensureLocal: async () => {}, readAhead: true,
        readAheadOptions: Object.assign({ maxAhead: 4 * MiB, minAhead: MiB, behind: MiB, segment: 2 * MiB, memory: () => null }, readAheadOptions) });
    const base = await listen(proxy);
    return { log, base, done: async () => { await close(proxy); await close(backend); fs.rmSync(directory, { recursive: true }); } };
}
const status = async base => (await (await fetch(base + '/ak/status')).json()).readAhead;

test('parses player Range headers', () => {
    assert.deepEqual(parseRange(undefined), { start: 0, end: null });
    assert.deepEqual(parseRange('bytes=10-'), { start: 10, end: null });
    assert.deepEqual(parseRange('bytes=10-19'), { start: 10, end: 19 });
    assert.equal(parseRange('bytes=10-5'), null);
    assert.equal(parseRange('bytes=-500'), null);
});

test('serves exact bytes through the read-ahead buffer, from the start and after a seek', async () => {
    const file = crypto.randomBytes(12 * MiB);
    const t = await setup(file);
    try {
        let reply = await fetch(`${t.base}/${HASH}/0`, { headers: { Range: 'bytes=0-' } });
        assert.equal(reply.status, 206);
        assert.equal(reply.headers.get('content-range'), `bytes 0-${file.length - 1}/${file.length}`);
        assert.equal(reply.headers.get('transfermode.dlna.org'), 'Streaming');
        assert.ok(Buffer.from(await reply.arrayBuffer()).equals(file));
        const at = 7 * MiB + 123;
        reply = await fetch(`${t.base}/${HASH}/0`, { headers: { Range: `bytes=${at}-` } });
        assert.ok(Buffer.from(await reply.arrayBuffer()).equals(file.subarray(at)));
        // Every server request is a closed segment, so none is ever cut short.
        for (const range of t.log) { const [a, b] = range.slice(6).split('-').map(Number); assert.ok(b >= a && b - a < 2 * MiB, range); }
    } finally { await t.done(); }
});

test('reads ahead of a slow player up to the limit, then pauses', async () => {
    const file = crypto.randomBytes(16 * MiB);
    const t = await setup(file);
    try {
        const reply = await fetch(`${t.base}/${HASH}/1`, { headers: { Range: 'bytes=0-' } });
        const reader = reply.body.getReader();
        await reader.read();
        let state;
        for (let n = 0; n < 50; n++) { state = await status(t.base); if (state.readers[0] && state.readers[0].paused) break; await new Promise(r => setTimeout(r, 20)); }
        const r = state.readers[0];
        assert.equal(r.clients, 1); assert.equal(r.paused, true);
        assert.ok(r.ahead >= 3 * MiB && r.held < 8 * MiB, JSON.stringify(r));
        await reader.cancel();
    } finally { await t.done(); }
});

test('passes small index probes straight through and reconnects after a dropped connection', async () => {
    const file = crypto.randomBytes(10 * MiB);
    const t = await setup(file, 1.5 * MiB);
    try {
        let reply = await fetch(`${t.base}/${HASH}/0`, { headers: { Range: `bytes=${file.length - 16}-${file.length - 1}` } });
        assert.ok(Buffer.from(await reply.arrayBuffer()).equals(file.subarray(-16)));
        assert.equal(t.log[0], `bytes=${file.length - 16}-${file.length - 1}`);
        assert.equal((await status(t.base)).readers.length, 0);
        reply = await fetch(`${t.base}/${HASH}/0`, { headers: { Range: 'bytes=0-' } });
        assert.ok(Buffer.from(await reply.arrayBuffer()).equals(file));
        assert.equal(t.log[1], `bytes=0-${2 * MiB - 1}`);
        assert.equal(t.log[2], `bytes=${1.5 * MiB}-${3.5 * MiB - 1}`, t.log.join(' '));
    } finally { await t.done(); }
});

test('stops a torrent on the server after the TV is done with it, unless kept alive', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stremio-ak-clean-'));
    const removed = [], file = crypto.randomBytes(MiB);
    let selections = 3;
    const backend = http.createServer((req, res) => {
        if (/\/remove$/.test(req.url)) { removed.push(req.url); return res.end('{}'); }
        if (req.url === '/stats.json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ [HASH]: { selections: new Array(selections).fill({}) } })); }
        res.writeHead(206, { 'Content-Range': `bytes 0-15/${file.length}`, 'Content-Length': 16 }); res.end(file.subarray(0, 16));
    });
    const target = await listen(backend);
    fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({ mode: 'external', serverUrl: 'http://192.168.0.9:11470' }));
    const proxy = createApp({ www: directory, configFile: path.join(directory, 'config.json'), target, readAhead: false, cleanupOptions: { delay: 60, interval: 3600000, leakLimit: 10 } });
    const base = await listen(proxy);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    try {
        await (await fetch(`${base}/${HASH}/0`, { headers: { Range: 'bytes=0-15' } })).arrayBuffer();
        await wait(20);
        await (await fetch(`${base}/${HASH}/0`, { headers: { Range: 'bytes=0-15' } })).arrayBuffer();
        await wait(40);
        assert.equal(removed.length, 0, 'a new request within the delay keeps the torrent');
        await wait(80);
        assert.deepEqual(removed, [`/${HASH}/remove`]);
        assert.equal((await (await fetch(base + '/ak/status')).json()).cleanup.log[0].action, 'stopped after playback');
    } finally { await close(proxy); await close(backend); fs.rmSync(directory, { recursive: true }); }
});

test('cleanup skips torrents kept for paused downloading and refreshes leaky torrents in use', async () => {
    const { createEngineCleanup } = require('../service/engine-cleanup');
    const removed = [];
    let selections = 50;
    const backend = http.createServer((req, res) => {
        if (/\/remove$/.test(req.url)) { removed.push(req.url); return res.end('{}'); }
        res.end(JSON.stringify({ [HASH]: { selections: new Array(selections).fill({}) } }));
    });
    const target = await listen(backend);
    let keep = true, canRefresh = false;
    const cleanup = createEngineCleanup({ backend: () => target, delay: 30, interval: 3600000, leakLimit: 40, keep: () => keep, canRefresh: () => canRefresh });
    try {
        const release = cleanup.hold(HASH);
        await cleanup.check(); assert.equal(removed.length, 0, 'not refreshed without enough read-ahead');
        canRefresh = true; await cleanup.check(); assert.equal(removed.length, 1);
        await cleanup.check(); assert.equal(removed.length, 1, 'refreshes are rate limited');
        release();
        await new Promise(r => setTimeout(r, 80)); assert.equal(removed.length, 1, 'kept while paused downloading');
        keep = false;
        await new Promise(r => setTimeout(r, 80)); assert.equal(removed.length, 2);
    } finally { cleanup.shutdown(); await close(backend); }
});

test('keeps reading ahead while a player that was streaming reconnects, then serves it from the buffer', async () => {
    const file = crypto.randomBytes(24 * MiB);
    const t = await setup(file, 0, { resumeAfter: 2 * MiB, maxAhead: 8 * MiB, behind: 32 * MiB });
    try {
        const control = new AbortController();
        const reply = await fetch(`${t.base}/${HASH}/0`, { headers: { Range: 'bytes=0-' }, signal: control.signal });
        const reader = reply.body.getReader();
        let got = 0;
        while (got < 3 * MiB) got += (await reader.read()).value.length;
        control.abort();
        let state;
        for (let n = 0; n < 100; n++) {
            await new Promise(r => setTimeout(r, 20));
            state = (await status(t.base)).readers[0];
            if (state && state.clients === 0 && state.ahead >= 7 * MiB) break;
        }
        assert.equal(state.clients, 0); assert.ok(state.ahead >= 7 * MiB, JSON.stringify(state));
        // The reloading player re-reads the header, then resumes just behind where it stopped.
        await (await fetch(`${t.base}/${HASH}/0`, { headers: { Range: 'bytes=0-1023' } })).arrayBuffer();
        const before = t.log.length, at = 2 * MiB;
        const again = await fetch(`${t.base}/${HASH}/0`, { headers: { Range: `bytes=${at}-${at + 4 * MiB - 1}` } });
        assert.ok(Buffer.from(await again.arrayBuffer()).equals(file.subarray(at, at + 4 * MiB)));
        assert.ok(t.log.slice(before).every(range => !range.startsWith(`bytes=${at}-`)), 'resumed from the buffer: ' + t.log.slice(before).join(' '));
    } finally { await t.done(); }
});
