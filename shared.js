// Shared helpers: credentials, normalized user key, cached Intl formatters.
(function () {
    const PREFIXES = [
        "notepad_notes_", "notepad_quick_access_",
        "notepad_category_notes_", "notepad_settings_", "notepad_forms_"
    ];

    function getCredentials() {
        try {
            const value = JSON.parse(localStorage.getItem("notepad_credentials") || "{}");
            return value && typeof value === "object" ? value : {};
        } catch { return {}; }
    }

    const rawId = c => String(c.oracleId || c.oracleID || "").trim();
    const normalizeId = id => String(id || "").trim().toLowerCase() || "default";
    const getUserId = (c = getCredentials()) => normalizeId(rawId(c));

    // One-time copy of data saved under the old, case-sensitive key.
    (function migrateLegacyKeys() {
        const raw = rawId(getCredentials()) || "default";
        const id = normalizeId(raw);
        if (raw === id) return;
        try {
            PREFIXES.forEach(prefix => {
                const old = localStorage.getItem(prefix + raw);
                if (old !== null && localStorage.getItem(prefix + id) === null) {
                    localStorage.setItem(prefix + id, old);
                }
            });
        } catch (error) { console.error("Key migration failed:", error); }
    })();

    const OPTIONS = {
        time:   { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true },
        date:   { weekday: "short", month: "short", day: "2-digit", year: "numeric" },
        hour:   { hour: "numeric", hourCycle: "h23" },
        short:  { timeZoneName: "short" },
        long:   { timeZoneName: "long" },
        offset: { timeZoneName: "longOffset" }
    };
    const cache = new Map();

    function fmt(timeZone, kind) {
        const key = `${timeZone}|${kind}`;
        let formatter = cache.get(key);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat("en-US", { timeZone, ...OPTIONS[kind] });
            cache.set(key, formatter);
        }
        return formatter;
    }

    function zoneName(timeZone, kind, now = new Date()) {
        return fmt(timeZone, kind).formatToParts(now)
            .find(part => part.type === "timeZoneName")?.value || "";
    }

    window.NotepadShared = { getCredentials, getUserId, normalizeId, fmt, zoneName };
})();
