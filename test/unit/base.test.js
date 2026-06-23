import { beforeEach, describe, expect, it } from 'vitest';
import '../../src/content/adapters/base.js';

const { finders, PlatformAdapter } = globalThis.DCL;

describe('finders.findByAriaLabel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('matches an aria-label containing a keyword, case-insensitively', () => {
    document.body.innerHTML = `
      <div role="button" aria-label="Reply"></div>
      <div role="button" aria-label="LIKE this post" id="target"></div>`;
    const el = finders.findByAriaLabel(document.body, ['like']);
    expect(el && el.id).toBe('target');
  });

  it('returns null when nothing matches', () => {
    document.body.innerHTML = `<div aria-label="Share"></div>`;
    expect(finders.findByAriaLabel(document.body, ['like'])).toBeNull();
  });
});

describe('finders.ariaPressed', () => {
  it('reads aria-pressed', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-pressed', 'true');
    expect(finders.ariaPressed(el)).toBe(true);
    el.setAttribute('aria-pressed', 'false');
    expect(finders.ariaPressed(el)).toBe(false);
  });

  it('falls back to aria-checked', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-checked', 'true');
    expect(finders.ariaPressed(el)).toBe(true);
  });

  it('defaults to false', () => {
    expect(finders.ariaPressed(document.createElement('div'))).toBe(false);
  });
});

describe('PlatformAdapter.like', () => {
  it('clicks the button and returns true', () => {
    const adapter = new PlatformAdapter();
    let clicked = false;
    const btn = { click: () => (clicked = true) };
    expect(adapter.like(btn)).toBe(true);
    expect(clicked).toBe(true);
  });

  it('returns false for a null button', () => {
    expect(new PlatformAdapter().like(null)).toBe(false);
  });
});
