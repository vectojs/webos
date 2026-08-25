/**
 * Desktop context menus (WEB-0039 / issue #40) — right-click surfaces for the
 * shell and every registered window, themed by the era's `desktop-menu-*`
 * tokens through @vectojs/ui ContextMenu.
 *
 * Routing lives in main.ts (document-level capture listener +
 * classifyRightClick): empty desktop → the WebOS menu below; window
 * titlebars → the chrome menu; app client areas → the surface registered in
 * {@link registerWindowSurface} by that app instance. The ONLY zone where no
 * menu opens and the native one is allowed is the Browser viewport (DEC-0026).
 *
 * Keyboard contract: @vectojs/ui ContextMenu implements the WCAG menu pattern
 * (arrows/Home/End/Enter/Space/Escape over role="menuitem" hotspots); this
 * module moves initial focus onto the first enabled item so the keyboard path
 * works immediately after a ContextMenu-key open, and exposes
 * {@link closeActiveContextMenu} as an Escape safety net.
 */

import type { Scene } from '@vectojs/core';
import { ContextMenu, type ContextMenuItem } from '@vectojs/ui';
import { appTheme } from '../model/app-theme';

export interface DesktopContextMenuActions {
  refresh: () => void;
  newDocument: () => void;
  changeWallpaper: () => void;
  openSettings: () => void;
  openTaskManager: () => void;
  openAbout: () => void;
}

export function buildDesktopContextMenuItems(
  actions: DesktopContextMenuActions,
): ContextMenuItem[] {
  return [
    { label: 'Refresh', onClick: actions.refresh },
    { label: 'New text document', onClick: actions.newDocument },
    { separator: true },
    { label: 'Change wallpaper', onClick: actions.changeWallpaper },
    { label: 'Display settings', onClick: actions.openSettings },
    { separator: true },
    { label: 'Task Manager', onClick: actions.openTaskManager },
    { label: 'About WebOS', onClick: actions.openAbout },
  ];
}

/** Actions behind the window-chrome (titlebar) context menu. */
export interface TitlebarMenuActions {
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  close: () => void;
}

/** Structural state the menu enables/disables on. */
export interface TitlebarWindowState {
  minimized: boolean;
  maximized: boolean;
}

/**
 * Windows-style titlebar menu: states disable their own verbs (Minimize is
 * dead while minimized, Maximize while maximized) and Restore needs a state
 * to restore from.
 */
export function buildTitlebarContextMenuItems(
  state: TitlebarWindowState,
  actions: TitlebarMenuActions,
): ContextMenuItem[] {
  return [
    { label: 'Minimize', disabled: state.minimized, onClick: actions.minimize },
    { label: 'Maximize', disabled: state.maximized, onClick: actions.maximize },
    { label: 'Restore', disabled: !state.maximized, onClick: actions.restore },
    { separator: true },
    { label: 'Close', onClick: actions.close },
  ];
}

let activeMenu: ContextMenu | null = null;

function destroyActiveMenu(): void {
  if (!activeMenu) return;
  activeMenu.hide();
  activeMenu.destroy();
  activeMenu = null;
}

/** Test seam: whether any shell context menu is currently open. */
export function desktopContextMenuOpen(): boolean {
  return activeMenu !== null;
}

/** Escape-path safety net: dismiss whatever shell context menu is open. */
export function closeActiveContextMenu(): void {
  destroyActiveMenu();
}

/**
 * Show a themed surface menu at scene coords, replacing any open one. All
 * context menus funnel through here so theming, single-instance discipline
 * and test seams stay in one place.
 */
export function showSurfaceMenu(
  scene: Scene,
  x: number,
  y: number,
  items: ContextMenuItem[],
  width = 210,
): void {
  destroyActiveMenu();
  const t = appTheme();
  const menu = new ContextMenu({
    items,
    width,
    bg: t.menuBg,
    hoverBg: t.menuHover,
    borderColor: t.menuBorder,
    color: t.text,
  });
  activeMenu = menu;
  menu.showAtPoint(x, y, scene);
  focusFirstMenuItem();
}

/**
 * Move DOM focus to the menu's roving tab stop (first enabled item) right
 * after show, so arrows work with no Tab press. The hotspot mirrors carry the
 * projected `role="menuitem"` semantics with `tabindex="0"` on exactly the
 * anchor row; when overlays are not projected (headless), this is a no-op and
 * pointer use is unaffected.
 */
function focusFirstMenuItem(): void {
  if (!activeMenu) return;
  // Scope to THIS menu's projection, not the first [data-vecto-a11y-root]:
  // projected elements carry their entity id as DOM id (engine contract), so
  // getElementById pins our own role="menu" subtree. With another menu
  // projected (e.g. the Y2K program start menu), its role="menuitem" mirrors
  // can precede ours in DOM order and steal initial focus (review PX-0224).
  const host =
    document.getElementById(activeMenu.id) ?? document.querySelector('[data-vecto-a11y-root]');
  if (!host) return;
  const items = host.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])');
  const anchor = Array.from(items).find((el) => el.getAttribute('tabindex') === '0') ?? items[0];
  if (anchor instanceof HTMLElement) anchor.focus({ preventScroll: true });
}

/** Legacy entry kept for existing callers/tests — the desktop menu itself. */
export function showDesktopContextMenu(
  scene: Scene,
  x: number,
  y: number,
  actions: DesktopContextMenuActions,
): void {
  showSurfaceMenu(scene, x, y, buildDesktopContextMenuItems(actions));
}

// --------------------------------------------------- per-window surfaces

/**
 * What an app instance contributes to the shell's right-click and owned-chord
 * routing. Keyed by windowId (unique per open), registered from create() and
 * unregistered on window close.
 */
export interface WindowSurface {
  /** Show this surface's context menu at the scene point of the click. */
  openContextMenu(scene: Scene, x: number, y: number): void;
  /**
   * Preferred anchor in scene coords for the ContextMenu-key path. Surfaces
   * whose client area starts with inert chrome (Notepad's status line sits
   * exactly at the titlebar+24 default) return their real target region
   * instead; unimplemented → the shell default anchor applies.
   */
  keyboardAnchor?(): { x: number; y: number };
  /**
   * Handle a shell-owned chord (e.g. 'Control+S'). Returns true when consumed;
   * unconsumed chords stay prevented but do nothing (the browser binding is
   * still suppressed — policy first, dispatch best-effort).
   */
  handleShellChord?(chord: string): boolean;
}

const surfaces = new Map<string, WindowSurface>();

export function registerWindowSurface(windowId: string, surface: WindowSurface): void {
  surfaces.set(windowId, surface);
}

export function unregisterWindowSurface(windowId: string): void {
  surfaces.delete(windowId);
}

/** Test/routing seam: the surface registered for a window, if any. */
export function windowSurface(windowId: string): WindowSurface | undefined {
  return surfaces.get(windowId);
}
