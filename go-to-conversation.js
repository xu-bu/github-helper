// Floating "Go to conversation" button on PR pages: jumps to the bottom of the
// Conversation tab.
(function () {
  const HASH = "#gh-helper-bottom";
  const ID = "gh-helper-go-bottom";

  function prBase() {
    const m = location.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/);
    return m ? m[0] : null;
  }

  function scrollToBottom() {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }

  // After navigating here from another tab: the timeline loads lazily, so keep
  // scrolling for a few seconds.
  if (location.hash === HASH) {
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
    if (existing) return;

    const btn = document.createElement("button");
    btn.id = ID;
    btn.type = "button";
    btn.textContent = "go to conversation";
    btn.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:99998;padding:6px 12px;" +
      "font:12px -apple-system,sans-serif;background:#1f6feb;color:#fff;border:0;" +
      "border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);";
    btn.onclick = () => {
      const b = prBase();
      if (!b) return;
      if (location.pathname === b) scrollToBottom(); // already on Conversation tab
      else location.href = b + HASH;
    };
    document.body.appendChild(btn);
  }

  // GitHub navigates without full reloads, so re-check periodically.
  sync();
  setInterval(sync, 1000);
})();
