// Krusty Skool Helper — content script v1.1
// Robust paste+send for Skool's React-controlled composer.
// Logs every step under the [Krusty] prefix so failures are screenshot-able.

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
    const active = document.activeElement;
    if (isEditable(active) && visible(active)) return active;
    if (STATE.lastEditable && document.contains(STATE.lastEditable) && isEditable(STATE.lastEditable)) {
      return STATE.lastEditable;
    }
    const cands = [
      ...document.querySelectorAll('[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
    ].filter(visible);
    cands.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return cands[0] || null;
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

  function findSendButton(near) {
    const scopes = [];
    if (near) { let p = near; for (let i = 0; i < 6 && p; i++) { scopes.push(p); p = p.parentElement; } }
    scopes.push(document.body);
    for (const root of scopes) {
      const btns = [...root.querySelectorAll('button, [role="button"]')];
      const hit = btns.find((b) => {
        const t = (b.textContent || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const test = (b.getAttribute('data-testid') || '').toLowerCase();
        return t === 'send' || aria === 'send' || aria.includes('send message') || test.includes('send');
      });
      if (hit) return hit;
    }
    return null;
  }
  function isEnabled(btn) {
    if (!btn) return false;
    if (btn.disabled) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    if (btn.hasAttribute('disabled')) return false;
    return true;
  }
  function waitForEnabledSend(near, timeoutMs = 4000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        const btn = findSendButton(near);
        if (btn && isEnabled(btn)) return resolve(btn);
        if (Date.now() - start > timeoutMs) return resolve(btn || null);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }
  function realClick(el) {
    ['mousedown', 'mouseup', 'click'].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
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

      const target = findComposer();
      if (!target) { warn('no composer found'); flash('No message box found. Click in the composer first.'); return; }
      log('composer found', target.tagName, target);

      injectText(target, text);
      log('text injected');
      flash(`Pasted ${text.length} chars`);
      if (!autoSend) return;

      const btn = await waitForEnabledSend(target, 4000);
      if (!btn) { warn('send button not found'); flash('Pasted. Send button not found — hit Enter.'); return; }
      if (!isEnabled(btn)) { warn('send still disabled', btn); flash('Pasted. Send still disabled — hit Enter.'); return; }
      log('send enabled, clicking', btn);
      realClick(btn);
      flash('Sent.');
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
  log('content script v1.1 loaded on', location.href);
})();