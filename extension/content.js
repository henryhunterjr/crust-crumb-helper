// Krusty Skool Helper — content script v1.6
// Skool's DM composer is a <textarea> with NO Send button.
// Submit happens by pressing Enter inside the textarea.
// All steps logged under [Krusty] for screenshot-able debugging.

(function () {
  const TAG = '[Krusty]';
  const BTN_ID = 'krusty-paste-btn';
  const AUTO_KEY = 'krusty:auto-flow';
  const STATE = { lastEditable: null, sending: false, autoFired: false };

  const log = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  // Notify the opener (Lovable app) of progress so the dialog stepper can update.
  function postProgress(step, detail) {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { source: 'krusty-ext', step, detail: detail || null, ts: Date.now() },
          '*',
        );
      }
    } catch (e) {
      // opener may be cross-origin restricted; ignore
    }
  }

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

  // Find the "Message" / "Chat" button on a Skool profile page.
  function findMessageButton() {
    const buttons = [
      ...document.querySelectorAll('button'),
      ...document.querySelectorAll('[role="button"]'),
      ...document.querySelectorAll('a'),
    ];
    for (const b of buttons) {
      if (!visible(b)) continue;
      const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
      if (txt === 'message' || txt === 'chat' || txt === 'send message') return b;
    }
    return null;
  }

  function normalizeText(value) {
    return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findMembersSearchInput() {
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    return inputs.find((input) => {
      const haystack = normalizeText(`${input.type || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''}`);
      return haystack.includes('search') || haystack.includes('member') || input.type === 'search';
    }) || inputs[0] || null;
  }

  function searchMembersDirectory(memberQuery) {
    if (!memberQuery) return false;
    const input = findMembersSearchInput();
    if (!input) return false;
    log('searching members directory for', memberQuery);
    postProgress('searching-member', { member: memberQuery });
    input.focus();
    setNativeValue(input, memberQuery);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    return true;
  }

  function findMemberResult(memberQuery) {
    const needle = normalizeText(memberQuery);
    if (!needle) return null;
    const pieces = needle.split(' ').filter(Boolean);
    const cands = [...document.querySelectorAll('a, button, [role="button"], [role="listitem"], li, [data-testid], div')]
      .filter(visible)
      .map((el) => {
        const text = normalizeText(el.innerText || el.textContent || '');
        const rect = el.getBoundingClientRect();
        return { el, text, area: rect.width * rect.height };
      })
      .filter(({ text, area }) => {
        if (!text || text.length > 1200) return false;
        if (area < 500) return false;
        return text.includes(needle) || pieces.every((part) => text.includes(part));
      })
      .sort((a, b) => a.area - b.area);
    return cands[0]?.el || null;
  }

  function findMemberClickable(memberQuery) {
    const result = findMemberResult(memberQuery);
    if (!result) return null;
    const needle = normalizeText(memberQuery);
    const messageLike = (el) => {
      const txt = normalizeText(el.innerText || el.textContent || '');
      return txt === 'message' || txt === 'chat' || txt === 'send message';
    };
    const anchors = [...result.querySelectorAll?.('a[href]') || []].filter(visible).filter((a) => !messageLike(a));
    const namedAnchor = anchors.find((a) => normalizeText(a.innerText || a.textContent || '').includes(needle));
    if (namedAnchor) return namedAnchor;
    const profileAnchor = anchors.find((a) => {
      const href = a.getAttribute('href') || '';
      return href.includes('/@') || href.includes('/members') || href.includes('/-/members');
    });
    if (profileAnchor) return profileAnchor;
    const buttons = [...result.querySelectorAll?.('button, [role="button"]') || []].filter(visible).filter((b) => !messageLike(b));
    return buttons[0] || (messageLike(result) ? null : result);
  }

  function waitForLocationChange(previousHref, timeoutMs = 5000) {
    return new Promise((resolve) => {
      if (location.href !== previousHref) return resolve(true);
      const start = Date.now();
      const tick = () => {
        if (location.href !== previousHref) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(tick, 150);
      };
      tick();
    });
  }

  async function waitForMemberClickable(memberQuery, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const clickable = findMemberClickable(memberQuery);
      if (clickable) return clickable;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  }

  function storeAutoFlow(mode, memberQuery) {
    try {
      sessionStorage.setItem(AUTO_KEY, JSON.stringify({ mode, member: memberQuery || '', ts: Date.now() }));
    } catch {}
  }

  function clearAutoFlow() {
    try { sessionStorage.removeItem(AUTO_KEY); } catch {}
  }

  function readStoredAutoFlow() {
    try {
      const raw = sessionStorage.getItem(AUTO_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.mode || Date.now() - Number(data.ts || 0) > 120_000) {
        clearAutoFlow();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function clickElement(el) {
    if (!el) return;
    el.scrollIntoView?.({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + Math.min(rect.width / 2, 24),
      clientY: rect.top + Math.min(rect.height / 2, 16),
    };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new MouseEvent('mousedown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
    el.dispatchEvent(new MouseEvent('mouseup', init));
    el.dispatchEvent(new MouseEvent('click', init));
  }

  async function openProfileThenMessage(memberQuery) {
    const clickable = await waitForMemberClickable(memberQuery, 7000);
    if (!clickable) return false;
    const before = location.href;
    log('opening member profile/card for', memberQuery, clickable);
    postProgress('member-selected', { member: memberQuery });
    clickElement(clickable);

    // If this navigates to a profile/detail page, sessionStorage keeps the automation alive.
    await waitForLocationChange(before, 2500);
    const msgBtn = await waitForMessageButton(7000);
    if (!msgBtn) return false;
    postProgress('message-button-clicked');
    clickElement(msgBtn);
    return true;
  }

  function isMemberMatch(el, memberQuery) {
    const needle = normalizeText(memberQuery);
    if (!needle) return false;
    const pieces = needle.split(' ').filter(Boolean);
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || text.length > 1400) return false;
    return text.includes(needle) || pieces.every((part) => text.includes(part));
  }

  function findMessageButtonForMember(memberQuery) {
    const needle = normalizeText(memberQuery);
    const buttons = [
      ...document.querySelectorAll('button'),
      ...document.querySelectorAll('[role="button"]'),
      ...document.querySelectorAll('a'),
    ].filter(visible).filter((b) => {
      const txt = normalizeText(b.innerText || b.textContent || '');
      return txt === 'message' || txt === 'chat' || txt === 'send message';
    });
    if (!needle) return buttons[0] || null;
    const scoped = buttons.find((b) => {
      let node = b.parentElement;
      for (let i = 0; i < 8 && node && node !== document.body; i += 1) {
        if (isMemberMatch(node, memberQuery)) return true;
        node = node.parentElement;
      }
      return false;
    });
    return scoped || (buttons.length === 1 ? buttons[0] : null);
  }

  async function openMemberChatFromDirectory(memberQuery) {
    if (!memberQuery) return false;
    let searched = false;
    const start = Date.now();

    while (Date.now() - start < 10_000) {
      if (!searched) searched = searchMembersDirectory(memberQuery);

      const msgBtn = findMessageButtonForMember(memberQuery);
      if (msgBtn) {
        postProgress('message-button-clicked');
        clickElement(msgBtn);
        return true;
      }

      const opened = await openProfileThenMessage(memberQuery);
      if (opened) return true;

      await new Promise((r) => setTimeout(r, 350));
    }
    postProgress('member-not-found', { member: memberQuery });
    return false;
  }

  function waitForMessageButton(timeoutMs = 6000) {
    return new Promise((resolve) => {
      const found = findMessageButton();
      if (found) return resolve(found);
      const start = Date.now();
      const obs = new MutationObserver(() => {
        const b = findMessageButton();
        if (b) { obs.disconnect(); resolve(b); }
        else if (Date.now() - start > timeoutMs) { obs.disconnect(); resolve(null); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
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

  async function pasteAndOptionallySend(autoSend, memberQuery) {
    if (STATE.sending) { log('already sending'); return; }
    STATE.sending = true;
    try {
      let text = '';
      try { text = await navigator.clipboard.readText(); }
      catch (e) { warn('clipboard read failed', e); flash('Allow clipboard access, then try again.'); return; }
      if (!text) { flash('Clipboard is empty.'); return; }
      log('clipboard length', text.length);

      // If we're on the Members directory, search for the member first, then click Message.
      let composer = findComposer();
      if (!composer && memberQuery && location.pathname.includes('/-/members')) {
        await openMemberChatFromDirectory(memberQuery);
        composer = findComposer();
      }

      // If we're on a profile page and no composer is open yet, click "Message" first.
      if (!composer) {
        const msgBtn = await waitForMessageButton(2500);
        if (msgBtn) {
          log('clicking Message button');
          postProgress('message-button-clicked');
          msgBtn.click();
        }
      }

      postProgress('waiting-for-composer');
      const target = await waitForComposer(4000);
      if (!target) { warn('no composer found'); flash('No message box found. Open a DM first.'); return; }
      log('composer found', target.tagName, target);
      postProgress('composer-mounted');

      // Let React attach handlers on freshly-mounted composers.
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
      injectText(target, text);
      log('text injected');
      postProgress('pasted', { chars: text.length });
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
        postProgress('sent');
      } else {
        warn('no echo detected — Skool may have ignored synthetic Enter');
        flash('Pasted. Press Enter to send (Skool blocked auto-send).');
        postProgress('send-blocked');
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

  // Auto-mode: if the web app opened this tab with #krusty=autosend or
  // #krusty=autopaste, fire once as soon as the DM composer appears.
  function readAutoMode() {
    const h = (location.hash || '').toLowerCase();
    if (h.includes('krusty=autosend')) return 'send';
    if (h.includes('krusty=autopaste')) return 'paste';
    return null;
  }
  function readMemberQuery() {
    try {
      const raw = (location.hash || '').replace(/^#/, '');
      return new URLSearchParams(raw).get('member') || '';
    } catch {
      return '';
    }
  }
  function armAutoFire() {
    const stored = readStoredAutoFlow();
    const mode = readAutoMode() || stored?.mode;
    if (!mode || STATE.autoFired) return;
    const memberQuery = readMemberQuery() || stored?.member || '';
    storeAutoFlow(mode, memberQuery);
    log('auto mode armed:', mode);
    postProgress('opened', { mode, member: memberQuery || null });
    const tryFire = async () => {
      if (STATE.autoFired) return true;
      // Either the composer is already there, we're on the Members directory,
      // or we're on a profile with a Message button.
      const target = findComposer();
      const onMembersPage = location.pathname.includes('/-/members');
      const msgBtn = target || onMembersPage ? null : findMessageButton();
      if (!target && !onMembersPage && !msgBtn) return false;
      STATE.autoFired = true;
      // Strip the hash so a manual refresh doesn't re-fire.
      try { history.replaceState(null, '', location.pathname + location.search); } catch {}
      await pasteAndOptionallySend(mode === 'send', memberQuery);
      clearAutoFlow();
      return true;
    };
    // Try immediately, then watch for the composer to mount.
    void tryFire();
    const start = Date.now();
    const obs = new MutationObserver(async () => {
      if (await tryFire()) obs.disconnect();
      else if (Date.now() - start > 60_000) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('hashchange', armAutoFire);
  window.addEventListener('popstate', armAutoFire);
  armAutoFire();

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
  log('content script v1.6 loaded on', location.href);
})();