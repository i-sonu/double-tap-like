/*
 * twitter.js — X / Twitter adapter.
 *
 * Per plan §5: X's data-testid is comparatively stable, so it's acceptable as the
 * PRIMARY anchor here. Like button = [data-testid="like"]; when already liked X
 * swaps the testid to [data-testid="unlike"]. Surface = the video player inside
 * the post's <article role="article">.
 */
(function () {
  'use strict';

  const DCL = (globalThis.DCL = globalThis.DCL || {});

  class TwitterAdapter extends DCL.PlatformAdapter {
    get name() {
      return 'twitter';
    }

    matches() {
      if (typeof location === 'undefined') return false;
      return /(^|\.)(x\.com|twitter\.com)$/i.test(location.hostname);
    }

    // Only count double-clicks that land on the video player region of a post.
    // A likeable surface is the video player, an inline post photo, OR the photo
    // lightbox modal (a double-click on an inline image opens that modal on the
    // first click, so by dblclick time we're usually inside it).
    resolveSurface(eventTarget) {
      if (!eventTarget || !eventTarget.closest) return null;

      // Inline media in a post. Precise, post-only testids — avatars/card images
      // /link previews are deliberately excluded.
      const inline = eventTarget.closest(
        '[data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="tweetPhoto"]'
      );
      if (inline) return inline;

      // Photo lightbox: double-click landed inside the modal that opened on click 1.
      const dialog = eventTarget.closest('[aria-modal="true"], [role="dialog"]');
      if (dialog) {
        const onImage =
          eventTarget.tagName === 'IMG' ||
          !!eventTarget.closest('img, [data-testid="swipe-to-dismiss"]');
        const onAvatar = !!eventTarget.closest(
          '[data-testid$="-Avatar"], [data-testid*="UserAvatar"]'
        );
        if (onImage && !onAvatar) return dialog;
      }
      return null;
    }

    findLikeButton(surface) {
      if (!surface || !surface.closest) return null;
      // The like button lives in the post's article, or — when an image opens the
      // photo lightbox — in the modal dialog. Resolve whichever contains the surface.
      const container =
        surface.closest('article[role="article"]') ||
        surface.closest('[role="dialog"], [aria-modal="true"]') ||
        surface.parentElement ||
        surface;
      // Primary anchor: stable data-testid.
      let btn = container.querySelector('[data-testid="like"], [data-testid="unlike"]');
      if (btn) return btn;
      // Semantic fallback: aria-label.
      btn = DCL.finders.findByAriaLabel(container, ['like']);
      if (btn) {
        console.warn('[DCL][twitter] like button found via aria-label fallback — testid selectors may have changed');
        return btn;
      }
      console.warn('[DCL][twitter] no like button found in post');
      return null;
    }

    isLiked(likeButton) {
      if (!likeButton) return false;
      if (likeButton.getAttribute('data-testid') === 'unlike') return true;
      return DCL.finders.ariaPressed(likeButton);
    }

    // Ignore double-clicks on the action bar / controls so they don't get hijacked.
    interactiveControlsSelector() {
      return [
        '[data-testid="like"]',
        '[data-testid="unlike"]',
        '[data-testid="reply"]',
        '[data-testid="retweet"]',
        '[data-testid="unretweet"]',
        '[data-testid="bookmark"]',
        '[data-testid="caret"]',
        '[role="slider"]',
        'button',
      ].join(', ');
      // NOTE: a[role="link"] is intentionally NOT listed — X wraps post images in a
      // photo-permalink link, and excluding it here would swallow image double-clicks.
      // resolveSurface() already gates liking to media-only regions.
    }
  }

  DCL.adapters = DCL.adapters || {};
  DCL.adapters.twitter = TwitterAdapter;
})();
