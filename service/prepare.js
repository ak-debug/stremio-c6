'use strict';
var http = require('http');
var https = require('https');

// Warm a torrent file before the TV player opens it. MP4 web releases often store their
// index (moov) after the media data, at the end of a multi-GB file. The webOS player gives
// up while a cold torrent fetches it, so read the head and the index here first.
var MEDIA_PATH = /^\/([a-f0-9]{40})\/(\d{1,6})$/i;
var HEAD_BYTES = 65536, OPENING_BYTES = 16 * 1048576, MAX_INDEX_BYTES = 128 * 1048576, MAX_BOXES = 32;

function parseRequest(value) {
    if (typeof value !== 'string' || value.length > 8192) throw new Error('A torrent media path is required.');
    var url;
    try { url = new URL(value, 'http://local'); } catch (_) { throw new Error('A torrent media path is required.'); }
    if (url.origin !== 'http://local' || !MEDIA_PATH.test(url.pathname)) throw new Error('A torrent media path is required.');
    return { path: url.pathname.toLowerCase(), search: url.search, key: url.pathname.toLowerCase() };
}

function boxHeader(buffer, offset, total) {
    if (buffer.length < 8) return null;
    var size = buffer.readUInt32BE(0), type = buffer.toString('latin1', 4, 8), header = 8;
    if (size === 1) {
        if (buffer.length < 16) return null;
        size = Number(buffer.readBigUInt64BE(8)); header = 16;
    } else if (size === 0) size = total - offset;
    if (!/^[\x20-\x7e]{4}$/.test(type) || size < header || size > total - offset) return null;
    return { type: type, size: size, header: header };
}

function createPrepare(options) {
    var cacheTtl = options.cacheTtl || 5 * 60000, deadline = options.timeout || 150000;
    var jobs = new Map(), done = new Map();

    function request(job, start, end, keep) {
        return new Promise(function(resolve, reject) {
            var url = new URL(job.path + job.search, job.backend);
            var req = (url.protocol === 'https:' ? https : http).request(url, {
                headers: { Range: 'bytes=' + start + '-' + end }, agent: options.agent && options.agent(url.protocol)
            }, function(res) {
                if (res.statusCode !== 206 && res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error('Server returned HTTP ' + res.statusCode));
                }
                var range = /\/(\d+)$/.exec(res.headers['content-range'] || '');
                var total = range ? Number(range[1]) : Number(res.headers['content-length']) || null;
                var want = end - start + 1, chunks = [], received = 0;
                // Ignore a whole-file 200 response unless it starts where we asked.
                if (res.statusCode === 200 && start > 0) { res.destroy(); return reject(new Error('Server does not support ranges.')); }
                res.on('data', function(chunk) {
                    var take = Math.min(chunk.length, want - received);
                    received += take; job.bytes += take;
                    if (keep && take) chunks.push(take === chunk.length ? chunk : chunk.subarray(0, take));
                    if (received >= want) { res.destroy(); finish(); }
                });
                res.on('end', finish);
                res.on('error', function(error) { if (received < want) reject(error); });
                function finish() { resolve({ buffer: keep ? Buffer.concat(chunks) : null, total: total, received: received }); }
            });
            job.requests.add(req);
            req.on('close', function() { job.requests.delete(req); });
            req.setTimeout(90000, function() { req.destroy(new Error('Server did not send data in time.')); });
            req.on('error', reject);
            req.end();
        });
    }

    async function run(job) {
        job.phase = 'waiting for first data';
        var head = await request(job, 0, HEAD_BYTES - 1, true);
        var total = head.total;
        if (head.buffer.length < 12 || head.buffer.toString('latin1', 4, 8) !== 'ftyp' || !total) return { container: 'other' };
        var offset = 0, mediaAt = null;
        for (var count = 0; count < MAX_BOXES && offset + 8 <= total; count++) {
            var bytes = offset + 16 <= head.buffer.length ? head.buffer.subarray(offset, offset + 16) :
                (await request(job, offset, Math.min(offset + 15, total - 1), true)).buffer;
            var box = boxHeader(bytes, offset, total);
            if (!box) break;
            if (box.type === 'mdat' && mediaAt === null) mediaAt = offset + box.header;
            if (box.type === 'moov') {
                var end = Math.min(offset + box.size, total) - 1;
                var from = Math.max(offset, head.buffer.length);
                if (end - offset + 1 > MAX_INDEX_BYTES) return { container: 'mp4', indexAt: offset, indexBytes: box.size, skipped: 'index too large' };
                if (from <= end) {
                    job.phase = offset > head.buffer.length ? 'fetching MP4 index from end of file' : 'fetching MP4 index';
                    job.target = end - from + 1; job.bytes = 0;
                    await request(job, from, end, false);
                }
                // The player then needs the opening video data within its startup timeout as well.
                if (mediaAt !== null) {
                    var openFrom = Math.max(mediaAt, head.buffer.length), openTo = Math.min(mediaAt + OPENING_BYTES, offset) - 1;
                    if (openFrom <= openTo) {
                        job.phase = 'fetching opening video'; job.target = openTo - openFrom + 1; job.bytes = 0;
                        await request(job, openFrom, openTo, false);
                    }
                }
                return { container: 'mp4', indexAt: offset, indexBytes: box.size, indexAtEnd: offset > total / 2 };
            }
            offset += box.size;
        }
        return { container: 'mp4', indexAt: null };
    }

    function state() {
        return { jobs: Array.from(jobs.values()).map(function(job) {
            return { key: job.key, phase: job.phase, bytes: job.bytes, target: job.target };
        }) };
    }

    function prepare(input, signal) {
        var target = parseRequest(input && input.url);
        var backend = options.backend();
        var key = backend + target.key, now = Date.now();
        var cached = done.get(key);
        if (cached && now - cached.at < cacheTtl) return Promise.resolve(Object.assign({ cached: true }, cached.result));
        var job = jobs.get(key);
        if (!job) {
            job = { key: target.key, backend: backend, path: target.path, search: target.search, phase: 'starting',
                bytes: 0, target: null, waiters: 0, requests: new Set(), started: now, aborted: false };
            jobs.set(key, job);
            var timer = setTimeout(function() { abort(job, 'Preparing the file took too long.'); }, deadline);
            job.promise = run(job).then(function(result) {
                result = Object.assign({ ready: true, ms: Date.now() - job.started }, result);
                done.set(key, { at: Date.now(), result: result });
                if (done.size > 50) done.delete(done.keys().next().value);
                return result;
            }, function(error) {
                throw job.reason ? new Error(job.reason) : error;
            }).finally(function() { clearTimeout(timer); if (jobs.get(key) === job) jobs.delete(key); });
            job.promise.catch(function() {});
        }
        job.waiters++;
        return new Promise(function(resolve, reject) {
            var settled = false;
            function leave() {
                if (settled) return;
                settled = true;
                if (--job.waiters <= 0) abort(job, 'Preparation cancelled.');
            }
            if (signal) signal.addEventListener('abort', function() { leave(); reject(new Error('Preparation cancelled.')); }, { once: true });
            job.promise.then(function(result) { if (!settled) { settled = true; job.waiters--; resolve(result); } },
                function(error) { if (!settled) { settled = true; job.waiters--; reject(error); } });
        });
    }

    function abort(job, reason) {
        if (job.aborted) return;
        job.aborted = true; job.reason = reason;
        job.requests.forEach(function(req) { req.destroy(new Error(reason)); });
        jobs.forEach(function(value, key) { if (value === job) jobs.delete(key); });
    }

    function shutdown() { jobs.forEach(function(job) { abort(job, 'Service stopping.'); }); done.clear(); }

    return { prepare: prepare, state: state, shutdown: shutdown, clear: function() { done.clear(); } };
}

module.exports = { createPrepare: createPrepare, parseRequest: parseRequest, boxHeader: boxHeader };
