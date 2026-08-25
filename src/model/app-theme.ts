import type { AppThemeTokens, ThemePreset, TitlebarButtonShape } from './theme-types';
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
  menuBg: '#ffffff',
  menuBorder: '#cbd5e1',
  menuHover: '#f1f5f9',
  menuRadius: 8,
  trayBg: null,
  buttonShape: 'rounded',
  chromeFont: '"Segoe UI", system-ui, sans-serif',
  taskbarHeight: 40,
  windowShadow: null,
  titlebarGradientTo: null,
  titlebarInactiveBg: '#f1f5f9',
  titlebarInactiveFg: '#64748b',
  bevel: null,
  pinstripe: null,
  glow: null,
};

export function appTheme(): AppThemeTokens {
  return current;
}

/**
 * Derive app colors from the shell preset while keeping the app contract
 * stable. Era chrome tokens (spec 2026-08-24 §3.3) ride along as open-record
 * keys the engine ignores; absent keys resolve to era-neutral defaults.
 */
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
    menuBg: colorToken(tokens['desktop-menu-bg'], 'desktop-menu-bg'),
    menuBorder: colorToken(tokens['desktop-menu-border'], 'desktop-menu-border'),
    menuHover: colorToken(tokens['desktop-menu-hover'], 'desktop-menu-hover'),
    menuRadius: numberToken(tokens['desktop-menu-radius'], 'desktop-menu-radius'),
    trayBg:
      tokens['desktop-tray-bg'] === undefined
        ? null
        : colorToken(tokens['desktop-tray-bg'], 'desktop-tray-bg'),
    buttonShape: buttonShapeToken(tokens['desktop-titlebar-button-shape']),
    chromeFont: colorToken(tokens['desktop-chrome-font'], 'desktop-chrome-font'),
    taskbarHeight: numberToken(tokens['desktop-taskbar-height'], 'desktop-taskbar-height'),
    windowShadow:
      tokens['desktop-window-shadow'] === undefined
        ? null
        : colorToken(tokens['desktop-window-shadow'], 'desktop-window-shadow'),
    titlebarGradientTo:
      tokens['desktop-titlebar-gradient-to'] === undefined
        ? null
        : colorToken(tokens['desktop-titlebar-gradient-to'], 'desktop-titlebar-gradient-to'),
    titlebarInactiveBg: colorToken(
      tokens['desktop-titlebar-inactive-bg'],
      'desktop-titlebar-inactive-bg',
    ),
    titlebarInactiveFg: colorToken(
      tokens['desktop-titlebar-inactive-fg'],
      'desktop-titlebar-inactive-fg',
    ),
    bevel:
      tokens['desktop-bevel-light'] === undefined || tokens['desktop-bevel-dark'] === undefined
        ? null
        : {
            lightOuter: colorToken(tokens['desktop-bevel-light'], 'desktop-bevel-light'),
            lightInner: colorToken(
              tokens['desktop-bevel-light-inner'],
              'desktop-bevel-light-inner',
            ),
            darkInner: colorToken(tokens['desktop-bevel-dark-inner'], 'desktop-bevel-dark-inner'),
            darkOuter: colorToken(tokens['desktop-bevel-dark'], 'desktop-bevel-dark'),
          },
    pinstripe:
      tokens['desktop-pinstripe-color'] === undefined ||
      tokens['desktop-pinstripe-gap'] === undefined
        ? null
        : {
            color: colorToken(tokens['desktop-pinstripe-color'], 'desktop-pinstripe-color'),
            gap: numberToken(tokens['desktop-pinstripe-gap'], 'desktop-pinstripe-gap'),
          },
    glow:
      tokens['desktop-glow-color'] === undefined || tokens['desktop-glow-strength'] === undefined
        ? null
        : {
            color: colorToken(tokens['desktop-glow-color'], 'desktop-glow-color'),
            strength: numberToken(tokens['desktop-glow-strength'], 'desktop-glow-strength'),
          },
  };
}

const BUTTON_SHAPES: readonly TitlebarButtonShape[] = [
  'fullbleed',
  'pill',
  'circle',
  'rounded',
  'square',
];

function buttonShapeToken(value: unknown): TitlebarButtonShape {
  if (typeof value !== 'string' || !BUTTON_SHAPES.includes(value as TitlebarButtonShape)) {
    throw new TypeError(`desktop-titlebar-button-shape must be one of ${BUTTON_SHAPES.join('|')}`);
  }
  return value as TitlebarButtonShape;
}

function numberToken(value: string | number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
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
