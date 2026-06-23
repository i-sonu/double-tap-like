/*
 * heart.js — heart-burst animation overlay.
 *
 * Default variant: a red heart at the cursor position.
 * Instagram variant: a large white heart popped in the CENTER of the media,
 *   matching Instagram's native double-tap-to-like animation.
 *
 * Styling lives in src/styles/heart.css (injected via the content script's css).
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 ' +
    '3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 ' +
    '11.54L12 21.35z"></path></svg>';

  function showHeart(x, y, opts) {
    opts = opts || {};
    if (typeof document === 'undefined' || !document.body) return null;

    const el = document.createElement('div');
    el.className = 'dcl-heart-burst';
    if (opts.variant === 'instagram') el.classList.add('dcl-heart-burst--instagram');
    if (opts.alreadyLiked) el.classList.add('dcl-heart-burst--muted');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = HEART_SVG;

    // Default to the cursor; if a center element is given, pop over its middle.
    let px = Number(x) || 0;
    let py = Number(y) || 0;
    if (opts.center && typeof opts.center.getBoundingClientRect === 'function') {
      const r = opts.center.getBoundingClientRect();
      if (r.width || r.height) {
        px = r.left + r.width / 2;
        py = r.top + r.height / 2;
      }
    }
    el.style.left = px + 'px';
    el.style.top = py + 'px';

    document.body.appendChild(el);

    const cleanup = () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    el.addEventListener('animationend', cleanup, { once: true });
    // Fallback in case animationend never fires (e.g. reduced-motion / detached).
    setTimeout(cleanup, 1200);

    return el;
  }

  DCL.heart = { showHeart };
})();
