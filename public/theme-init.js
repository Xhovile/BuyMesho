(function initializeBuyMeshoTheme() {
  var storageKey = "buymesho:theme-preference";
  var root = document.documentElement;
  var preference = "system";

  try {
    var storedPreference = window.localStorage.getItem(storageKey);
    if (
      storedPreference === "system" ||
      storedPreference === "light" ||
      storedPreference === "dark"
    ) {
      preference = storedPreference;
    }
  } catch {
    // Fall back to the device preference when browser storage is unavailable.
  }

  var systemTheme =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  var resolvedTheme = preference === "system" ? systemTheme : preference;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;

  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = resolvedTheme === "dark" ? "#0B0F16" : "#FAFAFA";
  }
})();
