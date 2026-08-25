/**
 * Window re-fit behaviors for viewport/DPR changes (issue #30).
 *
 * Two engine gaps force app-side compensation (@vectojs/desktop 0.7.0,
 * vectojs-docs forge/findings commit 794340f):
 *
 * - E1: DesktopShell.resize updates layout/wallpaper/taskbar only — a
 *   MAXIMIZED window keeps its stale pre-shrink box. The engine's
 *   maximize() early-return branch reapplies the CURRENT work area when
 *   called on an already-maximized window (without touching the stored
 *   pre-maximize box or minimized state), so refitting is a plain re-call.
 * - E2: Window.restore() replays the stale pre-maximize box unclamped, so
 *   "state" events (maximize / restore / minimize / un-minimize) re-run the
 *   shrink clamp; it is a no-op for in-bounds boxes. Focus/open/close are
 *   deliberately excluded: engine drag parks windows mostly off-screen
 *   (titlebar + 48px visible) and a focus event must not yank them back
 *   (review PX-0159); open is clamped by the engine at open time.
 *
 * Pure functions over an engine-shaped structural stub, so bun tests cover
 * the decisions without instantiating a Scene (taskbar-guard pattern).
 */

import { type Area, clampRect } from '../model/window-geometry';

/** Minimal shape of @vectojs/desktop 0.7.0 `DesktopWindow` used here. */
export interface RefitWindow {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  minimized: boolean;
  setGeometry(x: number, y: number, width: number, height: number): void;
  /** Engine maximize(): reapplies the current work area when already maximized. */
  maximize(): void;
}

/**
 * Re-fit maximized windows to the CURRENT work area (E1 compensation).
 * Runs right after shell.resize, when layout.updateSceneSize has already
 * moved the primary display bounds. Engine maximize() keeps `restored`
 * intact in this path, so a later restore still returns to the user's box.
 */
export function refitMaximized(windows: Iterable<RefitWindow>): void {
  for (const win of windows) {
    if (win.maximized) win.maximize();
  }
}

/**
 * Pull escaping windows back into `area` by shrinking first, then pinning
 * the top-left (E2 compensation + viewport-shrink safety). Skips maximized
 * windows (refitMaximized owns those — setGeometry would demote them) and
 * minimized ones (their un-minimize emits "state", which re-runs this).
 */
export function clampWindowsToArea(windows: Iterable<RefitWindow>, area: Area): void {
  for (const win of windows) {
    if (win.maximized || win.minimized) continue;
    const next = clampRect(win.x, win.y, win.width, win.height, area);
    if (
      next.x !== win.x ||
      next.y !== win.y ||
      next.width !== win.width ||
      next.height !== win.height
    ) {
      win.setGeometry(next.x, next.y, next.width, next.height);
    }
  }
}

/** Window-manager stream event types (@vectojs/desktop 0.7.0 WindowManagerListener). */
export type WmEventType = 'open' | 'close' | 'focus' | 'state';

/**
 * Gate the E2 shrink clamp behind "state" events ONLY (review PX-0159).
 * Engine drag deliberately parks windows mostly off-screen (titlebar + 48px
 * of frame stay visible — Window.clampMovePosition), so a focus/open/close
 * event re-running the clamp would yank user-parked windows back on-screen;
 * open is already engine-clamped at open time. Restore/un-minimize emit
 * "state" (Window.notifyState), which is exactly where the stale-box replay
 * needs correcting.
 */
export function clampWindowsOnEvent(
  event: { type: WmEventType },
  windows: Iterable<RefitWindow>,
  area: Area,
): void {
  if (event.type !== 'state') return;
  clampWindowsToArea(windows, area);
}
