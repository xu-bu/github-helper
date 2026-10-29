// Floating "Go to conversation" button on PR pages: jumps to the bottom of the
// Conversation tab.
(function () {
  const FLAG = "gh-helper-scroll-bottom";
  const ID = "gh-helper-go-bottom";

  function prBase() {
    const m = location.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/);
    return m ? m[0] : null;
  }

  function onConversation(base) {
    return location.pathname.replace(/\/$/, "") === base;
  }

  function scrollToBottom() {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }

  // The "scroll to bottom" request travels in sessionStorage, not the URL, so
  // shared links stay clean.
  function takeScrollFlag() {
    try {
      const set = sessionStorage.getItem(FLAG) === "1";
      sessionStorage.removeItem(FLAG);
      return set;
    } catch {
      return false;
    }
  }

  function setScrollFlag() {
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch {}
  }

  // Clean up an anchor left by an earlier version of this button.
  if (location.hash === "#gh-helper-bottom") {
    history.replaceState(null, "", location.pathname + location.search);
    setScrollFlag();
  }

  // After navigating here from another tab: the timeline loads lazily, so keep
  // scrolling for a few seconds.
  if (takeScrollFlag()) {
    let n = 0;
    const t = setInterval(() => {
      scrollToBottom();
      if (++n >= 10) clearInterval(t);
    }, 400);
  }

  function sync() {
    const base = prBase();
    const existing = document.getElementById(ID);
    if (!base) {
      if (existing) existing.remove();
      return;
    }
    // On the Conversation tab the button leads to Files changed; elsewhere, to
    // the bottom of Conversation.
    const label = onConversation(base) ? "go to files changed" : "go to conversation";
    if (existing) {
      if (existing.textContent !== label) existing.textContent = label;
      return;
    }

    const btn = document.createElement("button");
    btn.id = ID;
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:99998;padding:6px 12px;" +
      "font:12px -apple-system,sans-serif;background:#1f6feb;color:#fff;border:0;" +
      "border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);";
    btn.onclick = () => {
      const b = prBase();
      if (!b) return;
      if (onConversation(b)) location.href = b + "/files";
      else {
        setScrollFlag();
        location.href = b;
      }
    };
    document.body.appendChild(btn);
  }

  // GitHub navigates without full reloads, so re-check periodically.
  sync();
  setInterval(sync, 1000);
})();
