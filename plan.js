// Free / Premium plans. The plan lives in MongoDB (through the API); payment is Stripe Checkout.
// The browser only caches the plan for fast rendering and re-checks it with the server.
(function () {
    "use strict";

    const PRICE = 100;
    const peso = n => `₱${n.toFixed(2)}`;
    const Shared = window.NotepadShared;
    const API = window.NotepadAPI;
    const CACHE_KEY = `notepad_plan_cache_${Shared ? Shared.getUserId() : "default"}`;

    // ==========================================
    // WHAT EACH PLAN INCLUDES
    // ==========================================

    const FREE_FEATURES = [
        "Main notepad with autosave",
        "Phonetime notes",
        "Links and Contacts",
        "Callback form",
        "Timezone clocks and state search",
        "Light theme and default font"
    ];

    const PREMIUM_FEATURES = [
        "Everything in Free",
        "Casework notes",
        "Templates and Others in Quick Access",
        "All forms: Pay by Switch / LILO, DADS, Verification Team",
        "Dark theme and all fonts",
        "Backup export and import"
    ];

    // Elements that need Premium. Anything not listed stays free.
    const GATES = [
        { selector: '#formsMenu [data-form]:not([data-form="callback"])' },
        { selector: '#notesMenu [data-note-section="casework"]' },
        { selector: '#quickAccessMenu [data-category="templates"]' },
        { selector: '#quickAccessMenu [data-category="others"]' },
        { selector: "#exportBackup", name: "Backup export and import" },
        { selector: "#importBackupButton", name: "Backup export and import" }
    ];
    const GATE_SELECTOR = GATES.map(g => g.selector).join(",");

    // ==========================================
    // PLAN STATE (server is the source of truth)
    // ==========================================

    let state = loadCache();
    let signedIn = Boolean(API && API.getToken());

    function loadCache() {
        try {
            const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
            if (saved && saved.plan === "premium") return saved;
        } catch { /* free */ }
        return { plan: "free" };
    }

    function getPlan() {
        if (state.plan === "premium" && new Date(state.premiumUntil) > new Date()) return state;
        return { plan: "free" };
    }

    const isPremium = () => getPlan().plan === "premium";

    function setFromUser(user) {
        state = user && user.plan === "premium"
            ? { plan: "premium", premiumUntil: user.premiumUntil }
            : { plan: "free" };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
        refreshAll();
    }

    async function refreshFromServer() {
        if (!API || !API.getToken()) {
            signedIn = false;
            setFromUser(null);
            return;
        }
        try {
            const { user } = await API.me();
            signedIn = true;
            setFromUser(user);
        } catch (error) {
            if (error.status === 401) {
                API.clearToken();
                signedIn = false;
                setFromUser(null);
            }
            // Network problem: keep the cached plan.
        }
    }

    const formatDate = iso =>
        new Date(iso).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

    // ==========================================
    // SMALL HELPERS
    // ==========================================

    function toast(message, type = "success") {
        const container = document.getElementById("notificationContainer");
        if (!container) return;
        const item = document.createElement("div");
        item.className = `notification ${type}`;
        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.textContent = type === "error" ? "error" : "check_circle";
        const text = document.createElement("span");
        text.textContent = message;
        item.append(icon, text);
        container.appendChild(item);
        setTimeout(() => item.remove(), 3500);
    }

    function labelOf(element) {
        const copy = element.cloneNode(true);
        copy.querySelectorAll(".material-symbols-rounded").forEach(node => node.remove());
        return copy.textContent.replace(/\s+/g, " ").replace(/\(Premium\)/, "").trim();
    }

    const icon = name => `<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;

    // ==========================================
    // HEADER CHIP, LOCK MARKERS, SETTINGS SECTION
    // ==========================================

    let chip = null;
    let settingsStatus = null;

    function buildChip() {
        const brand = document.querySelector(".header-identity .brand");
        if (!brand) return;
        chip = document.createElement("button");
        chip.type = "button";
        chip.className = "plan-chip";
        chip.addEventListener("click", () => openModal());
        brand.after(chip);
    }

    function buildSettingsSection() {
        const content = document.querySelector(".settings-content");
        if (!content) return;

        const section = document.createElement("section");
        section.className = "settings-section";
        section.innerHTML = `
            <div class="settings-section-heading">
                ${icon("workspace_premium")}
                <div>
                    <h3>Subscription</h3>
                    <p data-plan-status></p>
                </div>
            </div>
            <div class="settings-data-actions">
                <button type="button" class="settings-secondary-button" data-plan-open>
                    ${icon("workspace_premium")}
                    View plans
                </button>
            </div>`;

        section.querySelector("[data-plan-open]").addEventListener("click", () => openModal());
        settingsStatus = section.querySelector("[data-plan-status]");
        content.prepend(section);
    }

    function refreshLocks() {
        const premium = isPremium();

        document.querySelectorAll(GATE_SELECTOR).forEach(element => {
            const existing = element.querySelector(":scope > .plan-lock");
            if (premium && existing) existing.remove();
            if (!premium && !existing) {
                const lock = document.createElement("span");
                lock.className = "material-symbols-rounded plan-lock";
                lock.title = "Premium feature";
                lock.textContent = "lock";
                element.appendChild(lock);
            }
        });

        // Theme and font selects: mark the locked options.
        document.querySelectorAll("#themeSelect option, #fontFamilySelect option").forEach((option, _, all) => {
            if (!option.dataset.label) option.dataset.label = option.textContent;
            const select = option.parentElement;
            const locked = select.id === "themeSelect"
                ? option.value === "dark"
                : option !== select.options[0];
            option.textContent = !premium && locked ? `${option.dataset.label} (Premium)` : option.dataset.label;
        });
    }

    function refreshChip() {
        if (!chip) return;
        const premium = isPremium();
        chip.dataset.plan = premium ? "premium" : "free";
        chip.innerHTML = premium
            ? `${icon("workspace_premium")}Premium`
            : `${icon("bolt")}Free`;
        chip.title = premium ? "Premium plan: view or extend" : "Free plan: see Premium";
    }

    function refreshSettingsStatus() {
        if (!settingsStatus) return;
        const plan = getPlan();
        settingsStatus.textContent = plan.plan === "premium"
            ? `Premium, active until ${formatDate(plan.premiumUntil)}.`
            : "Free plan. Upgrade to unlock every feature.";
    }

    function refreshAll() {
        refreshChip();
        refreshLocks();
        refreshSettingsStatus();
    }

    // ==========================================
    // GATING (runs before the app's own handlers)
    // ==========================================

    document.addEventListener("click", event => {
        if (isPremium() || !event.target.closest) return;
        const target = event.target.closest(GATE_SELECTOR);
        if (!target) return;

        const gate = GATES.find(g => target.matches(g.selector));
        event.preventDefault();
        event.stopImmediatePropagation();

        // Lets the app close any open dropdown behind the modal.
        document.body.click();
        openModal({ feature: (gate && gate.name) || labelOf(target) });
    }, true);

    // Selects: remember the last value, then revert if the new one is locked.
    document.addEventListener("focusin", event => {
        if (event.target.matches && event.target.matches("#themeSelect, #fontFamilySelect")) {
            event.target.dataset.previous = event.target.value;
        }
    });

    document.addEventListener("change", event => {
        const select = event.target;
        if (isPremium() || !select.matches || !select.matches("#themeSelect, #fontFamilySelect")) return;

        const locked = select.id === "themeSelect"
            ? select.value === "dark"
            : select.selectedIndex !== 0;

        if (!locked) { select.dataset.previous = select.value; return; }

        event.stopImmediatePropagation();
        select.value = select.dataset.previous || select.options[0].value;
        openModal({ feature: select.id === "themeSelect" ? "Dark theme" : "Extra fonts" });
    }, true);

    // ==========================================
    // MODAL
    // ==========================================

    let overlay = null;
    let modal = null;
    let previousFocus = null;
    let busy = false;

    function ensureModal() {
        if (overlay) return;

        overlay = document.createElement("div");
        overlay.className = "plan-overlay";
        overlay.hidden = true;

        modal = document.createElement("section");
        modal.className = "plan-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "planTitle");

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener("mousedown", event => { if (event.target === overlay) closeModal(); });
        modal.addEventListener("click", event => {
            const action = event.target.closest("[data-action]");
            if (action) handlers[action.dataset.action]?.(action);
        });
    }

    function openModal(options = {}) {
        ensureModal();
        previousFocus = document.activeElement;
        overlay.hidden = false;
        showPlans(options.feature);
    }

    function closeModal() {
        if (!overlay || overlay.hidden || busy) return;
        overlay.hidden = true;
        modal.replaceChildren();
        if (previousFocus && previousFocus.focus) previousFocus.focus();
    }

    function view(html, narrow) {
        modal.className = `plan-modal${narrow ? " is-narrow" : ""}`;
        modal.innerHTML = html;
        (modal.querySelector("[data-autofocus]") || modal.querySelector("button")).focus();
    }

    window.addEventListener("keydown", event => {
        if (!overlay || overlay.hidden) return;
        if (document.querySelector(".np-dialog-overlay")) return; // let the confirm box handle keys

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeModal();
        } else if (event.key === "Tab") {
            const items = [...modal.querySelectorAll("button:not(:disabled), input")];
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    }, true);

    // ---------- View 1: plans ----------

    function featureList(items, off) {
        return items.map(text =>
            `<li${off ? ' class="is-off"' : ""}>${icon(off ? "lock" : "check")}<span>${text}</span></li>`
        ).join("");
    }

    function showPlans(feature) {
        const plan = getPlan();
        const premium = plan.plan === "premium";

        const freeAction = premium ? "" : `<button type="button" class="plan-btn" disabled>Current plan</button>`;

        const premiumAction = premium
            ? `<button type="button" class="plan-btn primary" data-action="checkout" data-autofocus>Add 30 more days</button>`
            : `<button type="button" class="plan-btn primary" data-action="checkout" data-autofocus>Upgrade to Premium</button>`;

        view(`
            <div class="plan-head">
                <div>
                    <h2 id="planTitle">Notepad plans</h2>
                    <p>${premium ? "You have full access to every feature." : "Start free. Upgrade when you need more."}</p>
                </div>
                <button type="button" class="icon-button" data-action="close" aria-label="Close">${icon("close")}</button>
            </div>

            ${feature ? `<div class="plan-reason">${icon("lock")}<span data-reason></span></div>` : ""}

            <div class="plan-grid">
                <section class="plan-card">
                    <h3>Free</h3>
                    <div class="plan-price"><strong>${peso(0)}</strong><span>forever</span></div>
                    <p class="plan-tagline">For everyday note taking.</p>
                    <ul class="plan-features">${featureList(FREE_FEATURES)}</ul>
                    ${freeAction}
                </section>

                <section class="plan-card is-premium">
                    <h3>Premium</h3>
                    <div class="plan-price"><strong>${PRICE}</strong><span>pesos per 30 days</span></div>
                    <p class="plan-tagline" data-premium-line>Every feature, no limits.</p>
                    <ul class="plan-features">${featureList(PREMIUM_FEATURES)}</ul>
                    ${premiumAction}
                </section>
            </div>

            <p class="plan-note">${icon("payments")}<span>Pay with GCash or card through Stripe. Each payment adds 30 days. It does not renew by itself.</span></p>
        `);

        if (feature) modal.querySelector("[data-reason]").textContent = `${feature} is a Premium feature.`;
        if (premium) modal.querySelector("[data-premium-line]").textContent = `Active until ${formatDate(plan.premiumUntil)}.`;
    }

    // ---------- View 2: checkout summary ----------

    function showCheckout() {
        if (!signedIn) { showSignIn(); return; }

        const plan = getPlan();
        const startsFrom = plan.plan === "premium" ? new Date(plan.premiumUntil) : new Date();
        const until = new Date(startsFrom.getTime() + 30 * 86400000);

        view(`
            <div class="plan-head">
                <button type="button" class="icon-button plan-back" data-action="plans" aria-label="Back to plans">${icon("arrow_back")}</button>
                <div>
                    <h2 id="planTitle">Checkout</h2>
                    <p>Notepad Premium, 30 days.</p>
                </div>
                <button type="button" class="icon-button" data-action="close" aria-label="Close">${icon("close")}</button>
            </div>

            <div class="plan-summary">
                <div class="plan-summary-row">
                    <span>Notepad Premium<small>Active until ${formatDate(until.toISOString())}</small></span>
                    <span>${peso(PRICE)}</span>
                </div>
                <div class="plan-summary-row total"><span>Total today</span><span>${peso(PRICE)}</span></div>
            </div>

            <div class="plan-error" id="planError" role="alert"></div>

            <button type="button" class="plan-btn stripe" id="planPay" data-action="pay" data-autofocus>Continue to secure payment</button>

            <p class="plan-note">${icon("lock")}<span>You will pay on Stripe's secure page with GCash or a card. We never see your payment details.</span></p>
        `, true);
    }

    async function pay() {
        if (busy) return;
        const button = modal.querySelector("#planPay");
        const errorBox = modal.querySelector("#planError");

        busy = true;
        errorBox.textContent = "";
        button.disabled = true;
        button.innerHTML = `<span class="plan-spinner"></span>Opening Stripe…`;

        try {
            const { url } = await API.checkout(location.origin + location.pathname);
            location.href = url; // leaves the page; Stripe sends the person back afterwards
        } catch (error) {
            busy = false;
            if (error.status === 401) { API.clearToken(); signedIn = false; showSignIn(); return; }
            errorBox.textContent = error.message;
            button.disabled = false;
            button.textContent = "Continue to secure payment";
        }
    }

    // ---------- Other views ----------

    function showSignIn() {
        view(`
            <div class="plan-success">
                ${icon("account_circle")}
                <h2 id="planTitle">Sign in to upgrade</h2>
                <p>Your session has ended. Close this window and sign in again from the login page, then choose Upgrade.</p>
                <button type="button" class="plan-btn" data-action="close" data-autofocus>Close</button>
            </div>
        `, true);
    }

    function showVerifying() {
        view(`
            <div class="plan-success">
                <div class="plan-spinner dark" style="margin: 8px auto 14px"></div>
                <h2 id="planTitle">Confirming your payment</h2>
                <p>This only takes a moment.</p>
            </div>
        `, true);
    }

    function showPending(sessionId) {
        view(`
            <div class="plan-success">
                ${icon("hourglass_top")}
                <h2 id="planTitle">Payment is processing</h2>
                <p>Some payments take a minute to confirm. Premium unlocks as soon as it does.</p>
                <button type="button" class="plan-btn primary" data-action="recheck" data-session="${sessionId}" data-autofocus>Check again</button>
            </div>
        `, true);
    }

    function showSuccess() {
        const plan = getPlan();
        view(`
            <div class="plan-success">
                ${icon("check_circle")}
                <h2 id="planTitle">You're on Premium</h2>
                <p>Every feature is now unlocked.</p>
                <div class="plan-receipt">
                    <div class="plan-summary-row"><span>Amount</span><span>${peso(PRICE)}</span></div>
                    <div class="plan-summary-row"><span>Active until</span><span data-until></span></div>
                </div>
                <button type="button" class="plan-btn primary" data-action="close" data-autofocus>Done</button>
            </div>
        `, true);
        modal.querySelector("[data-until]").textContent = formatDate(plan.premiumUntil);
    }

    async function verifyPayment(sessionId) {
        busy = true;
        showVerifying();
        try {
            const result = await API.confirm(sessionId);
            setFromUser(result.user);
            busy = false;
            if (result.status === "paid" && isPremium()) showSuccess();
            else showPending(sessionId);
        } catch (error) {
            busy = false;
            showPending(sessionId);
            toast(error.message, "error");
        }
    }

    // ---------- Actions ----------

    const handlers = {
        close: closeModal,
        plans: () => showPlans(),
        checkout: showCheckout,
        pay,
        recheck: button => verifyPayment(button.dataset.session)
    };

    // ==========================================
    // RETURN FROM STRIPE + INIT
    // ==========================================

    function handleReturnFromStripe() {
        const params = new URLSearchParams(location.search);
        const result = params.get("checkout");
        if (!result) return false;

        history.replaceState(null, "", location.pathname);

        if (result === "success" && params.get("session_id")) {
            ensureModal();
            previousFocus = document.activeElement;
            overlay.hidden = false;
            verifyPayment(params.get("session_id"));
        } else {
            toast("Payment cancelled. You were not charged.", "info");
        }
        return true;
    }

    // Re-check when the person comes back to this window.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !busy) refreshFromServer();
    });

    function init() {
        buildChip();
        buildSettingsSection();
        refreshAll();
        if (!handleReturnFromStripe()) refreshFromServer();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();

    window.NotepadPlan = { isPremium, openUpgrade: feature => openModal({ feature }) };
})();
