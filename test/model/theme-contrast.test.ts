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

/** Measured worst-case ratios across all 7 presets (2026-08-25, WEB-0034 era matrices, base dfebbe7). */
const WORST = {
  textOnSurface: 5.87, // dreamcore
  accentLabelOnAccent: 4.66, // cloud
  focusOnSurface: 3.55, // dreamcore
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

  it('muted text stays below primary text contrast in the same preset', () => {
    // WEB-0026: the adaptive muted derivation must remain visually secondary.
    for (const preset of THEME_PRESETS) {
      const t = tokensFor(preset);
      const muted = contrastRatio(t.textMuted, t.surface);
      const primary = contrastRatio(t.text, t.surface);
      expect(
        primary - muted,
        `${preset.id} muted ${muted.toFixed(2)} must sit below primary ${primary.toFixed(2)}`,
      ).toBeGreaterThan(0.5);
    }
  });

  describe('known violations — measured, fix is a separate color decision', () => {
    // Every todo below lists theme=ratio pairs measured with
    // src/model/contrast.ts after the WEB-0026 fixes (base b6dbe71 + fixes).
    // focus:border is deliberately left unenforced: a ring-vs-border
    // adjacency is not a WCAG surface pair (the ring's own floor is enforced
    // as focus:surface / focus:inputSurface above), and separating mid-tone
    // accents from their borders by 3:1 would require character-altering
    // accent changes.
    it.todo(
      'focus:border >= 3:1 remains out of contract — measured after WEB-0026: ' +
        'cloud 1.16, aqua 1.45, dreamcore 1.67, vaporwave 1.86, aero 1.32, breeze 2.34',
    );

    it(`textMuted meets ${BODY_TEXT_MIN}:1 on its surface in every preset`, () => {
      // Fixed by the adaptive blendForContrast derivation (was 0.55-blend,
      // worst dreamcore 2.06).
      for (const preset of THEME_PRESETS) {
        const t = tokensFor(preset);
        const ratio = contrastRatio(t.textMuted, t.surface);
        expect(
          ratio,
          `${preset.id} textMuted:surface = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    });

    it(`text meets ${BODY_TEXT_MIN}:1 on raised surfaces (button hover backgrounds)`, () => {
      // Fixed per-preset: y2k start-hover navy->silver, vaporwave -> deep
      // purple, dreamcore -> light peach (was y2k 1.31, vaporwave 1.86,
      // dreamcore 3.93 at base).
      for (const preset of THEME_PRESETS) {
        const t = tokensFor(preset);
        const ratio = contrastRatio(t.text, t.surfaceRaised);
        expect(
          ratio,
          `${preset.id} text:surfaceRaised = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    });

    it(`borders meet ${INDICATOR_MIN}:1 against their window surface`, () => {
      // Fixed per-preset border darkening/lightening (was breeze 1.42,
      // aqua 1.47, y2k 1.54, cloud 2.45, aero 2.63 at base).
      for (const preset of THEME_PRESETS) {
        const t = tokensFor(preset);
        const ratio = contrastRatio(t.border, t.surface);
        expect(ratio, `${preset.id} border:surface = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          INDICATOR_MIN,
        );
      }
    });

    it(`danger pairs meet ${BODY_TEXT_MIN}:1 on their tinted surface`, () => {
      // Fixed by dangerTintedSurface (white-wash first, dark tint for light
      // danger colors); several presets also deepened desktop-close-bg for
      // the close button. Was y2k 1.00 (invisible), cloud 2.85, dreamcore
      // 2.91, breeze 2.98, aqua 3.05, aero 3.54 at base.
      for (const preset of THEME_PRESETS) {
        const t = tokensFor(preset);
        const ratio = contrastRatio(t.danger, t.dangerSurface);
        expect(
          ratio,
          `${preset.id} danger:dangerSurface = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    });

    it(`shell close-button labels meet ${BODY_TEXT_MIN}:1 on their background`, () => {
      // Fixed via desktop-close-bg deepening (was cloud 3.67, dreamcore 3.67,
      // aqua 3.76, breeze 4.26 at base).
      for (const preset of THEME_PRESETS) {
        const tk = preset.tokens;
        const fg = tk['desktop-close-fg'];
        const bg = tk['desktop-close-bg'];
        if (typeof fg !== 'string' || typeof bg !== 'string') continue;
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${preset.id} closeFg:closeBg = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    });

    it(`titlebar and taskbar shell text meet ${BODY_TEXT_MIN}:1`, () => {
      // Fixed in dreamcore (titlebar-bg lightened, taskbar-fg lightened; was
      // both 3.93 at base).
      for (const preset of THEME_PRESETS) {
        const tk = preset.tokens;
        for (const [name, fgKey, bgKey] of [
          ['titlebar', 'desktop-titlebar-fg', 'desktop-titlebar-bg'],
          ['taskbar', 'desktop-taskbar-fg', 'desktop-taskbar-bg'],
        ] as const) {
          const fg = tk[fgKey];
          const bg = tk[bgKey];
          if (typeof fg !== 'string' || typeof bg !== 'string') continue;
          const ratio = contrastRatio(fg, bg);
          expect(ratio, `${preset.id} ${name} text = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
            BODY_TEXT_MIN,
          );
        }
      }
    });

    it(`on-accent labels meet ${BODY_TEXT_MIN}:1 over the hovered accent fill`, () => {
      // Fixed per-preset taskbar-active adjustments (was breeze 2.39,
      // dreamcore 3.67, y2k 3.95 at base).
      for (const preset of THEME_PRESETS) {
        const t = tokensFor(preset);
        const ratio = contrastRatio(t.accentText, t.accentHover);
        expect(
          ratio,
          `${preset.id} accentText:accentHover = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MIN);
      }
    });
  });
});
