// Pre-first-paint theme and font size restoration from saath_pref cookie
(function () {
  try {
    var match = document.cookie.match(/(?:^|; )saath_pref=([^;]*)/);
    if (match && match[1]) {
      var val = decodeURIComponent(match[1]);
      var parts = val.split("&");
      for (var i = 0; i < parts.length; i++) {
        var pair = parts[i].split("=");
        if (pair[0] === "theme" && pair[1]) {
          document.documentElement.setAttribute("data-theme", pair[1]);
        }
        if (pair[0] === "textSize" && pair[1]) {
          document.documentElement.setAttribute("data-text-size", pair[1]);
        }
      }
    }
  } catch (e) {
    // Fail safe
  }
})();
