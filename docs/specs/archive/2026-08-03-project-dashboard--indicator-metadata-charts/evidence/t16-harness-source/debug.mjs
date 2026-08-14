const CDP_PORT = 9333;
const BASE = `http://127.0.0.1:${CDP_PORT}`;
const HARNESS_URL = 'http://localhost:8934/';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const info = await (await fetch(BASE + '/json/version')).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });

  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });
  function send(method, params = {}, sessionId) {
    const mid = ++id;
    const payload = { id: mid, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => { pending.set(mid, { resolve, reject }); ws.send(JSON.stringify(payload)); });
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);

  await send('Page.navigate', { url: HARNESS_URL }, sessionId);
  await sleep(6000);

  console.log('--- events (method names) ---');
  const counts = {};
  for (const e of events) counts[e.method] = (counts[e.method] || 0) + 1;
  console.log(JSON.stringify(counts, null, 2));

  console.log('--- exceptions ---');
  for (const e of events) {
    if (e.method === 'Runtime.exceptionThrown') console.log(JSON.stringify(e.params, null, 2));
  }
  console.log('--- console API calls ---');
  for (const e of events) {
    if (e.method === 'Runtime.consoleAPICalled') {
      console.log(e.params.type, (e.params.args || []).map(a => a.value ?? a.description).join(' '));
    }
  }
  console.log('--- Log.entryAdded ---');
  for (const e of events) {
    if (e.method === 'Log.entryAdded') console.log(JSON.stringify(e.params.entry));
  }

  const evalRes = await send('Runtime.evaluate', { expression: 'document.body.innerHTML.length + "|" + document.title + "|" + location.href', returnByValue: true }, sessionId);
  console.log('--- body length/title/href ---', evalRes.result.value);

  const rootRes = await send('Runtime.evaluate', { expression: 'document.querySelector("app-t16-harness") ? "harness-present" : (document.querySelector("app-root") ? "app-root-present-empty" : "neither")', returnByValue: true }, sessionId);
  console.log('--- root check ---', rootRes.result.value);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
