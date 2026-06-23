/*
 * detect.js — pick the correct adapter for the current page.
 * Instances are cached while they still match (hostname doesn't change mid-tab).
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  let cached = null;

  function detectAdapter() {
    if (cached && cached.matches()) return cached;
    cached = null;
    const adapters = DCL.adapters || {};
    for (const key of Object.keys(adapters)) {
      const Adapter = adapters[key];
      try {
        const instance = new Adapter();
        if (instance.matches()) {
          cached = instance;
          return instance;
        }
      } catch (e) {
        console.warn('[DCL] adapter failed to instantiate:', key, e);
      }
    }
    return null;
  }

  DCL.detect = { detectAdapter, _reset: () => { cached = null; } };
})();
