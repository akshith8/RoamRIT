/* RoamRIT — tab switching, the topbar search/action buttons, toasts, and
   the one-time "render everything" call used on first load. */
(function (App) {
  "use strict";

  App.switchView = function (view) {
    App.state.activeView = view;
    document.querySelectorAll(".view").forEach(function (element) { element.hidden = element.id !== "view-" + view; });
    document.querySelectorAll("[data-nav]").forEach(function (button) {
      if (button.classList.contains("nav-link")) button.setAttribute("aria-selected", button.dataset.nav === view ? "true" : "false");
    });
    if (view === "feed") App.renderFeed();
    if (view === "saved") App.renderSavedView();
    if (view === "community") { App.renderCommunity(); App.loadPosts(); }
    if (view === "leaderboard") App.loadLeaderboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.querySelectorAll("[data-nav]").forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      App.switchView(button.dataset.nav);
    });
  });
  document.getElementById("search-input").addEventListener("input", function (event) {
    App.state.search = event.target.value.trim().toLowerCase();
    App.renderExplore();
  });
  document.getElementById("refresh-btn").addEventListener("click", function () {
    App.renderExplore();
    App.showToast("Map refreshed");
  });
  document.getElementById("location-btn").addEventListener("click", function () { App.showToast("North campus is your current area"); });
  document.getElementById("feed-link").addEventListener("click", function () { App.switchView("feed"); });
  document.getElementById("nav-search-btn").addEventListener("click", function () {
    App.switchView("explore");
    var input = document.getElementById("search-input");
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.getElementById("nav-add-btn").addEventListener("click", function () {
    App.switchView("report");
    App.openContributionMode("new");
  });
  document.getElementById("nav-review-btn").addEventListener("click", function () {
    App.switchView("report");
    App.openContributionMode("update");
  });

  App.showToast = function (message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(App.showToast.timer);
    App.showToast.timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  };

  App.renderShell = function () {
    App.renderFilters();
    App.renderReportSpot();
    App.renderPostSpotOptions();
    App.renderSectorList();
    App.renderCategoryChoices();
    App.renderMiniMap();
    App.setReportMode("update");
    App.renderFormChoices();
    App.updateReviewSubmitState();
    App.renderExplore();
    App.renderFeed();
  };

})(window.App = window.App || {});
