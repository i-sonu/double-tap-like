import { beforeEach, describe, expect, it } from 'vitest';
import '../../src/config.js';

const config = globalThis.DCL.config;

describe('config.isPlatformEnabled', () => {
  beforeEach(() => {
    config._setCache(config.DEFAULTS);
  });

  it('defaults to all platforms enabled', () => {
    expect(config.isPlatformEnabled('twitter')).toBe(true);
    expect(config.isPlatformEnabled('youtube')).toBe(true);
  });

  it('returns false when the platform switch is off', () => {
    config._setCache({ twitter: false });
    expect(config.isPlatformEnabled('twitter')).toBe(false);
    expect(config.isPlatformEnabled('youtube')).toBe(true);
  });

  it('master off disables every platform', () => {
    config._setCache({ master: false });
    expect(config.isPlatformEnabled('twitter')).toBe(false);
    expect(config.isPlatformEnabled('youtube')).toBe(false);
    expect(config.isPlatformEnabled('tiktok')).toBe(false);
    expect(config.isPlatformEnabled('instagram')).toBe(false);
  });
});

describe('config.setPlatform (no chrome.storage present)', () => {
  beforeEach(() => {
    config._setCache(config.DEFAULTS);
  });

  it('updates the in-memory cache synchronously for isPlatformEnabled', async () => {
    await config.setPlatform('twitter', false);
    expect(config.isPlatformEnabled('twitter')).toBe(false);
    expect(config._getCache().twitter).toBe(false);
  });

  it('getEnabled resolves to a copy of the cache', async () => {
    config._setCache({ tiktok: false });
    const enabled = await config.getEnabled();
    expect(enabled.tiktok).toBe(false);
    expect(enabled.master).toBe(true);
  });
});
