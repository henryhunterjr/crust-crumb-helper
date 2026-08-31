// Krusty Skool Helper v2.1.0
// Exact-recipient, review-before-send handoff plus explicit Member Compass capture.
// This script intentionally never clicks Send, dispatches Enter, posts, likes, replies, or changes Skool content.

(function () {
  const TAG = '[Krusty v2.1]';
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
    flash.timer = setTimeout(() => element.classList.remove('show'), 5000);
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
      if (location.hostname === 'skoo.ly') await selectSkoolyConversation(handoff.member);
      else flash('Open the exact Skool conversation, then use Paste for review.', 'error');
      history.replaceState(null, '', location.pathname + location.search);
    } catch (error) {
      warn('review handoff failed', error);
      flash('The review handoff stopped safely. Nothing was sent.', 'error');
    } finally {
      state.running = false;
    }
  }

  function usernameFromHref(href) {
    try {
      const url = new URL(href, location.origin);
      const match = url.pathname.match(/\/@([^/?#]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  function simpleHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function findCommentContainer(anchor) {
    let node = anchor.parentElement;
    let fallback = null;
    for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
      const text = (node.innerText || '').trim();
      if (text.length < 25 || text.length > 6000) continue;
      const profileLinks = node.querySelectorAll?.('a[href*="/@"]').length || 0;
      if (profileLinks > 10) continue;
      if (!fallback && text.length >= 50) fallback = node;
      const hasInteraction = /(^|\n)\s*(like|reply)\s*(\n|$)/i.test(text);
      if (hasInteraction) return node;
    }
    return fallback;
  }

  function cleanCapturedText(container, author) {
    const clone = container.cloneNode(true);
    clone.querySelectorAll('button,svg,img,script,style,input,textarea,[contenteditable="true"]').forEach((node) => node.remove());
    const lines = (clone.innerText || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line !== author)
      .filter((line) => !/^(like|reply|report|share|more)$/i.test(line))
      .filter((line) => !/^\d+\s*(likes?|replies?|comments?)?$/i.test(line))
      .filter((line) => !/^view\s+\d+\s+(more\s+)?repl/i.test(line))
      .filter((line) => !/^\d+\s*(s|m|h|d|w|mo|y)$/i.test(line));
    return lines.join('\n').trim();
  }

  function collectLoadedIntroductions() {
    const anchors = Array.from(document.querySelectorAll('a[href*="/@"]'));
    const items = [];
    const seen = new Set();

    for (const anchor of anchors) {
      const username = usernameFromHref(anchor.href);
      if (!username) continue;
      const author = (anchor.innerText || anchor.textContent || '').trim() || username;
      const container = findCommentContainer(anchor);
      if (!container) continue;
      const text = cleanCapturedText(container, author);
      if (text.length < 20 || text.length > 5500) continue;

      const domId = container.getAttribute('data-comment-id') || container.getAttribute('data-id') || container.id || null;
      const externalId = domId || `krusty:${simpleHash(`${username}|${text}`)}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      items.push({
        author,
        username,
        text,
        sourceUrl: location.href,
        externalId,
        capturedAt: new Date().toISOString(),
      });
    }
    return items;
  }

  function downloadJson(text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `member-compass-capture-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function captureForCompass() {
    if (location.hostname !== 'www.skool.com') {
      flash('Open the Skool post you want to capture first.', 'error');
      return;
    }
    const items = collectLoadedIntroductions();
    if (!items.length) {
      flash('No loaded comment blocks were found. Open the post and scroll through its comments first.', 'error');
      return;
    }
    const payload = JSON.stringify({
      format: 'krusty-member-compass-v1',
      sourceUrl: location.href,
      capturedAt: new Date().toISOString(),
      comments: items,
    }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      flash(`Copied ${items.length} loaded comments for Member Compass. Only comments currently loaded in the page are included.`, 'success');
    } catch (error) {
      warn('clipboard write failed, downloading JSON', error);
      downloadJson(payload);
      flash(`Captured ${items.length} loaded comments to JSON. Only comments currently loaded in the page are included.`, 'success');
    }
  }

  function mountButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const wrap = document.createElement('div');
    wrap.id = BUTTON_ID;
    const captureButton = location.hostname === 'www.skool.com'
      ? '<button data-krusty="capture" title="Copy currently loaded comments as Member Compass JSON">🧭 Capture Compass</button>'
      : '';
    wrap.innerHTML = `<button data-krusty="paste" title="Paste into the open conversation for review">📋 Paste for review</button>${captureButton}`;
    wrap.addEventListener('click', (event) => {
      const action = event.target?.closest?.('button')?.dataset?.krusty;
      if (action === 'paste') pasteForReview(null).catch((error) => warn('paste failed', error));
      if (action === 'capture') captureForCompass().catch((error) => warn('capture failed', error));
    });
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
