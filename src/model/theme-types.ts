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
