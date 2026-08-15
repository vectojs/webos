/**
 * Boot — Scene(onDemand) → DesktopShell → icon grid → seed VFS → devtools hook.
 */

import { Scene } from '@vectojs/core';
import { DesktopShell, type DesktopWindow } from '@vectojs/desktop';
import { buildConfig, svgDataUrl } from '../config';
import { findPreset } from '../model/themes';
import { DesktopClickCatcher, DesktopIcon, DESKTOP_ICON_SPECS, MarqueeSelection } from './icons';

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
    target.wallpaperCdnUrl || svgDataUrl(target.wallpaperSvg),
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

/**
 * Keep windows offset from the scene center across zoom refits — and only
 * those. A zoom preserves the aspect ratio; a plain browser resize or the
 * early viewport settle does not, and shifting windows on those (measured:
 * the settle resize moved every boot window by +349,+129px) reads as broken
 * positioning.
 */
function recenterWindowsPreservingOffset(newW: number, newH: number): void {
  if (lastSceneW <= 0 || lastSceneH <= 0) {
    lastSceneW = newW;
    lastSceneH = newH;
    return;
  }
  if (lastSceneW === newW && lastSceneH === newH) return;
  const ratioChange = Math.abs(newW / newH - lastSceneW / lastSceneH) / (lastSceneW / lastSceneH);
  if (ratioChange > 0.02) {
    // Not a zoom — keep windows where they are; just re-anchor.
    lastSceneW = newW;
    lastSceneH = newH;
    return;
  }

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

let iconsReady = false;

function fit(): void {
  const vp = viewportCssSize();
  scene.resize(vp.w, vp.h);
  shell.resize(vp.w, vp.h);
  recenterWindowsPreservingOffset(vp.w, vp.h);
  // fit() runs before the icon grid exists at boot (TDZ guard).
  if (iconsReady) layoutIcons();
}

// One resize path: visualViewport covers browser zoom and window resize;
// the plain `resize` listener is the fallback for engines without it.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fit);
} else {
  window.addEventListener('resize', fit);
}

// Right-click never opens the browser's "Save image as…" menu on a desktop.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/**
 * Swallow browser-native shortcuts that a desktop would own. Editable
 * targets (the Notes TextArea shadow input) keep full native editing keys.
 */
// Browser-native bindings a desktop owns: Save/Print/Open/Reload/Bookmark.
const BROWSER_SHORTCUT_KEYS = new Set(['s', 'p', 'o', 'r', 'g', 'd']);
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement | null;
  const editable =
    !!target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  if (editable) return;
  if (e.key === 'F5' || e.key === 'F12') {
    e.preventDefault();
    return;
  }
  // The ShortcutRouter preventDefaults its own mapped chords; this only
  // swallows the browser's default bindings, never editable input.
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && BROWSER_SHORTCUT_KEYS.has(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

// ------------------------------------------------------------- desktop icons

const desktopIcons: DesktopIcon[] = [];

const marquee = new MarqueeSelection();
marquee.width = 1;
marquee.height = 1;
const catcher = new DesktopClickCatcher(
  () => {
    for (const icon of desktopIcons) icon.setSelected(false);
  },
  (rect, final) => {
    marquee.opacity = 1;
    marquee.x = rect.x;
    marquee.y = rect.y;
    marquee.width = rect.w;
    marquee.height = rect.h;
    for (const icon of desktopIcons) {
      const hit =
        icon.x + icon.width > rect.x &&
        icon.x < rect.x + rect.w &&
        icon.y + icon.height > rect.y &&
        icon.y < rect.y + rect.h;
      icon.setSelected(hit);
    }
    if (final) marquee.opacity = 0;
    scene.markDirty();
  },
);
// The catcher is the empty-desktop pointer surface, so its a11y mirror must be
// the BOTTOM-most mirror: added before the shell mounts anything, so every
// later mirror (taskbar, icons, windows) stacks above it and keeps its own
// clicks. Adding it after shell.start() made its mirror the topmost element
// at every point — Start and window clicks died and taskbar drags started
// marquees (measured: elementFromPoint over the Start button returned the
// catcher mirror).
scene.add(catcher);

// Order: catcher → shell → size → rAF → icons → marquee → initial windows
shell.start();
fit();
scene.start();

const startX = 14;
const startY = 14;
const colGap = 80;
const rowGap = 80;
/** Never taller than the usable desktop — no icon may overlap the taskbar. */
const maxItemsPerCol = 6;

/**
 * Re-flow the icon grid against the current scene height: the column height
 * is capped so the last row stays clear of the taskbar at any viewport size
 * (a large DPR / browser zoom shrinks the CSS viewport and would otherwise
 * push the tail of a fixed 6-per-column list into the taskbar).
 */
function layoutIcons(): void {
  const taskbarH = shell.taskbar ? shell.taskbar.height : 40;
  const usableH = Math.max(120, scene.height - taskbarH - 16);
  const perCol = Math.max(1, Math.min(maxItemsPerCol, Math.floor((usableH - startY) / rowGap)));
  desktopIcons.forEach((icon, index) => {
    const row = index % perCol;
    const col = Math.floor(index / perCol);
    icon.x = startX + col * colGap;
    icon.y = startY + row * rowGap;
  });
}

DESKTOP_ICON_SPECS.forEach((spec) => {
  const icon = new DesktopIcon(
    spec.appId,
    spec.label,
    (id) => shell.open(id),
    (target, toggle) => {
      if (toggle) {
        target.setSelected(!target.isSelected());
      } else {
        for (const other of desktopIcons) other.setSelected(other === target);
      }
    },
  );
  desktopIcons.push(icon);
  scene.add(icon);
});
layoutIcons();
iconsReady = true;

scene.add(marquee);

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
    return auditScene(scene, { includeOverlay: true });
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
