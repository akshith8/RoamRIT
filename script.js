(function () {
  "use strict";

  var ICONS = {
    study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5c2.2-1 5.3-1 7.6 0v13.4c-2.3-1-5.4-1-7.6 0Z"/><path d="M19.6 5.5c-2.2-1-5.3-1-7.6 0v13.4c2.3-1 5.4-1 7.6 0Z"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6.5a2.5 2.5 0 0 0 5 0V3"/><path d="M8.5 3v18"/><path d="M17 3c-1.7 0-3 2-3 5.5S15.3 13 17 13v8"/></svg>',
    chill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c0-6.5 1.5-11 7-15-3.5 0-9 1-9 8"/><path d="M12 21c0-5-1.2-8.6-5-11.5-1.8 3 0 8.5 5 11.5Z"/></svg>',
    hangout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M5.8 5.8l2.3 2.3M15.9 15.9l2.3 2.3M5.8 18.2l2.3-2.3M15.9 8.1l2.3-2.3"/></svg>',
    all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/></svg>'
  };
  var CATEGORIES = {
    study: { label: "Study", color: "#5b7cff", icon: ICONS.study },
    food: { label: "Food", color: "#ff9a3c", icon: ICONS.food },
    chill: { label: "Chill", color: "#8ef23c", icon: ICONS.chill },
    hangout: { label: "Hangout", color: "#ff3c8e", icon: ICONS.hangout }
  };
  var FILTERS = [
    { key: "all", label: "All", icon: ICONS.all },
    { key: "food", label: "Food", icon: CATEGORIES.food.icon },
    { key: "study", label: "Study", icon: CATEGORIES.study.icon },
    { key: "chill", label: "Chill", icon: CATEGORIES.chill.icon },
    { key: "hangout", label: "Hangout", icon: CATEGORIES.hangout.icon }
  ];
  var VIBES = ["Chill", "Focused", "Buzzing", "Packed", "Sleepy"];
  function now() { return Date.now(); }
  function slugify(name) {
    var base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "spot";
    var id = base, n = 2;
    while (spots.some(function (spot) { return spot.id === id; })) { id = base + "-" + n; n++; }
    return id;
  }

  /* ----- Supabase ----- */
  var supabase = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  function checkinFromRow(row) {
    return { id: row.id, timestamp: new Date(row.created_at).getTime(), vibe: row.vibe, noise: row.noise, outlets: row.outlets, comfort: row.comfort, note: row.note || "" };
  }
  function spotFromRow(row, checkinRows) {
    return {
      id: row.id, name: row.name, category: row.category, sector: row.sector,
      x: Number(row.x), y: Number(row.y), distanceMin: row.distance_min,
      rating: row.rating === null ? null : Number(row.rating),
      description: row.description || "",
      updates: (checkinRows || []).map(checkinFromRow)
    };
  }

  /* spots/checkins start empty and are filled in by loadData() once Supabase responds */
  var spots = [];
  var state = { filter: "all", search: "", selected: null, activeView: "explore", viewMode: "list", saved: loadSavedFromStorage() };

  /* ----- auth + community board state ----- */
  var session = null;
  var posts = [];
  function currentUserId() { return session && session.user ? session.user.id : null; }
  function currentDisplayName() {
    if (!session || !session.user) return "";
    var meta = session.user.user_metadata || {};
    return meta.display_name || (session.user.email ? session.user.email.split("@")[0] : "You");
  }
  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var chars = parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    return chars || "?";
  }
  var formState = {
    mode: "update",
    spot: null,
    vibe: null, rating: null, noise: 3, outlets: 3, comfort: 3,
    newSpot: { name: "", category: "study", sector: "", x: null, y: null }
  };

  /* ----- saved spots persist per-browser in localStorage (not shared via Supabase) ----- */
  function loadSavedFromStorage() {
    try {
      var raw = window.localStorage.getItem("roamrit-saved");
      return raw ? JSON.parse(raw) : {};
    } catch (err) { return {}; }
  }
  function persistSaved() {
    try { window.localStorage.setItem("roamrit-saved", JSON.stringify(state.saved)); } catch (err) { /* storage unavailable, ignore */ }
  }

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
    if (!spot.updates.length) return null;
    return spot.updates.reduce(function (newest, item) { return item.timestamp > newest.timestamp ? item : newest; }, spot.updates[0]);
  }
  function average(spot, key) {
    return spot.updates.reduce(function (sum, item) { return sum + item[key]; }, 0) / Math.max(spot.updates.length, 1);
  }
  function freshness(spot) {
    var recent = latest(spot);
    var minutes = recent ? minutesAgo(recent.timestamp) : 180;
    return Math.max(12, Math.min(100, Math.round(100 * Math.exp(-minutes / 58))));
  }
  function signalFor(spot) {
    var item = latest(spot);
    if (!item) return "open";
    if (item.vibe === "Packed" || average(spot, "noise") >= 4) return "busy";
    if (item.vibe === "Buzzing" || freshness(spot) < 55) return "filling";
    return "open";
  }
  function signalColor(signal) { return signal === "busy" ? "#ff4d6d" : signal === "filling" ? "#ffb020" : "#2be3a2"; }
  function signalLabel(signal) { return signal === "busy" ? "Busy" : signal === "filling" ? "Filling" : "Open"; }
  function matchingSpots() {
    return spots.filter(function (spot) {
      if (state.filter !== "all" && spot.category !== state.filter) return false;
      if (!state.search) return true;
      var recent = latest(spot);
      var haystack = (spot.name + " " + spot.description + " " + spot.sector + " " + CATEGORIES[spot.category].label + " " + (recent ? recent.vibe : "")).toLowerCase();
      return haystack.indexOf(state.search) !== -1;
    });
  }
  function savedSpots() {
    return spots.filter(function (spot) { return !!state.saved[spot.id]; });
  }

  function renderSectorList() {
    var sectors = [];
    spots.forEach(function (spot) { if (sectors.indexOf(spot.sector) === -1) sectors.push(spot.sector); });
    var list = document.getElementById("sector-list");
    if (list) list.innerHTML = sectors.map(function (sector) { return '<option value="' + escapeHTML(sector) + '"></option>'; }).join("");
  }

  function renderFilters() {
    var bar = document.getElementById("filter-bar");
    bar.innerHTML = FILTERS.map(function (filter) {
      return '<button class="filter-chip" type="button" data-filter="' + filter.key + '" aria-pressed="' + (state.filter === filter.key) + '"><span class="chip-icon">' + filter.icon + '</span>' + filter.label + "</button>";
    }).join("");
    bar.querySelectorAll("[data-filter]").forEach(function (button) {
      button.addEventListener("click", function () { state.filter = button.dataset.filter; renderFilters(); renderExplore(); });
    });
  }

  /* ----- place card (shared by Explore + Saved) ----- */
  function placeCardHTML(spot) {
    var recent = latest(spot);
    var signal = signalFor(spot);
    var color = signalColor(signal);
    var cat = CATEGORIES[spot.category];
    var isSaved = !!state.saved[spot.id];
    var ratingHTML = typeof spot.rating === "number"
      ? '<span class="place-rating">★ ' + spot.rating.toFixed(1) + '</span>'
      : '<span class="place-rating is-new">New</span>';
    var noteText = recent && recent.note ? recent.note : spot.description;
    return '<div class="place-card ' + (state.selected === spot.id ? "selected" : "") + '" data-spot="' + spot.id + '" role="button" tabindex="0" aria-label="Open ' + escapeHTML(spot.name) + '">' +
      '<div class="place-cover" style="--cat:' + cat.color + '">' +
        '<span class="place-icon" aria-hidden="true">' + cat.icon + '</span>' +
        '<button class="save-btn" type="button" data-save="' + spot.id + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "Remove from saved" : "Save") + ' ' + escapeHTML(spot.name) + '">' + heartSVG(isSaved) + '</button>' +
        '<span class="status-chip" style="--signal:' + color + '"><i></i>' + signalLabel(signal) + '</span>' +
      '</div>' +
      '<div class="place-body">' +
        '<div class="place-top"><h3 class="place-name">' + escapeHTML(spot.name) + '</h3>' + ratingHTML + '</div>' +
        '<p class="place-meta">' + escapeHTML(cat.label) + ' · ' + escapeHTML(spot.sector) + ' · ' + spot.distanceMin + ' min walk</p>' +
        (noteText ? '<p class="place-note">' + escapeHTML(noteText) + '</p>' : "") +
        '<p class="place-updated">' + (recent ? "Updated " + relativeTime(recent.timestamp) : "No check-ins yet") + '</p>' +
      '</div>' +
    '</div>';
  }
  function heartSVG(filled) {
    return '<svg viewBox="0 0 20 20" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.6"><path d="M10 17.3s-6.6-4-8.4-8.1C.5 6.4 2 3.4 5 3c1.9-.3 3.6.6 5 2.4C11.4 3.6 13.1 2.7 15 3c3 .4 4.5 3.4 3.4 6.2C16.6 13.3 10 17.3 10 17.3Z"/></svg>';
  }
  function wireCardEvents(container) {
    container.querySelectorAll("[data-spot]").forEach(function (card) {
      card.addEventListener("click", function () { openDetail(card.dataset.spot); });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(card.dataset.spot); }
      });
    });
    container.querySelectorAll("[data-save]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleSaved(button.dataset.save);
      });
    });
  }
  function toggleSaved(id) {
    var spot = spots.find(function (item) { return item.id === id; });
    if (!spot) return;
    if (state.saved[id]) { delete state.saved[id]; showToast("Removed from saved"); }
    else { state.saved[id] = true; showToast("Saved " + spot.name); }
    persistSaved();
    if (state.activeView === "saved") renderSavedView(); else renderList(matchingSpots());
  }

  function renderMap(items) {
    var map = document.getElementById("map-canvas");
    map.innerHTML = '<span class="map-label north">North quad</span><span class="map-label center">Central walk</span><span class="map-label south">South gate</span>';
    items.forEach(function (spot) {
      var signal = signalFor(spot);
      var node = document.createElement("button");
      node.type = "button";
      node.className = "map-node " + (state.selected === spot.id ? "selected" : "");
      node.style.left = spot.x + "%";
      node.style.top = spot.y + "%";
      node.style.setProperty("--node", signalColor(signal));
      var recent = latest(spot);
      node.setAttribute("aria-label", spot.name + ", " + signalLabel(signal) + (recent ? ", updated " + relativeTime(recent.timestamp) : ""));
      node.innerHTML = '<span class="node-glyph">' + CATEGORIES[spot.category].icon + '</span><span class="node-name">' + escapeHTML(spot.name.split(" · ")[0]) + "</span>";
      node.addEventListener("click", function () { openDetail(spot.id); });
      map.appendChild(node);
    });
    var openCount = items.filter(function (spot) { return signalFor(spot) === "open"; }).length;
    document.getElementById("map-summary").textContent = openCount + " of " + items.length + " spots are open right now";
  }
  function renderList(items) {
    var listEl = document.getElementById("spot-list");
    var emptyEl = document.getElementById("empty-state");
    var resultLine = document.getElementById("result-count");
    resultLine.textContent = items.length + (items.length === 1 ? " place near you" : " places near you");
    emptyEl.hidden = items.length !== 0 || state.viewMode === "map";
    listEl.innerHTML = items.map(placeCardHTML).join("");
    wireCardEvents(listEl);
  }
  function renderExplore() {
    var items = matchingSpots();
    renderList(items);
    renderMap(items);
    applyViewMode();
    renderPulseStrip();
  }
  function renderPulseStrip() {
    var el = document.getElementById("pulse-strip");
    if (!el) return;
    var openCount = spots.filter(function (spot) { return signalFor(spot) === "open"; }).length;
    var recentCount = spots.filter(function (spot) {
      var recent = latest(spot);
      return recent && minutesAgo(recent.timestamp) < 30;
    }).length;
    el.innerHTML =
      '<span class="pulse-chip"><i class="pulse-dot"></i>' + openCount + ' of ' + spots.length + ' spots open right now</span>' +
      '<span class="pulse-chip pulse-chip-alt">' + recentCount + ' check-in' + (recentCount === 1 ? "" : "s") + ' in the last 30 min</span>';
  }
  function renderTicker() {
    var track = document.getElementById("ticker-track");
    if (!track) return;
    var all = [];
    spots.forEach(function (spot) { spot.updates.forEach(function (item) { all.push({ spot: spot, item: item }); }); });
    all.sort(function (a, b) { return b.item.timestamp - a.item.timestamp; });
    var top = all.slice(0, 8);
    if (!top.length) { track.innerHTML = ""; return; }
    var pieces = top.map(function (entry) {
      return '<span class="ticker-item">' + escapeHTML(entry.spot.name.split(" · ")[0]) + ' is feeling ' + escapeHTML(entry.item.vibe).toLowerCase() + '<i class="ticker-sep">/</i></span>';
    });
    track.innerHTML = pieces.join("") + pieces.join("");
  }
  function renderSavedView() {
    var items = savedSpots();
    var listEl = document.getElementById("saved-list");
    var emptyEl = document.getElementById("saved-empty");
    emptyEl.hidden = items.length !== 0;
    listEl.innerHTML = items.map(placeCardHTML).join("");
    wireCardEvents(listEl);
  }

  function applyViewMode() {
    var isMap = state.viewMode === "map";
    document.getElementById("map-section").hidden = !isMap;
    document.getElementById("spot-list").style.display = isMap ? "none" : "grid";
    document.getElementById("result-count").style.display = isMap ? "none" : "block";
    var emptyEl = document.getElementById("empty-state");
    emptyEl.hidden = isMap || matchingSpots().length !== 0;
    document.querySelectorAll("#view-toggle .toggle-btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.view === state.viewMode ? "true" : "false");
    });
  }
  document.querySelectorAll("#view-toggle .toggle-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      state.viewMode = button.dataset.view;
      applyViewMode();
    });
  });

  function renderFeed() {
    var all = [];
    spots.forEach(function (spot) { spot.updates.forEach(function (item) { all.push({ spot: spot, item: item }); }); });
    all.sort(function (a, b) { return b.item.timestamp - a.item.timestamp; });
    document.getElementById("feed-list").innerHTML = all.map(function (entry) {
      var signal = signalFor(entry.spot);
      return '<article class="feed-item" style="--signal:' + signalColor(signal) + '"><span class="feed-marker"></span><div><div class="feed-top"><span class="feed-vibe">' + escapeHTML(entry.item.vibe) + '</span><span class="feed-spot">' + escapeHTML(entry.spot.name) + '</span></div>' + (entry.item.note ? '<p class="feed-note">' + escapeHTML(entry.item.note) + '</p>' : "") + '</div><time class="feed-time">' + relativeTime(entry.item.timestamp) + '</time></article>';
    }).join("");
    renderTicker();
  }

  function switchView(view) {
    state.activeView = view;
    document.querySelectorAll(".view").forEach(function (element) { element.hidden = element.id !== "view-" + view; });
    document.querySelectorAll("[data-nav]").forEach(function (button) {
      if (button.classList.contains("nav-link")) button.setAttribute("aria-selected", button.dataset.nav === view ? "true" : "false");
    });
    if (view === "feed") renderFeed();
    if (view === "saved") renderSavedView();
    if (view === "explore") renderPulseStrip();
    if (view === "community") { renderCommunity(); loadPosts(); }
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
  document.getElementById("feed-link").addEventListener("click", function () { switchView("feed"); });
  document.getElementById("nav-search-btn").addEventListener("click", function () {
    switchView("explore");
    var input = document.getElementById("search-input");
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.getElementById("nav-add-btn").addEventListener("click", function () {
    switchView("report");
    openContributionMode("new");
  });
  document.getElementById("nav-review-btn").addEventListener("click", function () {
    switchView("report");
    openContributionMode("update");
  });

  function closeDetail() {
    var root = document.getElementById("drawer-root");
    root.innerHTML = "";
    state.selected = null;
    document.removeEventListener("keydown", escClose);
    if (state.activeView === "saved") renderSavedView(); else renderExplore();
  }
  function openDetail(id) {
    var spot = spots.find(function (item) { return item.id === id; });
    if (!spot) return;
    state.selected = id;
    var signal = signalFor(spot);
    var color = signalColor(signal);
    var cat = CATEGORIES[spot.category];
    var isSaved = !!state.saved[id];
    var root = document.getElementById("drawer-root");
    var updates = spot.updates.slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
    var recent = latest(spot);
    root.innerHTML = '<div class="backdrop" id="backdrop"><aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">' +
      '<div class="drawer-cover" style="--cat:' + cat.color + '"><span class="place-icon" aria-hidden="true">' + cat.icon + '</span>' +
        '<button class="save-btn" type="button" data-save="' + id + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "Remove from saved" : "Save") + '">' + heartSVG(isSaved) + '</button>' +
        '<button class="close-btn" type="button" id="close-drawer" aria-label="Close details">×</button>' +
      '</div>' +
      '<div class="drawer-top"><h2 id="drawer-title">' + escapeHTML(spot.name) + '</h2><p class="drawer-category">' + escapeHTML(cat.label) + ' · ' + escapeHTML(spot.sector) + ' · ' + spot.distanceMin + ' min walk</p></div>' +
      '<div class="drawer-body"><div class="drawer-summary" style="--signal:' + color + '">' + pulseMeter(spot) + '<div class="drawer-summary-copy"><strong>' + signalLabel(signal) + ' right now</strong><span>' + (recent ? "Updated " + relativeTime(recent.timestamp) : "No check-ins yet") + '</span></div></div>' +
      '<p class="drawer-desc">' + escapeHTML(spot.description) + '</p>' +
      '<div class="metric-list">' + metric("Noise", average(spot, "noise"), color) + metric("Outlets", average(spot, "outlets"), color) + metric("Comfort", average(spot, "comfort"), color) + '</div>' +
      '<p class="drawer-section-label">Recent check-ins (' + updates.length + ')</p><div class="checkin-list">' + updates.map(function (item) { return '<div class="checkin"><div class="checkin-head"><strong>' + escapeHTML(item.vibe) + '</strong><span>' + relativeTime(item.timestamp) + '</span></div>' + (item.note ? '<p>' + escapeHTML(item.note) + '</p>' : '<p>No note left.</p>') + '</div>'; }).join("") + (updates.length ? "" : '<p style="color:var(--muted);font-size:12.5px;">Be the first to check in here.</p>') + '</div>' +
      '<button class="btn-solid drawer-report" type="button" id="drawer-report">Review this spot</button></div></aside></div>';
    document.getElementById("close-drawer").addEventListener("click", closeDetail);
    document.getElementById("backdrop").addEventListener("click", function (event) { if (event.target.id === "backdrop") closeDetail(); });
    document.getElementById("drawer-report").addEventListener("click", function () { closeDetail(); openContributionMode("update", spot.id); switchView("report"); });
    root.querySelectorAll("[data-save]").forEach(function (button) {
      button.addEventListener("click", function () { toggleSaved(id); openDetail(id); });
    });
    document.addEventListener("keydown", escClose);
    if (state.activeView === "saved") renderSavedView(); else renderExplore();
  }
  function escClose(event) { if (event.key === "Escape") { closeDetail(); document.removeEventListener("keydown", escClose); } }
  function pulseMeter(spot) {
    var value = freshness(spot);
    return '<div class="pulse-meter" style="--freshness:' + value + ';--signal:' + signalColor(signalFor(spot)) + '" aria-label="' + value + '% signal confidence"><div class="pulse-meter-content"><span class="pulse-number">' + value + '%</span><span class="pulse-label">fresh</span></div></div>';
  }
  function metric(label, value, color) {
    return '<div class="metric-row"><span>' + label + '</span><span class="metric-track"><span class="metric-fill" style="width:' + (value * 20) + '%;background:' + color + '"></span></span><strong class="metric-value">' + value.toFixed(1) + '</strong></div>';
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
      return '<button class="choice" type="button" data-choice="' + key + '" aria-pressed="' + (key === formState.newSpot.category) + '">' + CATEGORIES[key].icon + ' ' + CATEGORIES[key].label + '</button>';
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
    document.getElementById("report-heading").textContent = mode === "new" ? "Add a new spot" : "Review a spot";
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
    container.innerHTML = [1, 2, 3, 4, 5].map(function (value) {
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
    var note = document.getElementById("report-note").value.trim();
    var button = document.getElementById("submit-review");
    var payload = { spot_id: spot.id, vibe: formState.vibe, noise: formState.noise, outlets: formState.outlets, comfort: formState.comfort, note: note };
    var rating = formState.rating;

    if (!supabase) { showToast("Supabase isn't configured yet — see supabase-config.js"); return; }
    button.disabled = true;

    supabase.from("checkins").insert(payload).select().single()
      .then(function (result) {
        if (result.error) throw result.error;
        return supabase.from("spots").update({ rating: rating }).eq("id", spot.id).then(function (updateResult) {
          if (updateResult.error) throw updateResult.error;
          return result.data;
        });
      })
      .then(function (row) {
        spot.updates.push(checkinFromRow(row));
        spot.rating = rating;
        resetReviewForm();
        renderExplore();
        renderFeed();
        showToast("Your review is live on RoamRIT");
        switchView("explore");
      })
      .catch(function (err) {
        console.error(err);
        showToast("Couldn't post that review — try again");
        button.disabled = false;
      });
  });
  document.getElementById("add-spot-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var n = formState.newSpot;
    var name = document.getElementById("new-spot-name").value.trim();
    if (!name || !n.sector || n.x === null || n.y === null) { updateAddSpotSubmitState(); return; }
    if (!supabase) { showToast("Supabase isn't configured yet — see supabase-config.js"); return; }

    var button = document.getElementById("submit-add-spot");
    button.disabled = true;
    var payload = {
      id: slugify(name), name: name, category: n.category, sector: n.sector, x: n.x, y: n.y,
      distance_min: Math.max(1, Math.round(3 + Math.random() * 10)),
      description: document.getElementById("new-spot-description").value.trim()
    };

    supabase.from("spots").insert(payload).select().single()
      .then(function (result) {
        if (result.error) throw result.error;
        var newSpot = spotFromRow(result.data, []);
        spots.push(newSpot);
        resetAddSpotForm();
        renderReportSpot();
        renderSectorList();
        renderFilters();
        renderExplore();
        renderFeed();
        showToast("\u201c" + name + "\u201d was added to RoamRIT");
        switchView("explore");
        openDetail(newSpot.id);
      })
      .catch(function (err) {
        console.error(err);
        showToast("Couldn't add that spot — try again");
        button.disabled = false;
      });
  });

  function showToast(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  function renderShell() {
    renderFilters();
    renderReportSpot();
    renderSectorList();
    renderCategoryChoices();
    renderMiniMap();
    setReportMode("update");
    renderFormChoices();
    updateReviewSubmitState();
    renderExplore();
    renderFeed();
  }

  /* ----- auth slot in the topbar ----- */
  function renderAuthSlot() {
    var slot = document.getElementById("auth-slot");
    if (!slot) return;
    if (session && session.user) {
      var name = currentDisplayName();
      slot.innerHTML =
        '<div class="user-pill"><span class="avatar-circle">' + escapeHTML(initials(name)) + '</span>' +
        '<span class="user-pill-name">' + escapeHTML(name) + '</span>' +
        '<button class="user-pill-logout" type="button" id="logout-btn" aria-label="Log out" title="Log out">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H4.8A1.8 1.8 0 0 0 3 4.8v10.4A1.8 1.8 0 0 0 4.8 17H8M13 14l4-4-4-4M17 10H7"/></svg></button></div>';
      document.getElementById("logout-btn").addEventListener("click", function () {
        if (!supabase) return;
        supabase.auth.signOut().then(function () { window.location.href = "login.html"; });
      });
    } else {
      slot.innerHTML = '<a class="auth-login-btn" href="login.html" id="login-nav-btn">Log in</a>';
    }
  }
  var communityLoginBtn = document.getElementById("community-login-btn");
  if (communityLoginBtn) communityLoginBtn.addEventListener("click", function () { window.location.href = "login.html"; });

  /* ----- community board ----- */
  function postFromRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      body: row.body,
      timestamp: new Date(row.created_at).getTime(),
      authorName: (row.profiles && row.profiles.display_name) || "Student"
    };
  }
  function loadPosts() {
    if (!supabase) return;
    supabase.from("posts").select("*, profiles(display_name)").order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;
        posts = (result.data || []).map(postFromRow);
        renderCommunity();
      })
      .catch(function (err) { console.error(err); showToast("Couldn't load the community board"); });
  }
  function renderCommunity() {
    var composer = document.getElementById("composer-card");
    var gate = document.getElementById("community-login-gate");
    if (!composer || !gate) return;
    var loggedIn = !!currentUserId();
    composer.hidden = !loggedIn;
    gate.hidden = loggedIn;
    if (loggedIn) document.getElementById("composer-avatar").textContent = initials(currentDisplayName());
    var listEl = document.getElementById("post-list");
    var emptyEl = document.getElementById("post-empty");
    emptyEl.hidden = posts.length !== 0;
    listEl.innerHTML = posts.map(function (post) {
      var mine = post.userId === currentUserId();
      return '<article class="post-item"><div class="post-head"><span class="avatar-circle">' + escapeHTML(initials(post.authorName)) + '</span>' +
        '<span class="post-author">' + escapeHTML(post.authorName) + '</span>' +
        '<span class="post-time">' + relativeTime(post.timestamp) + '</span>' +
        (mine ? '<button class="post-delete" type="button" data-delete-post="' + post.id + '" aria-label="Delete post"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h12M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6m-7 0 .6 9.4A2 2 0 0 0 7.6 17h4.8a2 2 0 0 0 2-1.6L15 6"/></svg></button>' : "") +
        '</div><p class="post-body">' + escapeHTML(post.body) + '</p></article>';
    }).join("");
    listEl.querySelectorAll("[data-delete-post]").forEach(function (button) {
      button.addEventListener("click", function () { deletePost(button.dataset.deletePost); });
    });
  }
  function deletePost(id) {
    if (!supabase) return;
    supabase.from("posts").delete().eq("id", id)
      .then(function (result) {
        if (result.error) throw result.error;
        posts = posts.filter(function (post) { return post.id !== id; });
        renderCommunity();
        showToast("Post removed");
      })
      .catch(function (err) { console.error(err); showToast("Couldn't delete that post"); });
  }
  var postBodyEl = document.getElementById("post-body");
  if (postBodyEl) {
    postBodyEl.addEventListener("input", function () {
      document.getElementById("post-count").textContent = postBodyEl.value.length + "/500";
      document.getElementById("submit-post").disabled = !postBodyEl.value.trim();
    });
  }
  var postForm = document.getElementById("post-form");
  if (postForm) {
    postForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var body = postBodyEl.value.trim();
      var uid = currentUserId();
      if (!body) return;
      if (!supabase || !uid) { showToast("Log in to post"); return; }
      var button = document.getElementById("submit-post");
      button.disabled = true;
      supabase.from("posts").insert({ user_id: uid, body: body }).select("*, profiles(display_name)").single()
        .then(function (result) {
          if (result.error) throw result.error;
          posts.unshift(postFromRow(result.data));
          postBodyEl.value = "";
          document.getElementById("post-count").textContent = "0/500";
          renderCommunity();
          showToast("Posted to the community board");
        })
        .catch(function (err) {
          console.error(err);
          showToast("Couldn't post that — try again");
          button.disabled = !postBodyEl.value.trim();
        });
    });
  }

  /* ----- session bootstrap: this page requires a logged-in user ----- */
  function revealApp() {
    var loader = document.getElementById("boot-loader");
    var shell = document.getElementById("app-shell");
    if (loader) loader.hidden = true;
    if (shell) shell.hidden = false;
  }
  function goToLogin() {
    window.location.replace("login.html");
  }
  var appRevealed = false;
  if (supabase) {
    supabase.auth.getSession().then(function (result) {
      session = (result.data && result.data.session) || null;
      if (!session) { goToLogin(); return; }
      appRevealed = true;
      renderAuthSlot();
      revealApp();
    }).catch(function () {
      /* Couldn't reach Supabase to check the session — send to login rather
         than silently showing an app that can't load any data. */
      goToLogin();
    });
    supabase.auth.onAuthStateChange(function (event, newSession) {
      session = newSession;
      if (!session) {
        if (appRevealed) goToLogin();
        return;
      }
      renderAuthSlot();
      if (state.activeView === "community") renderCommunity();
    });
  } else {
    /* Supabase isn't configured at all — reveal the app anyway so the
       existing "Supabase isn't configured" messaging from loadData() shows,
       instead of silently redirecting in a loop. */
    renderAuthSlot();
    revealApp();
  }

  function loadData() {
    if (!supabase) {
      document.getElementById("result-count").textContent = "Supabase isn't configured — edit supabase-config.js";
      renderShell();
      return;
    }
    Promise.all([
      supabase.from("spots").select("*").order("created_at", { ascending: true }),
      supabase.from("checkins").select("*").order("created_at", { ascending: true })
    ]).then(function (results) {
      var spotsResult = results[0], checkinsResult = results[1];
      if (spotsResult.error) throw spotsResult.error;
      if (checkinsResult.error) throw checkinsResult.error;
      var checkinsBySpot = {};
      (checkinsResult.data || []).forEach(function (row) {
        (checkinsBySpot[row.spot_id] = checkinsBySpot[row.spot_id] || []).push(row);
      });
      spots.length = 0;
      (spotsResult.data || []).forEach(function (row) {
        spots.push(spotFromRow(row, checkinsBySpot[row.id]));
      });
      if (spots.length && !spots.some(function (spot) { return spot.id === formState.spot; })) {
        formState.spot = spots[0].id;
      }
      renderShell();
    }).catch(function (err) {
      console.error(err);
      showToast("Couldn't load RoamRIT data from Supabase");
      renderShell();
    });
  }

  loadData();
})();
