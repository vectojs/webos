import type { ThemePreset } from './theme-types';

/**
 * Outrun canon kept: sunset gradient, banded sun, perspective grid — plus palm
 * silhouettes flanking the grid, a marble-bust silhouette at the horizon, and
 * 2px scanlines at 5% over the sky half (spec §3.4).
 */
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
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#000000" opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="1920" height="650" fill="url(#vsky)"/>
  <circle cx="960" cy="480" r="220" fill="url(#vsun)"/>
  <rect x="700" y="440" width="520" height="6" fill="#0d0221"/>
  <rect x="700" y="465" width="520" height="10" fill="#0d0221"/>
  <rect x="700" y="495" width="520" height="14" fill="#0d0221"/>
  <rect x="700" y="530" width="520" height="20" fill="#0d0221"/>
  <rect x="700" y="570" width="520" height="28" fill="#0d0221"/>
  <!-- marble bust silhouette at the horizon -->
  <g fill="#15002a">
    <rect x="452" y="500" width="56" height="30"/>
    <polygon points="458,500 480,420 502,500"/>
    <polygon points="462,430 498,430 506,452 454,452"/>
    <rect x="466" y="404" width="28" height="26"/>
    <polygon points="466,404 480,388 494,404"/>
  </g>
  <!-- palms flanking the grid -->
  <g fill="#0d0221">
    <path d="M120,650 C130,540 118,470 140,398 L152,400 C138,472 152,540 148,650 Z"/>
    <path d="M146,404 C110,360 60,344 18,352 C64,326 122,338 150,376 Z"/>
    <path d="M148,400 C160,348 200,312 252,306 C210,340 180,372 158,410 Z"/>
    <path d="M150,406 C190,380 244,378 286,400 C240,398 192,410 156,424 Z"/>
    <path d="M144,410 C104,398 58,408 24,436 C68,410 116,416 148,432 Z"/>
    <path d="M1800,650 C1810,550 1798,486 1820,420 L1832,422 C1818,488 1832,552 1828,650 Z"/>
    <path d="M1826,426 C1790,382 1740,366 1698,374 C1744,348 1802,360 1830,398 Z"/>
    <path d="M1828,422 C1840,370 1880,334 1932,328 C1890,362 1860,394 1838,432 Z"/>
    <path d="M1830,428 C1870,402 1924,400 1966,422 C1920,420 1872,432 1836,446 Z"/>
  </g>
  <rect y="650" width="1920" height="430" fill="#0b001a"/>
  <g transform="matrix(1 0 0 0.5 0 325)">
    <rect y="650" width="1920" height="860" fill="url(#vgrid)"/>
  </g>
  <line x1="0" y1="650" x2="1920" y2="650" stroke="#05ffa1" stroke-width="3"/>
  <rect width="1920" height="650" fill="url(#scan)"/>
</svg>`;

export const vaporwavePreset: ThemePreset = {
  id: 'vaporwave',
  name: 'Vaporwave',
  category: 'Aesthetic',
  description: 'Neon-bordered dark chrome, glowing pink title text, scanlines and outrun canon.',
  tokens: {
    'desktop-wallpaper': '#2E0854',
    'desktop-window-bg': '#160A2E',
    'desktop-window-border': '#FF71CE',
    'desktop-titlebar-bg': '#1A0B33',
    'desktop-titlebar-fg': '#FF71CE',
    'desktop-titlebar-height': 28,
    'desktop-close-bg': '#01CDFE',
    'desktop-close-fg': '#120524',
    'desktop-focus-ring': '#05FFA1',
    'desktop-radius': 2,
    'desktop-taskbar-bg': '#18082E',
    'desktop-taskbar-fg': '#FF71CE',
    'desktop-taskbar-hover': '#2E0854',
    'desktop-taskbar-active': '#01CDFE',
    'desktop-start-bg': '#120524',
    'desktop-start-border': '#FF71CE',
    'desktop-start-fg': '#05FFA1',
    'desktop-start-hover': '#3D1A5B',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
    // ---- app-side era chrome ----
    // Neon glow instead of a shadow: reads as light emission, not elevation.
    'desktop-window-shadow': '0 0 26 rgba(255,113,206,.28)',
    'desktop-taskbar-height': 44,
    'desktop-titlebar-button-shape': 'rounded',
    'desktop-titlebar-inactive-bg': '#12071F',
    'desktop-titlebar-inactive-fg': '#8F5BB0',
    'desktop-menu-bg': '#160A2E',
    'desktop-menu-border': '#FF71CE',
    'desktop-menu-hover': '#3D1A5B',
    'desktop-menu-radius': 2,
    'desktop-glow-color': '#FF71CE',
    'desktop-glow-strength': 2,
    'desktop-chrome-font': '"Segoe UI",system-ui,sans-serif',
  },
  wallpaperBg: '#2E0854',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/vaporwave.svg',
};
