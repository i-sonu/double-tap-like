/*
 * instagram.js — Instagram adapter.
 *
 * IG-0 result (confirmed by the user): Instagram desktop ALREADY likes PHOTO posts
 * natively on double-click, but does NOT like VIDEOS/REELS. So this adapter acts
 * ONLY on video/reel surfaces — for photos it returns no surface and defers to
 * native (clicking Like ourselves would toggle the native like back off).
 *
 * The heart animation uses the Instagram variant (large white heart centered on
 * the media) to match the native double-tap-to-like feel.
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  const LIKE_SVG_SELECTOR = 'svg[aria-label="Like" i], svg[aria-label="Unlike" i]';

  function likeSvg(scope) {
    if (!scope || !scope.querySelector) return null;
    return scope.querySelector(LIKE_SVG_SELECTOR);
  }

  class InstagramAdapter extends DCL.PlatformAdapter {
    get name() {
      return 'instagram';
    }

    matches() {
      if (typeof location === 'undefined') return false;
      return /(^|\.)instagram\.com$/i.test(location.hostname);
    }

    // The reels viewer preloads MANY reels (each with its own Like button) and has
    // no <article> wrapper, so we can't search the whole page. Walk up from the
    // clicked element to the nearest ancestor that owns a Like control — that's the
    // active reel/post card — and use it as the surface.
    //
    // Only VIDEO/REEL cards are likeable; photo cards return null so Instagram's
    // own native double-tap-to-like handles them (clicking Like ourselves would
    // toggle the native like back off).
    resolveSurface(eventTarget) {
      if (!eventTarget || !eventTarget.closest) return null;
      let node = eventTarget;
      for (let i = 0; i < 20 && node && node.querySelector; i++, node = node.parentElement) {
        if (likeSvg(node)) {
          // Found the card that owns a Like control.
          return node.querySelector('video') ? node : null; // photo => defer to native
        }
        if (node === document.body) break;
      }
      return null;
    }

    findLikeButton(surface) {
      const scope = surface || (typeof document !== 'undefined' ? document : null);
      const svg = likeSvg(scope);
      if (!svg) {
        console.warn('[DCL][instagram] no Like control found');
        return null;
      }
      return svg.closest('[role="button"], button') || svg.parentElement;
    }

    isLiked(likeButton) {
      if (!likeButton) return false;
      const svg = likeButton.querySelector
        ? likeButton.querySelector('svg[aria-label]')
        : null;
      const label = svg ? (svg.getAttribute('aria-label') || '').toLowerCase() : '';
      if (label === 'unlike') return true;
      return DCL.finders.ariaPressed(likeButton);
    }

    heartOptions(surface) {
      const video =
        surface && surface.querySelector ? surface.querySelector('video') : null;
      return { variant: 'instagram', center: video || surface };
    }

    interactiveControlsSelector() {
      // Ignore comment box, links, and the comment/share/save action svgs — but NOT
      // the media area (so the video stays double-clickable).
      return [
        'a',
        'textarea',
        'input',
        '[role="menuitem"]',
        'svg[aria-label="Comment"]',
        'svg[aria-label="Share"]',
        'svg[aria-label="Save"]',
        'svg[aria-label="Remove"]',
      ].join(', ');
    }
  }

  DCL.adapters = DCL.adapters || {};
  DCL.adapters.instagram = InstagramAdapter;
})();
