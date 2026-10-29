// Tokens are set per host on the extension's options page (needed for private
// repos; raises the rate limit from 60/hr to 5000/hr on github.com).
async function getToken(host) {
  const { tokens } = await chrome.storage.local.get("tokens");
  return (tokens && tokens[host]) || "";
}

// github.com uses api.github.com; GitHub Enterprise serves the API under /api/v3.
function apiBase(host) {
  return host === "github.com" ? "https://api.github.com" : `https://${host}/api/v3`;
}

// Content scripts can't call the API (CORS), so the fetch happens here.
async function fetchCounts(host, path, etag) {
  const TOKEN = await getToken(host);
  const headers = { Accept: "application/vnd.github+json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (etag) headers["If-None-Match"] = etag;
  try {
    const r = await fetch(`${apiBase(host)}${path}`, { headers });
    if (r.status === 304) return { unchanged: true };
    if (r.status !== 200) return { error: r.status };
    const d = await r.json();
    return {
      etag: r.headers.get("etag"),
      // issues: comments; PRs: comments + inline review comments
      count: (d.comments || 0) + (d.review_comments || 0),
    };
  } catch {
    return { error: "network" };
  }
}

async function apiGet(host, path) {
  const TOKEN = await getToken(host);
  const headers = { Accept: "application/vnd.github+json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const r = await fetch(`${apiBase(host)}${path}`, { headers });
  if (r.status !== 200) {
    // Keep GitHub's own explanation (e.g. "Resource not accessible by personal
    // access token") and which endpoint failed, so the page can show them.
    const body = await r.json().catch(() => ({}));
    const endpoint = path.replace(/^\/repos\/[^/]+\/[^/]+\//, "").replace(/\?.*/, "");
    throw Object.assign(new Error(String(r.status)), {
      detail: `${endpoint}: ${body.message || "no details"}`,
    });
  }
  return r.json();
}

// A string that changes whenever the PR's head commit, a check run, or a commit
// status changes.
async function fetchCi(host, owner, repo, num) {
  try {
    const pr = await apiGet(host, `/repos/${owner}/${repo}/pulls/${num}`);
    const sha = pr.head.sha;
    const [checks, status] = await Promise.all([
      apiGet(host, `/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`),
      apiGet(host, `/repos/${owner}/${repo}/commits/${sha}/status`),
    ]);
    // Only the overall picture matters, so per-check noise doesn't trigger alerts.
    const runs = checks.check_runs;
    const running =
      runs.some((c) => c.status !== "completed") ||
      (status.total_count > 0 && status.state === "pending");
    const failed =
      runs.some((c) => ["failure", "timed_out", "cancelled", "action_required"].includes(c.conclusion)) ||
      (status.total_count > 0 && ["failure", "error"].includes(status.state));
    return { sha, state: running ? "running" : failed ? "failed" : "passed" };
  } catch (e) {
    // apiGet throws the HTTP status as the message; anything else is a network failure
    return { error: Number(e.message) || "network", detail: e.detail };
  }
}

// Clicking the toolbar icon opens the options page (token setup).
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "fetchCounts") {
    fetchCounts(msg.host, msg.path, msg.etag).then(sendResponse);
    return true; // async response
  }
  if (msg.type === "openOptions") {
    chrome.runtime.openOptionsPage();
    return false;
  }
  if (msg.type === "fetchCi") {
    fetchCi(msg.host, msg.owner, msg.repo, msg.num).then(sendResponse);
    return true;
  }
  if (msg.type === "hasToken") {
    getToken(msg.host).then((t) => sendResponse(!!t));
    return true;
  }
});
