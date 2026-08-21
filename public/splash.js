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
