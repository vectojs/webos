import { describe, expect, it } from 'bun:test';
import { THEME_PRESETS, findPreset, presetIds } from '../../src/model/themes';

const REQUIRED_TOKENS = [
  'desktop-wallpaper',
  'desktop-window-bg',
  'desktop-window-border',
  'desktop-titlebar-bg',
  'desktop-titlebar-fg',
  'desktop-titlebar-height',
  'desktop-close-bg',
  'desktop-close-fg',
  'desktop-focus-ring',
  'desktop-radius',
  'desktop-taskbar-bg',
  'desktop-taskbar-fg',
  'desktop-taskbar-hover',
  'desktop-taskbar-active',
  'desktop-start-bg',
  'desktop-start-border',
  'desktop-start-fg',
  'desktop-start-hover',
  'desktop-resize-handle',
  'desktop-min-width',
  'desktop-min-height',
];

describe('theme presets', () => {
  it('has unique ids and lookup works', () => {
    const ids = presetIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(findPreset(id)).toBeDefined();
    }
    expect(findPreset('not-a-theme')).toBeUndefined();
  });

  it('every preset declares all required tokens', () => {
    for (const preset of THEME_PRESETS) {
      for (const token of REQUIRED_TOKENS) {
        expect(preset.tokens[token], `${preset.id} missing ${token}`).toBeDefined();
      }
    }
  });

  it('every preset has wallpaper and metadata', () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.wallpaperBg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.wallpaperSvg).toContain('<svg');
      expect(preset.wallpaperCdnUrl).toMatch(/^https:\/\/cdn\.vectojs\.org\//);
    }
  });

  it('preset ids avoid OS product names', () => {
    for (const id of presetIds()) {
      expect(id).not.toMatch(/win|mac|chrome|plasma/i);
    }
  });
});
