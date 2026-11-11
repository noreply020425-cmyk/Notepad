
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // ELEMENTS
    // ==========================================

    const settingsButton = document.getElementById("settingsButton");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsClose = document.getElementById("settingsClose");
    const settingsDone = document.getElementById("settingsDone");

    const themeSelect = document.getElementById("themeSelect");
    const fontFamilySelect = document.getElementById("fontFamilySelect");
    const fontSizeSelect = document.getElementById("fontSizeSelect");

    const settingsName = document.getElementById("settingsName");
    const settingsOracleId = document.getElementById("settingsOracleId");
    const settingsRepId = document.getElementById("settingsRepId");

    const saveCredentialsButton = document.getElementById("saveCredentials");

    const exportBackupButton = document.getElementById("exportBackup");
    const importBackupButton = document.getElementById("importBackupButton");
    const importBackupFile = document.getElementById("importBackupFile");

    const notificationContainer = document.getElementById("notificationContainer");

    // ==========================================
    // NOTIFICATION
    // ==========================================

    function notify(message, type = "success") {

        if (!notificationContainer) {
            console.log(message);
            return;
        }

        const notification = document.createElement("div");
        notification.className = `notification ${type}`;

        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";

        icon.textContent = type === "error"
            ? "error"
            : type === "info"
                ? "info"
                : "check_circle";

        const text = document.createElement("span");
        text.textContent = message;

        notification.append(icon, text);
        notificationContainer.appendChild(notification);

        setTimeout(() => notification.remove(), 3500);
    }

    // ==========================================
    // CREDENTIALS
    // ==========================================

    function getCredentials() {

        try {
            return JSON.parse(
                localStorage.getItem("notepad_credentials") || "{}"
            );
        } catch {
            return {};
        }
    }

    function getOracleId(credentials) {

        return window.NotepadShared.normalizeId(
            credentials.oracleId || credentials.oracleID
        );
    }

    function saveCredentials(credentials) {

        try {

            localStorage.setItem(
                "notepad_credentials",
                JSON.stringify(credentials)
            );

            return true;

        } catch (error) {

            console.error("Credential save error:", error);
            return false;
        }
    }

    function populateCredentials() {

        const credentials = getCredentials();

        if (settingsName) {
            settingsName.value = credentials.name || "";
        }

        if (settingsOracleId) {
            settingsOracleId.value =
                credentials.oracleId || credentials.oracleID || "";
        }

        if (settingsRepId) {
            settingsRepId.value =
                credentials.repId || credentials.repID || "";
        }
    }

    function updateCredentialDisplay(credentials) {

        const nameElement = document.getElementById("userName");
        const oracleElement = document.getElementById("oracleId");
        const repElement = document.getElementById("repId");

        if (nameElement) {
            nameElement.textContent = credentials.name || "User";
        }

        if (oracleElement) {
            oracleElement.textContent =
                credentials.oracleId || credentials.oracleID || "Oracle ID";
        }

        if (repElement) {
            repElement.textContent =
                credentials.repId || credentials.repID || "Rep ID";
        }
    }

    // ==========================================
    // USER DATA MIGRATION
    // ==========================================

    function migrateUserData(oldId, newId) {

        if (!oldId || !newId || oldId === newId) {
            return true;
        }

        const keys = [
            `notepad_notes_${oldId}`,
            `notepad_quick_access_${oldId}`,
            `notepad_category_notes_${oldId}`,
            `notepad_settings_${oldId}`,
            `notepad_forms_${oldId}`
        ];

        const copiedKeys = [];

        try {

            for (const oldKey of keys) {

                const newKey = oldKey.replace(
                    `_${oldId}`,
                    `_${newId}`
                );

                const oldValue = localStorage.getItem(oldKey);

                if (oldValue === null) continue;

                if (localStorage.getItem(newKey) !== null) {
                    continue;
                }

                localStorage.setItem(newKey, oldValue);
                copiedKeys.push(newKey);
            }

            return true;

        } catch (error) {

            copiedKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            console.error("Data migration error:", error);

            notify(
                "Some existing data could not be transferred. Check browser storage.",
                "error"
            );

            return false;
        }
    }

    // ==========================================
    // SAVE CREDENTIALS
    // ==========================================

    if (saveCredentialsButton) {

        saveCredentialsButton.addEventListener("click", () => {

            const oldCredentials = getCredentials();
            const oldId = getOracleId(oldCredentials);

            const newCredentials = {
                ...oldCredentials,
                name: settingsName.value.trim(),
                oracleId: settingsOracleId.value.trim(),
                repId: settingsRepId.value.trim()
            };

            if (
                !newCredentials.name ||
                !newCredentials.oracleId ||
                !newCredentials.repId
            ) {

                notify(
                    "Please complete all three credential fields.",
                    "error"
                );

                return;
            }

            const newId = getOracleId(newCredentials);

            if (oldId !== newId) {

                const targetKeys = [
                    `notepad_notes_${newId}`,
                    `notepad_quick_access_${newId}`,
                    `notepad_category_notes_${newId}`,
                    `notepad_settings_${newId}`,
            `notepad_forms_${newId}`
                ];

                const hasExistingTargetData = targetKeys.some(
                    key => localStorage.getItem(key) !== null
                );

                if (hasExistingTargetData) {

                    notify(
                        "The new Oracle ID already has saved data. Existing data will be preserved.",
                        "info"
                    );
                }

                if (!migrateUserData(oldId, newId)) {
                    return;
                }
            }

            if (!saveCredentials(newCredentials)) {

                notify("Unable to save credentials.", "error");
                return;
            }

            updateCredentialDisplay(newCredentials);

            notify("Credentials successfully updated.");

            setTimeout(() => {
                window.location.reload();
            }, 700);
        });
    }

    // ==========================================
    // SETTINGS STORAGE
    // ==========================================

    function getCurrentOracleId() {
        return getOracleId(getCredentials());
    }

    function getSettingsKey() {
        return `notepad_settings_${getCurrentOracleId()}`;
    }

    function getDefaultSettings() {

        return {
            timezones: {
                pst: true,
                est: true,
                mst: true,
                cst: true
            },

            font: {
                family: "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif",
                size: 14
            }
        };
    }

    function getSettings() {

        try {

            const saved = JSON.parse(
                localStorage.getItem(getSettingsKey()) || "{}"
            );

            const defaults = getDefaultSettings();

            const validFamilies = [
                "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif",
                "Arial, Helvetica, sans-serif",
                "Verdana, sans-serif",
                "Tahoma, sans-serif",
                "'Trebuchet MS', sans-serif",
                "Georgia, serif",
                "'Courier New', monospace"
            ];

            const savedFamily = saved.font?.family;
            const savedSize = Number(saved.font?.size);

            return {
                timezones: {
                    pst: saved.timezones?.pst !== false,
                    est: saved.timezones?.est !== false,
                    mst: saved.timezones?.mst !== false,
                    cst: saved.timezones?.cst !== false
                },

                font: {
                    family: validFamilies.includes(savedFamily)
                        ? savedFamily
                        : defaults.font.family,

                    size: [12, 13, 14, 15, 16, 17, 18, 20].includes(savedSize)
                        ? savedSize
                        : defaults.font.size
                }
            };

        } catch {

            return getDefaultSettings();
        }
    }

    function saveSettings(settings) {

        try {

            localStorage.setItem(
                getSettingsKey(),
                JSON.stringify(settings)
            );

            return true;

        } catch (error) {

            console.error("Settings save error:", error);

            notify("Unable to save settings.", "error");

            return false;
        }
    }

    // ==========================================
    // THEME
    // ==========================================

    function applyTheme(theme) {

        const validTheme = theme === "dark" ? "dark" : "light";

        document.documentElement.setAttribute(
            "data-theme",
            validTheme
        );

        localStorage.setItem("notepad_theme", validTheme);

        if (themeSelect) {
            themeSelect.value = validTheme;
        }
    }

    if (themeSelect) {

        themeSelect.addEventListener("change", () => {

            applyTheme(themeSelect.value);

            notify(
                `${themeSelect.value === "dark" ? "Dark" : "Light"} theme applied.`
            );
        });
    }

    window.addEventListener("storage", event => {

        if (event.key === "notepad_theme" && event.newValue) {
            applyTheme(event.newValue);
        }
    });

    // ==========================================
    // FONT SETTINGS
    // ==========================================

    let currentFontSettings = {
        family: "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif",
        size: 14
    };

    // Apply font directly to editable areas.
    function applyFontToEditors() {

        const editors = document.querySelectorAll(
            "#noteEditor, .plain-template-editor"
        );

        editors.forEach(editor => {

            editor.style.setProperty(
                "font-family",
                currentFontSettings.family,
                "important"
            );

            editor.style.setProperty(
                "font-size",
                `${currentFontSettings.size}px`,
                "important"
            );
        });
    }

    // Apply saved font settings.
    function applyFontSettings() {

        const settings = getSettings();

        currentFontSettings = {
            family: settings.font.family,
            size: settings.font.size
        };

        document.documentElement.style.setProperty(
            "--notepad-font-family",
            currentFontSettings.family
        );

        document.documentElement.style.setProperty(
            "--notepad-font-size",
            `${currentFontSettings.size}px`
        );

        if (fontFamilySelect) {
            fontFamilySelect.value = currentFontSettings.family;
        }

        if (fontSizeSelect) {
            fontSizeSelect.value = String(currentFontSettings.size);
        }

        applyFontToEditors();
    }

    // Save font changes.
    function updateFontSettings() {

        const settings = getSettings();

        const previousFont = {
            ...settings.font
        };

        settings.font = {
            family: fontFamilySelect.value,
            size: Number(fontSizeSelect.value)
        };

        if (!saveSettings(settings)) {

            settings.font = previousFont;
            applyFontSettings();

            return;
        }

        applyFontSettings();

        notify("Font settings saved.");
    }

    if (fontFamilySelect) {
        fontFamilySelect.addEventListener(
            "change",
            updateFontSettings
        );
    }

    if (fontSizeSelect) {
        fontSizeSelect.addEventListener(
            "change",
            updateFontSettings
        );
    }

    // Watch for dynamically created Phonetime and Casework editors.
    // Newly created entries will automatically receive the selected font.
    if (document.body) {

        const fontObserver = new MutationObserver(() => {
            applyFontToEditors();
        });

        fontObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ==========================================
    // TIMEZONE VISIBILITY
    // ==========================================

    function applyTimezoneSettings() {

        const settings = getSettings();

        document.querySelectorAll("[data-timezone-toggle]").forEach(toggle => {

            const zone = toggle.dataset.timezoneToggle;
            const visible = settings.timezones[zone] !== false;

            toggle.checked = visible;

            const card = document.querySelector(
                `[data-timezone-card="${zone}"]`
            );

            if (card) {
                card.hidden = !visible;
            }
        });
    }

    document.querySelectorAll("[data-timezone-toggle]").forEach(toggle => {

        toggle.addEventListener("change", () => {

            const settings = getSettings();
            const zone = toggle.dataset.timezoneToggle;

            const previousValue = settings.timezones[zone];

            settings.timezones[zone] = toggle.checked;

            if (!saveSettings(settings)) {

                toggle.checked = previousValue;
                applyTimezoneSettings();

                return;
            }

            applyTimezoneSettings();

            notify(
                `${zone.toUpperCase()} clock ${toggle.checked ? "shown" : "hidden"}.`
            );
        });
    });

    // ==========================================
    // SETTINGS PANEL
    // ==========================================

    function closeExistingDropdowns() {

        const quickMenu = document.getElementById("quickAccessMenu");
        const notesMenu = document.getElementById("notesMenu");

        const quickButton = document.getElementById("quickAccessButton");
        const notesButton = document.getElementById("notesButton");

        const formsMenu = document.getElementById("formsMenu");
        const formsButton = document.getElementById("formsButton");

        if (quickMenu) quickMenu.hidden = true;
        if (notesMenu) notesMenu.hidden = true;
        if (formsMenu) formsMenu.hidden = true;
        if (formsButton) formsButton.setAttribute("aria-expanded", "false");

        if (quickButton) {
            quickButton.setAttribute("aria-expanded", "false");
        }

        if (notesButton) {
            notesButton.setAttribute("aria-expanded", "false");
        }
    }

    function openSettings() {

        closeExistingDropdowns();

        populateCredentials();

        if (themeSelect) {
            themeSelect.value =
                localStorage.getItem("notepad_theme") || "light";
        }

        applyFontSettings();
        applyTimezoneSettings();

        settingsOverlay.hidden = false;

        settingsButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function closeSettings() {

        settingsOverlay.hidden = true;

        settingsButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    if (settingsButton && settingsOverlay) {
        settingsButton.addEventListener("click", openSettings);
    }

    if (settingsClose) {
        settingsClose.addEventListener("click", closeSettings);
    }

    if (settingsDone) {
        settingsDone.addEventListener("click", closeSettings);
    }

    if (settingsOverlay) {

        settingsOverlay.addEventListener("click", event => {

            if (event.target === settingsOverlay) {
                closeSettings();
            }
        });
    }

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            settingsOverlay &&
            !settingsOverlay.hidden
        ) {
            closeSettings();
        }
    });

    // ==========================================
    // EXPORT BACKUP
    // ==========================================

    if (exportBackupButton) {

        exportBackupButton.addEventListener("click", () => {

            const backup = {
                application: "Notepad",
                version: 1,
                exportedAt: new Date().toISOString(),
                data: {}
            };

            try {

                for (let index = 0; index < localStorage.length; index++) {

                    const key = localStorage.key(index);

                    if (key && key.startsWith("notepad_")) {
                        backup.data[key] = localStorage.getItem(key);
                    }
                }

                const blob = new Blob(
                    [JSON.stringify(backup, null, 2)],
                    { type: "application/json" }
                );

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;

                link.download =
                    `notepad-backup-${new Date().toISOString().slice(0, 10)}.json`;

                document.body.appendChild(link);
                link.click();
                link.remove();

                URL.revokeObjectURL(url);

                notify("Notepad backup exported.");

            } catch (error) {

                console.error("Backup export error:", error);

                notify("Unable to export backup.", "error");
            }
        });
    }

    // ==========================================
    // IMPORT BACKUP
    // ==========================================

    if (importBackupButton && importBackupFile) {

        importBackupButton.addEventListener("click", () => {
            importBackupFile.click();
        });

        importBackupFile.addEventListener("change", async () => {

            const file = importBackupFile.files?.[0];

            if (!file) return;

            try {

                const text = await file.text();
                const backup = JSON.parse(text);

                if (
                    backup.application !== "Notepad" ||
                    !backup.data ||
                    typeof backup.data !== "object" ||
                    Array.isArray(backup.data)
                ) {
                    throw new Error("Invalid Notepad backup.");
                }

                const entries = Object.entries(backup.data);

                if (!entries.length) {
                    throw new Error("The backup contains no data.");
                }

                if (!entries.every(([key, value]) =>
                    key.startsWith("notepad_") &&
                    typeof value === "string"
                )) {
                    throw new Error("The backup contains invalid entries.");
                }

                const previousValues = {};

                entries.forEach(([key]) => {
                    previousValues[key] = localStorage.getItem(key);
                });

                try {

                    entries.forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                    });

                } catch (error) {

                    Object.entries(previousValues).forEach(([key, value]) => {

                        if (value === null) {
                            localStorage.removeItem(key);
                        } else {
                            localStorage.setItem(key, value);
                        }
                    });

                    throw error;
                }

                notify("Backup imported successfully. Refreshing workspace.");

                setTimeout(() => {
                    window.location.reload();
                }, 800);

            } catch (error) {

                console.error("Backup import error:", error);

                notify(
                    error.message || "Unable to import backup.",
                    "error"
                );

            } finally {

                importBackupFile.value = "";
            }
        });
    }

    // ==========================================
    // INITIALIZE
    // ==========================================

    const credentials = getCredentials();

    updateCredentialDisplay(credentials);

    if (themeSelect) {
        themeSelect.value =
            localStorage.getItem("notepad_theme") || "light";
    }

    applyFontSettings();
    applyTimezoneSettings();

});
