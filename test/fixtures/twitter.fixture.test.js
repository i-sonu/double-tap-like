/*
 * Fixture-based DOM test for the X/Twitter adapter against a REAL saved HTML
 * snapshot. Per plan §8, the human must provide test/fixtures/twitter.html
 * (DevTools -> right-click the post container -> Copy -> Copy outerHTML, while
 * logged in and viewing a video post). We do NOT invent DOM here.
 *
 * If the fixture is absent, these tests are skipped with a clear message rather
 * than fabricating one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, 'twitter.html');
const hasFixture = fs.existsSync(fixturePath);

const maybe = hasFixture ? describe : describe.skip;

if (!hasFixture) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n[DCL] Skipping X fixture test: test/fixtures/twitter.html not found.\n' +
      '      Provide a real saved snapshot of a logged-in X video post to enable it.\n'
  );
}

maybe('TwitterAdapter against real fixture', () => {
  function load() {
    const html = fs.readFileSync(fixturePath, 'utf8');
    const dom = new JSDOM(html, { url: 'https://x.com/home' });
    // Re-evaluate the adapter modules against this DOM's globals.
    const g = globalThis;
    const prev = { window: g.window, document: g.document, location: g.location, DCL: g.DCL };
    g.window = dom.window;
    g.document = dom.window.document;
    Object.defineProperty(g, 'location', { value: dom.window.location, configurable: true });
    g.DCL = {};
    return { dom, restore: () => Object.assign(g, prev) };
  }

  it('finds the like button and reads its state in the real DOM', async () => {
    const { dom, restore } = load();
    try {
      await import('../../src/content/adapters/base.js?fixture=1');
      await import('../../src/content/adapters/twitter.js?fixture=1');
      const adapter = new globalThis.DCL.adapters.twitter();

      const video = dom.window.document.querySelector('video');
      expect(video, 'fixture should contain a <video>').toBeTruthy();

      const surface = adapter.resolveSurface(video);
      expect(surface, 'adapter should resolve a surface from the video').toBeTruthy();

      const likeBtn = adapter.findLikeButton(surface);
      expect(likeBtn, 'adapter should locate the like button').toBeTruthy();

      // Just assert it returns a boolean without throwing.
      expect(typeof adapter.isLiked(likeBtn)).toBe('boolean');
    } finally {
      restore();
    }
  });
});
