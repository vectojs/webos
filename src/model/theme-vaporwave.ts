import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0221"/>
      <stop offset="40%" stop-color="#240046"/>
      <stop offset="70%" stop-color="#7209b7"/>
      <stop offset="100%" stop-color="#f72585"/>
    </linearGradient>
    <linearGradient id="vsun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe600"/>
      <stop offset="50%" stop-color="#ff007f"/>
      <stop offset="100%" stop-color="#7209b7"/>
    </linearGradient>
    <pattern id="vgrid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#05ffa1" stroke-width="1.5" opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="100%" height="650" fill="url(#vsky)"/>
  <circle cx="960" cy="480" r="220" fill="url(#vsun)"/>
  <rect x="700" y="440" width="520" height="6" fill="#0d0221"/>
  <rect x="700" y="465" width="520" height="10" fill="#0d0221"/>
  <rect x="700" y="495" width="520" height="14" fill="#0d0221"/>
  <rect x="700" y="530" width="520" height="20" fill="#0d0221"/>
  <rect x="700" y="570" width="520" height="28" fill="#0d0221"/>
  <polygon points="0,650 400,500 750,650" fill="#15002a"/>
  <polygon points="600,650 960,480 1350,650" fill="#1e003d"/>
  <polygon points="1200,650 1550,520 1920,650" fill="#15002a"/>
  <rect y="650" width="100%" height="430" fill="#0b001a"/>
  <g transform="matrix(1 0 0 0.5 0 325)">
    <rect y="650" width="100%" height="860" fill="url(#vgrid)"/>
  </g>
  <line x1="0" y1="650" x2="1920" y2="650" stroke="#05ffa1" stroke-width="3"/>
</svg>`;

export const vaporwavePreset: ThemePreset = {
  id: 'vaporwave',
  name: 'Vaporwave',
  category: 'Aesthetic',
  description: 'Neon sunsets, perspective grids and hot pink glow.',
  tokens: {
    'desktop-wallpaper': '#2e0854',
    'desktop-window-bg': '#120524',
    'desktop-window-border': '#ff71ce',
    'desktop-titlebar-bg': '#ff71ce',
    'desktop-titlebar-fg': '#120524',
    'desktop-titlebar-height': 28,
    'desktop-close-bg': '#01cdfe',
    'desktop-close-fg': '#120524',
    'desktop-focus-ring': '#05ffa1',
    'desktop-radius': 6,
    'desktop-taskbar-bg': '#18082e',
    'desktop-taskbar-fg': '#ff71ce',
    'desktop-taskbar-hover': '#2e0854',
    'desktop-taskbar-active': '#01cdfe',
    'desktop-start-bg': '#120524',
    'desktop-start-border': '#ff71ce',
    'desktop-start-fg': '#05ffa1',
    'desktop-start-hover': '#ff71ce',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
  },
  wallpaperBg: '#2e0854',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/vaporwave.svg',
};
