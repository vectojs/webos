import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <defs>
    <linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="cwave1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <linearGradient id="cwave2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#cbg)"/>
  <path d="M0,400 C400,250 800,650 1200,400 C1600,150 1800,300 1920,250 L1920,1080 L0,1080 Z" fill="url(#cwave1)" opacity="0.35"/>
  <path d="M0,600 C500,450 900,800 1400,550 C1700,400 1850,550 1920,500 L1920,1080 L0,1080 Z" fill="url(#cwave2)" opacity="0.3"/>
</svg>`;

export const cloudPreset: ThemePreset = {
  id: 'cloud',
  name: 'Cloud',
  category: 'Modern',
  description: 'Material rounded pills, slate tones, high contrast.',
  tokens: {
    'desktop-wallpaper': '#37474f',
    'desktop-window-bg': '#f8fafc',
    'desktop-window-border': '#94a3b8',
    'desktop-titlebar-bg': '#e2e8f0',
    'desktop-titlebar-fg': '#0f172a',
    'desktop-titlebar-height': 32,
    'desktop-close-bg': '#f43f5e',
    'desktop-close-fg': '#ffffff',
    'desktop-focus-ring': '#0284c7',
    'desktop-radius': 12,
    'desktop-taskbar-bg': '#1e293b',
    'desktop-taskbar-fg': '#f8fafc',
    'desktop-taskbar-hover': '#334155',
    'desktop-taskbar-active': '#0284c7',
    'desktop-start-bg': '#ffffff',
    'desktop-start-border': '#cbd5e1',
    'desktop-start-fg': '#0f172a',
    'desktop-start-hover': '#e2e8f0',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
  },
  wallpaperBg: '#37474f',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/chromeos.svg',
};
