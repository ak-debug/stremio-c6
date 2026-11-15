const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../service/proxy');
const { createPrepare, parseRequest, boxHeader } = require('../service/prepare');

const HASH = 'ab'.repeat(20);
async function listen(server) {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
}
function box(type, size) {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(size, 0); header.write(type, 4, 'latin1');
    return header;
}
// ftyp, free, mdat, then moov at the end, like the iTunes releases that failed on the TV.
function mp4(indexAtEnd) {
    const ftyp = Buffer.concat([box('ftyp', 32), Buffer.alloc(24)]);
    const free = Buffer.concat([box('free', 100000), Buffer.alloc(100000 - 8)]);
    const moov = Buffer.concat([box('moov', 300000), Buffer.alloc(300000 - 8, 7)]);
    const mdat = Buffer.concat([box('mdat', 500000), Buffer.alloc(500000 - 8, 1)]);
    return indexAtEnd ? Buffer.concat([ftyp, free, mdat, moov]) : Buffer.concat([ftyp, moov, mdat]);
}
function serve(file, log, delay) {
    return http.createServer((req, res) => {
        const match = /bytes=(\d+)-(\d+)/.exec(req.headers.range || '');
        const start = Number(match[1]), end = Math.min(Number(match[2]), file.length - 1);
        log.push([req.url, start, end]);
        setTimeout(() => {
            res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${file.length}`, 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4' });
            res.end(file.subarray(start, end + 1));
        }, delay || 0);
    });
}

test('accepts only torrent media paths and parses MP4 box headers', () => {
    assert.deepEqual(parseRequest(`/${HASH}/1?tr=dht%3A${HASH}`), { path: `/${HASH}/1`, search: `?tr=dht%3A${HASH}`, key: `/${HASH}/1` });
    for (const value of ['/settings', `//evil.example/${HASH}/1`, `http://evil.example/${HASH}/1`, `/${HASH}/1/stats.json`, `/${HASH}/x`, 42]) {
        assert.throws(() => parseRequest(value));
    }
    assert.deepEqual(boxHeader(box('moov', 4096), 0, 10000), { type: 'moov', size: 4096, header: 8 });
    const large = Buffer.alloc(16); large.writeUInt32BE(1, 0); large.write('mdat', 4, 'latin1'); large.writeBigUInt64BE(25777506350n, 8);
    assert.equal(boxHeader(large, 0, 3e10).size, 25777506350);
    assert.equal(boxHeader(Buffer.from('garbage!'), 0, 100), null);
});

test('fetches an MP4 index stored at the end of the file, then caches the result', async () => {
    const file = mp4(true), log = [];
    const backend = serve(file, log);
    const target = await listen(backend);
    const prepare = createPrepare({ backend: () => target });
    try {
        const result = await prepare.prepare({ url: `/${HASH}/0?tr=x` });
        assert.equal(result.container, 'mp4'); assert.equal(result.indexAt, 600032); assert.equal(result.indexAtEnd, true);
        assert.deepEqual(log.slice(-2), [[`/${HASH}/0?tr=x`, 600032, file.length - 1], [`/${HASH}/0?tr=x`, 100040, 600031]]);
        const before = log.length;
        assert.equal((await prepare.prepare({ url: `/${HASH}/0?tr=x` })).cached, true);
        assert.equal(log.length, before);
    } finally { prepare.shutdown(); await close(backend); }
});

test('does not refetch an index already at the start, and leaves other containers alone', async () => {
    const log = [];
    const backend = serve(mp4(false), log);
    const target = await listen(backend);
    const prepare = createPrepare({ backend: () => target });
    try {
        const result = await prepare.prepare({ url: `/${HASH}/0` });
        assert.equal(result.indexAtEnd, false);
        assert.ok(log.every(([, start]) => start < 300040), 'only the head and the rest of the leading index were read');
    } finally { prepare.shutdown(); await close(backend); }
    const mkv = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(200000)]), mkvLog = [];
    const mkvBackend = serve(mkv, mkvLog);
    const mkvTarget = await listen(mkvBackend);
    const other = createPrepare({ backend: () => mkvTarget });
    try {
        assert.equal((await other.prepare({ url: `/${HASH}/2` })).container, 'other');
        assert.equal(mkvLog.length, 1);
    } finally { other.shutdown(); await close(mkvBackend); }
});

test('shares one job between waiters and cancels it when the last waiter leaves', async () => {
    const log = [];
    let closed;
    const upstreamClosed = new Promise(resolve => closed = resolve);
    const backend = http.createServer((req, res) => { log.push(req.url); req.on('close', closed); });
    const target = await listen(backend);
    const prepare = createPrepare({ backend: () => target });
    try {
        const one = new AbortController(), two = new AbortController();
        const first = prepare.prepare({ url: `/${HASH}/0` }, one.signal), second = prepare.prepare({ url: `/${HASH}/0` }, two.signal);
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.equal(log.length, 1);
        assert.equal(prepare.state().jobs[0].phase, 'waiting for first data');
        one.abort(); await assert.rejects(first);
        assert.equal(prepare.state().jobs.length, 1);
        two.abort(); await assert.rejects(second);
        await Promise.race([upstreamClosed, new Promise((_, reject) => setTimeout(() => reject(new Error('Upstream was not cancelled')), 1500).unref())]);
        assert.equal(prepare.state().jobs.length, 0);
    } finally { prepare.shutdown(); await close(backend); }
});

test('proxy prepare endpoint validates input, rejects other origins and reports results', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stremio-ak-prepare-'));
    const log = [];
    const backend = serve(mp4(true), log, 20);
    const target = await listen(backend);
    const proxy = createApp({ www: directory, configFile: path.join(directory, 'config.json'), target, ensureLocal: async () => {} });
    const base = await listen(proxy);
    const post = (body, headers) => fetch(base + '/ak/prepare', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(body) });
    try {
        let reply = await post({ url: `/${HASH}/0` }, { Origin: 'https://other.example' });
        assert.equal(reply.status, 403); assert.equal(log.length, 0);
        reply = await post({ url: '/settings' }); assert.equal(reply.status, 502);
        reply = await post({ url: `/${HASH}/0` });
        const result = await reply.json();
        assert.equal(reply.status, 200); assert.equal(result.ready, true); assert.equal(result.indexAtEnd, true);
        reply = await fetch(base + '/ak/prepare'); assert.deepEqual(await reply.json(), { jobs: [] });
    } finally { await close(proxy); await close(backend); fs.rmSync(directory, { recursive: true }); }
});
