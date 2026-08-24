import type { ThemePreset } from './theme-types';

const wallpaper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#008080"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>`;

export const y2kPreset: ThemePreset = {
  id: 'y2k',
  name: 'Y2K',
  category: 'Retro',
  description: 'Teal grid wallpaper, navy titlebar and 3D beveled chrome.',
  tokens: {
    'desktop-wallpaper': '#008080',
    'desktop-window-bg': '#d4d0c8',
    'desktop-window-border': '#6e6e6e',
    'desktop-titlebar-bg': '#000080',
    'desktop-titlebar-fg': '#ffffff',
    'desktop-titlebar-height': 24,
    'desktop-close-bg': '#d4d0c8',
    'desktop-close-fg': '#000000',
    'desktop-focus-ring': '#000080',
    'desktop-radius': 0,
    'desktop-taskbar-bg': '#c0c0c0',
    'desktop-taskbar-fg': '#000000',
    'desktop-taskbar-hover': '#dfdfdf',
    'desktop-taskbar-active': '#585858',
    'desktop-start-bg': '#d4d0c8',
    'desktop-start-border': '#808080',
    'desktop-start-fg': '#000000',
    'desktop-start-hover': '#dfdfdf',
    'desktop-resize-handle': 4,
    'desktop-min-width': 200,
    'desktop-min-height': 140,
  },
  wallpaperBg: '#008080',
  wallpaperSvg: wallpaper,
  wallpaperCdnUrl: 'https://cdn.vectojs.org/webos/wallpapers/y2k.svg',
};
