/* RoamRIT — the slide-in detail drawer for a single spot. */
(function (App) {
  "use strict";

  App.closeDetail = function () {
    var root = document.getElementById("drawer-root");
    root.innerHTML = "";
    App.state.selected = null;
    document.removeEventListener("keydown", escClose);
    if (App.state.activeView === "saved") App.renderSavedView(); else App.renderExplore();
  };

  App.openDetail = function (id) {
    var spot = App.spots.find(function (item) { return item.id === id; });
    if (!spot) return;
    App.state.selected = id;
    var cat = App.CATEGORIES[spot.category];
    var color = cat.color;
    var isSaved = !!App.state.saved[id];
    var root = document.getElementById("drawer-root");
    var updates = spot.updates.slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
    root.innerHTML = '<div class="backdrop" id="backdrop"><aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">' +
      '<div class="drawer-cover" style="--cat:' + cat.color + '"><span class="place-icon" aria-hidden="true">' + cat.icon + '</span>' +
        '<button class="save-btn" type="button" data-save="' + id + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "Remove from saved" : "Save") + '">' + heartSVG(isSaved) + '</button>' +
        '<button class="close-btn" type="button" id="close-drawer" aria-label="Close details">×</button>' +
      '</div>' +
      '<div class="drawer-top"><h2 id="drawer-title">' + App.escapeHTML(spot.name) + '</h2><p class="drawer-category">' + App.escapeHTML(cat.label) + ' · ' + App.escapeHTML(spot.sector) + ' · ' + spot.distanceMin + ' min walk</p></div>' +
      '<div class="drawer-body">' +
      '<p class="drawer-desc">' + App.escapeHTML(spot.description) + '</p>' +
      '<div class="metric-list">' + metric("Noise", App.average(spot, "noise"), color) + metric("Outlets", App.average(spot, "outlets"), color) + metric("Comfort", App.average(spot, "comfort"), color) + '</div>' +
      '<p class="drawer-section-label">Reviews (' + updates.length + ')</p><div class="checkin-list">' + updates.map(function (item) { return '<div class="checkin"><div class="checkin-head"><strong>' + App.escapeHTML(item.vibe) + '</strong><span>' + App.relativeTime(item.timestamp) + '</span></div>' + (item.note ? '<p>' + App.escapeHTML(item.note) + '</p>' : '<p>No note left.</p>') + '</div>'; }).join("") + (updates.length ? "" : '<p style="color:var(--muted);font-size:12.5px;">Be the first to review this spot.</p>') + '</div>' +
      '<button class="btn-solid drawer-report" type="button" id="drawer-report">Review this spot</button></div></aside></div>';
    document.getElementById("close-drawer").addEventListener("click", App.closeDetail);
    document.getElementById("backdrop").addEventListener("click", function (event) { if (event.target.id === "backdrop") App.closeDetail(); });
    document.getElementById("drawer-report").addEventListener("click", function () { App.closeDetail(); App.openContributionMode("update", spot.id); App.switchView("report"); });
    root.querySelectorAll("[data-save]").forEach(function (button) {
      button.addEventListener("click", function () { App.toggleSaved(id); App.openDetail(id); });
    });
    document.addEventListener("keydown", escClose);
    if (App.state.activeView === "saved") App.renderSavedView(); else App.renderExplore();
  };

  function heartSVG(filled) {
    return '<svg viewBox="0 0 20 20" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.6"><path d="M10 17.3s-6.6-4-8.4-8.1C.5 6.4 2 3.4 5 3c1.9-.3 3.6.6 5 2.4C11.4 3.6 13.1 2.7 15 3c3 .4 4.5 3.4 3.4 6.2C16.6 13.3 10 17.3 10 17.3Z"/></svg>';
  }
  function escClose(event) { if (event.key === "Escape") { App.closeDetail(); document.removeEventListener("keydown", escClose); } }
  function metric(label, value, color) {
    return '<div class="metric-row"><span>' + label + '</span><span class="metric-track"><span class="metric-fill" style="width:' + (value * 20) + '%;background:' + color + '"></span></span><strong class="metric-value">' + value.toFixed(1) + '</strong></div>';
  }

})(window.App = window.App || {});
