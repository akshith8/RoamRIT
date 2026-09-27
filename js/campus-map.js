/* RoamRIT — the big illustrated campus map on the Explore tab: building
   tap-zones, the sector filter pill, pinch/scroll zoom + drag-to-pan, and
   the live spot markers layer. (The small pin-picker used in Add Spot lives
   in contribute-form.js instead.) */
(function (App) {
  "use strict";

  /* the building blocks + path are static — drawn once — so re-rendering the
     map on every search keystroke only has to touch the markers layer. */
  App.initExploreMap = function () {
    var viewport = document.getElementById("map-viewport");
    if (!viewport) return;
    viewport.insertAdjacentHTML("afterbegin", App.campusMarkup(false));
    viewport.insertAdjacentHTML("beforeend", '<div class="map-markers" id="map-markers"></div>');
    viewport.querySelectorAll("[data-building]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleMapSector(button.dataset.building);
      });
    });
  };

  function toggleMapSector(id) {
    App.state.mapSector = App.state.mapSector === id ? null : id;
    document.querySelectorAll("#map-viewport [data-building]").forEach(function (button) {
      var active = button.dataset.building === App.state.mapSector;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("dimmed", !!App.state.mapSector && !active);
    });
    var hint = document.getElementById("map-hint");
    if (hint) hint.hidden = !!App.state.mapSector;
    updateSectorPill();
    App.renderExplore();
  }

  function updateSectorPill() {
    var pill = document.getElementById("sector-clear-btn");
    if (!pill) return;
    if (!App.state.mapSector) { pill.hidden = true; return; }
    var building = App.buildingById(App.state.mapSector);
    pill.hidden = false;
    pill.innerHTML = '<span class="sector-pill-dot" style="--bc:' + (building ? building.color : "#d6ff3f") + '"></span>' +
      App.escapeHTML(building ? building.full : "Building") + ' <span class="sector-pill-x">\u2715</span>';
  }
  var sectorClearBtn = document.getElementById("sector-clear-btn");
  if (sectorClearBtn) sectorClearBtn.addEventListener("click", function () { toggleMapSector(App.state.mapSector); });

  /* pinch/scroll zoom + drag-to-pan on the big map, once zoomed in */
  var mapZoom = { scale: 1, x: 0, y: 0 };
  var mapDrag = null;
  function applyMapTransform() {
    var viewport = document.getElementById("map-viewport");
    var canvas = document.getElementById("map-canvas");
    if (!viewport) return;
    viewport.style.transform = "translate(" + mapZoom.x + "px, " + mapZoom.y + "px) scale(" + mapZoom.scale + ")";
    if (canvas) canvas.classList.toggle("is-zoomed", mapZoom.scale > 1);
  }
  function setMapZoom(scale) {
    mapZoom.scale = Math.max(1, Math.min(2.5, scale));
    if (mapZoom.scale === 1) { mapZoom.x = 0; mapZoom.y = 0; }
    applyMapTransform();
  }
  var mapCanvasEl = document.getElementById("map-canvas");
  var zoomInBtn = document.getElementById("map-zoom-in");
  var zoomOutBtn = document.getElementById("map-zoom-out");
  var zoomResetBtn = document.getElementById("map-zoom-reset");
  if (zoomInBtn) zoomInBtn.addEventListener("click", function () { setMapZoom(mapZoom.scale + 0.35); });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { setMapZoom(mapZoom.scale - 0.35); });
  if (zoomResetBtn) zoomResetBtn.addEventListener("click", function () { setMapZoom(1); });
  if (mapCanvasEl) {
    mapCanvasEl.addEventListener("wheel", function (event) {
      if (App.state.viewMode !== "map") return;
      event.preventDefault();
      setMapZoom(mapZoom.scale + (event.deltaY < 0 ? 0.2 : -0.2));
    }, { passive: false });
    mapCanvasEl.addEventListener("pointerdown", function (event) {
      if (mapZoom.scale <= 1) return;
      if (event.target.closest(".map-building, .map-node, .map-zoom-controls")) return;
      mapDrag = { startX: event.clientX, startY: event.clientY, origX: mapZoom.x, origY: mapZoom.y, id: event.pointerId };
      mapCanvasEl.setPointerCapture(event.pointerId);
    });
    mapCanvasEl.addEventListener("pointermove", function (event) {
      if (!mapDrag || event.pointerId !== mapDrag.id) return;
      mapZoom.x = mapDrag.origX + (event.clientX - mapDrag.startX);
      mapZoom.y = mapDrag.origY + (event.clientY - mapDrag.startY);
      applyMapTransform();
    });
    ["pointerup", "pointercancel"].forEach(function (type) {
      mapCanvasEl.addEventListener(type, function (event) {
        if (mapDrag && event.pointerId === mapDrag.id) mapDrag = null;
      });
    });
  }

  App.renderMap = function (items) {
    var layer = document.getElementById("map-markers");
    if (!layer) return;
    layer.innerHTML = "";
    items.forEach(function (spot) {
      var cat = App.CATEGORIES[spot.category];
      var node = document.createElement("button");
      node.type = "button";
      node.className = "map-node " + (App.state.selected === spot.id ? "selected" : "");
      node.style.left = spot.x + "%";
      node.style.top = spot.y + "%";
      node.style.setProperty("--node", cat.color);
      node.setAttribute("aria-label", spot.name);
      node.innerHTML = '<span class="node-glyph">' + cat.icon + '</span><span class="node-name">' + App.escapeHTML(spot.name.split(" · ")[0]) + "</span>";
      node.addEventListener("click", function (event) { event.stopPropagation(); App.openDetail(spot.id); });
      layer.appendChild(node);
    });
    var scopeLabel = App.state.mapSector ? " in " + ((App.buildingById(App.state.mapSector) || {}).full || "this building") : "";
    document.getElementById("map-summary").textContent = items.length + (items.length === 1 ? " spot" : " spots") + " shown" + scopeLabel;
  };

})(window.App = window.App || {});
