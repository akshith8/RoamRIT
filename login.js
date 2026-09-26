(function () {
  "use strict";

  var supabase = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  var authMode = "login";

  function goToApp() {
    window.location.replace("index.html");
  }
  function revealShell() {
    var loader = document.getElementById("boot-loader");
    var shell = document.getElementById("auth-shell");
    if (loader) loader.hidden = true;
    if (shell) shell.hidden = false;
  }
  function showFatal(message) {
    var el = document.getElementById("auth-fatal");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll("#auth-mode-toggle .mode-btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.authMode === mode ? "true" : "false");
    });
    document.getElementById("auth-name-field").hidden = mode !== "signup";
    document.getElementById("auth-name").required = mode === "signup";
    document.getElementById("auth-form-title").textContent = mode === "signup" ? "Create your account" : "Log in";
    document.getElementById("auth-form-kicker").textContent = mode === "signup" ? "Join with your campus email." : "Welcome back.";
    document.getElementById("auth-submit").textContent = mode === "signup" ? "Sign up" : "Log in";
    document.getElementById("auth-password").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
    hideError();
  }
  document.querySelectorAll("#auth-mode-toggle .mode-btn").forEach(function (button) {
    button.addEventListener("click", function () { setAuthMode(button.dataset.authMode); });
  });

  function showError(message) {
    var el = document.getElementById("auth-error");
    el.textContent = message;
    el.hidden = false;
  }
  function hideError() {
    var el = document.getElementById("auth-error");
    el.hidden = true;
    el.textContent = "";
  }

  var authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", function (event) {
      event.preventDefault();
      hideError();
      if (!supabase) { showError("Supabase isn't configured yet — see supabase-config.js"); return; }

      var email = document.getElementById("auth-email").value.trim();
      var password = document.getElementById("auth-password").value;
      var button = document.getElementById("auth-submit");
      button.disabled = true;

      if (authMode === "signup") {
        var name = document.getElementById("auth-name").value.trim();
        if (!name) { showError("Please enter a display name."); button.disabled = false; return; }
        supabase.auth.signUp({ email: email, password: password, options: { data: { display_name: name } } })
          .then(function (result) {
            if (result.error) throw result.error;
            if (result.data && result.data.session) {
              goToApp();
            } else {
              showError("Check your inbox to confirm your email, then log in.");
              setAuthMode("login");
              button.disabled = false;
            }
          })
          .catch(function (err) { showError(err.message || "Couldn't create that account"); button.disabled = false; });
      } else {
        supabase.auth.signInWithPassword({ email: email, password: password })
          .then(function (result) {
            if (result.error) throw result.error;
            goToApp();
          })
          .catch(function (err) { showError(err.message || "Couldn't log you in"); button.disabled = false; });
      }
    });
  }

  /* If a session already exists (remembered from a previous visit), skip
     straight to the app instead of showing the login form. */
  if (!supabase) {
    showFatal("Supabase isn't configured yet — edit supabase-config.js with your project URL and anon key.");
    revealShell();
  } else {
    supabase.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;
      if (session) { goToApp(); return; }
      revealShell();
    }).catch(function () {
      revealShell();
    });
  }
})();
