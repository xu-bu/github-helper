const MARK = "data-copy-filename-added";

function addButtons() {
  document
    // header is a <summary> in some views and a <div> in others
    .querySelectorAll('span.flex-auto > a.text-mono[href*="#diff-"]')
    .forEach((link) => {
      if (link.hasAttribute(MARK)) return;
      link.setAttribute(MARK, "1");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Copy";
      btn.title = "Copy file name (Shift+click: copy shown path)";
      btn.className = "btn-octicon";
      btn.style.cssText = "font-size:12px;margin-right:8px;cursor:pointer;";

      btn.addEventListener("click", async (e) => {
        // inside <summary>: stop the click from toggling the <details>
        e.preventDefault();
        e.stopPropagation();

        const shown = link.textContent.trim().replace(/^\.\.\./, "");
        const text = e.shiftKey ? shown : shown.split("/").pop();
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied!";
        } catch {
          btn.textContent = "Failed";
        }
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      });

      link.after(btn);
    });
}

addButtons();
new MutationObserver(addButtons).observe(document.body, {
  childList: true,
  subtree: true,
});
