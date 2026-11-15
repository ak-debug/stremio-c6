// Inspect only this app through the SSH-forwarded webOS debugger.
const fs = require('node:fs');
const path = require('node:path');
(async () => {
    const [mode, file] = process.argv.slice(2);
    const port = process.env.STREMIO_INSPECT_PORT || '63119';
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(item => item.description === 'io.github.akdebug.stremio');
    if (!target) throw new Error('Stremio AK debugger target not found.');
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        if (!pending.has(data.id)) return;
        const item = pending.get(data.id); pending.delete(data.id); clearTimeout(item.timer);
        if (data.error) item.reject(new Error(data.error.message)); else item.resolve(data.result);
    });
    function command(method, params = {}) {
        return new Promise((resolve, reject) => {
            const requestId = ++id;
            const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`Debugger timeout: ${method}`)); }, 30000);
            pending.set(requestId, { resolve, reject, timer });
            socket.send(JSON.stringify({ id: requestId, method, params }));
        });
    }
    try {
        if (mode === 'screenshot') {
            const result = await command('Page.captureScreenshot', { format: 'png' });
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
            console.log(`Saved ${file}`);
        } else if (mode === 'eval') {
            const result = await command('Runtime.evaluate', { expression: fs.readFileSync(file, 'utf8'), awaitPromise: true, returnByValue: true });
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + (result.exceptionDetails.exception?.description || ''));
            console.log(JSON.stringify(result.result.value));
        } else throw new Error('Usage: node tools/device-inspect.cjs eval expression.js | screenshot image.png');
    } finally { socket.close(); setTimeout(() => process.exit(process.exitCode || 0), 200); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
