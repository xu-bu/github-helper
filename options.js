// Hosts must match the content_scripts / host_permissions entries in manifest.json.
const HOSTS = ["github.com", "github.expedia.biz"];

const hostSel = document.getElementById("host");
const input = document.getElementById("token");
const status = document.getElementById("status");

HOSTS.forEach((h) => hostSel.add(new Option(h, h)));

function apiBase(host) {
  return host === "github.com" ? "https://api.github.com" : `https://${host}/api/v3`;
}

function flash(msg, color = "#1a7f37", ms = 1500) {
  status.style.color = color;
  status.textContent = msg;
  if (ms) setTimeout(() => (status.textContent = ""), ms);
}

async function loadToken() {
  const { tokens } = await chrome.storage.local.get("tokens");
  input.value = (tokens && tokens[hostSel.value]) || "";
}

async function saveToken(value) {
  const { tokens } = await chrome.storage.local.get("tokens");
  const next = { ...(tokens || {}) };
  if (value) next[hostSel.value] = value;
  else delete next[hostSel.value];
  await chrome.storage.local.set({ tokens: next });
}

hostSel.onchange = loadToken;

document.getElementById("test").onclick = async () => {
  const token = input.value.trim();
  if (!token) return flash("Enter a token first", "#cf222e");
  flash("Testing...", "#666", 0);
  try {
    const r = await fetch(`${apiBase(hostSel.value)}/user`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (r.status === 200) {
      const { login } = await r.json();
      flash(`Valid: signed in as ${login}`, "#1a7f37", 5000);
    } else if (r.status === 401) {
      flash("Invalid or expired token (401)", "#cf222e", 5000);
    } else {
      flash(`Unexpected response (${r.status})`, "#cf222e", 5000);
    }
  } catch {
    flash("Network error", "#cf222e", 5000);
  }
};

document.getElementById("save").onclick = async () => {
  await saveToken(input.value.trim());
  flash("Saved");
};

document.getElementById("clear").onclick = async () => {
  await saveToken("");
  input.value = "";
  flash("Cleared");
};

loadToken();
