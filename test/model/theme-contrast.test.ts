/**
 * Per-theme token contrast contract (WEB-0023).
 *
 * Spec: webos-docs/specs/2026-08-23-ux-research-materials.md §4 — per-pair
 * verification against WCAG 2.x floors: >= 4.5:1 body text, >= 3:1 rings,
 * borders and state indicators. Pairs are measured on the REAL derived
 * AppThemeTokens (setAppTheme -> appTheme()), not on declared preset colors,
 * so the derivation in src/model/app-theme.ts is part of the contract.
 *
 * Themes that fail a floor are recorded as test.todo with their measured
 * ratios — adjusting palette colors is a separate design decision and must
 * never happen silently inside this suite.
 */

import { describe, expect, it } from 'bun:test';
import { appTheme, setAppTheme } from '../../src/model/app-theme';
import { contrastRatio } from '../../src/model/contrast';
import type { AppThemeTokens } from '../../src/model/theme-types';
import type { ThemePreset } from '../../src/model/theme-types';
import { THEME_PRESETS } from '../../src/model/themes';

const BODY_TEXT_MIN = 4.5;
const INDICATOR_MIN = 3;

function tokensFor(preset: ThemePreset): AppThemeTokens {
  setAppTheme(preset);
  return appTheme();
}

/** Measured worst-case ratios across all 7 presets (2026-08, base 31006e2). */
const WORST = {
  textOnSurface: 6.61, // dreamcore
  accentLabelOnAccent: 5.07, // aero
  focusOnSurface: 3.68, // aqua
} as const;

describe('theme token contrast contract', () => {
  it(`primary text meets ${BODY_TEXT_MIN}:1 on every surface it is drawn on`, () => {
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      const surfaces: [string, string][] = [
        ['surface', t.surface],
        ['surfaceSunken', t.surfaceSunken],
        ['inputSurface', t.inputSurface],
      ];
      for (const [name, bg] of surfaces) {
        const ratio = contrastRatio(t.text, bg);
        expect(ratio, `${preset.id} text:${name} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          BODY_TEXT_MIN,
        );
      }
    }
  });

  it(`on-accent labels meet ${BODY_TEXT_MIN}:1 over the accent fill`, () => {
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      const ratio = contrastRatio(t.accentText, t.accent);
      expect(
        ratio,
        `${preset.id} accentText:accent = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
    }
  });

  it(`focus ring meets ${INDICATOR_MIN}:1 against its adjacent window surface`, () => {
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      for (const [name, bg] of [
        ['surface', t.surface],
        ['inputSurface', t.inputSurface],
      ] as const) {
        const ratio = contrastRatio(t.focus, bg);
        expect(ratio, `${preset.id} focus:${name} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          INDICATOR_MIN,
        );
      }
    }
  });

  it('on-accent labels are the luminance flip of the accent, never the raw accent', () => {
    // WEB-0012 mechanism: when an accent must carry text, derive a paired
    // label via luminance flip (spec §4 rec #3) instead of reusing the accent.
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      const blackWins = contrastRatio('#000000', t.accent) >= contrastRatio('#ffffff', t.accent);
      expect(t.accentText, `${preset.id} accentText`).toBe(blackWins ? '#000000' : '#ffffff');
      expect(t.accentText, `${preset.id} reuses accent as its own label`).not.toBe(t.accent);
    }
  });

  it('accents carrying body text still clear the body-text floor on their surface', () => {
    // Vaporwave intentionally uses its neon accent as running text (#05ffa1 on
    // #120524); allowed by spec §4 rec #3 only while the pair stays >= 4.5:1.
    let accentsAsBodyText = 0;
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      for (const [name, fg] of [
        ['text', t.text],
        ['textMuted', t.textMuted],
      ] as const) {
        if (fg !== t.accent) continue;
        accentsAsBodyText += 1;
        const ratio = contrastRatio(fg, t.surface);
        expect(
          ratio,
          `${preset.id} ${name}(=accent):surface = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    }
    expect(accentsAsBodyText, 'vaporwave is the known accent-as-text preset').toBeGreaterThan(0);
  });

  it('worst-case ratios do not regress below the measured baseline', () => {
    // Guards the passing floors against silent drift without duplicating the
    // per-pair assertions above.
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      expect(contrastRatio(t.text, t.surface), `${preset.id} text:surface`).toBeGreaterThanOrEqual(
        WORST.textOnSurface - 0.01,
      );
      expect(
        contrastRatio(t.accentText, t.accent),
        `${preset.id} accentText:accent`,
      ).toBeGreaterThanOrEqual(WORST.accentLabelOnAccent - 0.01);
      expect(
        contrastRatio(t.focus, t.surface),
        `${preset.id} focus:surface`,
      ).toBeGreaterThanOrEqual(WORST.focusOnSurface - 0.01);
    }
  });

  describe('known violations — measured, fix is a separate color decision', () => {
    // Every todo below lists theme=ratio pairs measured with
    // src/model/contrast.ts at base 31006e2. Promote each to a hard assertion
    // once the offending slot has been adjusted.
    it.todo(
      'text:surfaceRaised >= 4.5:1 fails in 3 presets — button hover backgrounds: ' +
        'y2k 1.31 (#000 text on #000080), vaporwave 1.86, dreamcore 3.93 (passing: aqua 16.12, breeze 10.78, aero 10.73, cloud 14.48)',
    );
    it.todo(
      'textMuted:surface >= 4.5:1 fails in ALL presets (0.55-blend derivation): ' +
        'dreamcore 2.06, aero 2.65, cloud 2.91, aqua 2.92, y2k 3.11, vaporwave 3.46, breeze 3.85',
    );
    it.todo(
      'border:surface >= 3:1 fails in 5 presets: breeze 1.42, aqua 1.47, y2k 1.54, cloud 2.45, aero 2.63' +
        ' (passing: vaporwave 7.93, dreamcore 3.44)',
    );
    it.todo(
      'focus:border >= 3:1 fails in 5 presets: cloud 1.60, dreamcore 1.67, vaporwave 1.86, aero 1.92, aqua 2.50' +
        ' (passing: y2k 16.01, breeze 4.13)',
    );
    it.todo(
      'danger:dangerSurface >= 4.5:1 fails in 6 presets — y2k is 1.00:1 (invisible): ' +
        'y2k 1.00, cloud 2.85, dreamcore 2.91, breeze 2.98, aqua 3.05, aero 3.54 (passing: vaporwave 8.11)',
    );
    it.todo(
      'shell close-button label >= 4.5:1 fails in 4 presets: cloud 3.67, dreamcore 3.67, aqua 3.76, breeze 4.26' +
        ' (passing: aero 4.63, vaporwave 10.41, y2k 13.66)',
    );
    it.todo(
      'titlebar/taskbar shell text >= 4.5:1 fails in dreamcore (both 3.93:1); others >= 7.64:1',
    );
    it.todo(
      'accentText:accentHover >= 4.5:1 fails in 3 presets: breeze 2.39, dreamcore 3.67, y2k 3.95',
    );
  });
});
