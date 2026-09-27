/* RoamRIT — Community board (posts tied to a spot) + the points Leaderboard. */
(function (App) {
  "use strict";

  /* ----- leaderboard ----- */
  App.loadLeaderboard = function () {
    var listEl = document.getElementById("leaderboard-list");
    var emptyEl = document.getElementById("leaderboard-empty");
    if (!listEl) return;
    if (!App.supabase) { emptyEl.hidden = false; listEl.innerHTML = ""; return; }
    App.supabase.from("profiles").select("id, display_name, points").order("points", { ascending: false }).limit(20)
      .then(function (result) {
        if (result.error) throw result.error;
        renderLeaderboard(result.data || []);
      })
      .catch(function (err) { console.error(err); App.showToast("Couldn't load the leaderboard"); });
  };
  function renderLeaderboard(rows) {
    var listEl = document.getElementById("leaderboard-list");
    var emptyEl = document.getElementById("leaderboard-empty");
    if (!listEl) return;
    emptyEl.hidden = rows.length !== 0;
    var uid = App.currentUserId();
    listEl.innerHTML = rows.map(function (row, index) {
      var mine = row.id === uid;
      return '<div class="leaderboard-item' + (mine ? " is-me" : "") + '">' +
        '<span class="leaderboard-rank">' + (index + 1) + '</span>' +
        '<span class="avatar-circle">' + App.escapeHTML(App.initials(row.display_name)) + '</span>' +
        '<span class="leaderboard-name">' + App.escapeHTML(row.display_name || "Student") + (mine ? ' <em>(you)</em>' : "") + '</span>' +
        App.pointsBadgeHTML(row.points) +
      '</div>';
    }).join("");
  }

  /* ----- community board ----- */
  App.loadPosts = function () {
    if (!App.supabase) return;
    App.supabase.from("posts").select("*, profiles(display_name, points), spots(name)").order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;
        App.posts = (result.data || []).map(App.postFromRow);
        App.renderCommunity();
      })
      .catch(function (err) { console.error(err); App.showToast("Couldn't load the community board"); });
  };
  App.renderCommunity = function () {
    var composer = document.getElementById("composer-card");
    var gate = document.getElementById("community-login-gate");
    if (!composer || !gate) return;
    var loggedIn = !!App.currentUserId();
    composer.hidden = !loggedIn;
    gate.hidden = loggedIn;
    if (loggedIn) {
      document.getElementById("composer-avatar").textContent = App.initials(App.currentDisplayName());
      App.renderPostSpotOptions();
      updatePostSubmitState();
    }
    var listEl = document.getElementById("post-list");
    var emptyEl = document.getElementById("post-empty");
    emptyEl.hidden = App.posts.length !== 0;
    listEl.innerHTML = App.posts.map(function (post) {
      var mine = post.userId === App.currentUserId();
      return '<article class="post-item"><div class="post-head"><span class="avatar-circle">' + App.escapeHTML(App.initials(post.authorName)) + '</span>' +
        '<span class="post-author">' + App.escapeHTML(post.authorName) + '</span>' +
        App.pointsBadgeHTML(post.authorPoints) +
        '<span class="post-time">' + App.relativeTime(post.timestamp) + '</span>' +
        (mine ? '<button class="post-delete" type="button" data-delete-post="' + post.id + '" aria-label="Delete post"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h12M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6m-7 0 .6 9.4A2 2 0 0 0 7.6 17h4.8a2 2 0 0 0 2-1.6L15 6"/></svg></button>' : "") +
        '</div>' +
        (post.spotId ? '<button class="post-spot-tag" type="button" data-open-spot="' + post.spotId + '">\uD83D\uDCCD ' + App.escapeHTML(post.spotName || "View spot") + '</button>' : "") +
        '<p class="post-body">' + App.escapeHTML(post.body) + '</p></article>';
    }).join("");
    listEl.querySelectorAll("[data-delete-post]").forEach(function (button) {
      button.addEventListener("click", function () { deletePost(button.dataset.deletePost); });
    });
    listEl.querySelectorAll("[data-open-spot]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.dataset.openSpot;
        if (!App.spots.some(function (spot) { return spot.id === id; })) { App.showToast("That spot isn't around anymore"); return; }
        App.switchView("explore");
        App.openDetail(id);
      });
    });
  };
  function deletePost(id) {
    if (!App.supabase) return;
    App.supabase.from("posts").delete().eq("id", id)
      .then(function (result) {
        if (result.error) throw result.error;
        App.posts = App.posts.filter(function (post) { return post.id !== id; });
        App.renderCommunity();
        App.showToast("Post removed");
      })
      .catch(function (err) { console.error(err); App.showToast("Couldn't delete that post"); });
  }
  var postBodyEl = document.getElementById("post-body");
  function updatePostSubmitState() {
    var button = document.getElementById("submit-post");
    if (!button || !postBodyEl) return;
    button.disabled = !(postBodyEl.value.trim() && App.communityPostSpot);
  }
  if (postBodyEl) {
    postBodyEl.addEventListener("input", function () {
      document.getElementById("post-count").textContent = postBodyEl.value.length + "/500";
      updatePostSubmitState();
    });
  }
  var postSpotEl = document.getElementById("post-spot");
  if (postSpotEl) {
    postSpotEl.addEventListener("change", function () {
      App.communityPostSpot = postSpotEl.value || null;
      updatePostSubmitState();
    });
  }
  var postForm = document.getElementById("post-form");
  if (postForm) {
    postForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var body = postBodyEl.value.trim();
      var uid = App.currentUserId();
      if (!App.communityPostSpot) { App.showToast("Choose a spot before posting"); return; }
      if (!body) return;
      if (!App.supabase || !uid) { App.showToast("Log in to post"); return; }
      var button = document.getElementById("submit-post");
      button.disabled = true;
      App.supabase.from("posts").insert({ user_id: uid, body: body, spot_id: App.communityPostSpot }).select("*, profiles(display_name, points), spots(name)").single()
        .then(function (result) {
          if (result.error) throw result.error;
          App.posts.unshift(App.postFromRow(result.data));
          postBodyEl.value = "";
          document.getElementById("post-count").textContent = "0/500";
          App.communityPostSpot = null;
          App.renderCommunity();
          App.bumpMyPoints(5);
          App.showToast("Posted to the community board \u00b7 +5 points");
        })
        .catch(function (err) {
          console.error(err);
          App.showToast("Couldn't post that — try again");
          updatePostSubmitState();
        });
    });
  }
  var communityLoginBtn = document.getElementById("community-login-btn");
  if (communityLoginBtn) communityLoginBtn.addEventListener("click", function () { window.location.href = "login.html"; });

})(window.App = window.App || {});
