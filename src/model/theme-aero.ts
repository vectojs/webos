import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a4b8c"/>
      <stop offset="50%" stop-color="#1e73be"/>
      <stop offset="85%" stop-color="#38a3d1"/>
      <stop offset="100%" stop-color="#82d8b8"/>
    </linearGradient>
    <radialGradient id="glow" cx="60%" cy="40%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.45)"/>
      <stop offset="60%" stop-color="rgba(120,210,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1150" cy="430" r="600" fill="url(#glow)"/>
  <path d="M-100,750 C400,600 800,900 1400,550 C1700,375 1950,450 2100,400 L2100,1200 L-100,1200 Z" fill="rgba(255,255,255,0.06)"/>
</svg>`;

export const aeroPreset: ThemePreset = {
  id: 'aero',
  name: 'Aero',
  category: 'Classic',
  description: 'Frosted glass, sky-blue gradients and rounded crystal titlebars.',
  tokens: {
    'desktop-wallpaper': '#2572b4',
    'desktop-window-bg': '#ffffff',
    'desktop-window-border': '#7ca3cd',
    'desktop-titlebar-bg': '#cfe2f8',
    'desktop-titlebar-fg': '#0b2d52',
    'desktop-titlebar-height': 30,
    'desktop-close-bg': '#e81123',
    'desktop-close-fg': '#ffffff',
    'desktop-focus-ring': '#2572b4',
    'desktop-radius': 6,
    'desktop-taskbar-bg': '#153c66',
    'desktop-taskbar-fg': '#ffffff',
    'desktop-taskbar-hover': '#20558e',
    'desktop-taskbar-active': '#2b6cb0',
    'desktop-start-bg': '#f0f6ff',
    'desktop-start-border': '#7ca3cd',
    'desktop-start-fg': '#0b2d52',
    'desktop-start-hover': '#d0e4ff',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
  },
  wallpaperBg: '#2572b4',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/win7.svg',
};
