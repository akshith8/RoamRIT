(function () {
      "use strict";

      var CATEGORIES = {
        study: { label: "Study zone", color: "#3d5bff", glyph: "▦" },
        hangout: { label: "Hangout spot", color: "#ff2d55", glyph: "✦" },
        food: { label: "Food + drink", color: "#ffb020", glyph: "◒" },
        quiet: { label: "Quiet corner", color: "#23d18b", glyph: "◌" }
      };
      var FILTERS = [
        { key: "all", label: "All spots" },
        { key: "study", label: "Study" },
        { key: "quiet", label: "Quiet" },
        { key: "food", label: "Food + drink" },
        { key: "hangout", label: "Hangout" }
      ];
      var VIBES = ["Chill", "Focused", "Buzzing", "Packed", "Sleepy"];
      var uid = 200;
      function nextId() { return uid++; }
      function now() { return Date.now(); }
      function slugify(name) {
        var base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "spot";
        var id = base, n = 2;
        while (spots.some(function (spot) { return spot.id === id; })) { id = base + "-" + n; n++; }
        return id;
      }
      function update(minsBack, vibe, noise, outlets, comfort, note) {
        return { id: nextId(), timestamp: now() - minsBack * 60000, vibe: vibe, noise: noise, outlets: outlets, comfort: comfort, note: note || "" };
      }
      var spots = [
        { id: "library-east", name: "Library · 3rd Floor East", category: "study", sector: "North quad", x: 28, y: 29, description: "Silent-study wing with individual desks along the windows.", updates: [update(2, "Focused", 1, 5, 4, "Basically empty, every outlet free."), update(58, "Focused", 2, 5, 4, "")] },
        { id: "union-yard", name: "Student Union Courtyard", category: "hangout", sector: "Central walk", x: 54, y: 54, description: "Open-air courtyard with picnic tables and string lights.", updates: [update(4, "Buzzing", 4, 2, 3, "Packed but a table just opened near the fountain."), update(44, "Chill", 3, 2, 3, "")] },
        { id: "cs-lounge", name: "CS Building Lounge", category: "study", sector: "North quad", x: 68, y: 23, description: "Beanbags and low tables outside the compiler lab.", updates: [update(15, "Chill", 2, 5, 5, "Whole lounge to ourselves, great for a group call."), update(187, "Buzzing", 4, 5, 4, "")] },
        { id: "rooftop-garden", name: "Rooftop Garden", category: "quiet", sector: "Arts block", x: 78, y: 70, description: "A planted terrace on top of the arts building. Bring a jacket.", updates: [update(30, "Sleepy", 1, 1, 3, "Nobody up here. Quiet enough to read.")] },
        { id: "cafeteria-annex", name: "Cafeteria Annex", category: "food", sector: "South gate", x: 25, y: 72, description: "Overflow seating next to the dining hall with plugs on the back wall.", updates: [update(2, "Packed", 4, 3, 2, "Line's out the door; annex seating is the move."), update(60, "Buzzing", 3, 3, 2, "")] },
        { id: "quad-lawn", name: "The Quad Lawn", category: "hangout", sector: "Central walk", x: 47, y: 29, description: "Central grass lawn. Frisbee territory on sunny afternoons.", updates: [update(120, "Sleepy", 1, 1, 3, "Empty this early, good for reading.")] },
        { id: "eng-atrium", name: "Engineering Atrium", category: "study", sector: "East walk", x: 78, y: 43, description: "Glass-roofed atrium with long communal tables and reliable outlets.", updates: [update(25, "Focused", 3, 5, 3, "Half full, plenty of outlets left on the east side.")] },
        { id: "cafe-corner", name: "Off-Campus Café Corner", category: "quiet", sector: "South gate", x: 22, y: 47, description: "Independent café two minutes off the main gate with solid wifi.", updates: [update(50, "Chill", 2, 4, 5, "Comfy corner booth open, wifi's solid.")] }
      ];
      var state = { filter: "all", search: "", selected: null, activeView: "explore" };
      var formState = {
        mode: "update",
        spot: spots[0].id,
        vibe: null, rating: null, noise: 3, outlets: 3, comfort: 3,
        newSpot: { name: "", category: "study", sector: "", x: null, y: null }
      };

      function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]; });
      }
      function minutesAgo(timestamp) { return Math.max(0, Math.round((now() - timestamp) / 60000)); }
      function relativeTime(timestamp) {
        var minutes = minutesAgo(timestamp);
        if (minutes < 1) return "just now";
        if (minutes < 60) return minutes + "m ago";
        var hours = Math.round(minutes / 60);
        if (hours < 24) return hours + "h ago";
        return Math.round(hours / 24) + "d ago";
      }
      function latest(spot) {
        return spot.updates.reduce(function (newest, item) { return item.timestamp > newest.timestamp ? item : newest; }, spot.updates[0]);
      }
      function average(spot, key) {
        return spot.updates.reduce(function (sum, item) { return sum + item[key]; }, 0) / Math.max(spot.updates.length, 1);
      }
      function freshness(spot) {
        var minutes = spot.updates.length ? minutesAgo(latest(spot).timestamp) : 180;
        return Math.max(12, Math.min(100, Math.round(100 * Math.exp(-minutes / 58))));
      }
      function signalFor(spot) {
        var item = latest(spot);
        if (!item) return "quiet";
        if (item.vibe === "Packed" || average(spot, "noise") >= 4) return "busy";
        if (item.vibe === "Buzzing" || freshness(spot) < 55) return "filling";
        return "open";
      }
      function signalColor(signal) { return signal === "busy" ? "#ff3b5c" : signal === "filling" ? "#ffb020" : "#23d18b"; }
      function signalLabel(signal) { return signal === "busy" ? "Busy" : signal === "filling" ? "Filling" : "Open"; }
      function matchingSpots() {
        return spots.filter(function (spot) {
          if (state.filter !== "all" && spot.category !== state.filter) return false;
          if (!state.search) return true;
          var haystack = (spot.name + " " + spot.description + " " + spot.sector + " " + CATEGORIES[spot.category].label + " " + latest(spot).vibe).toLowerCase();
          return haystack.indexOf(state.search) !== -1;
        });
      }

      function renderPlaceCount() {
        var el = document.getElementById("place-count");
        if (el) el.textContent = spots.length + (spots.length === 1 ? " place" : " places");
      }
      function renderSectorList() {
        var sectors = [];
        spots.forEach(function (spot) { if (sectors.indexOf(spot.sector) === -1) sectors.push(spot.sector); });
        var list = document.getElementById("sector-list");
        if (list) list.innerHTML = sectors.map(function (sector) { return '<option value="' + escapeHTML(sector) + '"></option>'; }).join("");
      }

      var listEl = document.getElementById("spot-list");
      var emptyEl = document.getElementById("empty-state");
      function renderFilters() {
        var bar = document.getElementById("filter-bar");
        bar.innerHTML = '<span class="filter-label">Show</span>' + FILTERS.map(function (filter) {
          return '<button class="filter-btn" type="button" data-filter="' + filter.key + '" aria-pressed="' + (state.filter === filter.key) + '">' + filter.label + "</button>";
        }).join("");
        bar.querySelectorAll("[data-filter]").forEach(function (button) {
          button.addEventListener("click", function () { state.filter = button.dataset.filter; renderFilters(); renderExplore(); });
        });
      }
      function pulseMeter(spot, extraClass) {
        var value = freshness(spot);
        return '<div class="pulse-meter ' + (value > 65 ? "fresh " : "") + (extraClass || "") + '" style="--freshness:' + value + ';--signal:' + signalColor(signalFor(spot)) + '" aria-label="' + value + '% signal confidence"><div class="pulse-meter-content"><span class="pulse-number">' + value + '%</span><span class="pulse-label">fresh</span></div></div>';
      }
      function renderMap(items) {
        var map = document.getElementById("map-canvas");
        map.querySelectorAll(".map-node").forEach(function (node) { node.remove(); });
        items.forEach(function (spot) {
          var signal = signalFor(spot);
          var node = document.createElement("button");
          node.type = "button";
          node.className = "map-node " + (freshness(spot) > 65 ? "fresh " : "") + (state.selected === spot.id ? "selected" : "");
          node.style.left = spot.x + "%";
          node.style.top = spot.y + "%";
          node.style.setProperty("--node", signalColor(signal));
          node.setAttribute("aria-label", spot.name + ", " + signalLabel(signal) + ", updated " + relativeTime(latest(spot).timestamp));
          node.innerHTML = '<span class="node-glyph">' + CATEGORIES[spot.category].glyph + '</span><span class="node-name">' + escapeHTML(spot.name.split(" · ")[0]) + "</span>";
          node.addEventListener("click", function () { openDetail(spot.id); });
          map.appendChild(node);
        });
        document.getElementById("map-summary").textContent = items.filter(function (spot) { return signalFor(spot) === "open"; }).length + " open sectors";
      }
      function renderList(items) {
        document.getElementById("result-count").textContent = items.length + (items.length === 1 ? " spot" : " spots");
        emptyEl.hidden = items.length !== 0;
        listEl.innerHTML = items.map(function (spot) {
          var item = latest(spot);
          var signal = signalFor(spot);
          var color = signalColor(signal);
          return '<button class="spot-card ' + (state.selected === spot.id ? "selected" : "") + '" data-spot="' + spot.id + '" style="--signal:' + color + '" type="button">' +
            '<div><div class="spot-title-row"><span class="spot-title">' + escapeHTML(spot.name) + '</span><span class="status-badge">' + signalLabel(signal) + '</span></div>' +
            '<div class="spot-category">' + escapeHTML(CATEGORIES[spot.category].label) + ' · ' + escapeHTML(spot.sector) + '</div>' +
            '<div class="spot-meta"><span>◷ ' + relativeTime(item.timestamp) + '</span><span>⚡ ' + item.outlets + '/5 outlets</span><span>◌ ' + item.comfort + '/5 comfort</span></div>' +
            (item.note ? '<div class="spot-note">“' + escapeHTML(item.note) + '”</div>' : "") + '</div>' + pulseMeter(spot) + '</button>';
        }).join("");
        listEl.querySelectorAll("[data-spot]").forEach(function (card) {
          card.addEventListener("click", function () { openDetail(card.dataset.spot); });
        });
      }
      function renderExplore() {
        var items = matchingSpots();
        renderList(items);
        renderMap(items);
      }

      function renderFeed() {
        var all = [];
        spots.forEach(function (spot) { spot.updates.forEach(function (item) { all.push({ spot: spot, item: item }); }); });
        all.sort(function (a, b) { return b.item.timestamp - a.item.timestamp; });
        document.getElementById("feed-list").innerHTML = all.map(function (entry) {
          var signal = signalFor(entry.spot);
          return '<article class="feed-item" style="--signal:' + signalColor(signal) + '"><span class="feed-marker"></span><div><div class="feed-top"><span class="feed-vibe">' + escapeHTML(entry.item.vibe) + '</span><span class="feed-spot">' + escapeHTML(entry.spot.name) + '</span></div>' + (entry.item.note ? '<p class="feed-note">' + escapeHTML(entry.item.note) + '</p>' : "") + '</div><time class="feed-time">' + relativeTime(entry.item.timestamp) + '</time></article>';
        }).join("");
      }

      function switchView(view) {
        state.activeView = view;
        document.querySelectorAll(".view").forEach(function (element) { element.hidden = element.id !== "view-" + view; });
        document.querySelectorAll("[data-nav]").forEach(function (button) {
          if (button.classList.contains("nav-btn")) button.setAttribute("aria-selected", button.dataset.nav === view ? "true" : "false");
        });
        if (view === "feed") renderFeed();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      document.querySelectorAll("[data-nav]").forEach(function (button) {
        button.addEventListener("click", function (event) {
          event.preventDefault();
          switchView(button.dataset.nav);
        });
      });
      document.getElementById("search-input").addEventListener("input", function (event) {
        state.search = event.target.value.trim().toLowerCase();
        renderExplore();
      });
      document.getElementById("refresh-btn").addEventListener("click", function () {
        renderExplore();
        showToast("Campus signal refreshed");
      });
      document.getElementById("location-btn").addEventListener("click", function () { showToast("North campus is your current area"); });
      document.getElementById("report-quick-btn").addEventListener("click", function () { switchView("report"); });

      function closeDetail() {
        var root = document.getElementById("drawer-root");
        root.innerHTML = "";
        state.selected = null;
        document.removeEventListener("keydown", escClose);
        renderExplore();
      }
      function openDetail(id) {
        var spot = spots.find(function (item) { return item.id === id; });
        if (!spot) return;
        state.selected = id;
        var signal = signalFor(spot);
        var color = signalColor(signal);
        var root = document.getElementById("drawer-root");
        var updates = spot.updates.slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
        root.innerHTML = '<div class="backdrop" id="backdrop"><aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">' +
          '<div class="drawer-top"><div><h2 id="drawer-title">' + escapeHTML(spot.name) + '</h2><p class="drawer-category">' + escapeHTML(CATEGORIES[spot.category].label) + ' · ' + escapeHTML(spot.sector) + '</p></div><button class="close-btn" type="button" id="close-drawer" aria-label="Close details">×</button></div>' +
          '<div class="drawer-body"><div class="drawer-summary" style="--signal:' + color + '">' + pulseMeter(spot) + '<div class="drawer-summary-copy"><strong>' + signalLabel(signal) + ' right now</strong><span>Updated ' + relativeTime(latest(spot).timestamp) + ' · confidence fades as the signal ages.</span></div></div>' +
          '<p class="drawer-section-label">Spot read</p><p style="color:var(--muted);font-size:13px;line-height:1.55;">' + escapeHTML(spot.description) + '</p>' +
          '<div class="metric-list">' + metric("Noise", average(spot, "noise"), color) + metric("Outlets", average(spot, "outlets"), color) + metric("Comfort", average(spot, "comfort"), color) + '</div>' +
          '<p class="drawer-section-label">Recent check-ins (' + updates.length + ')</p><div class="checkin-list">' + updates.map(function (item) { return '<div class="checkin" style="--signal:' + color + '"><div class="checkin-head"><strong>' + escapeHTML(item.vibe) + '</strong><span>' + relativeTime(item.timestamp) + '</span></div>' + (item.note ? '<p>' + escapeHTML(item.note) + '</p>' : '<p>No note left.</p>') + '</div>'; }).join("") + '</div>' +
          '<button class="report-btn drawer-report" type="button" id="drawer-report">Review this spot</button></div></aside></div>';
        document.getElementById("close-drawer").addEventListener("click", closeDetail);
        document.getElementById("backdrop").addEventListener("click", function (event) { if (event.target.id === "backdrop") closeDetail(); });
        document.getElementById("drawer-report").addEventListener("click", function () { closeDetail(); openContributionMode("update", spot.id); switchView("report"); });
        document.addEventListener("keydown", escClose);
        renderExplore();
      }
      function escClose(event) { if (event.key === "Escape") { closeDetail(); document.removeEventListener("keydown", escClose); } }
      function metric(label, value, color) {
        return '<div class="metric-row"><span>' + label + '</span><span class="metric-track"><span class="metric-fill" style="--signal:' + color + ';width:' + (value * 20) + '%;background:' + color + '"></span></span><strong class="metric-value">' + value.toFixed(1) + '</strong></div>';
      }

      function makeChoices(containerId, values, selected, onChange) {
        var container = document.getElementById(containerId);
        container.innerHTML = values.map(function (value) { return '<button class="choice" type="button" data-choice="' + value + '" aria-pressed="' + (value === selected ? "true" : "false") + '">' + value + '</button>'; }).join("");
        container.querySelectorAll("[data-choice]").forEach(function (button) {
          button.addEventListener("click", function () { onChange(Number(button.dataset.choice) || button.dataset.choice); makeChoices(containerId, values, Number(button.dataset.choice) || button.dataset.choice, onChange); });
        });
      }
      function renderReportSpot() {
        document.getElementById("report-spot").innerHTML = spots.map(function (spot) { return '<option value="' + spot.id + '">' + escapeHTML(spot.name) + '</option>'; }).join("");
        document.getElementById("report-spot").value = formState.spot;
      }
      function updateFormStateLabel(id, value) { document.getElementById(id).textContent = value; }
      function renderCategoryChoices() {
        var container = document.getElementById("category-choices");
        container.innerHTML = Object.keys(CATEGORIES).map(function (key) {
          return '<button class="choice" type="button" data-choice="' + key + '" aria-pressed="' + (key === formState.newSpot.category) + '">' + CATEGORIES[key].glyph + ' ' + CATEGORIES[key].label + '</button>';
        }).join("");
        container.querySelectorAll("[data-choice]").forEach(function (button) {
          button.addEventListener("click", function () {
            formState.newSpot.category = button.dataset.choice;
            renderCategoryChoices();
            renderMiniMap();
          });
        });
      }
      function renderMiniMap() {
        var map = document.getElementById("mini-map");
        if (!map) return;
        map.querySelectorAll(".mini-map-dot, .mini-map-marker").forEach(function (node) { node.remove(); });
        var hint = document.getElementById("mini-map-hint");
        spots.forEach(function (spot) {
          var dot = document.createElement("span");
          dot.className = "mini-map-dot";
          dot.style.left = spot.x + "%";
          dot.style.top = spot.y + "%";
          dot.style.background = CATEGORIES[spot.category].color;
          map.appendChild(dot);
        });
        if (formState.newSpot.x !== null && formState.newSpot.y !== null) {
          if (hint) hint.hidden = true;
          var marker = document.createElement("span");
          marker.className = "mini-map-marker";
          marker.style.left = formState.newSpot.x + "%";
          marker.style.top = formState.newSpot.y + "%";
          marker.style.setProperty("--node", CATEGORIES[formState.newSpot.category].color);
          marker.style.background = CATEGORIES[formState.newSpot.category].color;
          map.appendChild(marker);
        } else if (hint) {
          hint.hidden = false;
        }
      }
      function placeOnMiniMap(event) {
        var map = document.getElementById("mini-map");
        var rect = map.getBoundingClientRect();
        var clientX = event.touches ? event.touches[0].clientX : event.clientX;
        var clientY = event.touches ? event.touches[0].clientY : event.clientY;
        var x = Math.round(Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)));
        var y = Math.round(Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100)));
        formState.newSpot.x = x;
        formState.newSpot.y = y;
        renderMiniMap();
        updateAddSpotSubmitState();
      }
      document.getElementById("mini-map").addEventListener("click", placeOnMiniMap);
      document.getElementById("mini-map").addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          formState.newSpot.x = formState.newSpot.x === null ? 50 : formState.newSpot.x;
          formState.newSpot.y = formState.newSpot.y === null ? 50 : formState.newSpot.y;
          renderMiniMap();
          updateAddSpotSubmitState();
        }
      });
      function setReportMode(mode) {
        formState.mode = mode;
        document.querySelectorAll("#mode-toggle .mode-btn").forEach(function (button) {
          button.setAttribute("aria-pressed", button.dataset.mode === mode ? "true" : "false");
        });
        document.getElementById("review-form").hidden = mode !== "update";
        document.getElementById("add-spot-form").hidden = mode !== "new";
        if (mode === "new") {
          renderCategoryChoices();
          renderMiniMap();
          updateAddSpotSubmitState();
        } else {
          renderReportSpot();
          updateReviewSubmitState();
        }
      }
      function openContributionMode(mode, spotId) {
        if (spotId) formState.spot = spotId;
        setReportMode(mode);
      }
      document.querySelectorAll("#mode-toggle .mode-btn").forEach(function (button) {
        button.addEventListener("click", function () { setReportMode(button.dataset.mode); });
      });
      function renderFormChoices() {
        makeChoices("vibe-choices", VIBES, formState.vibe, function (value) { formState.vibe = value; updateReviewSubmitState(); });
        makeChoices("noise-choices", [1, 2, 3, 4, 5], formState.noise, function (value) { formState.noise = value; updateFormStateLabel("noise-value", value); updateReviewSubmitState(); });
        makeChoices("outlet-choices", [1, 2, 3, 4, 5], formState.outlets, function (value) { formState.outlets = value; updateFormStateLabel("outlet-value", value); updateReviewSubmitState(); });
        makeChoices("comfort-choices", [1, 2, 3, 4, 5], formState.comfort, function (value) { formState.comfort = value; updateFormStateLabel("comfort-value", value); updateReviewSubmitState(); });
        renderRatingChoices();
      }
      function renderRatingChoices() {
        var container = document.getElementById("rating-choices");
        if (!container) return;
        container.innerHTML = [1,2,3,4,5].map(function (value) {
          return '<button class="star-choice" type="button" data-rating="' + value + '" aria-label="' + value + ' out of 5" aria-pressed="' + (value === formState.rating) + '">' + (value <= (formState.rating || 0) ? "★" : "☆") + '</button>';
        }).join("");
        container.querySelectorAll("[data-rating]").forEach(function (button) {
          button.addEventListener("click", function () {
            formState.rating = Number(button.dataset.rating);
            renderRatingChoices();
            updateReviewSubmitState();
          });
        });
      }
      function updateReviewSubmitState() {
        var button = document.getElementById("submit-review");
        if (button) button.disabled = !(formState.spot && formState.vibe && formState.rating);
      }
      function updateAddSpotSubmitState() {
        var button = document.getElementById("submit-add-spot");
        if (!button) return;
        var n = formState.newSpot;
        var name = document.getElementById("new-spot-name").value.trim();
        button.disabled = !(name && n.sector && n.x !== null && n.y !== null);
      }
      document.getElementById("report-spot").addEventListener("change", function (event) { formState.spot = event.target.value; updateReviewSubmitState(); });
      document.getElementById("new-spot-name").addEventListener("input", function (event) { formState.newSpot.name = event.target.value; updateAddSpotSubmitState(); });
      document.getElementById("new-spot-sector").addEventListener("input", function (event) { formState.newSpot.sector = event.target.value.trim(); updateAddSpotSubmitState(); });
      function resetReviewForm() {
        formState.vibe = null;
        formState.rating = null;
        formState.noise = formState.outlets = formState.comfort = 3;
        document.getElementById("report-note").value = "";
        renderFormChoices();
        updateFormStateLabel("noise-value", 3); updateFormStateLabel("outlet-value", 3); updateFormStateLabel("comfort-value", 3);
      }
      function resetAddSpotForm() {
        document.getElementById("new-spot-name").value = "";
        document.getElementById("new-spot-description").value = "";
        document.getElementById("new-spot-sector").value = "";
        formState.newSpot = { name: "", category: "study", sector: "", x: null, y: null };
        renderCategoryChoices();
        renderMiniMap();
        updateAddSpotSubmitState();
      }
      document.getElementById("review-form").addEventListener("submit", function (event) {
        event.preventDefault();
        if (!formState.spot || !formState.vibe || !formState.rating) return;
        var spot = spots.find(function (item) { return item.id === formState.spot; });
        if (!spot) return;
        spot.updates.push(update(0, formState.vibe, formState.noise, formState.outlets, formState.comfort, document.getElementById("report-note").value.trim()));
        spot.rating = formState.rating;
        resetReviewForm();
        renderExplore();
        renderFeed();
        showToast("Your review is live on RoamRIT");
        switchView("explore");
      });
      document.getElementById("add-spot-form").addEventListener("submit", function (event) {
        event.preventDefault();
        var n = formState.newSpot;
        var name = document.getElementById("new-spot-name").value.trim();
        if (!name || !n.sector || n.x === null || n.y === null) { updateAddSpotSubmitState(); return; }
        var newSpot = {
          id: slugify(name), name: name, category: n.category, sector: n.sector, x: n.x, y: n.y,
          description: document.getElementById("new-spot-description").value.trim(),
          updates: []
        };
        spots.push(newSpot);
        resetAddSpotForm();
        renderReportSpot();
        renderSectorList();
        renderPlaceCount();
        renderFilters();
        renderExplore();
        renderFeed();
        showToast("“" + name + "” was added to RoamRIT");
        switchView("explore");
        openDetail(newSpot.id);
      });

      function showToast(message) {
        var toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
      }

      renderFilters();
      renderReportSpot();
      renderSectorList();
      renderCategoryChoices();
      renderMiniMap();
      setReportMode("update");
      renderFormChoices();
      updateReviewSubmitState();
      renderPlaceCount();
      renderExplore();
      renderFeed();
    })();