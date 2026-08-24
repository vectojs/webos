import type { ThemePreset } from './theme-types';

/**
 * Dreamcore moon scene: two fog bands, film grain (feTurbulence at 4%), and
 * one slightly-off eye-shaped cloud — weirdcore restraint, not horror
 * (spec §3.4).
 */
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
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#dcsky)"/>
  <circle cx="1400" cy="300" r="160" fill="url(#moon)" opacity="0.85"/>
  <!-- the one slightly-wrong element: a drifting eye-shaped cloud -->
  <g transform="translate(520 330)" opacity="0.85">
    <ellipse cx="0" cy="0" rx="150" ry="62" fill="#F6EDEF"/>
    <ellipse cx="118" cy="-8" rx="70" ry="40" fill="#F6EDEF"/>
    <circle cx="10" cy="0" r="30" fill="#9A8FB8"/>
    <circle cx="10" cy="0" r="14" fill="#4A4E69"/>
    <circle cx="18" cy="-8" r="5" fill="#F8EDEB"/>
  </g>
  <!-- fog bands -->
  <rect y="430" width="1920" height="180" fill="#FFFFFF" opacity="0.18"/>
  <rect y="600" width="1920" height="140" fill="#FFFFFF" opacity="0.10"/>
  <path d="M-100,800 C300,650 700,950 1100,750 C1500,550 1700,850 2050,700 L2050,1150 L-100,1150 Z" fill="#355c7d" opacity="0.7"/>
  <path d="M-100,900 C400,750 800,1050 1300,850 C1700,700 1850,900 2050,850 L2050,1150 L-100,1150 Z" fill="#22223b" opacity="0.85"/>
  <rect width="1920" height="1080" filter="url(#grain)" opacity="0.04"/>
</svg>`;

export const dreamcorePreset: ThemePreset = {
  id: 'dreamcore',
  name: 'Dreamcore',
  category: 'Aesthetic',
  description:
    'Liminal pastels: haze instead of contrast, big soft radii, muted rose and lavender focus.',
  tokens: {
    'desktop-wallpaper': '#6C5B7B',
    'desktop-window-bg': '#FBF7F3',
    'desktop-window-border': '#9E7E8E',
    'desktop-titlebar-bg': '#EADCF0',
    'desktop-titlebar-fg': '#5C5470',
    'desktop-titlebar-height': 26,
    'desktop-close-bg': '#9D4F67',
    'desktop-close-fg': '#FFFFFF',
    'desktop-focus-ring': '#8F76C4',
    'desktop-radius': 14,
    'desktop-taskbar-bg': '#586C94',
    'desktop-taskbar-fg': '#FBEDF4',
    'desktop-taskbar-hover': '#6C5B7B',
    'desktop-taskbar-active': '#B26E86',
    'desktop-start-bg': '#FAF7F5',
    'desktop-start-border': '#E8CCD6',
    'desktop-start-fg': '#4E6089',
    'desktop-start-hover': '#FBE3D2',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
    // ---- app-side era chrome ----
    // Haze, not shadow: depth through low-opacity washes (spec §3.3).
    'desktop-window-shadow': '0 20 50 rgba(90,80,110,.22)',
    'desktop-taskbar-height': 40,
    'desktop-titlebar-button-shape': 'rounded',
    'desktop-titlebar-inactive-bg': '#EFE6F2',
    'desktop-titlebar-inactive-fg': '#A89BB5',
    'desktop-menu-bg': '#FAF5F8',
    'desktop-menu-border': '#E8CCD6',
    'desktop-menu-hover': '#F3E6EF',
    'desktop-menu-radius': 12,
    'desktop-chrome-font': 'system-ui,sans-serif',
  },
  wallpaperBg: '#6C5B7B',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/dreamcore.svg',
};
