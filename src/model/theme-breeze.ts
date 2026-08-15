import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14181f"/>
      <stop offset="50%" stop-color="#232936"/>
      <stop offset="100%" stop-color="#12151b"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#pbg)"/>
  <polygon points="0,0 960,540 0,1080" fill="#1b202a" opacity="0.7"/>
  <polygon points="960,540 1920,0 1920,600" fill="#2d3546" opacity="0.6"/>
  <polygon points="960,540 1920,600 1400,1080" fill="#1f2532" opacity="0.8"/>
  <polygon points="500,1080 960,540 1400,1080" fill="#293140" opacity="0.75"/>
</svg>`;

export const breezePreset: ThemePreset = {
  id: 'breeze',
  name: 'Breeze Dark',
  category: 'Modern',
  description: 'Sharp slate geometry, dark panels and a red close accent.',
  tokens: {
    'desktop-wallpaper': '#2b303a',
    'desktop-window-bg': '#242930',
    'desktop-window-border': '#3a414d',
    'desktop-titlebar-bg': '#1e2228',
    'desktop-titlebar-fg': '#f0f2f5',
    'desktop-titlebar-height': 30,
    'desktop-close-bg': '#da4453',
    'desktop-close-fg': '#ffffff',
    'desktop-focus-ring': '#3daee9',
    'desktop-radius': 4,
    'desktop-taskbar-bg': '#191c21',
    'desktop-taskbar-fg': '#ffffff',
    'desktop-taskbar-hover': '#2e343f',
    'desktop-taskbar-active': '#1b4e75',
    'desktop-start-bg': '#242930',
    'desktop-start-border': '#3a414d',
    'desktop-start-fg': '#f0f2f5',
    'desktop-start-hover': '#313642',
    'desktop-resize-handle': 6,
    'desktop-min-width': 240,
    'desktop-min-height': 160,
  },
  wallpaperBg: '#2b303a',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/plasma.svg',
};
