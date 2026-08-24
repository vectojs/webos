/**
 * Boot — Scene(onDemand) → DesktopShell → icon grid → seed VFS → devtools hook.
 */

import { Scene } from '@vectojs/core';
import { DesktopShell, type DesktopWindow } from '@vectojs/desktop';
import {
  buildConfig,
  DEFAULT_PRESET,
  getActiveThemeId,
  persistTheme,
  setActiveThemeId,
  svgDataUrl,
} from '../config';
import { peekNextNoteWindowTitle } from '../apps/notes';
import { appTheme, setAppTheme } from '../model/app-theme';
import { findPreset, THEME_PRESETS } from '../model/themes';
import { pushRecent } from '../model/start-menu-model';
import { StorageVfs } from '../model/storage-vfs';
import { SEED_DIRS, SEED_DOCS } from '../model/seed-docs';
import { clampPosition, fitGeometry } from '../model/window-geometry';
import {
  DesktopClickCatcher,
  DesktopIcon,
  DESKTOP_ICON_SPECS,
  MarqueeSelection,
  setIconPreset,
} from './icons';
import { WebOSTaskbar } from './taskbar';
import { openY2KProgramMenu, WebOSStartMenu } from './start-menu';
import { showDesktopContextMenu } from './context-menu';
import { showBootSplash } from './boot-splash';

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

/** Recently launched app ids (start menu "Recent" section), newest first. */
const recentAppIds: string[] = [];

function applyTheme(presetId: string): void {
  const target = findPreset(presetId) ?? findPreset('aero')!;
  // Track the RESOLVED preset so the Settings indicator never shows a stale
  // id when a caller passed an unknown one (fallback applies 'aero').
  setActiveThemeId(target.id);
  setAppTheme(target);
  setIconPreset(target.id);
  // Keep the engine's placement math in sync with the era bar height BEFORE
  // setTheme — it repositions the taskbar using config.desktop.taskbarHeight.
  if (boot.config.desktop) boot.config.desktop.taskbarHeight = appTheme().taskbarHeight;
  shell.setTheme(
    {
      ...target.tokens,
      'desktop-wallpaper': target.wallpaperBg,
    },
    target.wallpaperCdnUrl || svgDataUrl(target.wallpaperSvg),
  );
  // setTheme() remounted the ENGINE taskbar; swap in the WebOS-owned one
  // (composition friction recorded upstream; fails safe if absent).
  installWebosTaskbar();
  closeStartMenu();
  persistTheme(target.id);
  scene.markDirty();
}

const boot = buildConfig((id) => applyTheme(id));
shell = new DesktopShell({ scene, config: boot.config });

/**
 * Per-instance window titles (audit #25 P2-D). The engine titles every
 * instance with the app's static label, so two terminals or two notes
 * windows were indistinguishable in the taskbar and for AT. Notes windows
 * carry their deterministic document name; other multi-instance apps get an
 * ordinal from the second instance on. The engine has no live-retitle API,
 * so a save renaming an open window stays out of scope (recorded deferred).
 */
const baseOpen = shell.open.bind(shell);
shell.open = (appId, opts) => {
  pushRecent(recentAppIds, appId);
  if (!opts?.title) {
    if (appId === 'notes') {
      return baseOpen(appId, { ...opts, title: peekNextNoteWindowTitle() });
    }
    const app = boot.config.apps?.find((a) => a.id === appId);
    const openCount = shell.windowManager.listByApp(appId).length + 1;
    if (app?.instances === 'multiple' && openCount > 1) {
      return baseOpen(appId, { ...opts, title: `${app.title} ${openCount}` });
    }
  }
  return baseOpen(appId, opts);
};

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
  const taskbarH = liveTaskbarHeight();
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
  clampWindowsToWorkArea();
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
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  // Desktop context menu on right-click of EMPTY desktop only (spec §4 #7).
  // Windows, the taskbar and icons own their own surfaces; over them we just
  // suppress the browser menu as before.
  const pt = scene.clientToScene(e.clientX, e.clientY);
  for (const win of shell.windowManager.list()) {
    if (pt.x >= win.x && pt.x <= win.x + win.width && pt.y >= win.y && pt.y <= win.y + win.height) {
      return;
    }
  }
  const tb = chrome.taskbar ?? shell.taskbar;
  if (tb && pt.x >= tb.x && pt.x <= tb.x + tb.width && pt.y >= tb.y) return;
  for (const icon of desktopIcons) {
    if (
      pt.x >= icon.x &&
      pt.x <= icon.x + icon.width &&
      pt.y >= icon.y &&
      pt.y <= icon.y + icon.height
    ) {
      return;
    }
  }
  showDesktopContextMenu(scene, pt.x, pt.y, {
    refresh: () => {
      fit();
      scene.markDirty();
    },
    openSettings: () => void shell.open('settings'),
    openAbout: () => void shell.open('about'),
  });
});

/**
 * Swallow browser-native shortcuts that a desktop would own. Editable
 * targets (the Notes TextArea shadow input) keep full native editing keys.
 */
// Browser-native bindings a desktop owns: Save/Print/Open/Reload/Bookmark.
const BROWSER_SHORTCUT_KEYS = new Set(['s', 'p', 'o', 'r', 'g', 'd']);

/** Snap/tiling gestures — Ctrl+Alt+Arrow snaps the focused window, Ctrl+Alt+G tiles. */
const SNAP_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

function focusedWindow(): DesktopWindow | null {
  return shell.windowManager.list().find((w) => w.focused) ?? null;
}

function workArea(): { x: number; y: number; width: number; height: number } {
  return shell.layout.workArea(shell.layout.primary().id);
}

/**
 * Pull any window whose box escapes the work area back inside — without
 * re-positioning windows that are already inside (audit #25 P2-B). Runs on
 * every viewport resize: the aspect-changing path skips re-centering by
 * design (measured +349,+129 shift), so clamping is the only correction a
 * narrow viewport gets.
 */
function clampWindowsToWorkArea(): void {
  const area = workArea();
  for (const win of shell.windowManager.list()) {
    if (win.maximized || win.minimized) continue;
    const pos = clampPosition(win.x, win.y, win.width, win.height, area);
    if (pos.x !== win.x || pos.y !== win.y) {
      win.setGeometry(pos.x, pos.y, win.width, win.height);
    }
  }
}

function snapFocused(dir: 'left' | 'right' | 'top' | 'bottom'): void {
  const win = focusedWindow();
  if (!win) return;
  const area = workArea();
  const halfW = Math.floor(area.width / 2);
  const halfH = Math.floor(area.height / 2);
  if (dir === 'left') win.setGeometry(area.x, area.y, halfW, area.height);
  else if (dir === 'right')
    win.setGeometry(area.x + area.width - halfW, area.y, halfW, area.height);
  else if (dir === 'top') win.setGeometry(area.x, area.y, area.width, halfH);
  else win.setGeometry(area.x, area.y + area.height - halfH, area.width, halfH);
  scene.markDirty();
}

/** Arrange all non-minimized windows in a √n grid over the work area. */
function tileWindows(): void {
  const wins = shell.windowManager.list().filter((w) => !w.minimized);
  if (wins.length === 0) return;
  const area = workArea();
  const cols = Math.ceil(Math.sqrt(wins.length));
  const rows = Math.ceil(wins.length / cols);
  const w = Math.floor(area.width / cols);
  const h = Math.floor(area.height / rows);
  wins.forEach((win, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    win.setGeometry(area.x + col * w, area.y + row * h, w, h);
  });
  scene.markDirty();
}

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement | null;
  const editable =
    !!target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

  // Browser-native chords a desktop owns are swallowed BEFORE the editable
  // bail-out (review PX-0079): none of s/p/o/r/g/d is a text-editing key, so
  // gating them on focus bought nothing — it only leaked Ctrl+P through to
  // the native print dialog when typing in Notes/Terminal.
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && BROWSER_SHORTCUT_KEYS.has(e.key.toLowerCase())) {
    e.preventDefault();
  }

  if (editable) return;
  if (e.key === 'F5' || e.key === 'F12') {
    e.preventDefault();
    return;
  }
  // The ShortcutRouter preventDefaults its own mapped chords; this only
  // swallows the browser's default bindings, never editable input.
  // Snap/tiling gestures (Ctrl+Alt — disjoint from the browser shortcuts above).
  if (e.ctrlKey && e.altKey) {
    if (SNAP_KEYS.has(e.key)) {
      snapFocused(e.key.slice(5).toLowerCase() as 'left' | 'right' | 'top' | 'bottom');
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === 'g') {
      tileWindows();
      e.preventDefault();
      return;
    }
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
  (x, y) => {
    const tb = chrome.taskbar ?? shell.taskbar;
    if (!tb) return false;
    return x >= tb.x && x <= tb.x + tb.width && y >= tb.y && y <= tb.y + tb.height;
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

// ----------------------------------------------------- WebOS-owned chrome

/** Typed handle for the WebOS-owned bar (engine field is engine-typed). */
const chrome = { taskbar: null as WebOSTaskbar | null };

function liveTaskbarHeight(): number {
  return chrome.taskbar?.height ?? (shell.taskbar ? shell.taskbar.height : 40);
}

/**
 * Replace the engine Taskbar with the WebOS-owned bar (spec §4 gap #3).
 * `setTheme()` remounts the engine bar internally, so applyTheme calls this
 * after every switch. The engine keeps calling `taskbar.setGeometry` on
 * whatever instance occupies its public field, so it continues to position
 * ours across resizes.
 */
function installWebosTaskbar(): void {
  const current = shell.taskbar;
  if (current instanceof WebOSTaskbar) return;
  if (current) {
    scene.remove(current);
    current.destroy();
    shell.taskbar = null;
  }
  const preset = findPreset(getActiveThemeId()) ?? DEFAULT_PRESET;
  const h = appTheme().taskbarHeight;
  const bounds = shell.layout.bounds();
  chrome.taskbar = new WebOSTaskbar({
    windowManager: shell.windowManager,
    preset,
    onStartMenu: () => toggleStartMenu(),
    onLaunch: (appId) => void shell.open(appId),
    width: bounds.width,
    y: bounds.y + bounds.height - h,
  });
  // Public mutable field — the documented replacement seam.
  (shell as unknown as { taskbar: unknown }).taskbar = chrome.taskbar;
  scene.add(chrome.taskbar);
}

// Start menu state. The engine's `startMenu` field is private, so the public
// `toggleStartMenu` is overridden to run the WebOS menu instead; Escape and
// outside-click dismissal are reimplemented here for the same reason.
let startMenu: WebOSStartMenu | null = null;
let y2kMenu: { hide(): void; destroy(): void } | null = null;
/** Opener focus, restored on close when nothing else took it (PX-0077). */
let openerFocus: HTMLElement | null = null;

function closeStartMenu(): void {
  const hadMenu = !!(startMenu || y2kMenu);
  if (startMenu) {
    scene.releaseA11yProjection(startMenu);
    scene.hideOverlay(startMenu);
    startMenu.destroy();
    startMenu = null;
  }
  if (y2kMenu) {
    y2kMenu.hide();
    y2kMenu.destroy();
    y2kMenu = null;
  }
  // Preserve the engine's focus-restoration contract: dismissal must not
  // leave DOM focus stranded on body.
  if (hadMenu && openerFocus) {
    const active = document.activeElement;
    if (!active || active === document.body) openerFocus.focus?.();
    openerFocus = null;
  }
  scene.markDirty();
}

function openStartMenu(): void {
  if (startMenu || y2kMenu) return;
  const active = document.activeElement;
  openerFocus = active instanceof HTMLElement && active !== document.body ? active : null;
  const preset = findPreset(getActiveThemeId()) ?? DEFAULT_PRESET;
  const apps = THEME_PRESETS.length > 0 ? (boot.config.apps ?? []) : [];
  const launch = (appId: string): void => {
    closeStartMenu();
    void shell.open(appId);
  };
  const tbH = appTheme().taskbarHeight;
  if (preset.id === 'y2k') {
    // Era-correct: cascading program groups instead of a searchable panel.
    y2kMenu = openY2KProgramMenu(scene, apps, 8, scene.height - tbH - 8, launch);
    scene.markDirty();
    return;
  }
  const menu = new WebOSStartMenu({
    apps,
    presetId: preset.id,
    recents: recentAppIds,
    onLaunch: launch,
    onClose: closeStartMenu,
  });
  menu.x = 8;
  menu.y = scene.height - tbH - menu.height - 6;
  startMenu = menu;
  scene.showOverlay(menu);
  scene.requestA11yProjection(menu);
  scene.markDirty();
}

function toggleStartMenu(): void {
  if (startMenu || y2kMenu) closeStartMenu();
  else openStartMenu();
}
shell.toggleStartMenu = toggleStartMenu;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (startMenu || y2kMenu)) {
    e.preventDefault();
    closeStartMenu();
  }
});
document.addEventListener(
  'pointerdown',
  (e) => {
    if (!startMenu && !y2kMenu) return;
    const pt = scene.clientToScene(e.clientX, e.clientY);
    if (startMenu?.containsPoint(pt.x, pt.y)) return;
    // Clicks on the Start tile toggle via the tile's own handler.
    const tb = shell.taskbar;
    if (tb && pt.x >= tb.x && pt.x <= tb.x + tb.startButtonRight && pt.y >= tb.y - 2) return;
    closeStartMenu();
  },
  true,
);

installWebosTaskbar();

fit();
scene.start();
// Era splash over the first paint (spec §4 #8): non-interactive, audit-safe.
void showBootSplash(scene, getActiveThemeId());

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
  const taskbarH = liveTaskbarHeight();
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
    // Durable VFS (audit #25 P1-B): when a snapshot restored, it already
    // holds the user's copies of the seed documents — reseeding would clobber
    // them, so seeds apply to first boot only. Dirs stay unconditional.
    let restoredAny = false;
    if (vfs instanceof StorageVfs) restoredAny = await vfs.restored;
    for (const dir of SEED_DIRS) await vfs.mkdir(dir);
    if (!restoredAny) {
      for (const [path, content] of Object.entries(SEED_DOCS)) await vfs.write(path, content);
    }
  }

  // Boot spawns shrink to fit narrow viewports instead of overflowing them
  // (audit #25 P2-B): preferred geometry first, fitted to the live scene.
  const tbH = liveTaskbarHeight();
  const termWin: DesktopWindow | null = shell.open('terminal');
  if (termWin) {
    const g = fitGeometry(
      { x: 200, y: 36, width: 540, height: 380 },
      scene.width,
      scene.height,
      tbH,
    );
    termWin.setGeometry(g.x, g.y, g.width, g.height);
  }
  const filesWin: DesktopWindow | null = shell.open('files');
  if (filesWin) {
    const g = fitGeometry(
      { x: 560, y: 80, width: 520, height: 470 },
      scene.width,
      scene.height,
      tbH,
    );
    filesWin.setGeometry(g.x, g.y, g.width, g.height);
  }
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
