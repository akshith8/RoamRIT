/* RoamRIT — Supabase client + row -> app-object mappers.
   Depends on: config.js (none directly, but kept in the same load order). */
(function (App) {
  "use strict";

  App.supabase = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  App.checkinFromRow = function (row) {
    return {
      id: row.id,
      timestamp: new Date(row.created_at).getTime(),
      vibe: row.vibe,
      noise: row.noise,
      outlets: row.outlets,
      comfort: row.comfort,
      note: row.note || ""
    };
  };

  App.spotFromRow = function (row, checkinRows) {
    return {
      id: row.id, name: row.name, category: row.category, sector: row.sector,
      x: Number(row.x), y: Number(row.y), distanceMin: row.distance_min,
      rating: row.rating === null ? null : Number(row.rating),
      description: row.description || "",
      updates: (checkinRows || []).map(App.checkinFromRow)
    };
  };

  App.postFromRow = function (row) {
    return {
      id: row.id,
      userId: row.user_id,
      body: row.body,
      timestamp: new Date(row.created_at).getTime(),
      authorName: (row.profiles && row.profiles.display_name) || "Student",
      authorPoints: (row.profiles && row.profiles.points) || 0,
      spotId: row.spot_id,
      spotName: (row.spots && row.spots.name) || null
    };
  };

})(window.App = window.App || {});
