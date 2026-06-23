/*
 * tiktok.js — TikTok adapter (For You feed + individual video pages).
 *
 * Like button anchored on TikTok's data-e2e attributes (comparatively stable),
 * with an aria-label fallback. Liked-state is read from aria-pressed or the
 * brand-red fill of the heart icon.
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  const LIKE_SELECTOR = '[data-e2e="like-icon"], [data-e2e="browse-like-icon"]';
  const ITEM_SELECTOR =
    '[data-e2e="recommend-list-item-container"], [data-e2e="feed-video"]';
  // TikTok brand reds used on a liked heart.
  const LIKED_COLORS = ['rgb(254, 44, 85)', 'rgb(255, 59, 92)', '#fe2c55', '#ff3b5c'];

  class TikTokAdapter extends DCL.PlatformAdapter {
    get name() {
      return 'tiktok';
    }

    matches() {
      if (typeof location === 'undefined') return false;
      return /(^|\.)tiktok\.com$/i.test(location.hostname);
    }

    resolveSurface(eventTarget) {
      if (!eventTarget || !eventTarget.closest) return null;
      const item = eventTarget.closest(ITEM_SELECTOR);
      if (item) return item;
      // Fallback: a video wrapper / the video itself.
      if (eventTarget.tagName === 'VIDEO' || eventTarget.closest('video')) {
        return eventTarget.closest(ITEM_SELECTOR) || eventTarget.closest('video');
      }
      return null;
    }

    findLikeButton(surface) {
      const scope =
        (surface && surface.closest && surface.closest(ITEM_SELECTOR)) ||
        surface ||
        (typeof document !== 'undefined' ? document : null);
      if (!scope || !scope.querySelector) return null;
      let el = scope.querySelector(LIKE_SELECTOR);
      if (el) return el.closest('button, [role="button"]') || el;
      el = DCL.finders.findByAriaLabel(scope, ['like']);
      if (el) {
        console.warn('[DCL][tiktok] like button via aria-label fallback');
        return el;
      }
      console.warn('[DCL][tiktok] no like button found');
      return null;
    }

    isLiked(likeButton) {
      if (!likeButton) return false;
      if (DCL.finders.ariaPressed(likeButton)) return true;
      // Heuristic: a liked heart is filled with TikTok red.
      const svg = likeButton.querySelector('svg');
      const target = svg || likeButton;
      try {
        const fill =
          (target.getAttribute && target.getAttribute('fill')) ||
          (typeof getComputedStyle === 'function' ? getComputedStyle(target).fill : '') ||
          (typeof getComputedStyle === 'function' ? getComputedStyle(target).color : '');
        const f = (fill || '').toLowerCase().replace(/\s/g, '');
        return LIKED_COLORS.some((c) => f.includes(c.toLowerCase().replace(/\s/g, '')));
      } catch (e) {
        return false;
      }
    }

    interactiveControlsSelector() {
      return [
        '[data-e2e="comment-icon"]',
        '[data-e2e="share-icon"]',
        '[data-e2e="undefined-icon"]',
        '[data-e2e="video-music"]',
        'a',
        'input',
        '[role="slider"]',
        '[role="menuitem"]',
      ].join(', ');
    }
  }

  DCL.adapters = DCL.adapters || {};
  DCL.adapters.tiktok = TikTokAdapter;
})();
