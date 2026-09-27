/* RoamRIT — the "Add Spot" / "Review Spot" report view: mode toggle, choice
   pickers, the mini pin-picker map, form validation, and the two Supabase
   writes (insert checkin / insert spot) that award points via DB triggers. */
(function (App) {
  "use strict";

  /* insert the tiny illustrated map used to place a new spot */
  App.initMiniMapPicker = function () {
    var miniMap = document.getElementById("mini-map");
    if (!miniMap) return;
    miniMap.insertAdjacentHTML("afterbegin", App.campusMarkup(true));
    miniMap.insertAdjacentHTML("beforeend", '<div class="mini-map-dots" id="mini-map-dots"></div>');
  };

  function makeChoices(containerId, values, selected, onChange) {
    var container = document.getElementById(containerId);
    container.innerHTML = values.map(function (value) { return '<button class="choice" type="button" data-choice="' + value + '" aria-pressed="' + (value === selected ? "true" : "false") + '">' + value + '</button>'; }).join("");
    container.querySelectorAll("[data-choice]").forEach(function (button) {
      button.addEventListener("click", function () { onChange(Number(button.dataset.choice) || button.dataset.choice); makeChoices(containerId, values, Number(button.dataset.choice) || button.dataset.choice, onChange); });
    });
  }
  App.renderReportSpot = function () {
    document.getElementById("report-spot").innerHTML = App.spots.map(function (spot) { return '<option value="' + spot.id + '">' + App.escapeHTML(spot.name) + '</option>'; }).join("");
    document.getElementById("report-spot").value = App.formState.spot;
  };
  App.renderPostSpotOptions = function () {
    var select = document.getElementById("post-spot");
    if (!select) return;
    var options = '<option value="" disabled' + (App.communityPostSpot ? "" : " selected") + '>Choose a spot...</option>' +
      App.spots.map(function (spot) { return '<option value="' + spot.id + '">' + App.escapeHTML(spot.name) + '</option>'; }).join("");
    select.innerHTML = options;
    select.value = App.communityPostSpot || "";
  };
  function updateFormStateLabel(id, value) { document.getElementById(id).textContent = value; }
  App.renderCategoryChoices = function () {
    var container = document.getElementById("category-choices");
    container.innerHTML = Object.keys(App.CATEGORIES).map(function (key) {
      return '<button class="choice" type="button" data-choice="' + key + '" aria-pressed="' + (key === App.formState.newSpot.category) + '">' + App.CATEGORIES[key].icon + ' ' + App.CATEGORIES[key].label + '</button>';
    }).join("");
    container.querySelectorAll("[data-choice]").forEach(function (button) {
      button.addEventListener("click", function () {
        App.formState.newSpot.category = button.dataset.choice;
        App.renderCategoryChoices();
        renderMiniMap();
      });
    });
  };
  function renderMiniMap() {
    var layer = document.getElementById("mini-map-dots");
    if (!layer) return;
    layer.innerHTML = "";
    var hint = document.getElementById("mini-map-hint");
    App.spots.forEach(function (spot) {
      var dot = document.createElement("span");
      dot.className = "mini-map-dot";
      dot.style.left = spot.x + "%";
      dot.style.top = spot.y + "%";
      dot.style.background = App.CATEGORIES[spot.category].color;
      layer.appendChild(dot);
    });
    if (App.formState.newSpot.x !== null && App.formState.newSpot.y !== null) {
      if (hint) hint.hidden = true;
      var marker = document.createElement("span");
      marker.className = "mini-map-marker";
      marker.style.left = App.formState.newSpot.x + "%";
      marker.style.top = App.formState.newSpot.y + "%";
      marker.style.background = App.CATEGORIES[App.formState.newSpot.category].color;
      layer.appendChild(marker);
    } else if (hint) {
      hint.hidden = false;
    }
  }
  App.renderMiniMap = renderMiniMap;
  function placeOnMiniMap(event) {
    var map = document.getElementById("mini-map");
    var rect = map.getBoundingClientRect();
    var clientX = event.touches ? event.touches[0].clientX : event.clientX;
    var clientY = event.touches ? event.touches[0].clientY : event.clientY;
    var x = Math.round(Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)));
    var y = Math.round(Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100)));
    App.formState.newSpot.x = x;
    App.formState.newSpot.y = y;
    if (!App.formState.newSpot.sectorTouched) {
      var building = App.buildingAt(x, y);
      var autoSector = building ? building.full : "Courtyard";
      App.formState.newSpot.sector = autoSector;
      var sectorInput = document.getElementById("new-spot-sector");
      if (sectorInput) sectorInput.value = autoSector;
    }
    renderMiniMap();
    updateAddSpotSubmitState();
  }
  var miniMapEl = document.getElementById("mini-map");
  if (miniMapEl) {
    miniMapEl.addEventListener("click", placeOnMiniMap);
    miniMapEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        App.formState.newSpot.x = App.formState.newSpot.x === null ? 50 : App.formState.newSpot.x;
        App.formState.newSpot.y = App.formState.newSpot.y === null ? 50 : App.formState.newSpot.y;
        renderMiniMap();
        updateAddSpotSubmitState();
      }
    });
  }

  function setReportMode(mode) {
    App.formState.mode = mode;
    document.querySelectorAll("#mode-toggle .mode-btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.mode === mode ? "true" : "false");
    });
    document.getElementById("review-form").hidden = mode !== "update";
    document.getElementById("add-spot-form").hidden = mode !== "new";
    document.getElementById("report-heading").textContent = mode === "new" ? "Add a new spot" : "Review a spot";
    if (mode === "new") {
      App.renderCategoryChoices();
      renderMiniMap();
      updateAddSpotSubmitState();
    } else {
      App.renderReportSpot();
      updateReviewSubmitState();
    }
  }
  App.setReportMode = setReportMode;
  App.openContributionMode = function (mode, spotId) {
    if (spotId) App.formState.spot = spotId;
    setReportMode(mode);
  };
  document.querySelectorAll("#mode-toggle .mode-btn").forEach(function (button) {
    button.addEventListener("click", function () { setReportMode(button.dataset.mode); });
  });
  App.renderFormChoices = function () {
    makeChoices("vibe-choices", App.VIBES, App.formState.vibe, function (value) { App.formState.vibe = value; updateReviewSubmitState(); });
    makeChoices("noise-choices", [1, 2, 3, 4, 5], App.formState.noise, function (value) { App.formState.noise = value; updateFormStateLabel("noise-value", value); updateReviewSubmitState(); });
    makeChoices("outlet-choices", [1, 2, 3, 4, 5], App.formState.outlets, function (value) { App.formState.outlets = value; updateFormStateLabel("outlet-value", value); updateReviewSubmitState(); });
    makeChoices("comfort-choices", [1, 2, 3, 4, 5], App.formState.comfort, function (value) { App.formState.comfort = value; updateFormStateLabel("comfort-value", value); updateReviewSubmitState(); });
    renderRatingChoices();
  };
  function renderRatingChoices() {
    var container = document.getElementById("rating-choices");
    if (!container) return;
    container.innerHTML = [1, 2, 3, 4, 5].map(function (value) {
      return '<button class="star-choice" type="button" data-rating="' + value + '" aria-label="' + value + ' out of 5" aria-pressed="' + (value === App.formState.rating) + '">' + (value <= (App.formState.rating || 0) ? "★" : "☆") + '</button>';
    }).join("");
    container.querySelectorAll("[data-rating]").forEach(function (button) {
      button.addEventListener("click", function () {
        App.formState.rating = Number(button.dataset.rating);
        renderRatingChoices();
        updateReviewSubmitState();
      });
    });
  }
  function updateReviewSubmitState() {
    var button = document.getElementById("submit-review");
    if (button) button.disabled = !(App.formState.spot && App.formState.vibe && App.formState.rating);
  }
  App.updateReviewSubmitState = updateReviewSubmitState;
  function updateAddSpotSubmitState() {
    var button = document.getElementById("submit-add-spot");
    if (!button) return;
    var n = App.formState.newSpot;
    var name = document.getElementById("new-spot-name").value.trim();
    button.disabled = !(name && n.sector && n.x !== null && n.y !== null);
  }
  document.getElementById("report-spot").addEventListener("change", function (event) { App.formState.spot = event.target.value; updateReviewSubmitState(); });
  document.getElementById("new-spot-name").addEventListener("input", function (event) { App.formState.newSpot.name = event.target.value; updateAddSpotSubmitState(); });
  document.getElementById("new-spot-sector").addEventListener("input", function (event) {
    App.formState.newSpot.sector = event.target.value.trim();
    App.formState.newSpot.sectorTouched = true;
    updateAddSpotSubmitState();
  });
  function resetReviewForm() {
    App.formState.vibe = null;
    App.formState.rating = null;
    App.formState.noise = App.formState.outlets = App.formState.comfort = 3;
    document.getElementById("report-note").value = "";
    App.renderFormChoices();
    updateFormStateLabel("noise-value", 3); updateFormStateLabel("outlet-value", 3); updateFormStateLabel("comfort-value", 3);
  }
  function resetAddSpotForm() {
    document.getElementById("new-spot-name").value = "";
    document.getElementById("new-spot-description").value = "";
    document.getElementById("new-spot-sector").value = "";
    App.formState.newSpot = { name: "", category: "study", sector: "", x: null, y: null, sectorTouched: false };
    App.renderCategoryChoices();
    renderMiniMap();
    updateAddSpotSubmitState();
  }

  document.getElementById("review-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!App.formState.spot || !App.formState.vibe || !App.formState.rating) return;
    var spot = App.spots.find(function (item) { return item.id === App.formState.spot; });
    if (!spot) return;
    var note = document.getElementById("report-note").value.trim();
    var button = document.getElementById("submit-review");
    var payload = { spot_id: spot.id, vibe: App.formState.vibe, noise: App.formState.noise, outlets: App.formState.outlets, comfort: App.formState.comfort, note: note, user_id: App.currentUserId() };
    var rating = App.formState.rating;

    if (!App.supabase) { App.showToast("Supabase isn't configured yet — see js/supabase-config.js"); return; }
    button.disabled = true;

    App.supabase.from("checkins").insert(payload).select().single()
      .then(function (result) {
        if (result.error) throw result.error;
        return App.supabase.from("spots").update({ rating: rating }).eq("id", spot.id).then(function (updateResult) {
          if (updateResult.error) throw updateResult.error;
          return result.data;
        });
      })
      .then(function (row) {
        spot.updates.push(App.checkinFromRow(row));
        spot.rating = rating;
        resetReviewForm();
        App.renderExplore();
        App.renderFeed();
        App.bumpMyPoints(10);
        App.showToast("Your review is live on RoamRIT \u00b7 +10 points");
        App.switchView("explore");
      })
      .catch(function (err) {
        console.error(err);
        App.showToast("Couldn't post that review — try again");
        button.disabled = false;
      });
  });

  document.getElementById("add-spot-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var n = App.formState.newSpot;
    var name = document.getElementById("new-spot-name").value.trim();
    if (!name || !n.sector || n.x === null || n.y === null) { updateAddSpotSubmitState(); return; }
    if (!App.supabase) { App.showToast("Supabase isn't configured yet — see js/supabase-config.js"); return; }

    var button = document.getElementById("submit-add-spot");
    button.disabled = true;
    var payload = {
      id: App.slugify(name), name: name, category: n.category, sector: n.sector, x: n.x, y: n.y,
      distance_min: Math.max(1, Math.round(3 + Math.random() * 10)),
      description: document.getElementById("new-spot-description").value.trim(),
      user_id: App.currentUserId()
    };

    App.supabase.from("spots").insert(payload).select().single()
      .then(function (result) {
        if (result.error) throw result.error;
        var newSpot = App.spotFromRow(result.data, []);
        App.spots.push(newSpot);
        resetAddSpotForm();
        App.renderReportSpot();
        App.renderPostSpotOptions();
        App.renderSectorList();
        App.renderFilters();
        App.renderExplore();
        App.renderFeed();
        App.bumpMyPoints(20);
        App.showToast("\u201c" + name + "\u201d was added to RoamRIT \u00b7 +20 points");
        App.switchView("explore");
        App.openDetail(newSpot.id);
      })
      .catch(function (err) {
        console.error(err);
        App.showToast("Couldn't add that spot — try again");
        button.disabled = false;
      });
  });

})(window.App = window.App || {});
