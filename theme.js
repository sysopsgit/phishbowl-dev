(function () {
  var STORAGE_KEY = "phishaware-theme";

  function getTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) {}
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  applyTheme(getTheme());

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute("data-theme") || "light";
    var next = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
    applyTheme(next);
  };
})();
