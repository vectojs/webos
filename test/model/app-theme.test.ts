import { describe, expect, it } from 'bun:test';
import { appTheme, setAppTheme } from '../../src/model/app-theme';
import { aeroPreset } from '../../src/model/theme-aero';
import { vaporwavePreset } from '../../src/model/theme-vaporwave';
import type { ThemePreset } from '../../src/model/theme-types';

describe('app theme', () => {
  it('derives app surfaces from the active shell preset', () => {
    setAppTheme(vaporwavePreset);

    expect(appTheme()).toEqual({
      surface: '#160A2E',
      surfaceRaised: '#3D1A5B',
      surfaceSunken: '#120524',
      text: '#05FFA1',
      textMuted: '#0d916d',
      border: '#FF71CE',
      accent: '#05FFA1',
      accentText: '#000000',
      accentHover: '#01CDFE',
      focus: '#05FFA1',
      danger: '#01CDFE',
      dangerSurface: '#00252e',
      inputSurface: '#160A2E',
      menuBg: '#160A2E',
      menuBorder: '#FF71CE',
      menuHover: '#3D1A5B',
      menuRadius: 2,
      trayBg: null,
      buttonShape: 'rounded',
      chromeFont: '"Segoe UI",system-ui,sans-serif',
      taskbarHeight: 44,
      windowShadow: '0 0 26 rgba(255,113,206,.28)',
      titlebarGradientTo: null,
      titlebarInactiveBg: '#12071F',
      titlebarInactiveFg: '#8F5BB0',
      bevel: null,
      pinstripe: null,
      glow: { color: '#FF71CE', strength: 2 },
    });
  });

  it('replaces the current snapshot when the preset changes', () => {
    setAppTheme(vaporwavePreset);
    setAppTheme(aeroPreset);

    expect(appTheme().surface).toBe('#F3F3F3');
    expect(appTheme().text).toBe('#1A1A1A');
    expect(appTheme().accent).toBe('#0067C0');
  });

  it('rejects numeric values in color slots', () => {
    const invalid = {
      ...aeroPreset,
      tokens: { ...aeroPreset.tokens, 'desktop-window-bg': 42 },
    } as ThemePreset;

    expect(() => setAppTheme(invalid)).toThrow('desktop-window-bg must be a color string');
  });
});
