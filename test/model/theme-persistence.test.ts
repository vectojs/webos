import { beforeEach, describe, expect, it } from 'bun:test';
import { DEFAULT_PRESET, loadPersistedTheme, persistTheme } from '../../src/config';

describe('theme persistence', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // localStorage unavailable — the functions must still not throw.
    }
  });

  it('falls back to the default preset when nothing is stored', () => {
    expect(loadPersistedTheme()).toBe(DEFAULT_PRESET.id);
  });

  it('round-trips a persisted preset id', () => {
    persistTheme('vaporwave');
    expect(loadPersistedTheme()).toBe('vaporwave');
  });

  it('ignores unknown ids', () => {
    try {
      localStorage.setItem('webos:theme', 'bogus');
    } catch {
      // no localStorage — skip the assertion body by returning early.
      return;
    }
    expect(loadPersistedTheme()).toBe(DEFAULT_PRESET.id);
  });
});
