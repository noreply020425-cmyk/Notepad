const STORAGE_KEY = "notepad_credentials";
const ACCOUNT_KEY = "notepad_account";
const THEME_KEY = "notepad_theme";
const root = document.documentElement;
const API = window.NotepadAPI;
const byId = id => document.getElementById(id);
const WINDOW_FEATURES = "width=1200,height=800,resizable=yes,scrollbars=yes";

let mode = "login";

// ---- Theme (same data-theme mechanism as the notepad) ----
const themeToggle = byId("themeToggle");
const themeIcon = byId("themeIcon");

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

// ---- Views ----
function readAccount() {
    try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null"); } catch { return null; }
}

function showView() {
    const account = readAccount();
    const signedIn = Boolean(account && account.email && API.getToken());
    byId("signedInView").hidden = !signedIn;
    byId("authView").hidden = signedIn;
    if (signedIn) byId("accountEmail").textContent = account.email;
}

function setMode(next) {
    mode = next;
    const register = mode === "register";

    document.querySelectorAll(".mode-switch button").forEach(button => {
        const active = button.dataset.mode === mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    byId("registerFields").hidden = !register;
    ["oracleId", "name", "repId"].forEach(id => { byId(id).required = register; });
    byId("password").autocomplete = register ? "new-password" : "current-password";
    byId("submitLabel").textContent = register ? "Create account and launch" : "Sign in and launch";
    showError("");
}

function showError(message) {
    const box = byId("formError");
    box.textContent = message;
    box.hidden = !message;
}

document.querySelectorAll(".mode-switch button").forEach(button =>
    button.addEventListener("click", () => setMode(button.dataset.mode))
);

// ---- Launch ----
// The window must open during the click, before any await, or browsers block it.
function openBlankWindow() {
    return window.open("", "NotepadWindow", WINDOW_FEATURES);
}

function launch(popup) {
    if (!popup) {
        NotepadDialog.alert({
            title: "Popup blocked",
            message: "Please allow popups for this page, then launch Notepad again."
        });
        return;
    }
    popup.location.href = new URL("notepad.html", location.href).href;
    popup.focus();
}

function closeIfBlank(popup) {
    try { if (popup && popup.location.href === "about:blank") popup.close(); } catch {}
}

byId("continueBtn").addEventListener("click", () => launch(openBlankWindow()));

byId("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    showError("");

    if (!API.configured()) {
        showError("The API address is not set yet. Edit config.js and set NOTEPAD_API.");
        return;
    }

    const popup = openBlankWindow();
    const button = byId("submitBtn");
    button.disabled = true;

    try {
        const email = byId("email").value.trim();
        const password = byId("password").value;

        const data = mode === "register"
            ? await API.register({
                email, password,
                oracleId: byId("oracleId").value.trim(),
                name: byId("name").value.trim(),
                repId: byId("repId").value.trim()
            })
            : await API.login({ email, password });

        API.setToken(data.token);
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ email: data.user.email }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            oracleId: data.user.oracleId, name: data.user.name, repId: data.user.repId
        }));

        byId("password").value = "";
        showView();
        launch(popup);
    } catch (error) {
        closeIfBlank(popup);
        showError(error.message);
    } finally {
        button.disabled = false;
    }
});

// ---- Sign out ----
byId("clearCredentials").addEventListener("click", async () => {
    const confirmed = await NotepadDialog.confirm({
        title: "Sign out",
        message: "This signs you out and removes your saved account details from this browser. Your notes are not deleted.",
        confirmText: "Sign out",
        danger: true
    });

    if (!confirmed) return;
    API.clearToken();
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem(STORAGE_KEY);
    byId("loginForm").reset();
    setMode("login");
    showView();
});

setMode("login");
showView();
updateThemeIcon();
