
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // ELEMENTS
    // ==========================================

    const quickAccessButton = document.getElementById("quickAccessButton");
    const quickAccessMenu = document.getElementById("quickAccessMenu");
    const notesButton = document.getElementById("notesButton");
    const notesMenu = document.getElementById("notesMenu");
    const formsButton = document.getElementById("formsButton");
const formsMenu = document.getElementById("formsMenu");

    const dialogOverlay = document.getElementById("dialogOverlay");
    const dialogTitle = document.getElementById("dialogTitle");
    const dialogDescription = document.getElementById("dialogDescription");
    const dialogContent = document.getElementById("dialogContent");
    const dialogActions = document.getElementById("dialogActions");
    const dialogClose = document.getElementById("dialogClose");

    const notificationContainer = document.getElementById("notificationContainer");

    const noteEditor = document.getElementById("noteEditor");
    const editorContainer = document.querySelector(".editor-container");

    // ==========================================
    // USER CREDENTIALS
    // ==========================================

    let credentials = {};

    try {
        credentials = JSON.parse(
            localStorage.getItem("notepad_credentials") || "{}"
        );
    } catch {
        credentials = {};
    }

    const oracleId = window.NotepadShared.getUserId(credentials);

    const userName = credentials.name || "";
    const repId = credentials.repId || credentials.repID || "";

    const QUICK_ACCESS_KEY = `notepad_quick_access_${oracleId}`;
    const CATEGORY_NOTES_KEY = `notepad_category_notes_${oracleId}`;

    const ENTRIES_PER_SET = 20;
    const ENTRY_SEPARATOR = "\n\n—————————————————\n\n";

    let activeNoteSection = null;
    let activeTemplateElement = null;

    // Remember each section's scroll position
    const noteScrollPositions = {
        phonetime: {
            container: 0,
            page: 0,
            workspace: 0
        },
        casework: {
            container: 0,
            page: 0,
            workspace: 0
        }
    };

    const loadingNextSet = {
        phonetime: false,
        casework: false
    };

    // ==========================================
    // CATEGORIES
    // ==========================================

    const categories = {
        links: {
            title: "Links",
            description: "Frequently used links and resources."
        },
        contacts: {
            title: "Contacts",
            description: "Saved contact information."
        },
        templates: {
            title: "Templates",
            description: "Reusable messages and text."
        },
        others: {
            title: "Others",
            description: "Other saved information."
        }
    };

    // ==========================================
    // DEFAULT LINKS
    // ==========================================

    const defaultLinks = [
        {
            title: "Service Directory",
            value: "https://magentapulse.t-mobile.com/us/en/customer-support/accounts/porting/port-requests/service-provider-directory-wireless"
        },
        {
            title: "Iport",
            value: "https://iportproduction.t-mobile.com/iport/cases/search"
        },
        {
            title: "Account Hub",
            value: "https://care.ahub.t-mobile.com/orghome"
        },
        {
            title: "Pinninator",
            value: "https://beta.launchpad.t-mobile.com/tpop-atlas-lite"
        },
        {
            title: "Athena",
            value: "https://porting.tupl-prod.t-mobile.com/unifier/"
        },
        {
            title: "Aurora",
            value: "https://t-mobile.archerirm.us/Default.aspx"
        },
        {
            title: "Genesis",
            value: "https://genesisptl.t-mobile.com/search-subscriber"
        },
        {
            title: "Atlas",
            value: "https://beta.launchpad.t-mobile.com/care"
        },
        {
            title: "T-Lens",
            value: "https://prdedsiprwu2-dynamic-forms-web.prdedsmgtwu2-iase1.appserviceenvironment.net/"
        },
        {
            title: "Coaching Form",
            value: "Please fill out this form"
        }
    ];

    // ==========================================
    // DEFAULT CONTACTS
    // ==========================================

    const defaultContacts = [
        { title: "NTC3", value: "9998862077" },
        { title: "Customer Care", value: "9998864770" },
        { title: "Business Care", value: "9998864427" },
        { title: "Prepaid NTC", value: "9998863055" },
        { title: "Activation", value: "9998864392" },
        { title: "Spanish", value: "9998862707" },
        { title: "TECH", value: "9998862512" },
        { title: "Rebate Care Team", value: "9998866663" },
        { title: "Telesales", value: "9998862332" }
    ];

    const noteSections = {
        phonetime: { title: "Phonetime" },
        casework: { title: "Casework" }
    };

    // ==========================================
    // NOTIFICATIONS
    // ==========================================

    function showNotification(message, type = "success") {
        if (!notificationContainer) {
            console.warn(message);
            return;
        }

        const notification = document.createElement("div");
        notification.className = `notification ${type}`;

        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";

        icon.textContent =
            type === "error" ? "error" :
            type === "info" ? "info" :
            "check_circle";

        const text = document.createElement("span");
        text.textContent = message;

        notification.append(icon, text);
        notificationContainer.appendChild(notification);

        setTimeout(() => notification.remove(), 3500);
    }

    // ==========================================
    // STORAGE
    // ==========================================

    function readStorage(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "{}");

            return value && typeof value === "object"
                ? value
                : {};
        } catch {
            return {};
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Storage error:", error);

            showNotification(
                "Unable to save. Storage may be full.",
                "error"
            );

            return false;
        }
    }

    // ==========================================
    // QUICK ACCESS STORAGE
    // ==========================================

    function getQuickAccessData() {
        return readStorage(QUICK_ACCESS_KEY);
    }

    function saveQuickAccessData(data) {
        return writeStorage(QUICK_ACCESS_KEY, data);
    }

    function initializeQuickAccess() {
        const data = getQuickAccessData();
        let updated = false;

        if (!Array.isArray(data.links)) {
            data.links = [...defaultLinks];
            updated = true;
        }

        if (!Array.isArray(data.contacts)) {
            data.contacts = [...defaultContacts];
            updated = true;
        }

        if (updated) {
            saveQuickAccessData(data);
        }
    }

    function getEntries(category) {
        const data = getQuickAccessData();

        return Array.isArray(data[category])
            ? data[category]
            : [];
    }

    initializeQuickAccess();

    // ==========================================
    // NOTE STORAGE
    // ==========================================

    function getAllCategoryNotes() {
        return readStorage(CATEGORY_NOTES_KEY);
    }

    function saveCategoryNote(section, content) {
        const data = getAllCategoryNotes();
        data[section] = content;

        return writeStorage(CATEGORY_NOTES_KEY, data);
    }

    function getCategoryNote(section) {
        const data = getAllCategoryNotes();

        if (typeof data[section] === "string") {
            return data[section];
        }

        return createInitialNote(section);
    }

    function getEntryBlocks(content) {
        return content.split(ENTRY_SEPARATOR);
    }

    // ==========================================
    // COMPLETION STORAGE
    // ==========================================

    function getDoneStates(section, entryCount) {
        const data = getAllCategoryNotes();

        const saved = Array.isArray(data[`${section}_done`])
            ? data[`${section}_done`]
            : [];

        return Array.from(
            { length: entryCount },
            (_, index) => saved[index] === true
        );
    }

    function saveDoneStates(section, states) {
        const data = getAllCategoryNotes();
        data[`${section}_done`] = states;

        return writeStorage(CATEGORY_NOTES_KEY, data);
    }

    // ==========================================
    // CREATE ENTRY
    // ==========================================

    function createEntry(section) {

        if (section === "phonetime") {
            return [
                "Callers Name:\u00A0",
                "Porting MSISDN:\u00A0",
                "Courtesy #:\u00A0",
                "Reason/ Resolution/ Steps",
                ">\u00A0",
                "",
                "",
                "",
                `Name: ${userName}`,
                `Rep ID: ${repId}`
            ].join("\n");
        }

        return [
            "Case ID:\u00A0",
            "Contact Attempt:\u00A0",
            "Porting MSISDN:\u00A0",
            "Courtesy #:\u00A0",
            "Reason/ Resolution/ Steps",
            ">\u00A0",
            "",
            "",
            "",
            `Name: ${userName}`,
            `Rep ID: ${repId}`,
            "",
            "",
            `Name & Rep ID: ${userName} / ${repId}`,
            "Casework PTN:\u00A0"
        ].join("\n");
    }

    function createInitialNote(section) {
        return Array.from(
            { length: ENTRIES_PER_SET },
            () => createEntry(section)
        ).join(ENTRY_SEPARATOR);
    }

    // ==========================================
    // UPDATE CREDENTIALS
    // ==========================================

    function updateCredentialLines(section, content) {
        return getEntryBlocks(content).map(block => {

            const lines = block.split("\n");

            return lines.map(line => {

                if (line.startsWith("Name:")) {
                    return `Name: ${userName}`;
                }

                if (line.startsWith("Rep ID:")) {
                    return `Rep ID: ${repId}`;
                }

                if (
                    section === "casework" &&
                    line.startsWith("Name & Rep ID:")
                ) {
                    return `Name & Rep ID: ${userName} / ${repId}`;
                }

                return line;

            }).join("\n");

        }).join(ENTRY_SEPARATOR);
    }

    // ==========================================
    // CASEWORK PTN MIRROR
    // ==========================================

    function updateCaseworkPTN(content) {
        return getEntryBlocks(content).map(block => {

            const lines = block.split("\n");

            const portingIndex = lines.findIndex(line =>
                line.startsWith("Porting MSISDN:")
            );

            const caseworkIndex = lines.findIndex(line =>
                line.startsWith("Casework PTN:")
            );

            if (portingIndex !== -1 && caseworkIndex !== -1) {

                const value = lines[portingIndex]
                    .substring("Porting MSISDN:".length)
                    .trim();

                lines[caseworkIndex] = `Casework PTN: ${value}`;
            }

            return lines.join("\n");

        }).join(ENTRY_SEPARATOR);
    }

    // ==========================================
    // EDITOR HELPERS
    // ==========================================

    function getEditorText(editor) {
        return (editor.innerText || "")
            .replace(/\r/g, "")
            .replace(/\n+$/, "");
    }

    function getCaretOffset(element) {
        const selection = window.getSelection();

        if (!selection || !selection.rangeCount) return 0;

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();

        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);

        return preCaretRange.toString().length;
    }

    function setCaretOffset(element, offset) {
        const selection = window.getSelection();

        if (!selection) return;

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
        );

        let node;
        let remaining = offset;

        while ((node = walker.nextNode())) {

            const length = node.textContent.length;

            if (remaining <= length) {

                const range = document.createRange();

                range.setStart(node, remaining);
                range.collapse(true);

                selection.removeAllRanges();
                selection.addRange(range);

                return;
            }

            remaining -= length;
        }

        const range = document.createRange();

        range.selectNodeContents(element);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function syncCaseworkEditor(editor) {
        const originalText = getEditorText(editor);
        const caretOffset = getCaretOffset(editor);

        const updatedText = updateCaseworkPTN(originalText);

        if (updatedText !== originalText) {
            editor.textContent = updatedText;
            setCaretOffset(editor, caretOffset);
        }
    }


    // ==========================================
    // DROPDOWNS
    // ==========================================

    function closeQuickAccessDropdown() {
        if (!quickAccessMenu || !quickAccessButton) return;

        quickAccessMenu.hidden = true;
        quickAccessButton.setAttribute("aria-expanded", "false");
    }

    function closeNotesDropdown() {
        if (!notesMenu || !notesButton) return;

        notesMenu.hidden = true;
        notesButton.setAttribute("aria-expanded", "false");
    }

    function closeFormsDropdown() {
        if (!formsMenu || !formsButton) return;

        formsMenu.hidden = true;
        formsButton.setAttribute("aria-expanded", "false");
    }

    function closeAllDropdowns() {
        closeQuickAccessDropdown();
        closeNotesDropdown();
        closeFormsDropdown();
    }

    // QUICK ACCESS
    if (quickAccessButton && quickAccessMenu) {
        quickAccessButton.addEventListener("click", event => {
            event.stopPropagation();

            const isOpen = !quickAccessMenu.hidden;

            closeAllDropdowns();

            quickAccessMenu.hidden = isOpen;

            quickAccessButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );
        });
    }

    // NOTES
    if (notesButton && notesMenu) {
        notesButton.addEventListener("click", event => {
            event.stopPropagation();

            const isOpen = !notesMenu.hidden;

            closeAllDropdowns();

            notesMenu.hidden = isOpen;

            notesButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );
        });
    }

    // FORMS
    if (formsButton && formsMenu) {
        formsButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = !formsMenu.hidden;

            closeAllDropdowns();

            formsMenu.hidden = isOpen;

            formsButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            console.log("Forms dropdown:", !isOpen ? "opened" : "closed");
        });
    }

    // CLOSE WHEN CLICKING OUTSIDE
    document.addEventListener("click", event => {

        if (
            quickAccessButton &&
            quickAccessMenu &&
            !quickAccessButton.contains(event.target) &&
            !quickAccessMenu.contains(event.target)
        ) {
            closeQuickAccessDropdown();
        }

        if (
            notesButton &&
            notesMenu &&
            !notesButton.contains(event.target) &&
            !notesMenu.contains(event.target)
        ) {
            closeNotesDropdown();
        }

        if (
            formsButton &&
            formsMenu &&
            !formsButton.contains(event.target) &&
            !formsMenu.contains(event.target)
        ) {
            closeFormsDropdown();
        }
    });


    // ==========================================
    // QUICK ACCESS EVENTS
    // ==========================================

    if (quickAccessMenu) {
        quickAccessMenu.querySelectorAll("[data-category]").forEach(button => {
            button.addEventListener("click", () => {
                closeAllDropdowns();
                showCategory(button.dataset.category);
            });
        });
    }

    // ==========================================
    // NOTES EVENTS
    // ==========================================

    if (notesMenu) {
        notesMenu.querySelectorAll("[data-note-section]").forEach(button => {

            button.addEventListener("click", () => {

                closeAllDropdowns();

                const section = button.dataset.noteSection;

                if (activeNoteSection === section) {
                    returnToMainEditor();
                } else {
                    renderNoteSection(section);
                }
            });
        });
    }

    // ==========================================
    // DIALOG
    // ==========================================

    function openDialog() {
        if (dialogOverlay) {
            dialogOverlay.hidden = false;
        }
    }

    function closeDialog() {
        if (dialogOverlay) {
            dialogOverlay.hidden = true;
        }

        if (dialogContent) dialogContent.innerHTML = "";
        if (dialogActions) dialogActions.innerHTML = "";
    }

    if (dialogClose) {
        dialogClose.addEventListener("click", closeDialog);
    }

    if (dialogOverlay) {
        dialogOverlay.addEventListener("click", event => {
            if (event.target === dialogOverlay) {
                closeDialog();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            dialogOverlay &&
            !dialogOverlay.hidden
        ) {
            closeDialog();
        }
    });

    // ==========================================
    // ACTION BUTTON
    // ==========================================

    function createActionButton(iconName, label, callback) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "icon-button";
        button.title = label;
        button.setAttribute("aria-label", label);

        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.textContent = iconName;

        button.appendChild(icon);
        button.addEventListener("click", callback);

        return button;
    }

    // ==========================================
    // COPY
    // ==========================================

    async function copyText(value) {
        const text = String(value || "");

        try {

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                throw new Error("Clipboard unavailable");
            }

            showNotification("Copied to clipboard.");
            return true;

        } catch {

            const temporaryInput = document.createElement("textarea");

            temporaryInput.value = text;
            temporaryInput.style.position = "fixed";
            temporaryInput.style.opacity = "0";

            document.body.appendChild(temporaryInput);
            temporaryInput.select();

            const successful = document.execCommand("copy");

            temporaryInput.remove();

            showNotification(
                successful ? "Copied to clipboard." : "Unable to copy.",
                successful ? "success" : "error"
            );

            return successful;
        }
    }

    // Swap the copy icon for a check mark for a moment after a successful copy.
    function flashCopied(button) {
        const icon = button.querySelector(".material-symbols-rounded");
        const label = button.querySelector("span:not(.material-symbols-rounded)");

        if (!icon) return;

        if (!button.dataset.idleIcon) {
            button.dataset.idleIcon = icon.textContent;
            if (label) button.dataset.idleLabel = label.textContent;
        }

        icon.textContent = "check";
        if (label) label.textContent = "Copied";
        button.classList.add("copied");

        clearTimeout(button._copiedTimer);
        button._copiedTimer = setTimeout(() => {
            icon.textContent = button.dataset.idleIcon;
            if (label) label.textContent = button.dataset.idleLabel;
            button.classList.remove("copied");
        }, 1500);
    }

    // ==========================================
    // QUICK ACCESS DISPLAY
    // ==========================================

    function showCategory(category) {

        const config = categories[category];

        if (
            !config ||
            !dialogTitle ||
            !dialogDescription ||
            !dialogContent ||
            !dialogActions
        ) return;

        const entries = getEntries(category);

        dialogTitle.textContent = config.title;
        dialogDescription.textContent = config.description;

        dialogContent.innerHTML = "";
        dialogActions.innerHTML = "";

        if (!entries.length) {
            const empty = document.createElement("div");

            empty.className = "empty-state";
            empty.textContent = "No saved entries available.";

            dialogContent.appendChild(empty);
        }

        entries.forEach(entry => {

            const item = document.createElement("div");
            item.className = "entry-item";

            const details = document.createElement("div");
            details.className = "entry-details";

            const title = document.createElement("div");
            title.className = "entry-title";
            title.textContent = entry.title || "Untitled";

            const value = document.createElement("div");
            value.className = "entry-value";
            value.textContent = entry.value || "";

            details.append(title, value);

            const actions = document.createElement("div");
            actions.className = "entry-actions";

            // COPY BUTTON — ALL CATEGORIES

            actions.appendChild(
                createActionButton("content_copy", "Copy", async event => {
                    const button = event.currentTarget;

                    if (await copyText(entry.value)) {
                        flashCopied(button);
                    }
                })
            );

            // OPEN BUTTON — LINKS ONLY

            if (category === "links") {
                actions.appendChild(
                    createActionButton("open_in_new", "Open link", () => {

                        try {
                            const url = new URL(entry.value);

                            if (!["http:", "https:"].includes(url.protocol)) {
                                throw new Error("Invalid URL");
                            }

                            window.open(
                                url.href,
                                "_blank",
                                "noopener,noreferrer"
                            );

                            // Close the Links window once the link is opened
                            closeDialog();

                        } catch {
                            showNotification("Invalid link.", "error");
                        }
                    })
                );
            }

            // INSERT BUTTON — TEMPLATES ONLY

            if (category === "templates") {
                actions.appendChild(
                    createActionButton("post_add", "Insert template", () => {
                        insertTemplate(entry.value);
                    })
                );
            }

            item.append(details, actions);
            dialogContent.appendChild(item);
        });

        openDialog();
    }

    // ==========================================
    // INSERT TEMPLATE
    // ==========================================

    function insertTemplate(template) {
        if (!noteEditor) return;

        returnToMainEditor();

        const start = noteEditor.selectionStart;
        const end = noteEditor.selectionEnd;

        noteEditor.setRangeText(
            template || "",
            start,
            end,
            "end"
        );

        noteEditor.focus();

        noteEditor.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        closeDialog();

        showNotification("Template inserted.");
    }

    // ==========================================
    // GET ACTIVE ENTRY COUNT
    // ==========================================

    function getActiveEntryCount(section) {

        if (
            activeNoteSection !== section ||
            !activeTemplateElement
        ) {
            return 0;
        }

        return activeTemplateElement.querySelectorAll(
            ".plain-template-editor"
        ).length;
    }

    // ==========================================
    // SAVE ACTIVE ENTRY TEXTS
    // ==========================================

    function saveEntryTexts(section) {

        if (
            !activeTemplateElement ||
            activeNoteSection !== section
        ) {
            return false;
        }

        const editors = Array.from(
            activeTemplateElement.querySelectorAll(
                ".plain-template-editor"
            )
        );

        const content = editors
            .map(editor => getEditorText(editor))
            .join(ENTRY_SEPARATOR);

        return saveCategoryNote(section, content);
    }

    // ==========================================
    // SAVE AND RESTORE SCROLL POSITION
    // ==========================================

    function saveSectionScrollPosition(section) {

        if (!section || !noteScrollPositions[section]) return;

        noteScrollPositions[section] = {
            container: editorContainer
                ? editorContainer.scrollTop
                : 0,

            page: window.scrollY ||
                document.documentElement.scrollTop ||
                0,

            workspace: activeTemplateElement
                ? activeTemplateElement.scrollTop
                : 0
        };
    }

    function restoreSectionScrollPosition(section) {

        if (!section || !noteScrollPositions[section]) return;

        const position = noteScrollPositions[section];

        requestAnimationFrame(() => {

            if (editorContainer) {
                editorContainer.scrollTop = position.container;
            }

            if (activeTemplateElement) {
                activeTemplateElement.scrollTop = position.workspace;
            }

            window.scrollTo(0, position.page);

        });
    }

    // ==========================================
    // RETURN TO MAIN NOTES
    // ==========================================

    function returnToMainEditor() {

        if (activeTemplateElement && activeNoteSection) {

            // Save current scroll position before removing workspace
            saveSectionScrollPosition(activeNoteSection);

            saveEntryTexts(activeNoteSection);

            activeTemplateElement.remove();
            activeTemplateElement = null;
        }

        activeNoteSection = null;

        if (noteEditor) {
            noteEditor.hidden = false;
        }
    }

    // ==========================================
    // LOAD ANOTHER 20 ENTRIES
    // ==========================================

    function addAnotherSet(section) {

        if (!noteSections[section]) return;

        if (loadingNextSet[section]) return;

        loadingNextSet[section] = true;

        try {

            if (
                activeNoteSection !== section ||
                !activeTemplateElement
            ) {
                throw new Error("The active workspace was not found.");
            }

            const currentCount = getActiveEntryCount(section);

            if (
                currentCount === 0 ||
                currentCount % ENTRIES_PER_SET !== 0
            ) {
                throw new Error(
                    `Unexpected ${section} entry count: ${currentCount}`
                );
            }

            if (!saveEntryTexts(section)) {
                throw new Error("Unable to save existing entries.");
            }

            const doneStates = getDoneStates(
                section,
                currentCount
            );

            const latestSet = doneStates.slice(
                currentCount - ENTRIES_PER_SET,
                currentCount
            );

            if (
                latestSet.length !== ENTRIES_PER_SET ||
                !latestSet.every(state => state === true)
            ) {
                showNotification(
                    `${noteSections[section].title}: Not all 20 entries are marked done.`,
                    "info"
                );
                return;
            }

            const currentEditors = Array.from(
                activeTemplateElement.querySelectorAll(
                    ".plain-template-editor"
                )
            );

            const existingContent = currentEditors.map(
                editor => getEditorText(editor)
            );

            const newEntries = Array.from(
                { length: ENTRIES_PER_SET },
                () => createEntry(section)
            );

            const updatedBlocks = [
                ...existingContent,
                ...newEntries
            ];

            const updatedContent = updatedBlocks.join(
                ENTRY_SEPARATOR
            );

            const updatedDoneStates = [
                ...doneStates,
                ...Array(ENTRIES_PER_SET).fill(false)
            ];

            const data = getAllCategoryNotes();

            data[section] = updatedContent;
            data[`${section}_done`] = updatedDoneStates;

            if (!writeStorage(CATEGORY_NOTES_KEY, data)) {
                throw new Error("Unable to save the next set.");
            }

            const verification = getAllCategoryNotes();

            if (
                typeof verification[section] !== "string" ||
                verification[`${section}_done`]?.length !==
                    currentCount + ENTRIES_PER_SET
            ) {
                throw new Error("The next set could not be verified.");
            }

            newEntries.forEach((entry, index) => {

                const newIndex = currentCount + index;

                const entryElement = createEntryElement(
                    section,
                    entry,
                    newIndex,
                    false
                );

                activeTemplateElement.appendChild(entryElement);
            });

            const newVisibleCount = getActiveEntryCount(section);

            if (newVisibleCount !== currentCount + ENTRIES_PER_SET) {
                throw new Error(
                    `Workspace count mismatch: ${newVisibleCount}`
                );
            }

            showNotification(
                `20 new ${noteSections[section].title} entries successfully loaded!`,
                "success"
            );

        } catch (error) {

            console.error(
                `Error loading ${section}:`,
                error
            );

            showNotification(
                `${noteSections[section].title} could not load another set. Check the browser console.`,
                "error"
            );

        } finally {

            loadingNextSet[section] = false;
        }
    }

    // ==========================================
    // CHECK COMPLETION OF LATEST SET
    // ==========================================

    function checkIfSetIsDone(section, entryIndex) {

        if (!noteSections[section]) return;

        if (loadingNextSet[section]) return;

        const currentCount = getActiveEntryCount(section);

        if (currentCount < ENTRIES_PER_SET) return;

        const latestSetStart =
            currentCount - ENTRIES_PER_SET;

        if (
            entryIndex < latestSetStart ||
            entryIndex >= currentCount
        ) {
            return;
        }

        const doneStates = getDoneStates(
            section,
            currentCount
        );

        const latestSet = doneStates.slice(
            latestSetStart,
            currentCount
        );

        console.log(
            `[${section}] Completion check`,
            {
                entryCount: currentCount,
                latestSetStart,
                latestSet,
                allDone: latestSet.length === ENTRIES_PER_SET &&
                    latestSet.every(Boolean)
            }
        );

        if (
            latestSet.length === ENTRIES_PER_SET &&
            latestSet.every(Boolean)
        ) {
            addAnotherSet(section);
        }
    }

    // ==========================================
    // MARK ENTRY DONE / UNDO
    // ==========================================

    function markEntryDone(
        section,
        entryIndex,
        wrapper,
        editor,
        doneButton
    ) {

        if (!noteSections[section]) return;

        if (loadingNextSet[section]) return;

        if (!saveEntryTexts(section)) {
            showNotification(
                "Unable to save your entries.",
                "error"
            );
            return;
        }

        const entryCount = getActiveEntryCount(section);

        if (entryIndex >= entryCount) return;

        const doneStates = getDoneStates(
            section,
            entryCount
        );

        doneStates[entryIndex] = !doneStates[entryIndex];

        if (!saveDoneStates(section, doneStates)) {
            showNotification(
                "Unable to save completion status.",
                "error"
            );
            return;
        }

        const isDone = doneStates[entryIndex];

        editor.contentEditable = isDone
            ? "false"
            : "plaintext-only";

        wrapper.classList.toggle("is-done", isDone);

        if (isDone) {

            doneButton.classList.add("completed");

            doneButton.innerHTML =
                '<span class="material-symbols-rounded">undo</span>' +
                '<span>Undo</span>';

        } else {

            doneButton.classList.remove("completed");

            doneButton.innerHTML =
                '<span class="material-symbols-rounded">check</span>' +
                '<span>Mark as Done</span>';
        }

        showNotification(
            isDone
                ? `${noteSections[section].title} entry marked as done.`
                : `${noteSections[section].title} entry restored.`
        );

        if (isDone) {
            checkIfSetIsDone(section, entryIndex);
        }
    }

    // ==========================================
    // CREATE ENTRY ELEMENT
    // ==========================================

    function createEntryElement(section, content, index, isDone) {

        const wrapper = document.createElement("div");
        wrapper.className = "template-entry-line";

        if (isDone) {
            wrapper.classList.add("is-done");
        }

        // EDITOR

        const editor = document.createElement("div");

        editor.className = "plain-template-editor";

        editor.contentEditable = isDone
            ? "false"
            : "plaintext-only";

        editor.spellcheck = true;

        editor.setAttribute("role", "textbox");
        editor.setAttribute("aria-multiline", "true");

        editor.setAttribute(
            "aria-label",
            `${noteSections[section].title} entry ${index + 1}`
        );

        editor.textContent = content;

        // ACTIONS

        const actions = document.createElement("div");
        actions.className = "template-entry-actions";

        // COPY

        // COPY

const copyButton = document.createElement("button");

copyButton.type = "button";
copyButton.className = "template-entry-button";

copyButton.innerHTML =
    '<span class="material-symbols-rounded">content_copy</span>' +
    '<span>Copy</span>';

copyButton.addEventListener("click", () => {
    
    let textToCopy = getEditorText(editor);
    
    // CASEWORK: COPY ONLY THE REQUIRED FIELDS
    if (section === "casework") {
        
        const lines = textToCopy.split("\n");
        
        const caseIdIndex = lines.findIndex(line =>
            line.startsWith("Case ID:")
        );
        
        const contactAttemptIndex = lines.findIndex(line =>
            line.startsWith("Contact Attempt:")
        );
        
        const portingIndex = lines.findIndex(line =>
            line.startsWith("Porting MSISDN:")
        );
        
        const courtesyIndex = lines.findIndex(line =>
            line.startsWith("Courtesy #:")
        );
        
        const reasonIndex = lines.findIndex(line =>
            line.startsWith("Reason/ Resolution/ Steps")
        );
        
        const nameIndex = lines.findIndex(line =>
            line.startsWith("Name:")
        );
        
        const repIdIndex = lines.findIndex(line =>
            line.startsWith("Rep ID:")
        );
        
        const selectedLines = [];
        
        if (caseIdIndex !== -1) {
            selectedLines.push(lines[caseIdIndex]);
        }
        
        if (contactAttemptIndex !== -1) {
            selectedLines.push(lines[contactAttemptIndex]);
        }
        
        if (portingIndex !== -1) {
            selectedLines.push(lines[portingIndex]);
        }
        
        if (courtesyIndex !== -1) {
            selectedLines.push(lines[courtesyIndex]);
        }
        
        if (reasonIndex !== -1) {
            selectedLines.push(
                ...lines.slice(reasonIndex, nameIndex !== -1 ?
                    nameIndex :
                    repIdIndex !== -1 ?
                    repIdIndex :
                    lines.length
                )
            );
        }
        
        if (nameIndex !== -1) {
            selectedLines.push(lines[nameIndex]);
        }
        
        if (repIdIndex !== -1) {
            selectedLines.push(lines[repIdIndex]);
        }
        
        textToCopy = selectedLines.join("\n");
    }
    
    copyText(textToCopy).then(ok => {
        if (ok) flashCopied(copyButton);
    });
});

        // DONE / UNDO

        const doneButton = document.createElement("button");

        doneButton.type = "button";
        doneButton.className = "template-entry-button done-button";

        if (isDone) {

            doneButton.classList.add("completed");

            doneButton.innerHTML =
                '<span class="material-symbols-rounded">undo</span>' +
                '<span>Undo</span>';

        } else {

            doneButton.innerHTML =
                '<span class="material-symbols-rounded">check</span>' +
                '<span>Mark as Done</span>';
        }

        doneButton.addEventListener("click", () => {
            markEntryDone(
                section,
                index,
                wrapper,
                editor,
                doneButton
            );
        });

        actions.append(copyButton, doneButton);

        // EMPTY ENTRY VISIBILITY

        function updateActionVisibility() {

            const hasText = getEditorText(editor).trim().length > 0;

            wrapper.hidden = !hasText;
            actions.hidden = !hasText;
        }

        // AUTO SAVE

        editor.addEventListener("input", () => {

            if (section === "casework") {
                syncCaseworkEditor(editor);
            }

            saveEntryTexts(section);
            updateActionVisibility();
        });

        // PLAIN TEXT PASTE

        editor.addEventListener("paste", event => {

            if (editor.contentEditable === "false") {
                event.preventDefault();
                return;
            }

            event.preventDefault();

            const pastedText =
                event.clipboardData?.getData("text/plain") || "";

            document.execCommand(
                "insertText",
                false,
                pastedText
            );
        });

        wrapper.append(editor, actions);

        updateActionVisibility();

        return wrapper;
    }

    // ==========================================
    // RENDER PHONETIME / CASEWORK
    // ==========================================

    function renderNoteSection(section) {

        const config = noteSections[section];

        if (!config || !editorContainer || !noteEditor) return;

        // SAVE PREVIOUS SECTION BEFORE SWITCHING

        if (activeTemplateElement && activeNoteSection) {

            saveSectionScrollPosition(activeNoteSection);

            saveEntryTexts(activeNoteSection);

            activeTemplateElement.remove();
            activeTemplateElement = null;
        }

        activeNoteSection = section;

        noteEditor.hidden = true;

        let content = getCategoryNote(section);

        content = updateCredentialLines(section, content);

        if (section === "casework") {
            content = updateCaseworkPTN(content);
        }

        saveCategoryNote(section, content);

        const blocks = getEntryBlocks(content);

        const doneStates = getDoneStates(
            section,
            blocks.length
        );

        const workspace = document.createElement("div");

        workspace.className = "template-workspace";
        workspace.id = "activeTemplateWorkspace";

        blocks.forEach((block, index) => {

            const entry = createEntryElement(
                section,
                block,
                index,
                doneStates[index]
            );

            workspace.appendChild(entry);
        });

        editorContainer.appendChild(workspace);

        activeTemplateElement = workspace;

        // RESTORE THE SELECTED SECTION'S PREVIOUS POSITION

        restoreSectionScrollPosition(section);

        console.log(
            `[${section}] Workspace loaded with ${blocks.length} entries.`
        );
    }

});
