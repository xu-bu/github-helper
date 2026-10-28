// Banner (and a desktop notification if the tab is in the background) when an
// issue/PR gets new comments. Ported from a userscript; API calls go through background.js.
(async function () {
  const hasToken = await chrome.runtime.sendMessage({ type: "hasToken" });
  const INTERVAL_MS = hasToken ? 30_000 : 120_000; // keep unauthenticated polling slow

  let currentKey = null,
    baseline = null,
    etag = null,
    banner = null;

  function parsePage() {
    const m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
    if (!m) return null;
    const [, owner, repo, kind, num] = m;
    const path =
      kind === "pull"
        ? `/repos/${owner}/${repo}/pulls/${num}`
        : `/repos/${owner}/${repo}/issues/${num}`;
    return { key: `${owner}/${repo}#${num}`, path };
  }

  function showBanner(diff) {
    if (!banner) {
      banner = document.createElement("div");
      banner.style.cssText =
        "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;" +
        "background:#1f6feb;color:#fff;padding:10px 16px;border-radius:8px;" +
        "font:14px -apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);" +
        "display:flex;gap:12px;align-items:center;";
      document.body.appendChild(banner);
    }
    banner.innerHTML = "";
    const text = document.createElement("span");
    text.textContent = `${diff} new comment${diff > 1 ? "s" : ""} on this page`;
    const refresh = document.createElement("button");
    refresh.textContent = "Refresh";
    refresh.style.cssText =
      "background:#fff;color:#1f6feb;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:600;";
    refresh.onclick = () => location.reload();
    const close = document.createElement("button");
    close.textContent = "✕";
    close.style.cssText = "background:none;color:#fff;border:0;cursor:pointer;font-size:14px;";
    close.onclick = () => {
      banner.remove();
      banner = null;
    };
    banner.append(text, refresh, close);
  }

  async function check() {
    const page = parsePage();
    if (!page) return;
    const res = await chrome.runtime.sendMessage({
      type: "fetchCounts",
      path: page.path,
      etag,
    });
    if (!res || res.error || res.unchanged) return;
    if (res.etag) etag = res.etag;
    if (baseline === null) {
      baseline = res.count;
      return;
    }
    if (res.count > baseline) {
      showBanner(res.count - baseline);
      if (document.hidden) chrome.runtime.sendMessage({ type: "notify", key: page.key });
      baseline = res.count;
    }
  }

  // Your own comment raises the count too, so re-baseline shortly after you submit one.
  document.addEventListener(
    "submit",
    () => {
      setTimeout(() => {
        baseline = null;
        etag = null;
        check();
      }, 5000);
    },
    true
  );

  // GitHub navigates without full reloads, so watch for page changes.
  setInterval(() => {
    const page = parsePage();
    const key = page ? page.key : null;
    if (key !== currentKey) {
      currentKey = key;
      baseline = null;
      etag = null;
      if (banner) {
        banner.remove();
        banner = null;
      }
      check();
    }
  }, 1000);

  setInterval(() => {
    if (!document.hidden || hasToken) check();
  }, INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
})();
