/*
 * youtube.js — YouTube Shorts adapter.
 *
 * Scoped strictly to the /shorts route so we never trigger the watch player's
 * native double-click-to-fullscreen. Like button is found by aria-label
 * (excluding "dislike", which contains the substring "like").
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  // Find the Shorts like toggle by accessible label. Excludes Dislike.
  function findLikeToggle(root) {
    if (!root || !root.querySelectorAll) return null;
    const buttons = root.querySelectorAll('button[aria-label]');
    for (const btn of buttons) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (!label || label.includes('dislike')) continue;
      if (
        label.startsWith('like') ||
        label.startsWith('unlike') ||
        label.includes('i like this') ||
        label.includes('like this video')
      ) {
        return btn;
      }
    }
    return null;
  }

  class YouTubeAdapter extends DCL.PlatformAdapter {
    get name() {
      return 'youtube';
    }

    matches() {
      if (typeof location === 'undefined') return false;
      return (
        /(^|\.)youtube\.com$/i.test(location.hostname) &&
        location.pathname.startsWith('/shorts')
      );
    }

    resolveSurface(eventTarget) {
      if (!eventTarget || !eventTarget.closest) return null;
      // Restrict to the Shorts surface (renderer/player), never the watch player.
      const reel = eventTarget.closest('ytd-reel-video-renderer, #shorts-player, ytd-shorts');
      if (reel) return reel;
      if (eventTarget.tagName === 'VIDEO' || eventTarget.closest('video')) {
        return eventTarget.closest('#shorts-player') || eventTarget.closest('video');
      }
      return null;
    }

    findLikeButton(surface) {
      // Prefer the active reel renderer's own action bar; fall back to document.
      const scope =
        (surface && surface.closest && surface.closest('ytd-reel-video-renderer')) || null;
      let btn = scope ? findLikeToggle(scope) : null;
      if (!btn && typeof document !== 'undefined') btn = findLikeToggle(document);
      if (!btn) console.warn('[DCL][youtube] no Shorts like button found');
      return btn;
    }

    isLiked(likeButton) {
      if (!likeButton) return false;
      if (DCL.finders.ariaPressed(likeButton)) return true;
      const label = (likeButton.getAttribute('aria-label') || '').toLowerCase();
      return label.startsWith('unlike');
    }

    interactiveControlsSelector() {
      // Ignore the action rail + player chrome; the bare video area stays likeable.
      return [
        'button',
        'a',
        'input',
        '[role="slider"]',
        'ytd-toggle-button-renderer',
        'tp-yt-paper-icon-button',
        '.ytp-chrome-bottom',
      ].join(', ');
    }
  }

  DCL.adapters = DCL.adapters || {};
  DCL.adapters.youtube = YouTubeAdapter;
})();
