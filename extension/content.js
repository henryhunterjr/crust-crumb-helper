// Krusty Skool Helper — content script
// Injects a floating "Paste DM" button on skool.com chat & post composers.
// One click: reads clipboard, fills the composer, focuses Send.

(function () {
  const BTN_ID = 'krusty-paste-btn';
  const STATE = { lastTarget: null };

  // ---- helpers --------------------------------------------------------------

  function findComposer() {
    // Prefer focused editable, then any visible contenteditable / textarea on page.
    const active = document.activeElement;
    if (isEditable(active)) return active;

    const candidates = [
      ...document.querySelectorAll('[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
    ];
    // Score by area (largest visible wins — Skool's composer is the big one).
    let best = null;
    let bestArea = 0;
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 24) continue;
      const area = rect.width * rect.height;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }
    return best;
  }

  function isEditable(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
    return false;
  }

  function setText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      // React-friendly value setter
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    // contenteditable: clear, then insert
    el.innerHTML = '';
    // execCommand still works for most editors and triggers proper events
    const ok = document.execCommand && document.execCommand('insertText', false, text);
    if (!ok) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    }
  }

  function findSendButton(near) {
    const root = (near && near.closest('form,div[role="dialog"],section,main')) || document.body;
    const buttons = [...root.querySelectorAll('button, [role="button"]')];
    return buttons.find((b) => {
      const t = (b.textContent || '').trim().toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return t === 'send' || aria.includes('send');
    });
  }

  async function pasteAndOptionallySend(autoSend) {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      flash('Allow clipboard access, then try again.');
      return;
    }
    if (!text) {
      flash('Clipboard is empty.');
      return;
    }
    const target = STATE.lastTarget && document.contains(STATE.lastTarget) && isEditable(STATE.lastTarget)
      ? STATE.lastTarget
      : findComposer();
    if (!target) {
      flash('No message box found. Click in the composer first.');
      return;
    }
    setText(target, text);
    flash(`Pasted ${text.length} chars`);
    if (autoSend) {
      const send = findSendButton(target);
      if (send) {
        // small delay so React updates state before click
        setTimeout(() => send.click(), 120);
      } else {
        flash('Pasted. Send button not found — hit Enter to send.');
      }
    }
  }

  function flash(msg) {
    let el = document.getElementById('krusty-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'krusty-flash';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // Remember last focused editable so we know where to paste even if focus moves.
  document.addEventListener('focusin', (e) => {
    if (isEditable(e.target)) STATE.lastTarget = e.target;
  });

  // ---- floating button ------------------------------------------------------

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
      pasteAndOptionallySend(btn.dataset.krusty === 'send');
    });
  }

  // Skool is a SPA — re-check after navigations.
  const obs = new MutationObserver(() => mountButton());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  mountButton();
})();