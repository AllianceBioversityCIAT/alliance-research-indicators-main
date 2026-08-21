// T-16 CDP driver — real headless Chrome, real component build, no puppeteer
// dependency (none installed in this repo). Uses Node 22's built-in
// WebSocket + fetch to talk to chrome-headless-shell's DevTools protocol
// directly: navigate, resize the viewport via Emulation.setDeviceMetricsOverride
// (no relaunch needed per width), evaluate JS for layout measurements, and
// dispatch a REAL trusted Input.dispatchKeyEvent for the Page Down probe
// (a page-JS `dispatchEvent(new KeyboardEvent(...))` is NOT trusted and does
// not trigger native scroll-on-keypress — this is why CDP is used instead of
// a plain --dump-dom probe for that one observation).

const CDP_PORT = 9333;
const BASE = `http://127.0.0.1:${CDP_PORT}`;
const HARNESS_URL = 'http://localhost:8934/';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function jsonFetch(path) {
  const res = await fetch(BASE + path, { method: 'PUT' }).catch(() => fetch(BASE + path));
  return res.json();
}

class CDPSession {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  onEvent(fn) {
    this.listeners.push(fn);
  }

  waitFor(method, sessionId, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for ' + method)), timeoutMs);
      const handler = msg => {
        if (msg.method === method && (!sessionId || msg.sessionId === sessionId)) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter(l => l !== handler);
          resolve(msg.params);
        }
      };
      this.listeners.push(handler);
    });
  }
}

async function connectBrowser() {
  const info = await (await fetch(BASE + '/json/version')).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  return new CDPSession(ws);
}

async function openPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('DOM.enable', {}, sessionId);
  return { targetId, sessionId };
}

async function navigate(cdp, sessionId, url) {
  const loadPromise = cdp.waitFor('Page.loadEventFired', sessionId, 30000);
  await cdp.send('Page.navigate', { url }, sessionId);
  await loadPromise;
}

async function setViewport(cdp, sessionId, width, height) {
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
}

async function evalJs(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error('JS error: ' + JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function waitForReady(cdp, sessionId, timeoutMs = 20000) {
  const start = Date.now();
  for (;;) {
    const ready = await evalJs(
      cdp,
      sessionId,
      `(() => {
        const el = document.querySelector('#t16-wide-band .imb-grid');
        if (!el) return false;
        const cs = getComputedStyle(el);
        return cs.display === 'grid';
      })()`
    );
    if (ready) return true;
    if (Date.now() - start > timeoutMs) throw new Error('harness never became ready');
    await sleep(150);
  }
}

const MEASURE_EXPR = `(() => {
  const doc = document.documentElement;
  const body = document.body;
  const overflowX = doc.scrollWidth - doc.clientWidth;
  const bodyOverflowX = body.scrollWidth - window.innerWidth;

  const wideGrid = document.querySelector('#t16-wide-band .imb-grid');
  const singleGrid = document.querySelector('#t16-single-band .imb-grid');
  const wideCards = wideGrid ? Array.from(wideGrid.children).map(c => c.getBoundingClientRect()) : [];
  const singleCards = singleGrid ? Array.from(singleGrid.children).map(c => c.getBoundingClientRect()) : [];

  const rectOf = el => (el ? (({ x, y, width, height }) => ({ x, y, width, height }))(el.getBoundingClientRect()) : null);

  const pageWrapper = document.querySelector('.app-page-wrapper');

  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    documentScrollWidth: doc.scrollWidth,
    documentClientWidth: doc.clientWidth,
    overflowX,
    bodyOverflowX,
    pageWrapperScrollWidth: pageWrapper ? pageWrapper.scrollWidth : null,
    pageWrapperClientWidth: pageWrapper ? pageWrapper.clientWidth : null,
    pageWrapperOverflowX: pageWrapper ? pageWrapper.scrollWidth - pageWrapper.clientWidth : null,
    wideGridComputedColumns: wideGrid ? getComputedStyle(wideGrid).gridTemplateColumns : null,
    wideGridRect: rectOf(wideGrid),
    wideGridScrollWidth: wideGrid ? wideGrid.scrollWidth : null,
    wideGridClientWidth: wideGrid ? wideGrid.clientWidth : null,
    wideGridOverflowX: wideGrid ? wideGrid.scrollWidth - wideGrid.clientWidth : null,
    wideCardRects: wideCards.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
    singleGridComputedColumns: singleGrid ? getComputedStyle(singleGrid).gridTemplateColumns : null,
    singleGridRect: rectOf(singleGrid),
    singleGridScrollWidth: singleGrid ? singleGrid.scrollWidth : null,
    singleGridClientWidth: singleGrid ? singleGrid.clientWidth : null,
    singleCardRects: singleCards.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }))
  };
})()`;

async function measureAt(cdp, sessionId, width, height) {
  await setViewport(cdp, sessionId, width, height);
  // Let layout settle a frame.
  await evalJs(cdp, sessionId, `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  return evalJs(cdp, sessionId, MEASURE_EXPR);
}

async function applyControlOverride(cdp, sessionId) {
  await evalJs(
    cdp,
    sessionId,
    `(() => {
      const style = document.createElement('style');
      style.id = 't16-kz006-control';
      style.textContent = '#t16-wide-band .imb-grid { grid-template-columns: 900px !important; }';
      document.head.appendChild(style);
      return true;
    })()`
  );
}

async function removeControlOverride(cdp, sessionId) {
  await evalJs(
    cdp,
    sessionId,
    `(() => { const s = document.getElementById('t16-kz006-control'); if (s) s.remove(); return true; })()`
  );
}

async function scrollProbe(cdp, sessionId) {
  const focusResult = await evalJs(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('#t16-scroll-probe [tabindex="0"]');
      if (!el) return { found: false };
      el.focus();
      return {
        found: true,
        focused: document.activeElement === el,
        scrollTopBefore: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        tag: el.tagName,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label')
      };
    })()`
  );
  if (!focusResult.found || !focusResult.focused) {
    return { ...focusResult, scrollTopAfter: null, dispatched: false };
  }

  // Real, trusted key input via CDP — not a page-JS dispatchEvent.
  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 34,
      nativeVirtualKeyCode: 34,
      key: 'PageDown',
      code: 'PageDown'
    },
    sessionId
  );
  await cdp.send(
    'Input.dispatchKeyEvent',
    {
      type: 'keyUp',
      windowsVirtualKeyCode: 34,
      nativeVirtualKeyCode: 34,
      key: 'PageDown',
      code: 'PageDown'
    },
    sessionId
  );
  await sleep(300);

  const after = await evalJs(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('#t16-scroll-probe [tabindex="0"]');
      return { scrollTopAfter: el.scrollTop, stillActive: document.activeElement === el };
    })()`
  );

  return { ...focusResult, ...after, dispatched: true };
}

async function main() {
  const cdp = await connectBrowser();
  const { sessionId } = await openPage(cdp);
  await navigate(cdp, sessionId, HARNESS_URL + '?padLeft=64');
  await waitForReady(cdp, sessionId);

  const results = {};

  // --- Main widths: NFR-IMC-003. padLeft=64 = the app's DEFAULT sidebar
  // state (cache.service.ts:70 — collapsed=true with no localStorage entry). ---
  for (const [name, w, h] of [
    ['390', 390, 900],
    ['768', 768, 1000],
    ['1440', 1440, 1200]
  ]) {
    results['measure_' + name] = await measureAt(cdp, sessionId, w, h);
  }

  // --- 1440 with the sidebar EXPANDED (250px left rail) — the other
  // reachable state, checked because it is the tighter constraint on the
  // 4-card band's column count (design §7.4 DD-7 2x2 claim). ---
  await navigate(cdp, sessionId, HARNESS_URL + '?padLeft=250');
  await waitForReady(cdp, sessionId);
  results.measure_1440_sidebar_expanded = await measureAt(cdp, sessionId, 1440, 1200);
  await navigate(cdp, sessionId, HARNESS_URL + '?padLeft=64');
  await waitForReady(cdp, sessionId);

  // --- Mobile breakpoint: one-column collapse below 720px (T-12: (width < 720px)) ---
  results.measure_719 = await measureAt(cdp, sessionId, 719, 1000);
  results.measure_720 = await measureAt(cdp, sessionId, 720, 1000);

  // --- Isolated breakpoint test, padLeft=0: at padLeft=64/250 the container
  // is already narrow enough that BOTH 719 and 720 land on 1 column
  // naturally, which does not by itself prove the `(width < 720px)` media
  // query is the acting mechanism rather than coincidental width scarcity.
  // With no left-rail chrome, minmax(300px,1fr) has enough room to form 2
  // natural columns at these widths if the override did not apply — so a
  // 719 (1 col) vs 720 (>1 col) split here isolates the CSS rule itself. ---
  await navigate(cdp, sessionId, HARNESS_URL + '?padLeft=0');
  await waitForReady(cdp, sessionId);
  results.breakpoint_isolated_719 = await measureAt(cdp, sessionId, 719, 1000);
  results.breakpoint_isolated_720 = await measureAt(cdp, sessionId, 720, 1000);
  await navigate(cdp, sessionId, HARNESS_URL + '?padLeft=64');
  await waitForReady(cdp, sessionId);

  // --- KZ-006 control: force overflow, confirm harness detects it, then clear it ---
  await setViewport(cdp, sessionId, 390, 900);
  await evalJs(cdp, sessionId, `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  await applyControlOverride(cdp, sessionId);
  await evalJs(cdp, sessionId, `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  results.control_forced_390 = await evalJs(cdp, sessionId, MEASURE_EXPR);
  await removeControlOverride(cdp, sessionId);
  await evalJs(cdp, sessionId, `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  results.control_cleared_390 = await evalJs(cdp, sessionId, MEASURE_EXPR);

  // --- T-15 added item: Page Down / scrollTop, real trusted CDP key dispatch ---
  await setViewport(cdp, sessionId, 1440, 1200);
  await evalJs(cdp, sessionId, `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  results.scroll_probe = await scrollProbe(cdp, sessionId);

  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('DRIVER_ERROR', err);
    process.exit(1);
  });
