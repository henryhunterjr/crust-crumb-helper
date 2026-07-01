// Krusty Skool Helper — content script v1.6.2
// Skool's DM composer is a <textarea> with NO Send button.
// Submit happens by pressing Enter inside the textarea.
// Also drives the members directory → profile → Message flow when the
// page URL contains #krusty=autosend|autopaste&member=<name>.
// All steps logged under [Krusty] for screenshot-able debugging.

(function () {
  const TAG = '[Krusty]';
  const BTN_ID = 'krusty-paste-btn';
  const STATE = { lastEditable: null, sending: false };

  const log = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  function isEditable(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
    return el.getAttribute && el.getAttribute('contenteditable') === 'true';
  }
  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 80 && r.height > 20 && r.bottom > 0 && r.top < innerHeight;
  }
  function findComposer() {
    // 1. Skool DM composer is a textarea with placeholder "Message <Name>".
    const skoolDM = document.querySelector('textarea[placeholder^="Message "]');
    if (skoolDM && visible(skoolDM)) return skoolDM;
    // 2. Currently focused editable.
    const active = document.activeElement;
    if (isEditable(active) && visible(active)) return active;
    // 3. Last focused editable.
    if (STATE.lastEditable && document.contains(STATE.lastEditable) && isEditable(STATE.lastEditable)) {
      return STATE.lastEditable;
    }
    // 4. Biggest visible editable on the page.
    const cands = [
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('[contenteditable="true"]'),
    ].filter(visible);
    cands.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return cands[0] || null;
  }

  function waitForComposer(timeoutMs = 4000) {
    return new Promise((resolve) => {
      const existing = findComposer();
      if (existing) return resolve(existing);
      const start = Date.now();
      const obs = new MutationObserver(() => {
        const ta = findComposer();
        if (ta) { obs.disconnect(); resolve(ta); }
        else if (Date.now() - start > timeoutMs) { obs.disconnect(); resolve(null); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }

  // React-aware text injection
  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
  }
  function injectText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      setNativeValue(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete', false);
    const ok = document.execCommand('insertText', false, text);
    if (!ok) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }

  // Skool's DM composer submits on Enter (Shift+Enter = newline). No Send button exists.
  function pressEnter(el) {
    el.focus();
    const init = {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true, composed: true,
    };
    el.dispatchEvent(new KeyboardEvent('keydown', init));
    el.dispatchEvent(new KeyboardEvent('keypress', init));
    el.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  function waitForMessageEcho(container, text, timeoutMs = 6000) {
    return new Promise((resolve) => {
      const needle = text.trim().slice(0, 40);
      if (!needle) return resolve(false);
      const check = () => {
        if ((container.innerText || '').includes(needle)) return true;
        return false;
      };
      if (check()) return resolve(true);
      const start = Date.now();
      const obs = new MutationObserver(() => {
        if (check()) { obs.disconnect(); resolve(true); }
        else if (Date.now() - start > timeoutMs) { obs.disconnect(); resolve(false); }
      });
      obs.observe(container, { childList: true, subtree: true, characterData: true });
    });
  }

  async function pasteAndOptionallySend(autoSend) {
    if (STATE.sending) { log('already sending'); return; }
    STATE.sending = true;
    try {
      let text = '';
      try { text = await navigator.clipboard.readText(); }
      catch (e) { warn('clipboard read failed', e); flash('Allow clipboard access, then try again.'); return; }
      if (!text) { flash('Clipboard is empty.'); return; }
      log('clipboard length', text.length);

      const target = await waitForComposer(4000);
      if (!target) { warn('no composer found'); flash('No message box found. Open a DM first.'); return; }
      log('composer found', target.tagName, target);

      // Let React attach handlers on freshly-mounted composers.
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
      injectText(target, text);
      log('text injected');
      flash(`Pasted ${text.length} chars`);
      if (!autoSend) return;

      // Wait one tick for React to commit controlled state.
      await new Promise((r) => setTimeout(r, 80));
      pressEnter(target);
      log('Enter dispatched');

      // Verify by watching for the message echo in the conversation pane.
      const scroller = target.closest('[role="dialog"]') || target.parentElement?.parentElement || document.body;
      const ok = await waitForMessageEcho(scroller, text, 5000);
      if (ok) {
        flash('Sent.');
      } else {
        warn('no echo detected — Skool may have ignored synthetic Enter');
        flash('Pasted. Press Enter to send (Skool blocked auto-send).');
      }
    } finally {
      STATE.sending = false;
    }
  }

  function flash(msg) {
    let el = document.getElementById('krusty-flash');
    if (!el) { el = document.createElement('div'); el.id = 'krusty-flash'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  document.addEventListener('focusin', (e) => {
    if (isEditable(e.target)) STATE.lastEditable = e.target;
  }, true);

  function mountButton() {
    if (document.getElementById(BTN_ID)) return;
    const wrap = document.createElement('div');
    wrap.id = BTN_ID;
    wrap.innerHTML = `
      <button data-krusty="paste" title="Paste clipboard into message">📋 Paste</button>
      <button data-krusty="send" title="Paste clipboard and send">🥖 Paste &amp; Send</button>
    `;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-krusty]');
      if (!btn) return;
      pasteAndOptionallySend(btn.dataset.krusty === 'send').catch((err) => warn('flow error', err));
    });
    log('buttons mounted');
  }

  const obs = new MutationObserver(() => mountButton());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  mountButton();
  log('content script v1.6.2 loaded on', location.href);

  // ---------- Auto-flow driven by URL hash ----------
  // #krusty=autosend&member=Jane%20Doe   → search, open profile, click Message, paste, send
  // #krusty=autopaste&member=Jane%20Doe  → same but stop after paste (no auto-send)
  function parseHash() {
    const h = (location.hash || '').replace(/^#/, '');
    if (!h) return null;
    const params = new URLSearchParams(h);
    const mode = params.get('krusty');
    const member = params.get('member');
    if (!mode || !member) return null;
    if (mode !== 'autosend' && mode !== 'autopaste') return null;
    return { mode, member: decodeURIComponent(member) };
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function waitFor(fn, { timeout = 8000, interval = 200 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try { const v = fn(); if (v) return v; } catch {}
      await sleep(interval);
    }
    return null;
  }

  function findSearchInput() {
    // Skool member directory search box.
    return document.querySelector(
      'input[placeholder*="Search" i], input[type="search"], input[aria-label*="search" i]'
    );
  }

  function typeInto(el, text) {
    el.focus();
    setNativeValue(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findMemberCard(name) {
    const needle = name.trim().toLowerCase();
    if (!needle) return null;
    // Any anchor to a Skool user profile whose visible text includes the name.
    const links = Array.from(document.querySelectorAll('a[href^="/@"], a[href*="/@"]'));
    for (const a of links) {
      const t = (a.innerText || '').trim().toLowerCase();
      if (t && t.includes(needle)) return a;
    }
    // Fallback: any element whose text starts with the name inside the directory grid.
    const nodes = Array.from(document.querySelectorAll('div,span,h3,h4'));
    for (const n of nodes) {
      const t = (n.innerText || '').trim().toLowerCase();
      if (t && (t === needle || t.startsWith(needle + '\n'))) {
        const clickable = n.closest('a,button,[role="button"]');
        if (clickable) return clickable;
      }
    }
    return null;
  }

  function findMessageButton() {
    const buttons = Array.from(document.querySelectorAll('button, a[role="button"], a'));
    for (const b of buttons) {
      const t = (b.innerText || '').trim().toLowerCase();
      if (t === 'message' || t === 'send message' || t === 'chat') {
        if (visible(b)) return b;
      }
    }
    return null;
  }

  async function runAutoFlow() {
    const params = parseHash();
    if (!params) return;
    log('auto-flow start', params);
    flash(`Krusty: searching for ${params.member}…`);

    // Only run search step if we're on a members directory page.
    const onDirectory = /\/-\/members(\/|$|\?)/.test(location.pathname) || /\/members$/.test(location.pathname);

    if (onDirectory) {
      const search = await waitFor(findSearchInput, { timeout: 6000 });
      if (!search) { warn('no search input'); flash('Could not find member search.'); return; }
      typeInto(search, params.member);
      await sleep(700);

      const card = await waitFor(() => findMemberCard(params.member), { timeout: 6000 });
      if (!card) { warn('member card not found'); flash(`No match for "${params.member}".`); return; }
      log('clicking member card');
      card.click();
    }

    // On the profile page now — find and click Message.
    const msgBtn = await waitFor(findMessageButton, { timeout: 8000 });
    if (!msgBtn) { warn('no Message button'); flash('Profile opened. Click Message manually.'); return; }
    log('clicking Message');
    msgBtn.click();

    // Composer should open — paste (and optionally send).
    await sleep(400);
    await pasteAndOptionallySend(params.mode === 'autosend');

    // Clear the hash so a manual refresh doesn't re-trigger.
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  }

  // Trigger auto-flow on load and on hash changes.
  window.addEventListener('hashchange', () => { runAutoFlow().catch((e) => warn('auto-flow', e)); });
  // Give the SPA a moment to mount.
  setTimeout(() => { runAutoFlow().catch((e) => warn('auto-flow', e)); }, 800);
})();