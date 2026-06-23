/**
 * Synthetic-contract tests for the YouTube Shorts adapter. Verifies adapter LOGIC
 * against DOM matching the documented contract — not that selectors still match
 * live YouTube (that's manual QA).
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://www.youtube.com/shorts/abc123" }
 */
import { beforeEach, describe, expect, it } from 'vitest';
import '../../src/content/adapters/base.js';
import '../../src/content/adapters/youtube.js';

const YouTube = globalThis.DCL.adapters.youtube;

function buildShort({ liked = false } = {}) {
  document.body.innerHTML = '';
  const renderer = document.createElement('ytd-reel-video-renderer');
  const player = document.createElement('div');
  player.id = 'shorts-player';
  player.appendChild(document.createElement('video'));
  renderer.appendChild(player);

  const likeBtn = document.createElement('button');
  likeBtn.setAttribute('aria-label', liked ? 'Unlike' : 'like this video along with 1,234 other people');
  if (liked) likeBtn.setAttribute('aria-pressed', 'true');
  renderer.appendChild(likeBtn);

  const dislikeBtn = document.createElement('button');
  dislikeBtn.setAttribute('aria-label', 'Dislike this video');
  renderer.appendChild(dislikeBtn);

  document.body.appendChild(renderer);
  return { renderer, player, video: renderer.querySelector('video'), likeBtn, dislikeBtn };
}

describe('YouTubeAdapter', () => {
  let adapter;
  beforeEach(() => {
    adapter = new YouTube();
  });

  it('matches only on the /shorts route', () => {
    expect(adapter.matches()).toBe(true);
  });

  it('resolves the shorts player as the surface', () => {
    const { player, video } = buildShort();
    // closest() returns the nearest matching ancestor (#shorts-player); findLikeButton
    // still climbs to the renderer from there.
    expect(adapter.resolveSurface(video)).toBe(player);
  });

  it('finds the like button and NOT the dislike button', () => {
    const { renderer, likeBtn } = buildShort();
    expect(adapter.findLikeButton(renderer)).toBe(likeBtn);
  });

  it('reads liked state from aria-pressed / Unlike label', () => {
    const { renderer } = buildShort({ liked: true });
    const btn = adapter.findLikeButton(renderer);
    expect(adapter.isLiked(btn)).toBe(true);
  });

  it('reads not-liked state', () => {
    const { renderer } = buildShort({ liked: false });
    const btn = adapter.findLikeButton(renderer);
    expect(adapter.isLiked(btn)).toBe(false);
  });
});
