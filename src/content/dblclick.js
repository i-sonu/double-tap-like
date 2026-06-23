/*
 * dblclick.js — double-click detection + native-conflict handling (plan §6).
 *
 * We do NOT use the native `dblclick` event. On X, clicking an inline image is a
 * link navigation that opens the photo lightbox on the FIRST click, so the two
 * clicks land on different elements and the browser never fires `dblclick`.
 *
 * Instead we observe `click` events in capture phase and detect a double-click
 * ourselves via timing + cursor proximity. We act on the like button resolved
 * from the FIRST click (which stays in the DOM even after a modal opens over it),
 * so images and videos are handled the same way.
 *
 * We never preventDefault/stopPropagation — native behavior (play/pause, opening
 * the photo viewer) proceeds untouched, same philosophy as the MVP.
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  const DOUBLE_MS = 350; // max gap between the two clicks of a double-click
  const MOVE_TOL = 24; // max cursor movement (px) between the two clicks
  const DEBOUNCE_MS = 600; // one gesture => at most one like on the same surface

  function createHandler(deps) {
    deps = deps || {};
    const now = deps.now || (() => Date.now());
    const log = deps.log || function () {};

    // State from the first click of a potential double-click.
    let first = null; // { t, x, y, adapter, surface, likeButton }
    // Debounce guard.
    let lastLikeSurface = null;
    let lastLikeTime = 0;

    function resolve(event) {
      const adapter = deps.detectAdapter();
      if (!adapter) return null;
      if (!deps.isPlatformEnabled(adapter.name)) return null;
      if (adapter.isInteractiveTarget(event.target)) return null;
      const surface = adapter.resolveSurface(event.target);
      if (!surface) return null;
      return { adapter, surface };
    }

    function fireLike(adapter, surface, likeButton, x, y) {
      if (!likeButton) {
        log('no like button found on', adapter.name);
        return;
      }
      // Debounce repeat double-clicks on the same surface.
      const t = now();
      if (surface === lastLikeSurface && t - lastLikeTime < DEBOUNCE_MS) return;
      lastLikeSurface = surface;
      lastLikeTime = t;

      const heartOpts = adapter.heartOptions ? adapter.heartOptions(surface) || {} : {};

      // Already liked => no-op (never un-like). Optionally still show the heart.
      if (adapter.isLiked(likeButton)) {
        if (deps.showHeart) deps.showHeart(x, y, { ...heartOpts, alreadyLiked: true });
        return;
      }
      const issued = adapter.like(likeButton);
      if (issued && deps.showHeart) deps.showHeart(x, y, heartOpts);
    }

    return function handleClick(event) {
      if (event.button !== 0) return;

      const t = now();
      const x = event.clientX;
      const y = event.clientY;

      // Is this the second click of a double-click? Decided by the FIRST click's
      // resolution, so the second click's target (e.g. a modal that just opened)
      // doesn't matter.
      if (
        first &&
        t - first.t <= DOUBLE_MS &&
        Math.abs(x - first.x) <= MOVE_TOL &&
        Math.abs(y - first.y) <= MOVE_TOL
      ) {
        fireLike(first.adapter, first.surface, first.likeButton, x, y);
        first = null; // reset so a triple-click doesn't fire twice
        return;
      }

      // Otherwise treat as a potential first click. Resolve + stash.
      const r = resolve(event);
      if (!r) {
        first = null;
        return;
      }
      first = {
        t,
        x,
        y,
        adapter: r.adapter,
        surface: r.surface,
        likeButton: r.adapter.findLikeButton(r.surface),
      };
    };
  }

  DCL.dblclick = { createHandler, DOUBLE_MS, MOVE_TOL, DEBOUNCE_MS };
})();
