/* RoamRIT — Explore tab: filtering/search, place cards, list/map toggle,
   Saved tab, the live "pulse" stat strip, and the recent-activity feed. */
(function (App) {
  "use strict";

  App.matchingSpots = function () {
    return App.spots.filter(function (spot) {
      if (App.state.filter !== "all" && spot.category !== App.state.filter) return false;
      if (App.state.mapSector) {
        var building = App.buildingAt(spot.x, spot.y);
        if (!building || building.id !== App.state.mapSector) return false;
      }
      if (!App.state.search) return true;
      var recent = App.latest(spot);
      var haystack = (spot.name + " " + spot.description + " " + spot.sector + " " + App.CATEGORIES[spot.category].label + " " + (recent ? recent.vibe : "")).toLowerCase();
      return haystack.indexOf(App.state.search) !== -1;
    });
  };
  App.savedSpots = function () {
    return App.spots.filter(function (spot) { return !!App.state.saved[spot.id]; });
  };

  App.renderSectorList = function () {
    var sectors = App.CAMPUS_BUILDINGS.map(function (b) { return b.full; });
    App.spots.forEach(function (spot) { if (sectors.indexOf(spot.sector) === -1) sectors.push(spot.sector); });
    var list = document.getElementById("sector-list");
    if (list) list.innerHTML = sectors.map(function (sector) { return '<option value="' + App.escapeHTML(sector) + '"></option>'; }).join("");
  };

  App.renderFilters = function () {
    var bar = document.getElementById("filter-bar");
    bar.innerHTML = App.FILTERS.map(function (filter) {
      return '<button class="filter-chip" type="button" data-filter="' + filter.key + '" aria-pressed="' + (App.state.filter === filter.key) + '"><span class="chip-icon">' + filter.icon + '</span>' + filter.label + "</button>";
    }).join("");
    bar.querySelectorAll("[data-filter]").forEach(function (button) {
      button.addEventListener("click", function () { App.state.filter = button.dataset.filter; App.renderFilters(); App.renderExplore(); });
    });
  };

  /* ----- place card (shared by Explore + Saved) ----- */
  function placeCardHTML(spot) {
    var recent = App.latest(spot);
    var cat = App.CATEGORIES[spot.category];
    var isSaved = !!App.state.saved[spot.id];
    var ratingHTML = typeof spot.rating === "number"
      ? '<span class="place-rating">★ ' + spot.rating.toFixed(1) + '</span>'
      : '<span class="place-rating is-new">New</span>';
    var noteText = recent && recent.note ? recent.note : spot.description;
    return '<div class="place-card ' + (App.state.selected === spot.id ? "selected" : "") + '" data-spot="' + spot.id + '" role="button" tabindex="0" aria-label="Open ' + App.escapeHTML(spot.name) + '">' +
      '<div class="place-cover" style="--cat:' + cat.color + '">' +
        '<span class="place-icon" aria-hidden="true">' + cat.icon + '</span>' +
        '<button class="save-btn" type="button" data-save="' + spot.id + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "Remove from saved" : "Save") + ' ' + App.escapeHTML(spot.name) + '">' + heartSVG(isSaved) + '</button>' +
      '</div>' +
      '<div class="place-body">' +
        '<div class="place-top"><h3 class="place-name">' + App.escapeHTML(spot.name) + '</h3>' + ratingHTML + '</div>' +
        '<p class="place-meta">' + App.escapeHTML(cat.label) + ' · ' + App.escapeHTML(spot.sector) + ' · ' + spot.distanceMin + ' min walk</p>' +
        (noteText ? '<p class="place-note">' + App.escapeHTML(noteText) + '</p>' : "") +
      '</div>' +
    '</div>';
  }
  function heartSVG(filled) {
    return '<svg viewBox="0 0 20 20" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.6"><path d="M10 17.3s-6.6-4-8.4-8.1C.5 6.4 2 3.4 5 3c1.9-.3 3.6.6 5 2.4C11.4 3.6 13.1 2.7 15 3c3 .4 4.5 3.4 3.4 6.2C16.6 13.3 10 17.3 10 17.3Z"/></svg>';
  }
  App.wireCardEvents = function (container) {
    container.querySelectorAll("[data-spot]").forEach(function (card) {
      card.addEventListener("click", function () { App.openDetail(card.dataset.spot); });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); App.openDetail(card.dataset.spot); }
      });
    });
    container.querySelectorAll("[data-save]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        App.toggleSaved(button.dataset.save);
      });
    });
  };
  App.toggleSaved = function (id) {
    var spot = App.spots.find(function (item) { return item.id === id; });
    if (!spot) return;
    if (App.state.saved[id]) { delete App.state.saved[id]; App.showToast("Removed from saved"); }
    else { App.state.saved[id] = true; App.showToast("Saved " + spot.name); }
    App.persistSaved();
    if (App.state.activeView === "saved") App.renderSavedView(); else App.renderList(App.matchingSpots());
  };

  App.renderList = function (items) {
    var listEl = document.getElementById("spot-list");
    var emptyEl = document.getElementById("empty-state");
    var resultLine = document.getElementById("result-count");
    resultLine.textContent = items.length + (items.length === 1 ? " place near you" : " places near you");
    emptyEl.hidden = items.length !== 0 || App.state.viewMode === "map";
    listEl.innerHTML = items.map(placeCardHTML).join("");
    App.wireCardEvents(listEl);
  };
  App.renderExplore = function () {
    var items = App.matchingSpots();
    App.renderList(items);
    App.renderMap(items);
    App.applyViewMode();
  };
  App.renderSavedView = function () {
    var items = App.savedSpots();
    var listEl = document.getElementById("saved-list");
    var emptyEl = document.getElementById("saved-empty");
    emptyEl.hidden = items.length !== 0;
    listEl.innerHTML = items.map(placeCardHTML).join("");
    App.wireCardEvents(listEl);
  };

  App.applyViewMode = function () {
    var isMap = App.state.viewMode === "map";
    document.getElementById("map-section").hidden = !isMap;
    document.getElementById("spot-list").style.display = isMap ? "none" : "grid";
    document.getElementById("result-count").style.display = isMap ? "none" : "block";
    var emptyEl = document.getElementById("empty-state");
    emptyEl.hidden = isMap || App.matchingSpots().length !== 0;
    document.querySelectorAll("#view-toggle .toggle-btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.view === App.state.viewMode ? "true" : "false");
    });
  };
  document.querySelectorAll("#view-toggle .toggle-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      App.state.viewMode = button.dataset.view;
      App.applyViewMode();
    });
  });

  App.renderFeed = function () {
    var all = [];
    App.spots.forEach(function (spot) { spot.updates.forEach(function (item) { all.push({ spot: spot, item: item }); }); });
    all.sort(function (a, b) { return b.item.timestamp - a.item.timestamp; });
    document.getElementById("feed-list").innerHTML = all.map(function (entry) {
      var cat = App.CATEGORIES[entry.spot.category];
      return '<article class="feed-item" style="--signal:' + cat.color + '"><span class="feed-marker"></span><div><div class="feed-top"><span class="feed-vibe">' + App.escapeHTML(entry.item.vibe) + '</span><span class="feed-spot">' + App.escapeHTML(entry.spot.name) + '</span></div>' + (entry.item.note ? '<p class="feed-note">' + App.escapeHTML(entry.item.note) + '</p>' : "") + '</div><time class="feed-time">' + App.relativeTime(entry.item.timestamp) + '</time></article>';
    }).join("");
  };

})(window.App = window.App || {});
