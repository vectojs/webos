/**
 * Settings app — theme preset catalog; each preset applies tokens +
 * wallpaper via the shell's `setTheme` path.
 *
 * The catalog projects radiogroup semantics: the active preset carries a
 * triple affordance (trailing check disc, accent-tinted row, left accent
 * bar) plus `role="radio"` / checked state and arrow-key navigation, per
 * the 2026-08-23 UX research recommendation #2.
 */

import type { A11yAttributes, Entity, IRenderer } from '@vectojs/core';
import type { AppDefinition } from '@vectojs/desktop';
import { appTheme } from '../model/app-theme';
import { THEME_PRESETS, type ThemePreset } from '../model/themes';
import { Button, Stack } from '@vectojs/ui';
import { p, ScrollableClientRoot, t, vstack } from '../app/ui-helpers';
import { isWindowFocused } from '../app/window-utils';
import { appIconSvg } from '../desktop/icons';
import { HRule } from './_hrule';

export interface SettingsAppOptions {
  applyTheme: (presetId: string) => void;
  /**
   * Live read of the preset id the shell currently applies. Owned by the
   * boot layer (config.ts); read every frame by the indicator so external
   * switches (terminal `theme`, API) stay reflected while the window is open.
   */
  getActiveThemeId: () => string;
}

const ROW_FONT = '500 12px "Segoe UI", system-ui, sans-serif';
const ROW_WIDTH = 360;
const ROW_HEIGHT = 30;
/** Keys the radio pattern consumes; Enter/Space reach `click` via the core's synthetic activation for `role="radio"`. */
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

/** `#rrggbb` → `rgba(...)`; returns null for non-hex tokens (overlay skipped). */
function hexToRgba(value: string, alpha: number): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * The preset list as an accessible radio group. Interactive so the semantic
 * layer projects it; explicit `tabIndex: -1` keeps the group itself out of
 * the tab order (the rows carry the single roving tab stop).
 */
class PresetRadioGroup extends Stack {
  constructor(children: Entity[]) {
    super({ direction: 'vertical', gap: 6 });
    for (const child of children) this.add(child);
    this.interactive = true;
  }

  public override getA11yAttributes(): A11yAttributes {
    return { role: 'radiogroup', label: 'Theme presets', tabIndex: -1 };
  }
}

/**
 * One theme-preset row: visually a button, semantically a radio option.
 *
 * Active state draws the triple affordance — trailing check disc, accent
 * tint over the row fill, 3px accent bar — and projects `role="radio"` with
 * `checked` plus the roving tab stop (active row 0, others -1), matching the
 * RadioGroup hotspot precedent in @vectojs/ui.
 */
class ThemePresetRow extends Button {
  private pressed = false;
  private hoverState = false;

  constructor(
    readonly preset: ThemePreset,
    private readonly opts: SettingsAppOptions,
  ) {
    super(`${preset.name} (${preset.category})`, {
      width: ROW_WIDTH,
      height: ROW_HEIGHT,
      font: ROW_FONT,
      padding: 6,
      radius: 6,
      focusColor: appTheme().focus,
    });
    // Base Button tracks hover/focus internally but keeps them private; the
    // row needs the hover bit for its own fill, so mirror it here.
    this.on('hover', () => {
      if (this.hoverState) return;
      this.hoverState = true;
      this.scene?.markDirty();
    });
    this.on('pointerdown', () => {
      this.pressed = true;
      this.scene?.markDirty();
    });
    const release = (): void => {
      if (!this.pressed) return;
      this.pressed = false;
      this.scene?.markDirty();
    };
    this.on('pointerup', release);
    this.on('pointercancel', release);
    this.on('pointerleave', () => {
      release();
      if (!this.hoverState) return;
      this.hoverState = false;
      this.scene?.markDirty();
    });
  }

  /**
   * Wire the shared activation path once every sibling row exists.
   *
   * Pointer click and the core's synthetic Enter/Space click for
   * `role="radio"` both funnel through `activate`; WCAG radio arrows
   * (Up/Left prev, Down/Right next wrapping, Home/End first/last) select
   * and apply immediately (live preview).
   */
  public wireActivation(activate: (preset: ThemePreset) => void): void {
    this.on('click', () => activate(this.preset));
    this.on('keydown', (e) => {
      if (!NAV_KEYS.has(e.key)) return;
      if (!isWindowFocused(this)) return;
      e.preventDefault();
      const n = THEME_PRESETS.length;
      const idx = THEME_PRESETS.findIndex((x) => x.id === this.preset.id);
      if (idx === -1) return;
      let target: ThemePreset;
      if (e.key === 'Home') target = THEME_PRESETS[0]!;
      else if (e.key === 'End') target = THEME_PRESETS[n - 1]!;
      else {
        const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
        target = THEME_PRESETS[(idx + (forward ? 1 : -1) + n) % n]!;
      }
      activate(target);
    });
  }

  public override getA11yAttributes(): A11yAttributes {
    const checked = this.opts.getActiveThemeId() === this.preset.id;
    return {
      role: 'radio',
      label: `Theme: ${this.preset.id}`,
      checked,
      // Roving tabindex: only the checked option is in the tab order.
      tabIndex: checked ? 0 : -1,
    };
  }

  public override render(r: IRenderer): void {
    const theme = appTheme();
    const forced = this.scene?.forcedColors ?? false;
    const active = this.opts.getActiveThemeId() === this.preset.id;
    const baseBg = forced
      ? 'ButtonFace'
      : this.pressed || this.hoverState
        ? theme.surfaceRaised
        : theme.surfaceSunken;
    r.beginPath();
    r.roundRect(0, 0, this.width, this.height, 6);
    r.fill(baseBg);
    if (active && !forced) {
      const tint = hexToRgba(theme.accent, 0.12);
      if (tint) {
        r.beginPath();
        r.roundRect(0, 0, this.width, this.height, 6);
        r.fill(tint);
      }
    }
    if (active) {
      // Left accent bar, 3px.
      r.beginPath();
      r.roundRect(0, 0, 3, this.height, 1.5);
      r.fill(forced ? 'Highlight' : theme.accent);
    }
    if (this.focused) {
      r.beginPath();
      r.roundRect(0, 0, this.width, this.height, 6);
      r.stroke(forced ? 'Highlight' : theme.focus, 2);
    }
    r.fillText(
      `${this.preset.name} (${this.preset.category})`,
      14,
      this.height * 0.66,
      ROW_FONT,
      forced ? 'ButtonText' : theme.text,
    );
    if (active) {
      // Trailing check disc, 12px, with a check mark in the accent-contrast color.
      const cx = this.width - 18;
      const cy = this.height / 2;
      r.beginPath();
      r.arc(cx, cy, 6, 0, Math.PI * 2);
      r.fill(forced ? 'Highlight' : theme.accent);
      r.beginPath();
      r.moveTo(cx - 2.6, cy + 0.4);
      r.lineTo(cx - 0.4, cy + 2.8);
      r.lineTo(cx + 3, cy - 2.4);
      r.stroke(theme.accentText, 1.5);
    }
  }
}

export function createSettingsApp(opts: SettingsAppOptions): AppDefinition {
  return {
    id: 'settings',
    title: 'Personalization',
    iconSvg: appIconSvg('settings'),
    instances: 'single',
    defaultWidth: 620,
    defaultHeight: 460,
    minWidth: 420,
    minHeight: 340,
    create: () => {
      const status = p('Select a desktop theme preset for your environment:', 12, '#475569', 520);

      const rows = THEME_PRESETS.map((preset) => new ThemePresetRow(preset, opts));
      /**
       * Single apply path shared by pointer click, keyboard activation and
       * arrow navigation — no duplicated switch logic. Applies immediately
       * (live preview) and moves the roving focus to the newly active row.
       */
      const activate = (preset: ThemePreset): void => {
        if (opts.getActiveThemeId() !== preset.id) {
          status.setText(`Applied: ${preset.name} — ${preset.description}`);
          status.scene?.markDirty();
          opts.applyTheme(preset.id);
        }
        rows.find((row) => row.preset.id === preset.id)?.focus();
      };
      for (const row of rows) row.wireActivation(activate);

      const tip = p(
        'Terminal users: `theme <id>` switches presets too. Ids: ' +
          THEME_PRESETS.map((x) => x.id).join(', '),
        12,
      );
      const title = t('Desktop Personalization Studio', 16);
      const catalogTitle = t('Preset Catalog', 14);
      const tipTitle = t('Tip', 14);
      const stack = vstack(
        [
          title,
          status,
          new HRule(),
          catalogTitle,
          new PresetRadioGroup(rows),
          new HRule(),
          tipTitle,
          tip,
        ],
        6,
      );

      return new ScrollableClientRoot(stack, [title, status, catalogTitle, tipTitle, tip]);
    },
  };
}
