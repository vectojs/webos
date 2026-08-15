import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="dcsky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a4e69"/>
      <stop offset="50%" stop-color="#6c5b7b"/>
      <stop offset="100%" stop-color="#c06c84"/>
    </linearGradient>
    <radialGradient id="moon" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f8edeb"/>
      <stop offset="80%" stop-color="#fcd5ce"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#dcsky)"/>
  <circle cx="1400" cy="300" r="160" fill="url(#moon)" opacity="0.85"/>
  <path d="M-100,800 C300,650 700,950 1100,750 C1500,550 1700,850 2050,700 L2050,1150 L-100,1150 Z" fill="#355c7d" opacity="0.7"/>
  <path d="M-100,900 C400,750 800,1050 1300,850 C1700,700 1850,900 2050,850 L2050,1150 L-100,1150 Z" fill="#22223b" opacity="0.85"/>
</svg>`;

export const dreamcorePreset: ThemePreset = {
  id: 'dreamcore',
  name: 'Dreamcore',
  category: 'Aesthetic',
  description: 'Liminal lavender horizons, pastel gradients, soft comfort.',
  tokens: {
    'desktop-wallpaper': '#6c5b7b',
    'desktop-window-bg': '#faf7f5',
    'desktop-window-border': '#c06c84',
    'desktop-titlebar-bg': '#f8b195',
    'desktop-titlebar-fg': '#355c7d',
    'desktop-titlebar-height': 28,
    'desktop-close-bg': '#c06c84',
    'desktop-close-fg': '#ffffff',
    'desktop-focus-ring': '#6c5b7b',
    'desktop-radius': 8,
    'desktop-taskbar-bg': '#355c7d',
    'desktop-taskbar-fg': '#f8b195',
    'desktop-taskbar-hover': '#6c5b7b',
    'desktop-taskbar-active': '#c06c84',
    'desktop-start-bg': '#faf7f5',
    'desktop-start-border': '#f8b195',
    'desktop-start-fg': '#355c7d',
    'desktop-start-hover': '#f8b195',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
  },
  wallpaperBg: '#6c5b7b',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/dreamcore.svg',
};
