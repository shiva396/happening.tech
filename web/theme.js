// Apply the saved palette before the first paint on each static page.
(() => {
  const root = document.documentElement;
  const storageKey = "happening.theme";
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let preference;
  let button;
  let transition;

  function readPreference() {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  }

  function applyTheme() {
    const dark = preference === "dark" || (preference !== "light" && systemDark.matches);
    root.dataset.theme = dark ? "dark" : "light";
    if (button) {
      const action = dark ? "Switch to light mode" : "Switch to dark mode";
      button.setAttribute("aria-label", action);
      button.title = action;
    }
  }

  preference = readPreference();
  applyTheme();
  systemDark.addEventListener("change", applyTheme);
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) {
      preference = readPreference();
      applyTheme();
    }
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      preference = readPreference();
      applyTheme();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    button = document.getElementById("theme-switch");
    applyTheme();
    button.addEventListener("click", () => {
      if (transition) return;
      preference = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, preference); } catch { /* Use the choice for this page. */ }
      if (!document.startViewTransition || reducedMotion.matches) {
        applyTheme();
        return;
      }

      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty("--iris-x", x + "px");
      root.style.setProperty("--iris-y", y + "px");
      root.style.setProperty("--iris-radius", Math.ceil(radius) + "px");
      root.classList.add("theme-iris");
      transition = document.startViewTransition(applyTheme);
      transition.finished.finally(() => {
        root.classList.remove("theme-iris");
        transition = null;
      });
    });
  });
})();
