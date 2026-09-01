"use client";

/**
 * Small external stores for the two pieces of browser-only state on the public
 * site. Using an external store instead of an effect keeps the server render and
 * the first client render consistent, and avoids a cascading re-render on mount.
 */

type Listener = () => void;

function createStorageStore(key: string, fallback: string) {
  const listeners = new Set<Listener>();

  const read = () => {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      // Private windows and blocked site data both throw here.
      return fallback;
    }
  };

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => fallback,
    write(value: string) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Preference is best effort; the page still works without persistence.
      }
      for (const listener of listeners) listener();
    },
  };
}

export const themeStore = createStorageStore("xmhua-theme", "system");
export const consentStore = createStorageStore("xmhua-analytics-consent", "undecided");

export function applyTheme(value: string) {
  const resolved = value === "dark" || value === "light"
    ? value
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

/**
 * Runs before first paint so a stored dark preference does not flash light.
 * Inlined into the document head by the root layout.
 */
export const themeBootstrapScript = `
(function(){try{
  var stored = localStorage.getItem("xmhua-theme");
  var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}catch(e){}})();
`.trim();
