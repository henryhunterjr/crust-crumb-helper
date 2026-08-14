// Krusty Skool Helper v2.0.1
// Exact-recipient, review-before-send handoff for Skoo.ly and Skool.
// This script intentionally never clicks Send or dispatches Enter.

(function () {
  const TAG = '[Krusty v2]';
  const BUTTON_ID = 'krusty-paste-btn';
  const state = { lastEditable: null, running: false };

  const log = (...args) => console.log(TAG, ...args);
  const warn = (...args) => console.warn(TAG, ...args);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 80 && rect.height > 20 && rect.bottom > 0 && rect.top < innerHeight;
  }

  function isEditable(element) {
    return Boolean(element && (
      element.tagName === 'TEXTAREA' ||
      element.tagName === 'INPUT' ||
      element.getAttribute?.('contenteditable') === 'true'
    ));
  }

  function findComposer() {
    const selectors = location.hostname === 'skoo.ly'
      ? ['textarea[aria-label="Message"]', 'textarea[placeholder*="Type a message" i]']
      : ['textarea[placeholder^="Message "]', 'textarea[aria-label*="message" i]'];
    for (const selector of selectors) {
      const match = document.querySelector(selector);
      if (visible(match)) return match;
    }
    if (isEditable(document.activeElement) && visible(document.activeElement)) return document.activeElement;
    if (isEditable(state.lastEditable) && document.contains(state.lastEditable) && visible(state.lastEditable)) return state.lastEditable;
    return null;
  }

  async function waitFor(find, timeoutMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const value = find();
      if (value) return value;
      await sleep(150);
    }
    return null;
  }

  function setNativeValue(element, value) {
    const prototype = element.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (!setter) throw new Error('Native value setter unavailable');
    setter.call(element, value);
  }

  function injectText(element, text) {
    element.focus();
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      setNativeValue(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    element.textContent = text;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  function flash(message, tone = 'neutral') {
    let element = document.getElementById('krusty-flash');
    if (!element) {
      element = document.createElement('div');
      element.id = 'krusty-flash';
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.dataset.tone = tone;
    element.classList.add('show');
    clearTimeout(flash.timer);
    flash.timer = setTimeout(() => element.classList.remove('show'), 4000);
  }

  async function readClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error('Clipboard is empty');
      return text;
    } catch (error) {
      flash('Clipboard unavailable. Allow access, then try again.', 'error');
      throw error;
    }
  }

  async function pasteForReview(expectedMember) {
    const text = await readClipboard();
    const composer = await waitFor(findComposer, 8000);
    if (!composer) {
      flash('No DM composer found. Open the intended conversation first.', 'error');
      return false;
    }
    injectText(composer, text);
    const who = expectedMember ? ` for ${expectedMember}` : '';
    flash(`Pasted${who}. Review it, then send it yourself.`, 'success');
    return true;
  }

  function parseReviewHandoff() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const mode = params.get('krusty');
    const member = params.get('member')?.trim();
    if (!member) return null;
    // Older autosend links are deliberately downgraded to review-only.
    if (!['review', 'autopaste', 'autosend'].includes(mode || '')) return null;
    return { member };
  }

  function findExactConversation(memberName) {
    const expected = memberName.trim().toLocaleLowerCase();
    return Array.from(document.querySelectorAll('button')).find((button) => {
      if (!visible(button)) return false;
      const firstLine = (button.innerText || '').split('\n').map((part) => part.trim()).find(Boolean);
      return firstLine?.toLocaleLowerCase() === expected;
    }) || null;
  }

  async function selectSkoolyConversation(memberName) {
    if (location.hostname !== 'skoo.ly' || !location.pathname.startsWith('/dashboard/dm')) return false;
    const search = await waitFor(() => document.querySelector('input[aria-label="Search conversations"]'), 8000);
    if (!search) {
      flash('Skooly conversation search was not found.', 'error');
      return false;
    }
    setNativeValue(search, memberName);
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(new Event('change', { bubbles: true }));
    const conversation = await waitFor(() => findExactConversation(memberName), 8000);
    if (!conversation) {
      flash(`No exact conversation match for ${memberName}. Nothing was pasted.`, 'error');
      return false;
    }
    conversation.click();
    const composer = await waitFor(findComposer, 8000);
    if (!composer) {
      flash(`Opened ${memberName}, but no composer was found. Nothing was pasted.`, 'error');
      return false;
    }
    return pasteForReview(memberName);
  }

  async function runHandoff() {
    const handoff = parseReviewHandoff();
    if (!handoff || state.running) return;
    state.running = true;
    try {
      flash(`Finding the exact conversation for ${handoff.member}…`);
      if (location.hostname === 'skoo.ly') {
        await selectSkoolyConversation(handoff.member);
      } else {
        flash('Open the exact Skool conversation, then use Paste for review.', 'error');
      }
      history.replaceState(null, '', location.pathname + location.search);
    } catch (error) {
      warn('review handoff failed', error);
      flash('The review handoff stopped safely. Nothing was sent.', 'error');
    } finally {
      state.running = false;
    }
  }

  function mountButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const wrap = document.createElement('div');
    wrap.id = BUTTON_ID;
    wrap.innerHTML = '<button data-krusty="paste" title="Paste into the open conversation for review">📋 Paste for review</button>';
    wrap.addEventListener('click', () => pasteForReview(null).catch((error) => warn('paste failed', error)));
    document.body.appendChild(wrap);
  }

  document.addEventListener('focusin', (event) => {
    if (isEditable(event.target)) state.lastEditable = event.target;
  }, true);

  new MutationObserver(mountButton).observe(document.documentElement, { childList: true, subtree: true });
  mountButton();
  window.addEventListener('hashchange', () => runHandoff());
  setTimeout(runHandoff, 500);
  log('loaded on', location.href);
})();
