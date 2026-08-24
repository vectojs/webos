/**
 * Per-theme identity contract (WEB-0034).
 *
 * Spec: webos-docs/specs/2026-08-24-theme-identity-and-os-feel.md §3 — each
 * preset carries its era's engine-token matrix (§3.2) plus the app-side era
 * chrome tokens (§3.3). Signature values are asserted per preset so a recolor
 * cannot silently erase an era; deviations from the spec matrix are recorded
 * in the preset files and carryctx DEC-0017/0018.
 */

import { describe, expect, it } from 'bun:test';
import { appTheme, setAppTheme } from '../../src/model/app-theme';
import type { ThemePreset } from '../../src/model/theme-types';
import { THEME_PRESETS, findPreset } from '../../src/model/themes';

const ENGINE_TOKENS = [
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
] as const;

const ERA_TOKENS = [
  'desktop-window-shadow',
  'desktop-taskbar-height',
  'desktop-titlebar-button-shape',
  'desktop-titlebar-inactive-bg',
  'desktop-titlebar-inactive-fg',
  'desktop-menu-bg',
  'desktop-menu-border',
  'desktop-menu-hover',
  'desktop-menu-radius',
  'desktop-chrome-font',
] as const;

const SHAPES = ['fullbleed', 'pill', 'circle', 'rounded', 'square'] as const;

describe('theme identity contract', () => {
  it('every preset declares all 21 engine tokens', () => {
    for (const preset of THEME_PRESETS) {
      for (const token of ENGINE_TOKENS) {
        expect(preset.tokens[token], `${preset.id} missing ${token}`).toBeDefined();
      }
    }
  });

  it('every preset declares the era chrome tokens with valid shapes', () => {
    for (const preset of THEME_PRESETS) {
      // y2k is the deliberate flat era: no shadow token (spec §3.3 "—(none)").
      const eraTokens: readonly string[] =
        preset.id === 'y2k' ? ERA_TOKENS.filter((t) => t !== 'desktop-window-shadow') : ERA_TOKENS;
      for (const token of eraTokens) {
        expect(preset.tokens[token], `${preset.id} missing ${token}`).toBeDefined();
      }
      const shape = preset.tokens['desktop-titlebar-button-shape'];
      expect(SHAPES).toContain(shape);
    }
  });

  it('era categories follow the spec fix (aero Modern, aqua Classic)', () => {
    expect(findPreset('aero')?.category).toBe('Modern');
    expect(findPreset('aqua')?.category).toBe('Classic');
    expect(findPreset('breeze')?.category).toBe('Modern');
    expect(findPreset('cloud')?.category).toBe('Modern');
    expect(findPreset('y2k')?.category).toBe('Retro');
    expect(findPreset('vaporwave')?.category).toBe('Aesthetic');
    expect(findPreset('dreamcore')?.category).toBe('Aesthetic');
  });

  it('no two presets share an era reference (distinct descriptions)', () => {
    const descriptions = THEME_PRESETS.map((p) => p.description);
    expect(new Set(descriptions).size).toBe(THEME_PRESETS.length);
  });

  it('signature values pin each era to its spec §3.2 matrix', () => {
    const sig = (id: string, token: keyof ThemePreset['tokens']): string | number | undefined =>
      findPreset(id)?.tokens[token];

    // aero — Fluent blended titlebar + accent
    expect(sig('aero', 'desktop-titlebar-bg')).toBe('#F3F3F3');
    expect(sig('aero', 'desktop-window-bg')).toBe('#F3F3F3');
    expect(sig('aero', 'desktop-focus-ring')).toBe('#0067C0');
    expect(sig('aero', 'desktop-radius')).toBe(8);
    expect(sig('aero', 'desktop-titlebar-height')).toBe(32);

    // cloud — Material pillow radii + tinted active shelf
    expect(sig('cloud', 'desktop-radius')).toBe(16);
    expect(sig('cloud', 'desktop-focus-ring')).toBe('#1A73E8');
    expect(sig('cloud', 'desktop-taskbar-active')).toBe('#D2E3FC');

    // breeze — exact Breeze palette
    expect(sig('breeze', 'desktop-focus-ring')).toBe('#3DAEE9');
    expect(sig('breeze', 'desktop-close-bg')).toBe('#C43B4B');
    expect(sig('breeze', 'desktop-radius')).toBe(4);

    // aqua — traffic-light red close, pinstripe era
    expect(sig('aqua', 'desktop-close-bg')).toBe('#FF5449');
    expect(sig('aqua', 'desktop-radius')).toBe(10);
    expect(sig('aqua', 'desktop-pinstripe-gap')).toBe(3);

    // y2k — Win98 navy gradient titlebar, square zero-radius bevel era
    expect(sig('y2k', 'desktop-titlebar-bg')).toBe('#000080');
    expect(sig('y2k', 'desktop-titlebar-gradient-to')).toBe('#1084D0');
    expect(sig('y2k', 'desktop-radius')).toBe(0);
    expect(sig('y2k', 'desktop-bevel-dark')).toBe('#000000');
    expect(sig('y2k', 'desktop-bevel-light')).toBe('#FFFFFF');
    expect(sig('y2k', 'desktop-window-shadow')).toBeUndefined();

    // vaporwave — dark neon chrome, radius 2, glow tokens
    expect(sig('vaporwave', 'desktop-titlebar-bg')).toBe('#1A0B33');
    expect(sig('vaporwave', 'desktop-titlebar-fg')).toBe('#FF71CE');
    expect(sig('vaporwave', 'desktop-radius')).toBe(2);
    expect(sig('vaporwave', 'desktop-glow-color')).toBe('#FF71CE');

    // dreamcore — pastel haze era
    expect(sig('dreamcore', 'desktop-radius')).toBe(14);
    expect(sig('dreamcore', 'desktop-titlebar-bg')).toBe('#EADCF0');
    expect(sig('dreamcore', 'desktop-focus-ring')).toBe('#8F76C4');
  });

  it('per-era taskbar heights come from the era token, not a flat default', () => {
    const heights = THEME_PRESETS.map((p) => ({
      id: p.id,
      h: p.tokens['desktop-taskbar-height'],
    }));
    expect(heights).toEqual([
      { id: 'aero', h: 48 },
      { id: 'breeze', h: 44 },
      { id: 'aqua', h: 60 },
      { id: 'cloud', h: 56 },
      { id: 'y2k', h: 30 },
      { id: 'vaporwave', h: 44 },
      { id: 'dreamcore', h: 40 },
    ]);
  });

  it('setAppTheme derives era chrome accessors without parsing composites', () => {
    setAppTheme(findPreset('y2k')!);
    const y2k = appTheme();
    expect(y2k.buttonShape).toBe('square');
    expect(y2k.bevel).toEqual({
      lightOuter: '#FFFFFF',
      lightInner: '#DFDFDF',
      darkInner: '#808080',
      darkOuter: '#000000',
    });
    expect(y2k.windowShadow).toBeNull();
    expect(y2k.pinstripe).toBeNull();

    setAppTheme(findPreset('aqua')!);
    const aqua = appTheme();
    expect(aqua.buttonShape).toBe('circle');
    expect(aqua.pinstripe).toEqual({ color: 'rgba(15,40,90,0.08)', gap: 3 });
    expect(aqua.bevel).toBeNull();

    setAppTheme(findPreset('breeze')!);
    expect(appTheme().trayBg).toBe('#14161A');
  });

  it('rejects an invalid caption shape loudly', () => {
    const broken = {
      ...findPreset('aero')!,
      tokens: {
        ...findPreset('aero')!.tokens,
        'desktop-titlebar-button-shape': 'wavy',
      },
    } as unknown as ThemePreset;
    expect(() => setAppTheme(broken)).toThrow('desktop-titlebar-button-shape');
  });

  it('wallpapers carry the era art direction markers', () => {
    const svg = (id: string): string => findPreset(id)!.wallpaperSvg;
    // aero bloom: ribbon sweep + white core glow over deep blue
    expect(svg('aero')).toContain('#0E2C4C');
    expect(svg('aero')).toContain('#4FC3E8');
    // cloud: cumulus clusters
    expect(svg('cloud')).toContain('#90A4AE');
    // breeze: Breeze Dark stops + highlight edge
    expect(svg('breeze')).toContain('#232629');
    expect(svg('breeze')).toContain('#3DAEE9');
    // aqua: Panther horizon + pinstripe overlay
    expect(svg('aqua')).toContain('#8ED0F5');
    expect(svg('aqua')).toContain('stripes');
    // y2k: flat teal, no gradients
    expect(svg('y2k')).toContain('#008080');
    expect(svg('y2k')).not.toContain('gradient');
    // vaporwave: palms + scanlines added
    expect(svg('vaporwave')).toContain('scan');
    expect(svg('vaporwave')).toContain('polygon');
    // dreamcore: fog bands + grain + eye cloud
    expect(svg('dreamcore')).toContain('feTurbulence');
    expect(svg('dreamcore')).toContain('opacity="0.18"');
  });
});
