/**
 * Synthetic-contract tests for the Instagram adapter. The defining behavior:
 * act on VIDEO/REEL surfaces only; defer to native for PHOTOS (per IG-0).
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://www.instagram.com/" }
 */
import { beforeEach, describe, expect, it } from 'vitest';
import '../../src/content/adapters/base.js';
import '../../src/content/adapters/instagram.js';

const Instagram = globalThis.DCL.adapters.instagram;

function buildPost({ media = 'video', liked = false } = {}) {
  document.body.innerHTML = '';
  const article = document.createElement('article');

  const mediaWrap = document.createElement('div');
  if (media === 'video') {
    mediaWrap.appendChild(document.createElement('video'));
  } else if (media === 'photo') {
    mediaWrap.appendChild(document.createElement('img'));
  }
  article.appendChild(mediaWrap);

  // Like control: svg[aria-label] inside a role=button.
  const likeBtn = document.createElement('div');
  likeBtn.setAttribute('role', 'button');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-label', liked ? 'Unlike' : 'Like');
  likeBtn.appendChild(svg);
  article.appendChild(likeBtn);

  document.body.appendChild(article);
  return { article, video: article.querySelector('video'), img: article.querySelector('img'), likeBtn };
}

describe('InstagramAdapter', () => {
  let adapter;
  beforeEach(() => {
    adapter = new Instagram();
  });

  it('matches on instagram.com', () => {
    expect(adapter.matches()).toBe(true);
  });

  it('resolves a surface for VIDEO posts/reels', () => {
    const { article, video } = buildPost({ media: 'video' });
    expect(adapter.resolveSurface(video)).toBe(article);
  });

  it('returns NO surface for PHOTO posts (defers to native double-tap)', () => {
    const { img } = buildPost({ media: 'photo' });
    expect(adapter.resolveSurface(img)).toBeNull();
  });

  it('finds the Like button from the surface', () => {
    const { article, likeBtn } = buildPost({ media: 'video' });
    expect(adapter.findLikeButton(article)).toBe(likeBtn);
  });

  it('reads liked state from the Unlike label', () => {
    const { article } = buildPost({ media: 'video', liked: true });
    expect(adapter.isLiked(adapter.findLikeButton(article))).toBe(true);
  });

  it('reads not-liked state from the Like label', () => {
    const { article } = buildPost({ media: 'video', liked: false });
    expect(adapter.isLiked(adapter.findLikeButton(article))).toBe(false);
  });

  it('picks the clicked reel\'s like button when many reels are preloaded', () => {
    // The reels viewer has no <article> and preloads several reels, each with its
    // own "Like". resolveSurface must scope to the clicked reel's card.
    document.body.innerHTML = '';
    function reelCard(label) {
      const card = document.createElement('div');
      const media = document.createElement('div');
      media.appendChild(document.createElement('video'));
      card.appendChild(media);
      const likeBtn = document.createElement('div');
      likeBtn.setAttribute('role', 'button');
      likeBtn.dataset.reel = label;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-label', 'Like');
      likeBtn.appendChild(svg);
      card.appendChild(likeBtn);
      return card;
    }
    const main = document.createElement('main');
    const card1 = reelCard('one');
    const card2 = reelCard('two');
    main.append(card1, card2);
    document.body.appendChild(main);

    // Double-click lands on the SECOND reel's video.
    const clickedVideo = card2.querySelector('video');
    const surface = adapter.resolveSurface(clickedVideo);
    expect(surface).toBe(card2);
    const btn = adapter.findLikeButton(surface);
    expect(btn.dataset.reel).toBe('two');
  });

  it('uses the instagram heart variant centered on the video', () => {
    const { article, video } = buildPost({ media: 'video' });
    const opts = adapter.heartOptions(article);
    expect(opts.variant).toBe('instagram');
    expect(opts.center).toBe(video);
  });
});
