import type { ThemePreset } from './theme-types';

/**
 * Panther-era horizon: sky gradient with an upper-right sun glow, a glassy
 * water band with horizontal light streaks, and a faint full-image pinstripe
 * overlay (spec §3.4).
 */
const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8ED0F5"/>
      <stop offset="55%" stop-color="#5FA3DA"/>
      <stop offset="100%" stop-color="#3E86C6"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3E86C6"/>
      <stop offset="100%" stop-color="#2B5E96"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.85)"/>
      <stop offset="40%" stop-color="rgba(255,244,214,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="620" fill="url(#sky)"/>
  <circle cx="1450" cy="180" r="420" fill="url(#sun)"/>
  <rect y="620" width="1920" height="460" fill="url(#water)"/>
  <g stroke="#CFE7F8" stroke-width="3" opacity="0.4">
    <line x1="140" y1="668" x2="700" y2="668"/>
    <line x1="980" y1="700" x2="1700" y2="700"/>
    <line x1="320" y1="752" x2="900" y2="752"/>
    <line x1="1150" y1="806" x2="1820" y2="806"/>
    <line x1="220" y1="884" x2="760" y2="884"/>
    <line x1="1050" y1="962" x2="1640" y2="962"/>
  </g>
  <g fill="#FFFFFF" opacity="0.14">
    <path d="M-120,300 C240,240 480,330 760,290 C520,350 200,360 -120,340 Z"/>
    <path d="M1100,380 C1420,320 1680,400 2040,360 C1740,430 1380,450 1100,420 Z"/>
  </g>
  <g opacity="0.04">
    <rect width="1920" height="1080" fill="url(#stripes)"/>
  </g>
  <defs>
    <pattern id="stripes" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#0F285A"/>
    </pattern>
  </defs>
</svg>`;

export const aquaPreset: ThemePreset = {
  id: 'aqua',
  name: 'Aqua',
  // Spec §5-P0: Mac OS X Aqua is the classic era; aero takes Modern.
  category: 'Classic',
  description:
    'Mac OS X Aqua: pinstriped chrome, traffic lights left, candy gloss and soft shadows.',
  tokens: {
    'desktop-wallpaper': '#3572B0',
    'desktop-window-bg': '#FFFFFF',
    'desktop-window-border': '#5F6E80',
    'desktop-titlebar-bg': '#E9EEF7',
    'desktop-titlebar-fg': '#000000',
    'desktop-titlebar-height': 28,
    'desktop-close-bg': '#FF5449',
    'desktop-close-fg': '#43100A',
    'desktop-focus-ring': '#3D77D2',
    'desktop-radius': 10,
    'desktop-taskbar-bg': '#DFE7F0',
    'desktop-taskbar-fg': '#111111',
    'desktop-taskbar-hover': '#CBD8E6',
    'desktop-taskbar-active': '#A9C6E8',
    'desktop-start-bg': '#F2F5F9',
    'desktop-start-border': '#B8C5D4',
    'desktop-start-fg': '#111111',
    'desktop-start-hover': '#DDE6F0',
    'desktop-resize-handle': 6,
    'desktop-min-width': 260,
    'desktop-min-height': 180,
    // ---- app-side era chrome ----
    'desktop-window-shadow': '0 14 36 rgba(20,40,70,.38)',
    'desktop-taskbar-height': 60,
    'desktop-titlebar-button-shape': 'circle',
    'desktop-titlebar-inactive-bg': '#EEF1F5',
    'desktop-titlebar-inactive-fg': '#666666',
    'desktop-menu-bg': '#F4F7FA',
    'desktop-menu-border': '#B8C5D4',
    'desktop-menu-hover': '#DDE6F0',
    'desktop-menu-radius': 10,
    'desktop-pinstripe-color': 'rgba(15,40,90,0.08)',
    'desktop-pinstripe-gap': 3,
    'desktop-chrome-font': '"Lucida Grande","Helvetica Neue",system-ui,sans-serif',
  },
  wallpaperBg: '#3572B0',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/macos.svg',
};
