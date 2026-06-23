/*
 * main.js — entry point. Registers ONE delegated capture-phase click listener on
 * document; the handler detects double-clicks itself (see dblclick.js for why we
 * don't use the native dblclick event). This survives SPA navigation/scroll (no
 * per-element binding).
 */
(function () {
  'use strict';

  const DCL = globalThis.DCL || {};

  if (!DCL.config || !DCL.detect || !DCL.dblclick) {
    console.warn('[DCL] core modules not loaded — extension inactive on this page');
    return;
  }

  // Load enabled-state into cache and subscribe to changes (toggle w/o reload).
  DCL.config.initCache();

  const handler = DCL.dblclick.createHandler({
    detectAdapter: () => DCL.detect.detectAdapter(),
    isPlatformEnabled: (name) => DCL.config.isPlatformEnabled(name),
    showHeart: (x, y, opts) => (DCL.heart ? DCL.heart.showHeart(x, y, opts) : undefined),
    log: (...args) => console.debug('[DCL]', ...args),
  });

  document.addEventListener('click', handler, true /* capture */);
  console.debug('[DCL] double-click-to-like active');
})();
