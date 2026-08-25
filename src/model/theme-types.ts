import type { DesktopThemeTokens } from '@vectojs/desktop';

/** Caption-button geometry per era (spec 2026-08-24 §3.3). */
export type TitlebarButtonShape = 'fullbleed' | 'pill' | 'circle' | 'rounded' | 'square';

/**
 * App-surface tokens shared by every WebOS application. The color pairs are
 * derived from engine tokens by `setAppTheme` (contrast contract WEB-0023);
 * the chrome tokens carry era anatomy that the engine ignores but WebOS-owned
 * chrome (taskbar, start menu, menus, splash) consumes.
 */
export interface AppThemeTokens {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  accentHover: string;
  focus: string;
  danger: string;
  dangerSurface: string;
  inputSurface: string;
  /** Context-menu / flyout surface (Acrylic/Kickoff analogs). */
  menuBg: string;
  menuBorder: string;
  menuHover: string;
  menuRadius: number;
  /** Tray well inside the taskbar; null = flush with the bar. */
  trayBg: string | null;
  /** Caption geometry of the era; consumed on webos-owned chrome. */
  buttonShape: TitlebarButtonShape;
  /** Font stack for shell chrome + app titles. */
  chromeFont: string;
  /** Per-era bar height in px (engine default is a flat 40). */
  taskbarHeight: number;
  /**
   * Composite elevation spec (`"dx dy blur rgba(...)"[; ...]`), parsed by
   * `src/chrome/shadow.ts`; null = flat era (y2k).
   */
  windowShadow: string | null;
  /** Second titlebar gradient stop (right end); null = flat titlebar. */
  titlebarGradientTo: string | null;
  /** Unfocused-window chrome pair (values ready for the upstream ask). */
  titlebarInactiveBg: string;
  titlebarInactiveFg: string;
  /** Win98 4-tone bevel set for app-drawn classic chrome; null = modern era. */
  bevel: {
    lightOuter: string;
    lightInner: string;
    darkInner: string;
    darkOuter: string;
  } | null;
  /** Aqua pinstripe overlay for titlebars/menus; null = other eras. */
  pinstripe: { color: string; gap: number } | null;
  /** Neon glow for vaporwave text/borders; null = other eras. */
  glow: { color: string; strength: number } | null;
}

/** Theme preset — pure token data, no canvas imports. */
export interface ThemePreset {
  id: string;
  name: string;
  category: 'Modern' | 'Classic' | 'Retro' | 'Aesthetic';
  description: string;
  tokens: DesktopThemeTokens;
  wallpaperBg: string;
  wallpaperSvg: string;
  wallpaperCdnUrl: string;
}
