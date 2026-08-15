/**
 * Boot — Scene(onDemand) → DesktopShell → icon grid → seed VFS → devtools hook.
 */

import { Scene } from '@vectojs/core';
import { DesktopShell, type DesktopWindow } from '@vectojs/desktop';
import { buildConfig } from '../config';
import { findPreset } from '../model/themes';
import { DesktopClickCatcher, DesktopIcon, DESKTOP_ICON_SPECS } from './icons';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

const canvas = document.createElement('canvas');
canvas.setAttribute('aria-label', 'VectoJS WebOS desktop');
canvas.style.display = 'block';
root.appendChild(canvas);

const scene = new Scene(canvas, {
  renderMode: 'onDemand',
  disableWindowResize: true,
});

let shell: DesktopShell;

function applyTheme(presetId: string): void {
  const target = findPreset(presetId) ?? findPreset('aero')!;
  shell.setTheme(
    {
      ...target.tokens,
      'desktop-wallpaper': target.wallpaperBg,
    },
    target.wallpaperCdnUrl || target.wallpaperSvg,
  );
  scene.markDirty();
}

const boot = buildConfig((id) => applyTheme(id));
shell = new DesktopShell({ scene, config: boot.config });

// ---------------------------------------------------------------- viewport

function viewportCssSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  if (vv && vv.width >= 1 && vv.height >= 1) {
    return { w: Math.round(vv.width), h: Math.round(vv.height) };
  }
  return {
    w: Math.max(1, Math.round(window.innerWidth || 1280)),
    h: Math.max(1, Math.round(window.innerHeight || 800)),
  };
}

let lastSceneW = 0;
let lastSceneH = 0;

/** Keep windows offset from the scene center across zoom/resize refits. */
function recenterWindowsPreservingOffset(newW: number, newH: number): void {
  if (lastSceneW <= 0 || lastSceneH <= 0) {
    lastSceneW = newW;
    lastSceneH = newH;
    return;
  }
  if (lastSceneW === newW && lastSceneH === newH) return;

  const oldCx = lastSceneW / 2;
  const oldCy = lastSceneH / 2;
  const newCx = newW / 2;
  const newCy = newH / 2;
  const taskbarH = shell.taskbar ? shell.taskbar.height : 40;
  const maxUsableH = Math.max(120, newH - taskbarH);

  for (const win of shell.windowManager.list()) {
    if (win.maximized || win.minimized) continue;
    const curW = win.width;
    const curH = win.height;
    const offX = win.x + curW / 2 - oldCx;
    const offY = win.y + curH / 2 - oldCy;
    const nextX = Math.max(8, Math.min(newW - curW - 8, Math.round(newCx + offX - curW / 2)));
    const nextY = Math.max(8, Math.min(maxUsableH - curH - 8, Math.round(newCy + offY - curH / 2)));
    win.setGeometry(nextX, nextY, curW, curH);
  }

  lastSceneW = newW;
  lastSceneH = newH;
}

function fit(): void {
  const vp = viewportCssSize();
  scene.resize(vp.w, vp.h);
  shell.resize(vp.w, vp.h);
  recenterWindowsPreservingOffset(vp.w, vp.h);
}

// One resize path: visualViewport covers browser zoom and window resize;
// the plain `resize` listener is the fallback for engines without it.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fit);
} else {
  window.addEventListener('resize', fit);
}

// Order: shell → size → rAF → desktop icons → initial windows
shell.start();
fit();
scene.start();

// ------------------------------------------------------------- desktop icons

const catcher = new DesktopClickCatcher(() => {
  for (const icon of desktopIcons) icon.setSelected(false);
});
catcher.width = 1;
catcher.height = 1;
scene.add(catcher);

const desktopIcons: DesktopIcon[] = [];
const startX = 14;
const startY = 14;
const colGap = 80;
const rowGap = 80;
const itemsPerCol = 6;

DESKTOP_ICON_SPECS.forEach((spec, index) => {
  const icon = new DesktopIcon(spec.appId, spec.label, (id) => shell.open(id));
  const row = index % itemsPerCol;
  const col = Math.floor(index / itemsPerCol);
  icon.x = startX + col * colGap;
  icon.y = startY + row * rowGap;
  desktopIcons.push(icon);
  scene.add(icon);
});

// --------------------------------------------------------------- seed + open

void (async () => {
  const vfs = boot.config.vfs;
  if (vfs) {
    await vfs.mkdir('/docs');
    await vfs.mkdir('/notes');
    await vfs.mkdir('/system');
    await vfs.write(
      '/docs/readme.txt',
      'Welcome to VectoJS WebOS!\n\nA complete Zero-DOM Canvas operating environment.\nShortcuts:\n  • Ctrl+Alt+T:    New Terminal\n  • Ctrl+N:        New Notepad\n  • Ctrl+W:        Close Focused Window\n  • Ctrl+Space:    Toggle Start Menu\n',
    );
    await vfs.write(
      '/docs/shortcuts.txt',
      'Keybindings:\n  • Ctrl+Space  - Start Menu\n  • Ctrl+N      - Notes\n  • Ctrl+Alt+T  - Terminal\n  • Ctrl+W      - Close Window\n',
    );
  }

  const termWin: DesktopWindow | null = shell.open('terminal');
  if (termWin) termWin.setGeometry(200, 36, 540, 380);
  const filesWin: DesktopWindow | null = shell.open('files');
  if (filesWin) filesWin.setGeometry(560, 80, 520, 400);
  scene.markDirty();
})();

// ----------------------------------------------------------------- devtools

let devtoolsInstance: { detach(): void } | null = null;

async function toggleDevtools(): Promise<void> {
  if (devtoolsInstance) {
    devtoolsInstance.detach();
    devtoolsInstance = null;
    return;
  }
  // Dynamic import: the production bundle carries no devtools code unless
  // the user asks for it.
  const { attachDevtools } = await import('@vectojs/devtools');
  devtoolsInstance = attachDevtools(scene, {
    width: 340,
    refreshInterval: 500,
    showPerf: true,
    defaultTab: 'tree',
  });
}

const webosApi = {
  shell,
  scene,
  vfs: boot.config.vfs,
  fit,
  applyTheme,
  toggleDevtools,
  audit: async () => {
    const { auditScene } = await import('@vectojs/devtools/headless');
    return auditScene(scene);
  },
};

(window as unknown as Record<string, unknown>).webos = webosApi;
(window as unknown as Record<string, unknown>).__app = {
  scene,
  shell,
  vfs: boot.config.vfs,
  audit: webosApi.audit,
};

if (new URLSearchParams(location.search).has('debug')) {
  void toggleDevtools();
}
