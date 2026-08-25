import type { ThemePreset } from './theme-types';

/**
 * Material 2023+: softened silk waves in 20% opacity steps with two cumulus
 * clusters near the upper third over a blue-gray base (spec §3.4).
 */
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#90A4AE"/>
      <stop offset="55%" stop-color="#6B8291"/>
      <stop offset="100%" stop-color="#546E7A"/>
    </linearGradient>
    <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#B7C6CE"/>
      <stop offset="100%" stop-color="#90A4AE"/>
    </linearGradient>
    <linearGradient id="wave2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8FA6B3"/>
      <stop offset="100%" stop-color="#78909C"/>
    </linearGradient>
    <radialGradient id="puff" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="70%" stop-color="#F2F5F7"/>
      <stop offset="100%" stop-color="rgba(242,245,247,0)"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <g opacity="0.9">
    <ellipse cx="430" cy="250" rx="230" ry="72" fill="url(#puff)"/>
    <ellipse cx="600" cy="290" rx="170" ry="58" fill="url(#puff)" opacity="0.85"/>
    <ellipse cx="300" cy="300" rx="140" ry="48" fill="url(#puff)" opacity="0.75"/>
    <ellipse cx="1450" cy="200" rx="260" ry="80" fill="url(#puff)" opacity="0.95"/>
    <ellipse cx="1650" cy="250" rx="180" ry="62" fill="url(#puff)" opacity="0.8"/>
    <ellipse cx="1290" cy="255" rx="130" ry="46" fill="url(#puff)" opacity="0.7"/>
  </g>
  <path d="M0,520 C420,380 900,640 1340,480 C1600,385 1780,450 1920,400 L1920,1080 L0,1080 Z" fill="url(#wave1)" opacity="0.20"/>
  <path d="M0,700 C500,540 980,800 1420,650 C1660,565 1820,640 1920,600 L1920,1080 L0,1080 Z" fill="url(#wave2)" opacity="0.40"/>
  <path d="M0,880 C520,720 1020,960 1480,830 C1700,765 1840,840 1920,800 L1920,1080 L0,1080 Z" fill="#465A66" opacity="0.55"/>
</svg>`;

export const cloudPreset: ThemePreset = {
  id: 'cloud',
  name: 'Cloud',
  category: 'Modern',
  description: 'Material pillow radii, unified white chrome, Google hairlines and pill controls.',
  tokens: {
    'desktop-wallpaper': '#546E7A',
    'desktop-window-bg': '#FFFFFF',
    'desktop-window-border': '#80868F',
    'desktop-titlebar-bg': '#FFFFFF',
    'desktop-titlebar-fg': '#202124',
    'desktop-titlebar-height': 34,
    'desktop-close-bg': '#D93025',
    'desktop-close-fg': '#FFFFFF',
    'desktop-focus-ring': '#1A73E8',
    'desktop-radius': 16,
    'desktop-taskbar-bg': '#F1F3F4',
    'desktop-taskbar-fg': '#202124',
    'desktop-taskbar-hover': '#E4E7EA',
    'desktop-taskbar-active': '#D2E3FC',
    'desktop-start-bg': '#FFFFFF',
    'desktop-start-border': '#DADCE0',
    'desktop-start-fg': '#202124',
    'desktop-start-hover': '#F1F3F4',
    'desktop-resize-handle': 6,
    'desktop-min-width': 260,
    'desktop-min-height': 180,
    // ---- app-side era chrome ----
    'desktop-window-shadow': '0 16 40 rgba(30,40,60,.28)',
    'desktop-taskbar-height': 56,
    'desktop-titlebar-button-shape': 'pill',
    'desktop-titlebar-inactive-bg': '#FFFFFF',
    'desktop-titlebar-inactive-fg': '#9AA0A6',
    'desktop-menu-bg': '#FFFFFF',
    'desktop-menu-border': '#DADCE0',
    'desktop-menu-hover': '#F1F3F4',
    'desktop-menu-radius': 16,
    'desktop-chrome-font': '"Google Sans","Roboto",system-ui,sans-serif',
  },
  wallpaperBg: '#546E7A',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/chromeos.svg',
};
