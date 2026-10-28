const input = document.getElementById("token");
const status = document.getElementById("status");

function flash(msg, color = "#1a7f37", ms = 1500) {
  status.style.color = color;
  status.textContent = msg;
  if (ms) setTimeout(() => (status.textContent = ""), ms);
}

document.getElementById("test").onclick = async () => {
  const token = input.value.trim();
  if (!token) return flash("Enter a token first", "#cf222e");
  flash("Testing...", "#666", 0);
  try {
    const r = await fetch("https://api.github.com/user", {
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

chrome.storage.local.get("token").then(({ token }) => {
  if (token) input.value = token;
});

document.getElementById("save").onclick = async () => {
  await chrome.storage.local.set({ token: input.value.trim() });
  flash("Saved");
};

document.getElementById("clear").onclick = async () => {
  await chrome.storage.local.remove("token");
  input.value = "";
  flash("Cleared");
};
