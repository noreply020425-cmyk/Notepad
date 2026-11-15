
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // USER DETAILS
    // ==========================================

    function getUserDetails() {
        let credentials = {};

        try {
            credentials = JSON.parse(
                localStorage.getItem("notepad_credentials")
            ) || {};
        } catch (error) {
            console.error("Unable to read credentials:", error);
        }

        return {
            name:
                credentials.name ||
                document.getElementById("userName")?.textContent ||
                "",

            oracleId:
                credentials.oracleId ||
                credentials.oracleID ||
                document.getElementById("oracleId")?.textContent ||
                ""
        };
    }


    // ==========================================
    // DATE
    // ==========================================

    function getToday() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    // ==========================================
    // FORM DEFINITIONS
    // ==========================================

    const forms = {

        "pay-by-switch": {
            title: "Pay by Switch / LILO",

            fields: [
                {
                    name: "Oracle ID",
                    type: "text",
                    value: () => getUserDetails().oracleId
                },
                {
                    name: "Name",
                    type: "text",
                    value: () => getUserDetails().name
                },
                {
                    name: "Impacted Tools",
                    type: "text"
                },
                {
                    name: "Remarks",
                    type: "textarea"
                },
                {
                    name: "Resolution",
                    type: "textarea"
                },
                {
                    name: "Log out from Cisco (PST)",
                    type: "time"
                },
                {
                    name: "Log in to Cisco (PST)",
                    type: "time"
                }
            ]
        },


        "dads": {
            title: "DADS",

            fields: [
                {
                    name: "Date",
                    type: "date",
                    value: () => getToday()
                },
                {
                    name: "Endorsed By",
                    type: "text",
                    value: () => getUserDetails().name
                },
                {
                    name: "Endorsed To",
                    type: "text"
                },
                {
                    name: "PTN",
                    type: "text"
                },
                {
                    name: "BAN",
                    type: "text"
                },
                {
                    name: "Type of DADS",
                    type: "text"
                },
                {
                    name: "Time of Incident",
                    type: "time"
                },
                {
                    name: "Callback",
                    type: "select",
                    options: ["Yes", "No"]
                }
            ]
        },


        "callback": {
            title: "Callback",

            fields: [
                {
                    name: "Name",
                    type: "text",
                    value: () => getUserDetails().name
                },
                {
                    name: "Endorsed To",
                    type: "text"
                },
                {
                    name: "PTN",
                    type: "text"
                },
                {
                    name: "BAN",
                    type: "text"
                },
                {
                    name: "Callback Date",
                    type: "date",
                    value: () => getToday()
                },
                {
                    name: "Callback Time (Manila)",
                    type: "time"
                },
                {
                    name: "Notes",
                    type: "textarea"
                }
            ]
        },


        // ======================================
        // VERIFICATION TEAM ENDORSEMENT
        // ======================================

        "verification-team": {
            title: "Verification Team Endorsement",

            fields: [
                {
                    name: "Reason customer is unable to visit a Retail Store",
                    type: "textarea"
                },
                {
                    name: "If reason is due to distance, provide customer's location & distance to nearest store",
                    type: "textarea"
                },
                {
                    name: "Customer Name",
                    type: "text"
                },
                {
                    name: "BAN",
                    type: "text"
                },
                {
                    name: "Mobile number",
                    type: "tel"
                },
                {
                    name: "Customer callback number (alternative # if T-Mobile # is unreachable)",
                    type: "tel"
                },
                {
                    name: "Customer email address",
                    type: "email"
                },
                {
                    name: "New Sim number if available",
                    type: "text"
                },
                {
                    name: "Did the customer contact via TTY services?",
                    type: "text"
                },
                {
                    name: "Reason for escalation (see Account Actions table below)",
                    type: "textarea"
                }
            ]
        }

    };


    // ==========================================
    // MODAL STYLES
    // ==========================================

    if (!document.getElementById("formsModalStyles")) {

        const style = document.createElement("style");

        style.id = "formsModalStyles";

        style.textContent = `
            .forms-overlay {
                position: fixed;
                inset: 0;
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0, 0, 0, 0.45);
                backdrop-filter: blur(3px);
            }

            .forms-overlay[hidden] {
                display: none !important;
            }

            .forms-modal {
                width: 100%;
                max-width: 560px;
                max-height: 85vh;
                overflow-y: auto;
                background: var(--surface, #ffffff);
                color: var(--text, #222222);
                border: 1px solid var(--border, #eeeeee);
                border-radius: 14px;
                box-shadow: 0 15px 45px rgba(0, 0, 0, 0.2);
                padding: 24px;
            }

            .forms-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 22px;
            }

            .forms-modal-title {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
            }

            .forms-close {
                width: 34px;
                height: 34px;
                border: none;
                border-radius: 8px;
                background: transparent;
                color: inherit;
                cursor: pointer;
                font-size: 22px;
            }

            .forms-close:hover {
                background: var(--hover, #f5f5f5);
            }

            .forms-fields {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .forms-field {
                display: flex;
                flex-direction: column;
                gap: 7px;
            }

            .forms-field label {
                font-size: 13px;
                font-weight: 600;
            }

            .forms-field input,
            .forms-field select,
            .forms-field textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 11px 12px;
                border: 1px solid var(--border, #dddddd);
                border-radius: 8px;
                background: var(--background, #ffffff);
                color: var(--text, #222222);
                font: inherit;
                font-size: 14px;
                outline: none;
            }

            .forms-field input:focus,
            .forms-field select:focus,
            .forms-field textarea:focus {
                border-color: var(--accent, #777777);
            }

            .forms-field textarea {
                min-height: 85px;
                resize: vertical;
            }

            .forms-actions {
                display: flex;
                justify-content: flex-end;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 24px;
            }

            .forms-action-button {
                padding: 10px 18px;
                border: 1px solid var(--border, #dddddd);
                border-radius: 8px;
                background: var(--surface, #ffffff);
                color: var(--text, #222222);
                font: inherit;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }

            .forms-action-button:hover {
                background: var(--hover, #f5f5f5);
            }

            .forms-copy-button {
                background: var(--text, #222222);
                color: var(--surface, #ffffff);
                border-color: var(--text, #222222);
            }

            .forms-copy-button:hover {
                opacity: 0.85;
                background: var(--text, #222222);
            }

            .forms-reset-button {
                color: #c0392b;
            }

            .forms-reset-button:hover {
                background: rgba(192, 57, 43, 0.08);
            }

            @media (max-width: 600px) {
                .forms-overlay {
                    padding: 12px;
                }

                .forms-modal {
                    padding: 18px;
                    max-height: 90vh;
                }
            }
        `;

        document.head.appendChild(style);
    }


    // ==========================================
    // CREATE MODAL
    // ==========================================

    const overlay = document.createElement("div");

    overlay.className = "forms-overlay";
    overlay.id = "formsOverlay";
    overlay.hidden = true;

    overlay.innerHTML = `
        <div
            class="forms-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="formsModalTitle"
        >
            <div class="forms-modal-header">
                <h2 class="forms-modal-title" id="formsModalTitle">
                    Form
                </h2>

                <button
                    type="button"
                    class="forms-close"
                    id="formsClose"
                    aria-label="Close form"
                >
                    &times;
                </button>
            </div>

            <div class="forms-fields" id="formsFields"></div>

            <div class="forms-actions">

                <button
                    type="button"
                    class="forms-action-button"
                    id="formsCancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="forms-action-button forms-reset-button"
                    id="formsReset"
                >
                    Reset
                </button>

                <button
                    type="button"
                    class="forms-action-button forms-copy-button"
                    id="formsCopy"
                >
                    Copy
                </button>

            </div>
        </div>
    `;

    document.body.appendChild(overlay);


    // ==========================================
    // ELEMENTS
    // ==========================================

    const formsTitle = document.getElementById("formsModalTitle");
    const formsFields = document.getElementById("formsFields");
    const formsClose = document.getElementById("formsClose");
    const formsCancel = document.getElementById("formsCancel");
    const formsReset = document.getElementById("formsReset");
    const formsCopy = document.getElementById("formsCopy");


    // ==========================================
    // DRAFT STORAGE (survives closing the window)
    // ==========================================

    const DRAFTS_KEY = `notepad_forms_${window.NotepadShared.getUserId()}`;

    let currentFormType = null;
    let draftTimer = null;

    function readDrafts() {
        try {
            const value = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
            return value && typeof value === "object" ? value : {};
        } catch {
            return {};
        }
    }

    function writeDrafts(drafts) {
        try {
            localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
        } catch (error) {
            console.error("Unable to save form draft:", error);
        }
    }

    function saveDraftNow() {
        clearTimeout(draftTimer);
        draftTimer = null;

        if (!currentFormType) return;

        const values = {};

        formsFields.querySelectorAll("input, select, textarea").forEach(input => {
            values[input.dataset.fieldName] = input.value;
        });

        const drafts = readDrafts();
        drafts[currentFormType] = values;
        writeDrafts(drafts);
    }

    function queueDraftSave() {
        clearTimeout(draftTimer);
        draftTimer = setTimeout(saveDraftNow, 250);
    }

    function clearDraft() {
        clearTimeout(draftTimer);
        draftTimer = null;

        if (!currentFormType) return;

        const drafts = readDrafts();
        delete drafts[currentFormType];
        writeDrafts(drafts);
    }

    formsFields.addEventListener("input", queueDraftSave);
    formsFields.addEventListener("change", queueDraftSave);

    window.addEventListener("pagehide", () => {
        if (draftTimer) saveDraftNow();
    });


    // ==========================================
    // OPEN FORM
    // ==========================================

    function openForm(formType) {

        const form = forms[formType];

        if (!form) {
            console.error("Form not found:", formType);
            return;
        }

        formsTitle.textContent = form.title;
        formsFields.innerHTML = "";

        form.fields.forEach((field, index) => {

            const wrapper = document.createElement("div");
            wrapper.className = "forms-field";

            const label = document.createElement("label");
            label.textContent = field.name;
            label.htmlFor = `formField${index}`;

            let input;

            if (field.type === "textarea") {

                input = document.createElement("textarea");

            } else if (field.type === "select") {

                input = document.createElement("select");

                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.textContent = "Select an option";
                input.appendChild(placeholder);

                (field.options || []).forEach(option => {
                    const optionElement = document.createElement("option");
                    optionElement.value = option;
                    optionElement.textContent = option;
                    input.appendChild(optionElement);
                });

            } else {

                input = document.createElement("input");
                input.type = field.type || "text";
            }

            input.id = `formField${index}`;
            input.dataset.fieldName = field.name;

            if (field.placeholder) {
                input.placeholder = field.placeholder;
            }

            if (typeof field.value === "function") {
                input.value = field.value();
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);

            formsFields.appendChild(wrapper);

        });

        // RESTORE SAVED DRAFT
        currentFormType = formType;

        const draft = readDrafts()[formType];

        if (draft && typeof draft === "object") {
            formsFields.querySelectorAll("input, select, textarea").forEach(input => {
                const saved = draft[input.dataset.fieldName];

                if (typeof saved === "string") {
                    input.value = saved;
                }
            });
        }

        overlay.hidden = false;
        document.body.style.overflow = "hidden";

        formsClose.focus();
    }

    window.openForm = openForm;


    // ==========================================
    // CLOSE FORM
    // ==========================================

    function closeForm() {
        saveDraftNow();
        overlay.hidden = true;
        document.body.style.overflow = "";
    }

    formsClose.addEventListener("click", closeForm);
    formsCancel.addEventListener("click", closeForm);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeForm();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !overlay.hidden) {
            closeForm();
        }
    });


    // ==========================================
    // RESET FORM
    // ==========================================

    formsReset.addEventListener("click", async () => {

        const confirmed = await window.NotepadDialog.confirm({
            title: "Clear form",
            message: "Are you sure you want to clear all fields? This also removes the saved draft.",
            confirmText: "Clear",
            cancelText: "Cancel",
            danger: true
        });

        if (!confirmed) return;

        formsFields.querySelectorAll("input, textarea, select")
            .forEach(input => {
                input.value = "";
            });

        clearDraft();

        formsCopy.textContent = "Copy";

    });


    // ==========================================
    // COPY FORM
    // ==========================================

    formsCopy.addEventListener("click", async () => {

        const lines = [
            formsTitle.textContent,
            ""
        ];

        formsFields.querySelectorAll(".forms-field").forEach(wrapper => {

            const input = wrapper.querySelector("input, select, textarea");

            if (!input) return;

            lines.push(
                `${input.dataset.fieldName}: ${input.value.trim()}`
            );

        });

        const copyText = lines.join("\n");

        try {

            await navigator.clipboard.writeText(copyText);

            formsCopy.textContent = "✓ Copied";

        } catch (error) {

            const temporary = document.createElement("textarea");

            temporary.value = copyText;
            temporary.style.position = "fixed";
            temporary.style.opacity = "0";

            document.body.appendChild(temporary);
            temporary.select();

            try {
                document.execCommand("copy");
                formsCopy.textContent = "✓ Copied";
            } catch (copyError) {
                window.NotepadDialog.alert({
                    title: "Copy failed",
                    message: "Unable to copy. Please copy manually."
                });
            }

            temporary.remove();

        }

        setTimeout(() => {
            formsCopy.textContent = "Copy";
        }, 1500);

    });


    // ==========================================
    // FORMS DROPDOWN ITEM SELECTION
    // ==========================================

    const formsMenu = document.getElementById("formsMenu");

    if (formsMenu) {

        formsMenu.addEventListener("click", event => {

            const button = event.target.closest("[data-form]");

            if (!button || !formsMenu.contains(button)) return;

            const formType = button.dataset.form;

            if (!forms[formType]) return;

            formsMenu.hidden = true;

            const formsButton = document.getElementById("formsButton");

            if (formsButton) {
                formsButton.setAttribute("aria-expanded", "false");
            }

            openForm(formType);

        });

    }

    console.log("Forms module loaded successfully.");

});
