import { describe, expect, it } from 'bun:test';
import { appTheme, setAppTheme } from '../../src/model/app-theme';
import { aeroPreset } from '../../src/model/theme-aero';
import { vaporwavePreset } from '../../src/model/theme-vaporwave';
import type { ThemePreset } from '../../src/model/theme-types';

describe('app theme', () => {
  it('derives app surfaces from the active shell preset', () => {
    setAppTheme(vaporwavePreset);

    expect(appTheme()).toEqual({
      surface: '#120524',
      surfaceRaised: '#3d1a5b',
      surfaceSunken: '#120524',
      text: '#05ffa1',
      textMuted: '#0b8c68',
      border: '#ff71ce',
      accent: '#05ffa1',
      accentText: '#000000',
      accentHover: '#01cdfe',
      focus: '#05ffa1',
      danger: '#01cdfe',
      dangerSurface: '#00252e',
      inputSurface: '#120524',
    });
  });

  it('replaces the current snapshot when the preset changes', () => {
    setAppTheme(vaporwavePreset);
    setAppTheme(aeroPreset);

    expect(appTheme().surface).toBe('#ffffff');
    expect(appTheme().text).toBe('#0b2d52');
    expect(appTheme().accent).toBe('#2572b4');
  });

  it('rejects numeric values in color slots', () => {
    const invalid = {
      ...aeroPreset,
      tokens: { ...aeroPreset.tokens, 'desktop-window-bg': 42 },
    } as ThemePreset;

    expect(() => setAppTheme(invalid)).toThrow('desktop-window-bg must be a color string');
  });
});
