/* RoamRIT — shared namespace + static config/data + tiny helpers.
   Every other file attaches to `window.App`, so load this file first. */
(function (App) {
  "use strict";

  App.ICONS = {
    study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5c2.2-1 5.3-1 7.6 0v13.4c-2.3-1-5.4-1-7.6 0Z"/><path d="M19.6 5.5c-2.2-1-5.3-1-7.6 0v13.4c2.3-1 5.4-1 7.6 0Z"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6.5a2.5 2.5 0 0 0 5 0V3"/><path d="M8.5 3v18"/><path d="M17 3c-1.7 0-3 2-3 5.5S15.3 13 17 13v8"/></svg>',
    chill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c0-6.5 1.5-11 7-15-3.5 0-9 1-9 8"/><path d="M12 21c0-5-1.2-8.6-5-11.5-1.8 3 0 8.5 5 11.5Z"/></svg>',
    hangout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M5.8 5.8l2.3 2.3M15.9 15.9l2.3 2.3M5.8 18.2l2.3-2.3M15.9 8.1l2.3-2.3"/></svg>',
    all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/></svg>'
  };

  App.CATEGORIES = {
    study: { label: "Study", color: "#5b7cff", icon: App.ICONS.study },
    food: { label: "Food", color: "#ff9a3c", icon: App.ICONS.food },
    chill: { label: "Chill", color: "#8ef23c", icon: App.ICONS.chill },
    hangout: { label: "Hangout", color: "#ff3c8e", icon: App.ICONS.hangout }
  };

  App.FILTERS = [
    { key: "all", label: "All", icon: App.ICONS.all },
    { key: "food", label: "Food", icon: App.CATEGORIES.food.icon },
    { key: "study", label: "Study", icon: App.CATEGORIES.study.icon },
    { key: "chill", label: "Chill", icon: App.CATEGORIES.chill.icon },
    { key: "hangout", label: "Hangout", icon: App.CATEGORIES.hangout.icon }
  ];

  App.VIBES = ["Chill", "Focused", "Buzzing", "Packed", "Sleepy"];

  App.now = function () { return Date.now(); };

  App.escapeHTML = function (value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
    });
  };

  App.minutesAgo = function (timestamp) { return Math.max(0, Math.round((App.now() - timestamp) / 60000)); };

  App.relativeTime = function (timestamp) {
    var minutes = App.minutesAgo(timestamp);
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + "m ago";
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + "h ago";
    return Math.round(hours / 24) + "d ago";
  };

})(window.App = window.App || {});
