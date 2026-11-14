// Custom message box that replaces the browser's alert() and confirm().
// Usage:
//   const ok = await NotepadDialog.confirm({ title, message, confirmText, cancelText, danger });
//   await NotepadDialog.alert({ title, message });
(function () {
    const CSS = `
    .np-dialog-overlay {
        position: fixed; inset: 0; z-index: 40000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; background: rgba(0, 0, 0, 0.35);
    }
    .np-dialog {
        width: 100%; max-width: 380px; padding: 24px;
        border: 1px solid var(--border, #E0E0E0); border-radius: 8px;
        background: var(--surface, #fff); color: var(--text, #1B1B1B);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
        font-family: var(--ui-font, 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif);
    }
    .np-dialog-title { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
    .np-dialog-message { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted, #616161); white-space: pre-line; }
    .np-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
    .np-dialog-button {
        min-width: 84px; height: 34px; padding: 0 16px;
        border: 1px solid var(--border, #E0E0E0); border-radius: 4px;
        background: transparent; color: var(--text, #1B1B1B);
        font: inherit; font-size: 13px; cursor: pointer;
    }
    .np-dialog-button:hover { background: var(--hover, #E6E6E6); }
    .np-dialog-button.primary { border-color: var(--accent, #005FB8); background: var(--accent, #005FB8); color: var(--on-accent, #fff); }
    .np-dialog-button.primary:hover { background: var(--accent-hover, #004A91); border-color: var(--accent-hover, #004A91); }
    .np-dialog-button.danger { border-color: var(--danger, #C42B1C); background: var(--danger, #C42B1C); color: #fff; }
    .np-dialog-button.danger:hover { opacity: 0.9; background: var(--danger, #C42B1C); }
    .np-dialog-button:focus-visible { outline: 2px solid var(--accent, #005FB8); outline-offset: 2px; }
    `;

    function injectStyles() {
        if (document.getElementById("npDialogStyles")) return;
        const style = document.createElement("style");
        style.id = "npDialogStyles";
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function show(options) {
        injectStyles();

        const {
            title = "Notepad",
            message = "",
            confirmText = "OK",
            cancelText = "Cancel",
            danger = false,
            showCancel = false
        } = options;

        return new Promise(resolve => {
            const previousFocus = document.activeElement;

            const overlay = document.createElement("div");
            overlay.className = "np-dialog-overlay";

            const box = document.createElement("div");
            box.className = "np-dialog";
            box.setAttribute("role", "alertdialog");
            box.setAttribute("aria-modal", "true");
            box.setAttribute("aria-labelledby", "npDialogTitle");
            box.setAttribute("aria-describedby", "npDialogMessage");

            const heading = document.createElement("h2");
            heading.className = "np-dialog-title";
            heading.id = "npDialogTitle";
            heading.textContent = title;

            const text = document.createElement("p");
            text.className = "np-dialog-message";
            text.id = "npDialogMessage";
            text.textContent = message;

            const actions = document.createElement("div");
            actions.className = "np-dialog-actions";

            const confirmButton = document.createElement("button");
            confirmButton.type = "button";
            confirmButton.className = `np-dialog-button ${danger ? "danger" : "primary"}`;
            confirmButton.textContent = confirmText;

            let cancelButton = null;

            if (showCancel) {
                cancelButton = document.createElement("button");
                cancelButton.type = "button";
                cancelButton.className = "np-dialog-button";
                cancelButton.textContent = cancelText;
                actions.appendChild(cancelButton);
            }

            actions.appendChild(confirmButton);
            box.append(heading, text, actions);
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            function close(result) {
                window.removeEventListener("keydown", onKey, true);
                overlay.remove();
                if (previousFocus && previousFocus.focus) previousFocus.focus();
                resolve(result);
            }

            function onKey(event) {
                // Handled here first so Esc does not also close a form behind the box.
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    close(false);
                } else if (event.key === "Tab") {
                    const buttons = [...actions.querySelectorAll("button")];
                    const first = buttons[0];
                    const last = buttons[buttons.length - 1];

                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            }

            window.addEventListener("keydown", onKey, true);

            confirmButton.addEventListener("click", () => close(true));
            if (cancelButton) cancelButton.addEventListener("click", () => close(false));

            overlay.addEventListener("mousedown", event => {
                if (event.target === overlay) close(false);
            });

            // Safe default for destructive actions: focus Cancel.
            (danger && cancelButton ? cancelButton : confirmButton).focus();
        });
    }

    const normalize = value => (typeof value === "string" ? { message: value } : value || {});

    window.NotepadDialog = {
        confirm: options => show({ ...normalize(options), showCancel: true }),
        alert: options => show({ ...normalize(options), showCancel: false }).then(() => undefined)
    };
})();
