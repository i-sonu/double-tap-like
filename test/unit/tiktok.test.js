/**
 * Synthetic-contract tests for the TikTok adapter.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://www.tiktok.com/foryou" }
 */
import { beforeEach, describe, expect, it } from 'vitest';
import '../../src/content/adapters/base.js';
import '../../src/content/adapters/tiktok.js';

const TikTok = globalThis.DCL.adapters.tiktok;

function buildItem({ liked = false } = {}) {
  document.body.innerHTML = '';
  const item = document.createElement('div');
  item.setAttribute('data-e2e', 'recommend-list-item-container');
  item.appendChild(document.createElement('video'));

  const likeBtn = document.createElement('button');
  const icon = document.createElement('span');
  icon.setAttribute('data-e2e', 'like-icon');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (liked) svg.setAttribute('fill', '#fe2c55');
  icon.appendChild(svg);
  likeBtn.appendChild(icon);
  item.appendChild(likeBtn);

  document.body.appendChild(item);
  return { item, video: item.querySelector('video'), likeBtn, icon };
}

describe('TikTokAdapter', () => {
  let adapter;
  beforeEach(() => {
    adapter = new TikTok();
  });

  it('matches on tiktok.com', () => {
    expect(adapter.matches()).toBe(true);
  });

  it('resolves the feed item as the surface', () => {
    const { item, video } = buildItem();
    expect(adapter.resolveSurface(video)).toBe(item);
  });

  it('finds the like button (closest button to the like-icon)', () => {
    const { item, likeBtn } = buildItem();
    expect(adapter.findLikeButton(item)).toBe(likeBtn);
  });

  it('detects liked state from the brand-red fill', () => {
    const { item } = buildItem({ liked: true });
    const btn = adapter.findLikeButton(item);
    expect(adapter.isLiked(btn)).toBe(true);
  });

  it('detects not-liked state', () => {
    const { item } = buildItem({ liked: false });
    const btn = adapter.findLikeButton(item);
    expect(adapter.isLiked(btn)).toBe(false);
  });
});
