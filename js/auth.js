/* RoamRIT — the auth pill in the topbar, and the session check that gates
   the whole app (redirects to login.html if there's no session). */
(function (App) {
  "use strict";

  App.renderAuthSlot = function () {
    var slot = document.getElementById("auth-slot");
    if (!slot) return;
    if (App.session && App.session.user) {
      var name = App.currentDisplayName();
      slot.innerHTML =
        '<div class="user-pill"><span class="avatar-circle">' + App.escapeHTML(App.initials(name)) + '</span>' +
        '<span class="user-pill-name">' + App.escapeHTML(name) + '</span>' +
        App.pointsBadgeHTML(App.myProfile.points) +
        '<button class="user-pill-logout" type="button" id="logout-btn" aria-label="Log out" title="Log out">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H4.8A1.8 1.8 0 0 0 3 4.8v10.4A1.8 1.8 0 0 0 4.8 17H8M13 14l4-4-4-4M17 10H7"/></svg></button></div>';
      document.getElementById("logout-btn").addEventListener("click", function () {
        if (!App.supabase) return;
        App.supabase.auth.signOut().then(function () { window.location.href = "login.html"; });
      });
    } else {
      slot.innerHTML = '<a class="auth-login-btn" href="login.html" id="login-nav-btn">Log in</a>';
    }
  };

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
  if (App.supabase) {
    App.supabase.auth.getSession().then(function (result) {
      App.session = (result.data && result.data.session) || null;
      if (!App.session) { goToLogin(); return; }
      appRevealed = true;
      App.renderAuthSlot();
      App.loadMyProfile();
      revealApp();
    }).catch(function () {
      /* Couldn't reach Supabase to check the session — send to login rather
         than silently showing an app that can't load any data. */
      goToLogin();
    });
    App.supabase.auth.onAuthStateChange(function (event, newSession) {
      App.session = newSession;
      if (!App.session) {
        if (appRevealed) goToLogin();
        return;
      }
      App.renderAuthSlot();
      App.loadMyProfile();
      if (App.state.activeView === "community") App.renderCommunity();
    });
  } else {
    /* Supabase isn't configured at all — reveal the app anyway so the
       existing "Supabase isn't configured" messaging from loadData() shows,
       instead of silently redirecting in a loop. */
    App.renderAuthSlot();
    revealApp();
  }

})(window.App = window.App || {});
