import type { DesktopThemeTokens } from '@vectojs/desktop';

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

/** App-surface tokens shared by every WebOS application. */
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
}
