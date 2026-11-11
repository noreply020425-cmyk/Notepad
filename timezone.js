
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // ELEMENTS
    // ==========================================

    const searchButton = document.getElementById("timezoneSearchButton");
    const searchPanel = document.getElementById("timezoneSearchPanel");
    const searchInput = document.getElementById("timezoneSearchInput");
    const searchResult = document.getElementById("timezoneSearchResult");

    if (!searchButton || !searchPanel || !searchInput || !searchResult) {
        console.warn("Timezone search elements were not found.");
        return;
    }

    // ==========================================
    // US STATE TIMEZONES
    // ==========================================

    const stateTimezones = {

        "Alabama": ["America/Chicago"],
        "Alaska": ["America/Anchorage", "America/Adak"],
        "Arizona": ["America/Phoenix"],
        "Arkansas": ["America/Chicago"],
        "California": ["America/Los_Angeles"],
        "Colorado": ["America/Denver"],
        "Connecticut": ["America/New_York"],
        "Delaware": ["America/New_York"],
        "Florida": ["America/New_York", "America/Chicago"],
        "Georgia": ["America/New_York"],
        "Hawaii": ["Pacific/Honolulu"],
        "Idaho": ["America/Boise", "America/Los_Angeles"],
        "Illinois": ["America/Chicago"],
        "Indiana": ["America/Indiana/Indianapolis", "America/Indiana/Knox"],
        "Iowa": ["America/Chicago"],
        "Kansas": ["America/Chicago", "America/Denver"],
        "Kentucky": ["America/New_York", "America/Chicago"],
        "Louisiana": ["America/Chicago"],
        "Maine": ["America/New_York"],
        "Maryland": ["America/New_York"],
        "Massachusetts": ["America/New_York"],
        "Michigan": ["America/Detroit", "America/Menominee"],
        "Minnesota": ["America/Chicago"],
        "Mississippi": ["America/Chicago"],
        "Missouri": ["America/Chicago"],
        "Montana": ["America/Denver"],
        "Nebraska": ["America/Chicago", "America/Denver"],
        "Nevada": ["America/Los_Angeles", "America/Denver"],
        "New Hampshire": ["America/New_York"],
        "New Jersey": ["America/New_York"],
        "New Mexico": ["America/Denver"],
        "New York": ["America/New_York"],
        "North Carolina": ["America/New_York"],
        "North Dakota": ["America/Chicago", "America/Denver"],
        "Ohio": ["America/New_York"],
        "Oklahoma": ["America/Chicago"],
        "Oregon": ["America/Los_Angeles", "America/Denver"],
        "Pennsylvania": ["America/New_York"],
        "Rhode Island": ["America/New_York"],
        "South Carolina": ["America/New_York"],
        "South Dakota": ["America/Chicago", "America/Denver"],
        "Tennessee": ["America/Chicago", "America/New_York"],
        "Texas": ["America/Chicago", "America/Denver"],
        "Utah": ["America/Denver"],
        "Vermont": ["America/New_York"],
        "Virginia": ["America/New_York"],
        "Washington": ["America/Los_Angeles"],
        "West Virginia": ["America/New_York"],
        "Wisconsin": ["America/Chicago"],
        "Wyoming": ["America/Denver"],
        "District of Columbia": ["America/New_York"],
        "Puerto Rico": ["America/Puerto_Rico"],
        "U.S. Virgin Islands": ["America/St_Thomas"],
        "Guam": ["Pacific/Guam"],
        "American Samoa": ["Pacific/Pago_Pago"],
        "Northern Mariana Islands": ["Pacific/Saipan"]

    };

    // ==========================================
    // STATE ABBREVIATIONS
    // ==========================================

    const stateAbbreviations = {
        AL: "Alabama",
        AK: "Alaska",
        AZ: "Arizona",
        AR: "Arkansas",
        CA: "California",
        CO: "Colorado",
        CT: "Connecticut",
        DE: "Delaware",
        FL: "Florida",
        GA: "Georgia",
        HI: "Hawaii",
        ID: "Idaho",
        IL: "Illinois",
        IN: "Indiana",
        IA: "Iowa",
        KS: "Kansas",
        KY: "Kentucky",
        LA: "Louisiana",
        ME: "Maine",
        MD: "Maryland",
        MA: "Massachusetts",
        MI: "Michigan",
        MN: "Minnesota",
        MS: "Mississippi",
        MO: "Missouri",
        MT: "Montana",
        NE: "Nebraska",
        NV: "Nevada",
        NH: "New Hampshire",
        NJ: "New Jersey",
        NM: "New Mexico",
        NY: "New York",
        NC: "North Carolina",
        ND: "North Dakota",
        OH: "Ohio",
        OK: "Oklahoma",
        OR: "Oregon",
        PA: "Pennsylvania",
        RI: "Rhode Island",
        SC: "South Carolina",
        SD: "South Dakota",
        TN: "Tennessee",
        TX: "Texas",
        UT: "Utah",
        VT: "Vermont",
        VA: "Virginia",
        WA: "Washington",
        WV: "West Virginia",
        WI: "Wisconsin",
        WY: "Wyoming",
        DC: "District of Columbia",
        PR: "Puerto Rico",
        VI: "U.S. Virgin Islands",
        GU: "Guam",
        AS: "American Samoa",
        MP: "Northern Mariana Islands"
    };

    // ==========================================
    // HELPERS
    // ==========================================

    const Shared = window.NotepadShared;
    const stateNames = Object.keys(stateTimezones);
    const MAX_SUGGESTIONS = 6;

    function getTimezoneInformation(timezone) {
        const now = new Date();

        return {
            time: Shared.fmt(timezone, "time").format(now),
            timezoneName: Shared.zoneName(timezone, "long", now) || timezone,
            abbreviation: Shared.zoneName(timezone, "short", now),
            offset: Shared.zoneName(timezone, "offset", now)
        };
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    // ==========================================
    // MATCHING
    // Exact name or abbreviation wins, and other
    // states that start with the same letters are
    // still offered ("al" -> Alabama, also Alaska).
    // ==========================================

    function findMatches(value) {
        const search = value.trim().toLowerCase();
        if (!search) return { primary: null, others: [] };

        const exact = stateNames.find(name => name.toLowerCase() === search);
        const abbreviation = stateAbbreviations[search.toUpperCase()];
        const prefix = stateNames.filter(name => name.toLowerCase().startsWith(search));
        const contains = stateNames.filter(name => name.toLowerCase().includes(search));
        const pool = prefix.length ? prefix : contains;

        const primary = exact || abbreviation || (pool.length === 1 ? pool[0] : null);

        return { primary, others: pool.filter(name => name !== primary) };
    }

    // ==========================================
    // RENDER
    // ==========================================

    function appendState(stateName) {
        const timezones = stateTimezones[stateName];

        searchResult.appendChild(el("div", "timezone-result-state", stateName));

        timezones.forEach(timezone => {
            const info = getTimezoneInformation(timezone);
            const item = el("div", "timezone-result-item");

            const time = el("div", "timezone-result-time", info.time);
            time.dataset.tz = timezone;

            item.append(
                el("div", "timezone-result-name", info.timezoneName),
                el("div", "timezone-result-details", `${info.abbreviation} | ${info.offset}`),
                time
            );

            searchResult.appendChild(item);
        });

        if (timezones.length > 1) {
            searchResult.appendChild(el(
                "div", "timezone-search-empty",
                "This state has multiple timezones. The local time depends on the area."
            ));
        }
    }

    function render(value) {
        searchResult.replaceChildren();

        if (!value.trim()) return;

        const { primary, others } = findMatches(value);

        if (!primary && !others.length) {
            searchResult.appendChild(el(
                "div", "timezone-search-empty",
                "No match. Try a state name or abbreviation."
            ));
            return;
        }

        if (primary) appendState(primary);

        if (others.length) {
            searchResult.appendChild(el(
                "div", "timezone-also",
                primary ? "Also matching" : "Did you mean"
            ));

            others.slice(0, MAX_SUGGESTIONS).forEach(name => {
                const button = el("button", "timezone-result-item", name);
                button.type = "button";
                button.addEventListener("click", () => {
                    searchInput.value = name;
                    render(name);
                    searchInput.focus();
                });
                searchResult.appendChild(button);
            });
        }
    }

    // ==========================================
    // OPEN / CLOSE
    // ==========================================

    function setOpen(open) {
        searchPanel.classList.toggle("active", open);
        searchButton.setAttribute("aria-expanded", String(open));

        if (open) {
            searchInput.focus();
        } else {
            searchInput.value = "";
            searchResult.replaceChildren();
        }
    }

    searchButton.addEventListener("click", () => {
        setOpen(!searchPanel.classList.contains("active"));
    });

    searchInput.addEventListener("input", () => render(searchInput.value));

    searchInput.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        const { primary, others } = findMatches(searchInput.value);

        if (!primary && others.length) {
            searchInput.value = others[0];
            render(others[0]);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && searchPanel.classList.contains("active")) {
            setOpen(false);
            searchButton.focus();
        }
    });

    document.addEventListener("click", event => {
        if (
            searchPanel.classList.contains("active") &&
            !searchPanel.contains(event.target) &&
            !searchButton.contains(event.target)
        ) {
            setOpen(false);
        }
    });

    // ==========================================
    // LIVE TIME: only the time text is updated
    // ==========================================

    setInterval(() => {
        if (document.hidden || !searchPanel.classList.contains("active")) return;

        const now = new Date();

        searchResult.querySelectorAll("[data-tz]").forEach(node => {
            node.textContent = Shared.fmt(node.dataset.tz, "time").format(now);
        });
    }, 1000);

});
