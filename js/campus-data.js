/* RoamRIT — campus building layout (used by both the big Explore map and the
   mini pin-picker in Add Spot). x/y/w/h are pixel-measured against
   assets/campus-map.jpg (876x552) as percentages, so the invisible hit-boxes
   line up with the illustrated buildings. Re-measure if the image changes. */
(function (App) {
  "use strict";

  App.CAMPUS_BUILDINGS = [
    { id: "esb", short: "ESB", full: "Engineering Sciences Block", color: "#ff8500", x: 15.64, y: 4.35, w: 37.79, h: 17.03 },
    { id: "apex", short: "Apex", full: "Apex Block", color: "#e75b00", x: 56.16, y: 4.89, w: 24.32, h: 17.39 },
    { id: "des", short: "DES", full: "Division of Electrical Sciences", color: "#8261ff", x: 59.82, y: 24.28, w: 22.95, h: 22.10 },
    { id: "architecture", short: "Arch", full: "Architecture Block", color: "#df169d", x: 6.39, y: 21.92, w: 16.10, h: 23.55 },
    { id: "workshop", short: "Workshop", full: "Workshop Block", color: "#2ba74a", x: 3.88, y: 48.19, w: 20.43, h: 23.91 },
    { id: "lhc", short: "LHC", full: "Lecture Complex", color: "#eb5400", x: 62.56, y: 47.64, w: 26.37, h: 37.32 },
    { id: "msb", short: "MSB", full: "Multipurpose Block", color: "#00abf7", x: 37.33, y: 61.78, w: 28.08, h: 25.36 }
  ];

  App.buildingAt = function (x, y) {
    var found = null;
    App.CAMPUS_BUILDINGS.forEach(function (b) {
      if (!found && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) found = b;
    });
    return found;
  };

  App.buildingById = function (id) {
    var found = null;
    App.CAMPUS_BUILDINGS.forEach(function (b) { if (b.id === id) found = b; });
    return found;
  };

  App.campusMarkup = function (mini) {
    var path = '<svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="70" y1="26" x2="33" y2="68"/></svg>';
    var buildings = App.CAMPUS_BUILDINGS.map(function (b) {
      var tag = mini ? "span" : "button";
      var attrs = mini ? "" : ' type="button" data-building="' + b.id + '" aria-pressed="false"';
      var style = "left:" + b.x + "%; top:" + b.y + "%; width:" + b.w + "%; height:" + b.h + "%; --bc:" + b.color;
      return "<" + tag + " class=\"map-building" + (mini ? " mini" : "") + "\"" + attrs +
        ' style="' + style + '" title="' + App.escapeHTML(b.full) + '" aria-label="' + App.escapeHTML(b.full) + '">' +
        (mini ? "" : '<span class="building-name">' + App.escapeHTML(b.short) + "</span>") +
        "</" + tag + ">";
    }).join("");
    return path + buildings;
  };

})(window.App = window.App || {});
