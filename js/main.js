/* RoamRIT — entry point. Loaded last, after every other module, so it can
   safely wire the two maps and kick off the initial Supabase data fetch. */
(function (App) {
  "use strict";

  App.loadData = function () {
    if (!App.supabase) {
      document.getElementById("result-count").textContent = "Supabase isn't configured — edit js/supabase-config.js";
      App.renderShell();
      return;
    }
    Promise.all([
      App.supabase.from("spots").select("*").order("created_at", { ascending: true }),
      App.supabase.from("checkins").select("*").order("created_at", { ascending: true })
    ]).then(function (results) {
      var spotsResult = results[0], checkinsResult = results[1];
      if (spotsResult.error) throw spotsResult.error;
      if (checkinsResult.error) throw checkinsResult.error;
      var checkinsBySpot = {};
      (checkinsResult.data || []).forEach(function (row) {
        (checkinsBySpot[row.spot_id] = checkinsBySpot[row.spot_id] || []).push(row);
      });
      App.spots.length = 0;
      (spotsResult.data || []).forEach(function (row) {
        App.spots.push(App.spotFromRow(row, checkinsBySpot[row.id]));
      });
      if (App.spots.length && !App.spots.some(function (spot) { return spot.id === App.formState.spot; })) {
        App.formState.spot = App.spots[0].id;
      }
      App.renderShell();
    }).catch(function (err) {
      console.error(err);
      App.showToast("Couldn't load RoamRIT data from Supabase");
      App.renderShell();
    });
  };

  App.initExploreMap();
  App.initMiniMapPicker();
  App.loadData();

})(window.App = window.App || {});
