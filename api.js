// Small client for the Notepad API (accounts + billing).
(function () {
    const TOKEN_KEY = "notepad_token";
    const base = () => String(window.NOTEPAD_API || "").replace(/\/$/, "");

    const configured = () => Boolean(base()) && !base().includes("YOUR-API");

    const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
    const setToken = token => { try { localStorage.setItem(TOKEN_KEY, token); } catch {} };
    const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} };

    async function request(path, { method = "GET", body, auth = true } = {}) {
        if (!configured()) throw Object.assign(new Error("The API address is not set. Edit config.js."), { status: 0 });

        const headers = {};
        if (body) headers["Content-Type"] = "application/json";
        if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

        let response;
        try {
            response = await fetch(base() + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
        } catch {
            throw Object.assign(new Error("Cannot reach the server. Check your connection and try again."), { status: 0 });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(data.error || "Request failed."), { status: response.status });
        return data;
    }

    window.NotepadAPI = {
        configured, getToken, setToken, clearToken,
        register: fields => request("/api/auth/register", { method: "POST", body: fields, auth: false }),
        login: fields => request("/api/auth/login", { method: "POST", body: fields, auth: false }),
        me: () => request("/api/me"),
        checkout: returnUrl => request("/api/billing/checkout", { method: "POST", body: { returnUrl } }),
        confirm: sessionId => request(`/api/billing/confirm?session_id=${encodeURIComponent(sessionId)}`)
    };
})();
