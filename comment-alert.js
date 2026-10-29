// Banner when an issue/PR gets new comments, or when a PR's CI status changes.
// Ported from a userscript; API calls go through background.js.
(async function () {
  const host = location.hostname;
  const hasToken = await chrome.runtime.sendMessage({ type: "hasToken", host });
  const INTERVAL_MS = hasToken ? 30_000 : 120_000; // keep unauthenticated polling slow

  let currentKey = null,
    baseline = null,
    etag = null,
    ciBaseline = null,
    commentMsg = null,
    ciMsg = null,
    banner = null,
    errBanner = null,
    lastErr = null;

  function parsePage() {
    const m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
    if (!m) return null;
    const [, owner, repo, kind, num] = m;
    const path =
      kind === "pull"
        ? `/repos/${owner}/${repo}/pulls/${num}`
        : `/repos/${owner}/${repo}/issues/${num}`;
    return { key: `${owner}/${repo}#${num}`, path, owner, repo, num, isPull: kind === "pull" };
  }

  function closeBanner() {
    if (banner) banner.remove();
    banner = null;
    commentMsg = ciMsg = null;
  }

  function clearError() {
    if (errBanner) errBanner.remove();
    errBanner = null;
    lastErr = null;
  }

  // Turn an API failure into a sentence that says what to fix.
  function describeError(what, err) {
    if (err === "network") return `${what}: can't reach ${host}. Check your network or VPN.`;
    if (!hasToken) {
      return `${what} off: no token set for ${host}. Private repos need one — add it in the extension settings.`;
    }
    if (err === 401) return `${what} off: the token for ${host} is invalid or expired.`;
    if (err === 403) {
      return `${what} off: access denied (403). The token may be missing a permission (Pull requests, Checks, Commit statuses: Read), or the rate limit was hit.`;
    }
    if (err === 404) {
      return `${what} off: the token for ${host} can't see this repo (404). Check its repo access, and authorize it for SSO if the org requires it.`;
    }
    return `${what} off: GitHub API error (${err}).`;
  }

  // Shown once per distinct problem, so a failing poll doesn't nag every 30s.
  function reportError(what, err, detail) {
    // GitHub's SAML message carries a one-click authorization link; show it as a
    // button instead of a wall of text.
    const ssoUrl = detail && (detail.match(/https:\/\/\S+/) || [])[0];
    const isSso = !!detail && /SAML/i.test(detail);
    let msg;
    if (isSso) {
      msg = `${what} off: the token for ${host} isn't authorized for SSO on this org.`;
    } else {
      const short = detail && detail.length > 140 ? detail.slice(0, 140) + "…" : detail;
      msg = describeError(what, err) + (short ? ` [${short}]` : "");
    }
    if (msg === lastErr) return;
    clearError();
    lastErr = msg;
    errBanner = document.createElement("div");
    errBanner.style.cssText =
      "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;max-width:560px;" +
      "background:#bc4c00;color:#fff;padding:10px 16px;border-radius:8px;" +
      "font:14px -apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);" +
      "display:flex;gap:12px;align-items:center;box-sizing:border-box;width:max-content;" +
      "max-width:min(560px,calc(100vw - 24px));max-height:40vh;overflow:auto;word-break:break-word;";
    if (banner) errBanner.style.top = "64px"; // don't cover the update banner
    const text = document.createElement("span");
    text.textContent = msg;
    const settings = document.createElement("button");
    settings.textContent = "Open settings";
    settings.style.cssText =
      "background:#fff;color:#bc4c00;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:600;white-space:nowrap;";
    settings.onclick = () => chrome.runtime.sendMessage({ type: "openOptions" });
    const close = document.createElement("button");
    close.textContent = "✕";
    close.style.cssText = "background:none;color:#fff;border:0;cursor:pointer;font-size:14px;";
    close.onclick = () => {
      errBanner.remove();
      errBanner = null; // keep lastErr so it isn't shown again until the problem changes
    };
    const btnStyle =
      "background:#fff;color:#bc4c00;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:600;white-space:nowrap;flex-shrink:0;text-decoration:none;";
    settings.style.cssText = btnStyle;
    close.style.flexShrink = "0";
    if (ssoUrl) {
      const sso = document.createElement("a");
      sso.textContent = "Authorize SSO";
      sso.href = ssoUrl;
      sso.target = "_blank";
      sso.rel = "noopener";
      sso.style.cssText = btnStyle;
      errBanner.append(text, sso, close);
    } else {
      errBanner.append(text, settings, close);
    }
    document.body.appendChild(errBanner);
  }

  function renderBanner() {
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
    text.textContent = [commentMsg, ciMsg].filter(Boolean).join(" · ");
    const refresh = document.createElement("button");
    refresh.textContent = "Refresh";
    refresh.style.cssText =
      "background:#fff;color:#1f6feb;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:600;";
    refresh.onclick = () => location.reload();
    const close = document.createElement("button");
    close.textContent = "✕";
    close.style.cssText = "background:none;color:#fff;border:0;cursor:pointer;font-size:14px;";
    close.onclick = closeBanner;
    banner.append(text, refresh, close);
  }

  async function checkComments(page) {
    const res = await chrome.runtime.sendMessage({
      type: "fetchCounts",
      host,
      path: page.path,
      etag,
    });
    if (!res) return;
    if (res.error) return reportError("Comment alerts", res.error);
    if (lastErr && lastErr.startsWith("Comment alerts")) clearError();
    if (res.unchanged) return;
    if (res.etag) etag = res.etag;
    if (baseline === null) {
      baseline = res.count;
      return;
    }
    if (res.count > baseline) {
      const diff = res.count - baseline;
      commentMsg = `${diff} new comment${diff > 1 ? "s" : ""} on this page`;
      renderBanner();
      baseline = res.count;
    }
  }

  // The PR page doesn't always update when checks finish, so compare CI state
  // (head commit + check runs + commit statuses) against the first snapshot.
  async function checkCi(page) {
    if (!page.isPull) return;
    const res = await chrome.runtime.sendMessage({
      type: "fetchCi",
      host,
      owner: page.owner,
      repo: page.repo,
      num: page.num,
    });
    if (!res) return;
    if (res.error) return reportError("CI alerts", res.error, res.detail);
    if (lastErr && lastErr.startsWith("CI alerts")) clearError();
    if (ciBaseline === null) {
      ciBaseline = res;
      return;
    }
    if (res.sha !== ciBaseline.sha) {
      ciMsg = "New commit pushed";
    } else if (res.state !== ciBaseline.state) {
      ciMsg = `CI ${ciBaseline.state} → ${res.state}`;
    } else {
      return;
    }
    renderBanner();
    ciBaseline = res;
  }

  async function check() {
    const page = parsePage();
    if (!page) return;
    await Promise.all([checkComments(page), checkCi(page)]);
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
      ciBaseline = null;
      closeBanner();
      clearError();
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
