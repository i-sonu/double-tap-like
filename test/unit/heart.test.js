import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/content/heart.js';

const { showHeart } = globalThis.DCL.heart;

describe('heart.showHeart', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends a positioned heart element with an svg', () => {
    const el = showHeart(123, 456);
    expect(el).toBeTruthy();
    expect(el.className).toContain('dcl-heart-burst');
    expect(el.querySelector('svg')).toBeTruthy();
    expect(el.style.left).toBe('123px');
    expect(el.style.top).toBe('456px');
    expect(document.querySelectorAll('.dcl-heart-burst').length).toBe(1);
  });

  it('marks the muted variant for already-liked', () => {
    const el = showHeart(0, 0, { alreadyLiked: true });
    expect(el.className).toContain('dcl-heart-burst--muted');
  });

  it('applies the instagram variant', () => {
    const el = showHeart(5, 5, { variant: 'instagram' });
    expect(el.className).toContain('dcl-heart-burst--instagram');
  });

  it('removes the element via the fallback timer', () => {
    showHeart(0, 0);
    expect(document.querySelectorAll('.dcl-heart-burst').length).toBe(1);
    vi.advanceTimersByTime(1200);
    expect(document.querySelectorAll('.dcl-heart-burst').length).toBe(0);
  });
});
