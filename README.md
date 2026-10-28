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
- **New-comment alert:** shows a banner when the issue or PR you are viewing gets new comments. It also sends a desktop notification if the tab is in the background.
- **Go to conversation:** adds a **go to conversation** button at the bottom right of PR pages. It jumps to the bottom of the Conversation tab.

It runs on `https://github.com/*` only.

## 3. How to use

### Copy file name

1. Open a PR with review comments.
2. Click **Copy** after the file name in a comment thread. This copies the file name, for example `ProofPointOption.java`.
3. Shift+click copies the path as shown on the page. GitHub shortens long paths with `...`, so it may not be the full path.

### New-comment alert

1. Open the extension options (**Details** on the extension card, then **Extension options**).
2. Paste a read-only [fine-grained token](https://github.com/settings/personal-access-tokens), click **Test** to check it, then click **Save**.
3. Reload your GitHub tabs. Leave a PR or issue open and a banner appears when new comments arrive. Click **Refresh** in the banner to load them.

The token is needed for private repos. Without one, the alert only works on public repos and checks every 2 minutes. With one, it checks every 30 seconds.
The token is stored in this browser only, and is sent only to `api.github.com`.
The alert counts your own comments too. It re-checks a few seconds after you submit one.

### Go to conversation

Open any PR page and click **go to conversation** at the bottom right.
On the Conversation tab it scrolls to the bottom. On other tabs, such as Files changed, it opens the Conversation tab first.
