import type { ThemePreset } from './theme-types';

/**
 * Breeze Dark facets: geometric planes retuned to the Plasma palette with one
 #3DAEE9 highlight edge (spec §3.4).
 */
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#232629"/>
      <stop offset="55%" stop-color="#2C3136"/>
      <stop offset="100%" stop-color="#31363B"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#pbg)"/>
  <polygon points="0,0 960,540 0,1080" fill="#1B1E22" opacity="0.85"/>
  <polygon points="960,540 1920,0 1920,600" fill="#383E45" opacity="0.8"/>
  <polygon points="960,540 1920,600 1400,1080" fill="#262B30" opacity="0.9"/>
  <polygon points="500,1080 960,540 1400,1080" fill="#2E343B" opacity="0.85"/>
  <path d="M960,540 L1920,0 L1920,14 L978,549 Z" fill="#3DAEE9" opacity="0.75"/>
</svg>`;

export const breezePreset: ThemePreset = {
  id: 'breeze',
  name: 'Breeze Dark',
  category: 'Modern',
  description:
    'Plasma 6 Breeze Dark: exact palette, thin sharp chrome, tray + clock panel anatomy.',
  tokens: {
    'desktop-wallpaper': '#232629',
    'desktop-window-bg': '#2A2E32',
    'desktop-window-border': '#71797F',
    'desktop-titlebar-bg': '#31363B',
    'desktop-titlebar-fg': '#EFF0F1',
    'desktop-titlebar-height': 30,
    'desktop-close-bg': '#C43B4B',
    'desktop-close-fg': '#FFFFFF',
    'desktop-focus-ring': '#3DAEE9',
    'desktop-radius': 4,
    'desktop-taskbar-bg': '#1B1E23',
    'desktop-taskbar-fg': '#EFF0F1',
    'desktop-taskbar-hover': '#383F48',
    'desktop-taskbar-active': '#3A7FAC',
    'desktop-start-bg': '#2A2E32',
    'desktop-start-border': '#4D5560',
    'desktop-start-fg': '#EFF0F1',
    'desktop-start-hover': '#373E47',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
    // ---- app-side era chrome ----
    'desktop-window-shadow': '0 18 44 rgba(0,0,0,.5)',
    'desktop-taskbar-height': 44,
    'desktop-titlebar-button-shape': 'rounded',
    'desktop-titlebar-inactive-bg': '#26292D',
    'desktop-titlebar-inactive-fg': '#7F8388',
    'desktop-menu-bg': '#2A2E32',
    'desktop-menu-border': '#4D5560',
    'desktop-menu-hover': '#373E47',
    'desktop-menu-radius': 4,
    'desktop-tray-bg': '#14161A',
    'desktop-chrome-font': '"Inter","Noto Sans",system-ui,sans-serif',
  },
  wallpaperBg: '#232629',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/plasma.svg',
};
