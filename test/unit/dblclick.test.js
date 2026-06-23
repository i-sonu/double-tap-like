import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/content/dblclick.js';

const { createHandler } = globalThis.DCL.dblclick;

// A controllable fake adapter for exercising the handler's branches.
function makeAdapter(overrides = {}) {
  const likeButton = { click: vi.fn() };
  return {
    name: 'twitter',
    isInteractiveTarget: () => false,
    resolveSurface: (t) => t.surface ?? null,
    findLikeButton: () => likeButton,
    isLiked: () => false,
    like: vi.fn(() => true),
    _likeButton: likeButton,
    ...overrides,
  };
}

function clickEvent(extra = {}) {
  return { button: 0, target: {}, clientX: 10, clientY: 20, ...extra };
}

describe('createHandler (click-based double-click detection)', () => {
  let showHeart;
  let clock;

  beforeEach(() => {
    showHeart = vi.fn();
    clock = 1000;
  });

  const deps = (adapter, enabled = true) => ({
    detectAdapter: () => adapter,
    isPlatformEnabled: () => enabled,
    showHeart,
    now: () => clock,
  });

  // Helper: two clicks close in time + position == a double-click.
  function doubleClick(handler, opts = {}) {
    const surface = opts.surface ?? {};
    handler(clickEvent({ target: { surface }, ...opts.first }));
    clock += opts.gap ?? 100;
    handler(clickEvent({ target: opts.secondTarget ?? { surface }, ...opts.second }));
  }

  it('a single click never likes', () => {
    const adapter = makeAdapter();
    createHandler(deps(adapter))(clickEvent({ target: { surface: {} } }));
    expect(adapter.like).not.toHaveBeenCalled();
    expect(showHeart).not.toHaveBeenCalled();
  });

  it('a double-click on a surface likes and shows the heart', () => {
    const adapter = makeAdapter();
    doubleClick(createHandler(deps(adapter)));
    expect(adapter.like).toHaveBeenCalledTimes(1);
    expect(showHeart).toHaveBeenCalledWith(10, 20, {});
  });

  it('ignores non-primary buttons', () => {
    const adapter = makeAdapter();
    const handler = createHandler(deps(adapter));
    handler(clickEvent({ button: 2, target: { surface: {} } }));
    handler(clickEvent({ button: 2, target: { surface: {} } }));
    expect(adapter.like).not.toHaveBeenCalled();
  });

  it('does nothing when the platform is disabled', () => {
    const adapter = makeAdapter();
    doubleClick(createHandler(deps(adapter, false)));
    expect(adapter.like).not.toHaveBeenCalled();
  });

  it('ignores clicks that start on interactive controls', () => {
    const adapter = makeAdapter({ isInteractiveTarget: () => true });
    doubleClick(createHandler(deps(adapter)));
    expect(adapter.like).not.toHaveBeenCalled();
  });

  it('does nothing when the first click is not on a likeable surface', () => {
    const adapter = makeAdapter({ resolveSurface: () => null });
    const handler = createHandler(deps(adapter));
    handler(clickEvent());
    handler(clickEvent());
    expect(adapter.like).not.toHaveBeenCalled();
  });

  it('uses the FIRST click\'s like button even if the second click moves to a new target (image -> modal)', () => {
    // First click resolves the inline post; second click lands on the modal
    // (which resolves nothing) — the like should still fire on the stashed button.
    const surface = { id: 'inline' };
    const adapter = makeAdapter({
      resolveSurface: (t) => t.surface ?? null,
    });
    const handler = createHandler(deps(adapter));
    handler(clickEvent({ target: { surface } }));
    clock += 100;
    handler(clickEvent({ target: { /* modal: no surface */ } }));
    expect(adapter.like).toHaveBeenCalledTimes(1);
  });

  it('does not fire if the clicks are too far apart in time', () => {
    const adapter = makeAdapter();
    doubleClick(createHandler(deps(adapter)), { gap: 500 });
    expect(adapter.like).not.toHaveBeenCalled();
  });

  it('does not fire if the cursor moved too far between clicks', () => {
    const adapter = makeAdapter();
    const handler = createHandler(deps(adapter));
    const surface = {};
    handler(clickEvent({ target: { surface }, clientX: 10, clientY: 20 }));
    clock += 100;
    handler(clickEvent({ target: { surface }, clientX: 200, clientY: 200 }));
    expect(adapter.like).not.toHaveBeenCalled();
  });

  it('never un-likes: already-liked is a no-op (muted heart only)', () => {
    const adapter = makeAdapter({ isLiked: () => true });
    doubleClick(createHandler(deps(adapter)));
    expect(adapter.like).not.toHaveBeenCalled();
    expect(showHeart).toHaveBeenCalledWith(10, 20, { alreadyLiked: true });
  });

  it('debounces: a rapid triple/quad click likes at most once per window', () => {
    const adapter = makeAdapter();
    const handler = createHandler(deps(adapter));
    const surface = {};
    handler(clickEvent({ target: { surface } })); // 1st
    clock += 100;
    handler(clickEvent({ target: { surface } })); // 2nd -> like
    clock += 100;
    handler(clickEvent({ target: { surface } })); // 3rd -> new first
    clock += 100;
    handler(clickEvent({ target: { surface } })); // 4th -> within debounce window, suppressed
    expect(adapter.like).toHaveBeenCalledTimes(1);
  });
});
