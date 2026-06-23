/*
 * config.js — shared storage keys, defaults, and the enabled-state helpers.
 *
 * Loaded both as a classic content script (attaches to globalThis.DCL) AND
 * by the popup (<script src="../config.js">). No ES module syntax so it runs
 * as a plain script in every context, and unit tests import it for side effects.
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  const STORAGE_KEY = 'enabled';
  const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'twitter'];
  const DEFAULTS = Object.freeze({
    master: true,
    youtube: true,
    instagram: true,
    tiktok: true,
    twitter: true,
  });

  // In-memory cache so content scripts can answer isPlatformEnabled() synchronously
  // at event time. Kept in sync via chrome.storage.onChanged.
  let cache = { ...DEFAULTS };

  const hasStorage =
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.sync &&
    typeof chrome.storage.sync.get === 'function';

  function getEnabled() {
    return new Promise((resolve) => {
      if (!hasStorage) {
        resolve({ ...cache });
        return;
      }
      chrome.storage.sync.get(STORAGE_KEY, (res) => {
        const stored = (res && res[STORAGE_KEY]) || {};
        cache = { ...DEFAULTS, ...stored };
        resolve({ ...cache });
      });
    });
  }

  function setPlatform(name, value) {
    cache = { ...cache, [name]: !!value };
    const next = { ...cache };
    return new Promise((resolve) => {
      if (!hasStorage) {
        resolve(next);
        return;
      }
      chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => resolve(next));
    });
  }

  // Synchronous: master must be on AND the platform's own switch on.
  function isPlatformEnabled(name) {
    return !!cache.master && !!cache[name];
  }

  function initCache() {
    getEnabled();
    if (hasStorage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[STORAGE_KEY]) {
          cache = { ...DEFAULTS, ...(changes[STORAGE_KEY].newValue || {}) };
        }
      });
    }
  }

  DCL.config = {
    STORAGE_KEY,
    PLATFORMS,
    DEFAULTS,
    getEnabled,
    setPlatform,
    isPlatformEnabled,
    initCache,
    // test-only seams
    _setCache: (c) => {
      cache = { ...DEFAULTS, ...c };
    },
    _getCache: () => ({ ...cache }),
  };
})();
