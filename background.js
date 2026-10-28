// Token is set on the extension's options page (needed for private repos; raises
// the rate limit from 60/hr to 5000/hr).
async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return token || "";
}

// Content scripts can't call api.github.com (CORS), so the fetch happens here.
async function fetchCounts(path, etag) {
  const TOKEN = await getToken();
  const headers = { Accept: "application/vnd.github+json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (etag) headers["If-None-Match"] = etag;
  try {
    const r = await fetch(`https://api.github.com${path}`, { headers });
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "fetchCounts") {
    fetchCounts(msg.path, msg.etag).then(sendResponse);
    return true; // async response
  }
  if (msg.type === "notify") {
    chrome.notifications.create({
      type: "basic",
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      title: "GitHub",
      message: `New comment on ${msg.key}`,
    });
    return false;
  }
  if (msg.type === "hasToken") {
    getToken().then((t) => sendResponse(!!t));
    return true;
  }
});
