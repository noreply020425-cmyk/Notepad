const STORAGE_KEY = "notepad_credentials";
const THEME_KEY = "notepad_theme";
const fields = ["oracleId", "name", "repId"];
const root = document.documentElement;

function readCredentials() {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return value && typeof value === "object" ? value : {};
    } catch {
        return {};
    }
}

function loadCredentials() {
    const saved = readCredentials();
    fields.forEach(id => { document.getElementById(id).value = saved[id] || ""; });
}

function saveCredentials() {
    const credentials = {};
    fields.forEach(id => { credentials[id] = document.getElementById(id).value.trim(); });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
        console.error("Unable to save credentials:", error);
    }
}

// Save on blur and submit (not every keystroke) so an open Notepad window
// is not reloaded while you are still typing.
fields.forEach(id => document.getElementById(id).addEventListener("change", saveCredentials));

// ---- Theme (same data-theme mechanism as the notepad) ----
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

function updateThemeIcon() {
    const isDark = root.getAttribute("data-theme") === "dark";
    themeIcon.textContent = isDark ? "light_mode" : "dark_mode";
    themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
}

themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    updateThemeIcon();
});

// ---- Launch ----
document.getElementById("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    saveCredentials();

    const popup = window.open(
        "./notepad.html", "NotepadWindow",
        "width=1200,height=800,resizable=yes,scrollbars=yes"
    );

    if (popup) popup.focus();
    else NotepadDialog.alert({
        title: "Popup blocked",
        message: "Please allow popups for this page, then launch Notepad again."
    });
});

// ---- Clear ----
document.getElementById("clearCredentials").addEventListener("click", async () => {
    const confirmed = await NotepadDialog.confirm({
        title: "Clear saved credentials",
        message: "This removes your saved Oracle ID, name and Rep ID from this browser. Your notes are not deleted.",
        confirmText: "Clear",
        danger: true
    });

    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById("loginForm").reset();
});

loadCredentials();
updateThemeIcon();
