/* RoamRIT — mutable app state shared across every view, plus the small
   helpers that read/derive from it. Other files read/write these through
   the App.* properties directly (e.g. App.state.filter = "food"). */
(function (App) {
  "use strict";

  /* spots/checkins start empty and are filled in by App.loadData() once Supabase responds */
  App.spots = [];
  App.state = {
    filter: "all", search: "", selected: null, activeView: "explore",
    viewMode: "list", saved: loadSavedFromStorage(), mapSector: null
  };

  /* ----- auth + community board state ----- */
  App.session = null;
  App.posts = [];
  App.myProfile = { points: 0 };
  App.communityPostSpot = null;

  App.currentUserId = function () {
    return App.session && App.session.user ? App.session.user.id : null;
  };

  App.currentDisplayName = function () {
    if (!App.session || !App.session.user) return "";
    var meta = App.session.user.user_metadata || {};
    return meta.display_name || (App.session.user.email ? App.session.user.email.split("@")[0] : "You");
  };

  App.initials = function (name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var chars = parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    return chars || "?";
  };

  App.pointsBadgeHTML = function (points) {
    return '<span class="points-badge">\u2726 ' + (points || 0) + '</span>';
  };

  App.bumpMyPoints = function (amount) {
    App.myProfile.points = (App.myProfile.points || 0) + amount;
    App.renderAuthSlot();
    if (App.state.activeView === "community") App.renderCommunity();
    if (App.state.activeView === "leaderboard") App.loadLeaderboard();
  };

  App.loadMyProfile = function () {
    var uid = App.currentUserId();
    if (!App.supabase || !uid) return;
    App.supabase.from("profiles").select("points").eq("id", uid).single()
      .then(function (result) {
        if (result.error) throw result.error;
        App.myProfile.points = (result.data && result.data.points) || 0;
        App.renderAuthSlot();
        if (App.state.activeView === "community") App.renderCommunity();
      })
      .catch(function (err) { console.error(err); });
  };

  App.slugify = function (name) {
    var base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "spot";
    var id = base, n = 2;
    while (App.spots.some(function (spot) { return spot.id === id; })) { id = base + "-" + n; n++; }
    return id;
  };

  App.formState = {
    mode: "update",
    spot: null,
    vibe: null, rating: null, noise: 3, outlets: 3, comfort: 3,
    newSpot: { name: "", category: "study", sector: "", x: null, y: null, sectorTouched: false }
  };

  /* ----- saved spots persist per-browser in localStorage (not shared via Supabase) ----- */
  function loadSavedFromStorage() {
    try {
      var raw = window.localStorage.getItem("roamrit-saved");
      return raw ? JSON.parse(raw) : {};
    } catch (err) { return {}; }
  }
  App.persistSaved = function () {
    try { window.localStorage.setItem("roamrit-saved", JSON.stringify(App.state.saved)); } catch (err) { /* storage unavailable, ignore */ }
  };

  App.latest = function (spot) {
    if (!spot.updates.length) return null;
    return spot.updates.reduce(function (newest, item) { return item.timestamp > newest.timestamp ? item : newest; }, spot.updates[0]);
  };
  App.average = function (spot, key) {
    return spot.updates.reduce(function (sum, item) { return sum + item[key]; }, 0) / Math.max(spot.updates.length, 1);
  };

})(window.App = window.App || {});
