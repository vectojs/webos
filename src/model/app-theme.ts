import type { AppThemeTokens, ThemePreset } from './theme-types';
import { contrastRatio } from './contrast';

let current: AppThemeTokens = {
  surface: '#ffffff',
  surfaceRaised: '#f8fafc',
  surfaceSunken: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#475569',
  border: '#cbd5e1',
  accent: '#2563eb',
  accentText: '#ffffff',
  accentHover: '#1d4ed8',
  focus: '#2563eb',
  danger: '#b91c1c',
  dangerSurface: '#fee2e2',
  inputSurface: '#ffffff',
};

export function appTheme(): AppThemeTokens {
  return current;
}

/** Derive app colors from the shell preset while keeping the app contract stable. */
export function setAppTheme(preset: ThemePreset): void {
  const tokens = preset.tokens;
  current = {
    surface: colorToken(tokens['desktop-window-bg'], 'desktop-window-bg'),
    surfaceRaised: colorToken(tokens['desktop-start-hover'], 'desktop-start-hover'),
    surfaceSunken: colorToken(tokens['desktop-start-bg'], 'desktop-start-bg'),
    text: colorToken(tokens['desktop-start-fg'], 'desktop-start-fg'),
    textMuted: blendForContrast(
      colorToken(tokens['desktop-start-fg'], 'desktop-start-fg'),
      colorToken(tokens['desktop-window-bg'], 'desktop-window-bg'),
      4.6,
    ),
    border: colorToken(tokens['desktop-window-border'], 'desktop-window-border'),
    accent: colorToken(tokens['desktop-focus-ring'], 'desktop-focus-ring'),
    accentText: contrastText(colorToken(tokens['desktop-focus-ring'], 'desktop-focus-ring')),
    accentHover: colorToken(tokens['desktop-taskbar-active'], 'desktop-taskbar-active'),
    focus: colorToken(tokens['desktop-focus-ring'], 'desktop-focus-ring'),
    danger: colorToken(tokens['desktop-close-bg'], 'desktop-close-bg'),
    dangerSurface: dangerTintedSurface(
      colorToken(tokens['desktop-close-bg'], 'desktop-close-bg'),
      4.5,
    ),
    inputSurface: colorToken(tokens['desktop-window-bg'], 'desktop-window-bg'),
  };
}

function colorToken(value: string | number, name: string): string {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a color string`);
  return value;
}

function contrastText(background: string): '#000000' | '#ffffff' {
  const rgb = parseHex(background);
  if (!rgb) return '#ffffff';
  const luminance = rgb
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}

function blend(foreground: string, background: string, amount: number): string {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return foreground;
  const mix = (a: number, b: number) => Math.round(a * (1 - amount) + b * amount);
  return `#${[mix(fg[0], bg[0]), mix(fg[1], bg[1]), mix(fg[2], bg[2])]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Largest blend toward `background` whose contrast against it still clears
 * `target` (WEB-0026: muted text must stay >= 4.5:1 on every preset while
 * remaining visibly secondary to the primary text).
 */
function blendForContrast(foreground: string, background: string, target: number): string {
  let lo = 0;
  let hi = 0.6;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(blend(foreground, background, mid), background) >= target) lo = mid;
    else hi = mid;
  }
  return blend(foreground, background, Math.floor(lo * 100) / 100);
}

/**
 * Danger surface tinted away from the danger color until the pair clears
 * `target` (WEB-0026). Prefers a soft white wash; light danger colors (beige,
 * neon cyan) fall back to a dark tint so the pair keeps its floor.
 */
function dangerTintedSurface(danger: string, target: number): string {
  for (let percent = 86; percent <= 97; percent++) {
    const hex = blend(danger, '#ffffff', percent / 100);
    if (contrastRatio(danger, hex) >= target) return hex;
  }
  for (let percent = 82; percent <= 96; percent++) {
    const hex = blend(danger, '#000000', percent / 100);
    if (contrastRatio(danger, hex) >= target) return hex;
  }
  return blend(danger, '#ffffff', 0.95);
}

function parseHex(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return null;
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ];
}
