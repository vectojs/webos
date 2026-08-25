/**
 * Pure right-click zone classification for the shell context-menu router
 * (WEB-0039 / issue #40). Given a scene-space point plus the live surface
 * rectangles, decides which context-menu surface — if any — owns the point,
 * INCLUDING the single deliberate passthrough zone: the Browser app viewport
 * (DEC-0026), where the native menu stays because the app simulates third-party
 * page content.
 *
 * Pure and structural so the whole matrix is bun-test-able without a scene:
 * windows are described by the fields the router actually reads.
 */

/** Structural window surface the classifier needs (DesktopWindow satisfies it). */
export interface RoutableWindow {
  readonly appId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly minimized: boolean;
  readonly chrome: { readonly titlebarHeight: number };
}

export interface ScenePoint {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RightClickZone<W extends RoutableWindow = RoutableWindow> =
  /** Browser client area — the ONLY zone where the native menu is allowed. */
  | { kind: 'browser-viewport'; window: W }
  /** Window chrome strip — window menu (minimize/maximize/restore/close). */
  | { kind: 'titlebar'; window: W }
  /** App client area — routed to the app's registered surface menu. */
  | { kind: 'window-client'; window: W }
  /** Over the taskbar — suppressed, the bar owns every interaction. */
  | { kind: 'taskbar' }
  /** Over a desktop icon — suppressed (icon menus deferred, issue #40). */
  | { kind: 'desktop-icon' }
  /** Empty desktop — the WebOS desktop menu. */
  | { kind: 'desktop' };

/** Fallback titlebar height when a window carries no engine chrome. */
export const FALLBACK_TITLEBAR_HEIGHT = 32;

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

/** Titlebar strip of a window in scene coordinates. */
export function titlebarRect(win: RoutableWindow): Rect {
  const h = win.chrome?.titlebarHeight ?? FALLBACK_TITLEBAR_HEIGHT;
  return { x: win.x, y: win.y, width: win.width, height: h };
}

/**
 * Classify a right-click. Windows are evaluated in the caller-provided order
 * (first hit wins — the same forward iteration the previous inline router in
 * main.ts used); minimized windows are skipped because they are invisible.
 */
export function classifyRightClick<W extends RoutableWindow>(
  pt: ScenePoint,
  windows: readonly W[],
  taskbar: Rect | null,
  icons: readonly Rect[],
): RightClickZone<W> {
  for (const win of windows) {
    if (win.minimized) continue;
    if (
      !pointInRect(pt.x, pt.y, {
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
      })
    ) {
      continue;
    }
    if (pointInRect(pt.x, pt.y, titlebarRect(win))) {
      return { kind: 'titlebar', window: win };
    }
    if (win.appId === 'browser') {
      // Below the titlebar the Browser simulates page content: passthrough
      // (DEC-0026). Its address bar keeps native editing commands with it.
      return { kind: 'browser-viewport', window: win };
    }
    return { kind: 'window-client', window: win };
  }
  if (taskbar && pointInRect(pt.x, pt.y, taskbar)) return { kind: 'taskbar' };
  for (const icon of icons) {
    if (pointInRect(pt.x, pt.y, icon)) return { kind: 'desktop-icon' };
  }
  return { kind: 'desktop' };
}
