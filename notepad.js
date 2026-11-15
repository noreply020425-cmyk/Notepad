document.addEventListener("DOMContentLoaded", () => {

    const Shared = window.NotepadShared;
    const byId = id => document.getElementById(id);

    // ==========================================
    // USER CREDENTIALS
    // ==========================================

    const credentials = Shared.getCredentials();
    const userId = Shared.getUserId(credentials);
    const displayName = credentials.name || "User";

    byId("userName").textContent = displayName;
    byId("oracleId").textContent = credentials.oracleId || credentials.oracleID || "Oracle ID";
    byId("repId").textContent = credentials.repId || credentials.repID || "Rep ID";
    byId("userAvatar").textContent = (displayName.trim()[0] || "U").toUpperCase();

    // ==========================================
    // TOAST
    // ==========================================

    function toast(message, type = "success") {
        const container = byId("notificationContainer");
        if (!container) return;

        const item = document.createElement("div");
        item.className = `notification ${type}`;

        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.textContent = type === "error" ? "error" : type === "info" ? "info" : "check_circle";

        const text = document.createElement("span");
        text.textContent = message;

        item.append(icon, text);
        container.appendChild(item);
        setTimeout(() => item.remove(), 3500);
    }

    // ==========================================
    // THEME
    // ==========================================

    const applyTheme = theme =>
        document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");

    applyTheme(localStorage.getItem("notepad_theme") || "light");

    // ==========================================
    // MAIN NOTE: DEBOUNCED SAVE, COUNTS, EXPORT
    // ==========================================

    const noteEditor = byId("noteEditor");
    const noteKey = `notepad_notes_${userId}`;
    const saveStatus = byId("saveStatus");
    const noteCounts = byId("noteCounts");
    const editorStatus = byId("editorStatus");
    let saveTimer = null;

    function setStatus(text, state) {
        saveStatus.textContent = text;
        saveStatus.dataset.state = state;
    }

    function updateCounts() {
        const text = noteEditor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        noteCounts.textContent =
            `${words.toLocaleString()} ${words === 1 ? "word" : "words"}, ` +
            `${text.length.toLocaleString()} characters`;
    }

    function saveNow() {
        clearTimeout(saveTimer);
        saveTimer = null;
        try {
            localStorage.setItem(noteKey, noteEditor.value);
            setStatus("Saved", "saved");
            return true;
        } catch {
            setStatus("Not saved: browser storage is full", "error");
            return false;
        }
    }

    if (noteEditor) {
        noteEditor.value = localStorage.getItem(noteKey) || "";
        updateCounts();

        noteEditor.addEventListener("input", () => {
            setStatus("Saving…", "saving");
            updateCounts();
            clearTimeout(saveTimer);
            saveTimer = setTimeout(saveNow, 400);
        });

        // Never lose the last few keystrokes.
        window.addEventListener("pagehide", () => { if (saveTimer) saveNow(); });

        // The status bar only applies to the main note, not Phonetime/Casework.
        new MutationObserver(() => {
            editorStatus.hidden = noteEditor.hidden;
        }).observe(noteEditor, { attributes: true, attributeFilter: ["hidden"] });

        // Ctrl/Cmd+S saves immediately instead of opening the browser dialog.
        document.addEventListener("keydown", event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (!noteEditor.hidden && saveNow()) toast("Note saved.");
            }
        });
    }

    // ==========================================
    // CROSS-TAB SYNC
    // ==========================================

    let reloadTimer = null;

    window.addEventListener("storage", event => {
        if (event.key === "notepad_theme") applyTheme(event.newValue || "light");

        if (event.key === "notepad_credentials") {
            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                if (saveTimer) saveNow();
                location.reload();
            }, 600);
        }

        if (event.key === noteKey && noteEditor && document.activeElement !== noteEditor) {
            noteEditor.value = event.newValue || "";
            updateCounts();
        }
    });

    // ==========================================
    // KEEP NOTIFICATIONS JUST ABOVE THE FOOTER
    // ==========================================

    const footerBars = [editorStatus, document.querySelector(".timezone-footer")].filter(Boolean);

    function updateFooterOffset() {
        const height = footerBars.reduce((total, bar) => total + bar.offsetHeight, 0);
        document.documentElement.style.setProperty("--footer-offset", `${height}px`);
    }

    updateFooterOffset();
    window.addEventListener("resize", updateFooterOffset);

    if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(updateFooterOffset);
        footerBars.forEach(bar => observer.observe(bar));
    }

    // ==========================================
    // TIMEZONE CLOCKS
    // ==========================================

    const zones = {
        pst: "America/Los_Angeles",
        est: "America/New_York",
        mst: "America/Denver",
        cst: "America/Chicago"
    };

    const clocks = Object.entries(zones).map(([key, timeZone]) => ({
        timeZone,
        card: document.querySelector(`[data-timezone-card="${key}"]`),
        time: document.querySelector(`[data-time="${key}"]`),
        date: document.querySelector(`[data-date="${key}"]`),
        label: document.querySelector(`[data-zone="${key}"]`)
    }));

    const setText = (element, value) => {
        if (element && element.textContent !== value) element.textContent = value;
    };

    function updateClocks() {
        if (document.hidden) return;
        const now = new Date();

        clocks.forEach(({ timeZone, card, time, date, label }) => {
            if (card && card.hidden) return;

            setText(time, Shared.fmt(timeZone, "time").format(now));
            setText(date, Shared.fmt(timeZone, "date").format(now));
            setText(label, Shared.zoneName(timeZone, "short", now) || label?.textContent);

            if (card) {
                const hour = parseInt(Shared.fmt(timeZone, "hour").format(now), 10);
                const daytime = hour >= 8 && hour < 20;
                card.classList.toggle("is-day", daytime);
                card.title = daytime ? "Daytime (8 AM to 8 PM)" : "Evening or night (8 PM to 8 AM)";
            }
        });
    }

    updateClocks();
    setInterval(updateClocks, 1000);
    document.addEventListener("visibilitychange", updateClocks);

    // Re-run when settings show a clock that was hidden.
    document.querySelectorAll("[data-timezone-toggle]").forEach(toggle =>
        toggle.addEventListener("change", () => setTimeout(updateClocks, 0))
    );
});
