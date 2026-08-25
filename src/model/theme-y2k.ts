import type { ThemePreset } from './theme-types';

/**
 * Authentic Win98 desktop: flat teal with the optional "setup" diagonal cloud
 * band in the lower-right at very low contrast. No gradients (spec §3.4).
 */
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#008080"/>
  <g transform="rotate(-18 1500 900)" opacity="0.10">
    <ellipse cx="1380" cy="860" rx="260" ry="52" fill="#FFFFFF"/>
    <ellipse cx="1600" cy="920" rx="300" ry="58" fill="#FFFFFF"/>
    <ellipse cx="1420" cy="985" rx="240" ry="48" fill="#FFFFFF"/>
    <ellipse cx="1680" cy="1030" rx="280" ry="54" fill="#FFFFFF"/>
  </g>
</svg>`;

export const y2kPreset: ThemePreset = {
  id: 'y2k',
  name: 'Y2K',
  category: 'Retro',
  description:
    'Windows 98/2000: true 4-tone bevels, gradient navy titlebar, inset tray well, Tahoma.',
  tokens: {
    'desktop-wallpaper': '#008080',
    'desktop-window-bg': '#D4D0C8',
    // ButtonShadow mid tone reserved for the bevel tokens; the frame keeps a
    // contract-passing gray (WEB-0023 border:surface >= 3:1) — DEC-0018.
    'desktop-window-border': '#6E6E6E',
    'desktop-titlebar-bg': '#000080',
    'desktop-titlebar-fg': '#FFFFFF',
    'desktop-titlebar-height': 20,
    'desktop-close-bg': '#D4D0C8',
    'desktop-close-fg': '#000000',
    'desktop-focus-ring': '#000080',
    'desktop-radius': 0,
    'desktop-taskbar-bg': '#C0C0C0',
    'desktop-taskbar-fg': '#000000',
    'desktop-taskbar-hover': '#DFDFDF',
    // Authentic pressed-gray #ADABA4 fails the accent-label floor; the pressed
    // bevel look is drawn by WebOSTaskbar itself — DEC-0018.
    'desktop-taskbar-active': '#585858',
    'desktop-start-bg': '#D4D0C8',
    'desktop-start-border': '#808080',
    'desktop-start-fg': '#000000',
    'desktop-start-hover': '#DFDFDF',
    'desktop-resize-handle': 4,
    'desktop-min-width': 200,
    'desktop-min-height': 140,
    // ---- app-side era chrome ----
    // Flat era: no window shadow token (omitted by design).
    'desktop-taskbar-height': 30,
    'desktop-titlebar-button-shape': 'square',
    'desktop-titlebar-gradient-to': '#1084D0',
    'desktop-titlebar-inactive-bg': '#808080',
    'desktop-titlebar-inactive-fg': '#D4D0C8',
    'desktop-bevel-light': '#FFFFFF',
    'desktop-bevel-light-inner': '#DFDFDF',
    'desktop-bevel-dark-inner': '#808080',
    'desktop-bevel-dark': '#000000',
    'desktop-menu-bg': '#D4D0C8',
    'desktop-menu-border': '#808080',
    'desktop-menu-hover': '#DFDFDF',
    'desktop-menu-radius': 0,
    'desktop-tray-bg': '#D4D0C8',
    'desktop-chrome-font': '"Tahoma","MS Sans Serif",sans-serif',
  },
  wallpaperBg: '#008080',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/y2k.svg',
};
