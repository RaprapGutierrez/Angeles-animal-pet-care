/*
 *  Google Fonts preload → stylesheet swap
 *  ─────────────────────────────────────────────────────────────────
 *  index.html preloads the Google Fonts stylesheet (rel="preload")
 *  for performance, then needs to flip it to rel="stylesheet" once
 *  it's fetched so the browser actually applies it. This used to be
 *  done via an inline onload="" attribute, but that's blocked by the
 *  CSP script-src policy (no 'unsafe-inline'). Doing it here instead,
 *  from an external script, satisfies script-src 'self' and applies
 *  the font correctly.
 */
(function () {
  const fontLink = document.getElementById("google-font-preload");
  if (!fontLink) return;
  fontLink.addEventListener("load", function () {
    fontLink.onload = null;
    fontLink.rel = "stylesheet";
  });
  // Edge case: if the stylesheet was already cached and loaded before
  // this listener attached, sheet will be non-null already.
  if (fontLink.sheet) {
    fontLink.rel = "stylesheet";
  }
})();

/*
 *  Splash dismissal
 *  ─────────────────────────────────────────────────────────────────
 *  React calls window.__dismissSplash() from main.jsx after mount.
 *  The splash slides up and out while the Information System
 *  underneath fades + rises into view, so the transition reads as
 *  one continuous motion rather than a hard cut.
 *
 *  MIN_SPLASH_MS guarantees the splash is always visible for at
 *  least this long — on a fast refresh (cached assets, warm
 *  connection) React can mount in well under 100ms, which would
 *  otherwise cut the splash off before its entrance animation even
 *  finishes. We track the actual start time and, if dismissal is
 *  requested early, simply delay the reveal by the remainder so it
 *  always feels like a deliberate, smooth transition.
 *
 *  Fallback: force-remove after 6s in case React fails to load.
 */
const SPLASH_START = performance.now();
const MIN_SPLASH_MS = 1400;

function revealApp() {
  const splash = document.getElementById("splash");
  const root = document.getElementById("root");
  if (root) root.classList.add("app-revealed");
  if (splash) {
    splash.classList.add("splash-hide");
    setTimeout(() => splash.remove(), 700);
  }
}

window.__splashFallback = setTimeout(revealApp, 6000);

window.__dismissSplash = function () {
  clearTimeout(window.__splashFallback);
  const elapsed = performance.now() - SPLASH_START;
  const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
  setTimeout(revealApp, remaining);
};
