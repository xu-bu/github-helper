# GitHub Helper

A small Chrome extension that makes GitHub pull request pages easier to work with.

## 1. Install

1. Clone or download this repo.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the repo folder.
4. (Optional, pin it) Click the puzzle-piece icon in the toolbar and pin **GitHub Helper**.
5. Reload any open GitHub tabs.

After you change the code, click the refresh icon on the extension card, then reload the GitHub tab.
If you move or rename the folder, remove the extension and load it again.

## 2. What it can do

- **Copy file name:** adds a **Copy** button next to the file name in review comment threads.
- **Alerts:** shows a banner when the issue or PR you are viewing gets new comments, or when a PR's CI status changes (the page doesn't always update by itself).
- **Page jump button:** adds a button at the bottom right of PR pages. On the Conversation tab it goes to Files changed. On other tabs it goes to the bottom of the Conversation tab.

It runs on `github.com` and `github.expedia.biz`. To add another host, add it to `content_scripts.matches` and `host_permissions` in `manifest.json` (GitHub Enterprise API lives under `https://<host>/api/*`) and to `HOSTS` in `options.js`.

## 3. How to use

### Copy file name

1. Open a PR with review comments.
2. Click **Copy** after the file name in a comment thread. This copies the file name, for example `ProofPointOption.java`.
3. Shift+click copies the path as shown on the page. GitHub shortens long paths with `...`, so it may not be the full path.

### Alerts (comments and CI)

1. Open the extension options (click the toolbar icon, or **Details** on the extension card, then **Extension options**).
2. Pick the host, paste a read-only [fine-grained token](https://github.com/settings/personal-access-tokens), click **Test** to check it, then click **Save**. Each host has its own token.
3. Reload your GitHub tabs. Leave a PR open and a banner appears when new comments arrive or CI status changes. Click **Refresh** in the banner to load them.

The token is needed for private repos. For the CI alert it needs **Checks: Read** and **Commit statuses: Read**.
Without a token, the alert only works on public repos and checks every 2 minutes. With one, it checks every 30 seconds.
The token is stored in this browser only, and is sent only to that host's API.
The alert counts your own comments too. It re-checks a few seconds after you submit one.
The CI alert only fires when the overall CI state changes (running, passed, failed) or a new commit is pushed, for example "CI running → passed".

### Page jump button

Open any PR page and click the button at the bottom right.
On the Conversation tab it reads **go to files changed**. On other tabs it reads **go to conversation** and opens the Conversation tab scrolled to the bottom.
