/**
 * Synthetic-contract tests for the X/Twitter adapter. These build a minimal DOM
 * matching the documented selector contract (plan §5) — they verify the adapter's
 * LOGIC, not that the selectors still match the live site. Real-DOM verification is
 * the fixture test (test/fixtures) + the human manual QA checklist.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/home" }
 */
import { beforeEach, describe, expect, it } from 'vitest';
import '../../src/content/adapters/base.js';
import '../../src/content/adapters/twitter.js';

const Twitter = globalThis.DCL.adapters.twitter;

function buildPost({ liked = false, media = 'video' } = {}) {
  document.body.innerHTML = '';
  const article = document.createElement('article');
  article.setAttribute('role', 'article');

  if (media === 'video') {
    const player = document.createElement('div');
    player.setAttribute('data-testid', 'videoPlayer');
    player.appendChild(document.createElement('video'));
    article.appendChild(player);
  } else if (media === 'photo') {
    // X wraps post images in a photo-permalink link.
    const link = document.createElement('a');
    link.setAttribute('role', 'link');
    link.setAttribute('href', '/user/status/1/photo/1');
    const photo = document.createElement('div');
    photo.setAttribute('data-testid', 'tweetPhoto');
    photo.appendChild(document.createElement('img'));
    link.appendChild(photo);
    article.appendChild(link);
  }

  const likeBtn = document.createElement('div');
  likeBtn.setAttribute('role', 'button');
  likeBtn.setAttribute('data-testid', liked ? 'unlike' : 'like');
  likeBtn.setAttribute('aria-label', liked ? '1 Unlike' : '1 Like');
  article.appendChild(likeBtn);

  document.body.appendChild(article);
  return {
    article,
    player: article.querySelector('[data-testid="videoPlayer"]'),
    video: article.querySelector('video'),
    photo: article.querySelector('[data-testid="tweetPhoto"]'),
    img: article.querySelector('img'),
    likeBtn,
  };
}

describe('TwitterAdapter', () => {
  let adapter;
  beforeEach(() => {
    adapter = new Twitter();
  });

  it('matches on x.com', () => {
    expect(adapter.matches()).toBe(true);
  });

  it('resolves the video player as the surface', () => {
    const { player, video } = buildPost();
    expect(adapter.resolveSurface(video)).toBe(player);
  });

  it('resolves the photo region as the surface for an image post', () => {
    const { photo, img } = buildPost({ media: 'photo' });
    expect(adapter.resolveSurface(img)).toBe(photo);
  });

  it('finds the like button from an image surface', () => {
    const { photo, likeBtn } = buildPost({ media: 'photo' });
    expect(adapter.findLikeButton(photo)).toBe(likeBtn);
  });

  it('does NOT treat an image (inside its permalink link) as an interactive control', () => {
    const { img } = buildPost({ media: 'photo' });
    expect(adapter.isInteractiveTarget(img)).toBe(false);
  });

  describe('photo lightbox modal', () => {
    function buildModal({ withAvatar = true } = {}) {
      document.body.innerHTML = '';
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const big = document.createElement('img');
      big.setAttribute('alt', 'Image');
      dialog.appendChild(big);

      let avatar = null;
      if (withAvatar) {
        avatar = document.createElement('div');
        avatar.setAttribute('data-testid', 'Tweet-User-Avatar');
        avatar.appendChild(document.createElement('img'));
        dialog.appendChild(avatar);
      }

      const likeBtn = document.createElement('div');
      likeBtn.setAttribute('role', 'button');
      likeBtn.setAttribute('data-testid', 'like');
      dialog.appendChild(likeBtn);

      document.body.appendChild(dialog);
      return { dialog, big, avatar: avatar && avatar.querySelector('img'), likeBtn };
    }

    it('resolves the dialog as the surface when the big image is double-clicked', () => {
      const { dialog, big } = buildModal();
      expect(adapter.resolveSurface(big)).toBe(dialog);
    });

    it('finds the like button inside the dialog', () => {
      const { dialog, likeBtn } = buildModal();
      expect(adapter.findLikeButton(dialog)).toBe(likeBtn);
    });

    it('does not treat an avatar image in the modal as a likeable surface', () => {
      const { avatar } = buildModal();
      expect(adapter.resolveSurface(avatar)).toBeNull();
    });
  });

  it('returns null surface for a text-only post', () => {
    buildPost({ media: 'none' });
    const article = document.querySelector('article');
    expect(adapter.resolveSurface(article)).toBeNull();
  });

  it('finds the like button from the surface', () => {
    const { player, likeBtn } = buildPost();
    expect(adapter.findLikeButton(player)).toBe(likeBtn);
  });

  it('reads liked state from the unlike testid', () => {
    const { player } = buildPost({ liked: true });
    const btn = adapter.findLikeButton(player);
    expect(adapter.isLiked(btn)).toBe(true);
  });

  it('reads not-liked state from the like testid', () => {
    const { player } = buildPost({ liked: false });
    const btn = adapter.findLikeButton(player);
    expect(adapter.isLiked(btn)).toBe(false);
  });

  it('treats the like button itself as an interactive control', () => {
    const { likeBtn } = buildPost();
    expect(adapter.isInteractiveTarget(likeBtn)).toBe(true);
  });

  it('does not treat the bare video as an interactive control', () => {
    const { video } = buildPost();
    expect(adapter.isInteractiveTarget(video)).toBe(false);
  });
});
