import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <defs>
    <radialGradient id="mbg1" cx="20%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ff7e5f"/>
      <stop offset="50%" stop-color="#feb47b"/>
      <stop offset="100%" stop-color="#3f2b96"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#mbg1)"/>
  <path d="M-200,500 Q400,200 960,600 T2100,400 L2100,1200 L-200,1200 Z" fill="rgba(255,255,255,0.08)"/>
  <path d="M-200,700 Q600,900 1200,450 T2100,800 L2100,1200 L-200,1200 Z" fill="rgba(0,0,0,0.15)"/>
</svg>`;

export const aquaPreset: ThemePreset = {
  id: 'aqua',
  name: 'Aqua',
  category: 'Modern',
  description: 'Light chrome, squircle window curves and a sunset glow.',
  tokens: {
    'desktop-wallpaper': '#3d405b',
    'desktop-window-bg': '#ffffff',
    'desktop-window-border': '#d1d5db',
    'desktop-titlebar-bg': '#f3f4f6',
    'desktop-titlebar-fg': '#111827',
    'desktop-titlebar-height': 28,
    'desktop-close-bg': '#ef4444',
    'desktop-close-fg': '#ffffff',
    'desktop-focus-ring': '#3b82f6',
    'desktop-radius': 10,
    'desktop-taskbar-bg': '#f8fafc',
    'desktop-taskbar-fg': '#1f2937',
    'desktop-taskbar-hover': '#e2e8f0',
    'desktop-taskbar-active': '#3b82f6',
    'desktop-start-bg': '#ffffff',
    'desktop-start-border': '#e5e7eb',
    'desktop-start-fg': '#111827',
    'desktop-start-hover': '#f3f4f6',
    'desktop-resize-handle': 6,
    'desktop-min-width': 260,
    'desktop-min-height': 180,
  },
  wallpaperBg: '#3d405b',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/macos.svg',
};
