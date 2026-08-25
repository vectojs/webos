import type { ThemePreset } from './theme-types';

/**
 * Win11-style abstract bloom: concentric ribbon sweeps from the lower-left
 * over a deep-blue field, radial white core glow (spec 2026-08-24 §3.4).
 */
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#0E2C4C"/>
      <stop offset="55%" stop-color="#1B5FA8"/>
      <stop offset="100%" stop-color="#4FC3E8"/>
    </linearGradient>
    <radialGradient id="core" cx="60%" cy="40%" r="45%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.50)"/>
      <stop offset="45%" stop-color="rgba(160,220,250,0.18)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <linearGradient id="ribbon" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(79,195,232,0)"/>
      <stop offset="45%" stop-color="rgba(79,195,232,0.55)"/>
      <stop offset="75%" stop-color="rgba(255,255,255,0.65)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <circle cx="1150" cy="430" r="620" fill="url(#core)"/>
  <path d="M-120,980 C360,900 520,700 860,660 C1240,615 1420,740 2040,520 L2040,300 C1500,470 1300,420 900,500 C520,580 320,800 -120,850 Z" fill="url(#ribbon)" opacity="0.85"/>
  <path d="M-120,1060 C420,1010 640,830 1020,790 C1380,750 1560,850 2040,660 L2040,560 C1520,720 1330,650 950,700 C560,750 340,930 -120,980 Z" fill="url(#ribbon)" opacity="0.55"/>
  <path d="M-120,1140 C480,1110 760,970 1160,930 C1520,895 1700,970 2040,830 L2040,760 C1580,880 1400,810 1040,850 C640,895 400,1030 -120,1070 Z" fill="url(#ribbon)" opacity="0.35"/>
</svg>`;

export const aeroPreset: ThemePreset = {
  id: 'aero',
  name: 'Aero',
  // Spec §5-P0: aero is the modern Fluent default, not a classic era.
  category: 'Modern',
  description:
    'Fluent calm: blended titlebar, neutral surfaces, one blue accent and soft elevation.',
  tokens: {
    'desktop-wallpaper': '#123A63',
    'desktop-window-bg': '#F3F3F3',
    'desktop-window-border': '#767881',
    'desktop-titlebar-bg': '#F3F3F3',
    'desktop-titlebar-fg': '#1A1A1A',
    'desktop-titlebar-height': 32,
    'desktop-close-bg': '#C42B1C',
    'desktop-close-fg': '#FFFFFF',
    'desktop-focus-ring': '#0067C0',
    'desktop-radius': 8,
    'desktop-taskbar-bg': '#ECEEF0',
    'desktop-taskbar-fg': '#1A1A1A',
    'desktop-taskbar-hover': '#DCDFE3',
    'desktop-taskbar-active': '#2E6BB8',
    'desktop-start-bg': '#FFFFFF',
    'desktop-start-border': '#D6D6D6',
    'desktop-start-fg': '#1A1A1A',
    'desktop-start-hover': '#EEF4FB',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
    // ---- app-side era chrome (open record; engine ignores unknown keys) ----
    'desktop-window-shadow': '0 18 44 rgba(10,20,35,.34); 0 4 10 rgba(10,20,35,.22)',
    'desktop-taskbar-height': 48,
    'desktop-titlebar-button-shape': 'fullbleed',
    'desktop-titlebar-inactive-bg': '#F3F3F3',
    'desktop-titlebar-inactive-fg': '#8A8A8A',
    'desktop-menu-bg': '#FFFFFF',
    'desktop-menu-border': '#D6D6D6',
    'desktop-menu-hover': '#F5F5F5',
    'desktop-menu-radius': 8,
    'desktop-chrome-font': '"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif',
  },
  wallpaperBg: '#123A63',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/win7.svg',
};
