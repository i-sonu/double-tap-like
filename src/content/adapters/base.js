/*
 * base.js — PlatformAdapter interface + shared semantic finder helpers.
 *
 * Finder priority (see plan §5): aria-label > aria-pressed/checked > structural
 * fallback > class names (last resort). NEVER lead with obfuscated class names.
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  function normalize(s) {
    return (s || '').trim().toLowerCase();
  }

  function findByAriaLabel(root, keywords) {
    if (!root || !root.querySelectorAll) return null;
    const kws = keywords.map(normalize);
    const candidates = root.querySelectorAll('[aria-label]');
    for (const el of candidates) {
      const label = normalize(el.getAttribute('aria-label'));
      if (kws.some((k) => k && label.includes(k))) return el;
    }
    return null;
  }

  function ariaPressed(el) {
    if (!el || !el.getAttribute) return false;
    const pressed = el.getAttribute('aria-pressed');
    if (pressed != null) return pressed === 'true';
    const checked = el.getAttribute('aria-checked');
    if (checked != null) return checked === 'true';
    return false;
  }

  class PlatformAdapter {
    get name() {
      return 'base';
    }

    /** Does this adapter handle the current page? */
    matches() {
      return false;
    }

    /** From the dblclick target, return the video surface element, or null. */
    resolveSurface(/* eventTarget */) {
      return null;
    }

    /** Given a surface, find the associated Like button, or null. */
    findLikeButton(/* surface */) {
      return null;
    }

    /** Is this video already liked? */
    isLiked(/* likeButton */) {
      return false;
    }

    /** Perform the like. Returns true if a like action was issued. */
    like(likeButton) {
      if (!likeButton || typeof likeButton.click !== 'function') return false;
      likeButton.click();
      return true;
    }

    /** Optional per-adapter heart animation tuning, e.g. { variant, center }. */
    heartOptions(/* surface */) {
      return {};
    }

    /** Selector list of controls a double-click should be ignored on. Per-adapter. */
    interactiveControlsSelector() {
      return 'button, a[role="link"], [role="button"], input, [role="slider"], [role="menuitem"]';
    }

    isInteractiveTarget(eventTarget) {
      if (!eventTarget || !eventTarget.closest) return false;
      const sel = this.interactiveControlsSelector();
      try {
        return !!eventTarget.closest(sel);
      } catch (e) {
        console.warn('[DCL] bad interactive selector', sel, e);
        return false;
      }
    }
  }

  DCL.finders = { findByAriaLabel, ariaPressed };
  DCL.PlatformAdapter = PlatformAdapter;
})();
