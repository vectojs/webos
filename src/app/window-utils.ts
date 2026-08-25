/**
 * Window visibility helpers — apps use these to gate their timers (D8:
 * a minimized window must not keep waking an onDemand scene).
 */

import type { Entity } from '@vectojs/core';
import { DesktopWindow } from '@vectojs/desktop';

/** Walk the parent chain to the hosting DesktopWindow, if any. */
export function findWindow(entity: Entity | null | undefined): DesktopWindow | null {
  let cur: Entity | null | undefined = entity;
  while (cur) {
    if (cur instanceof DesktopWindow) return cur;
    cur = cur.parent ?? null;
  }
  return null;
}

/**
 * True when the entity is visible to the user: not hosted in a window, or
 * its window is neither minimized nor (for keyboard handlers) unfocused.
 */
export function isWindowVisible(entity: Entity | null | undefined): boolean {
  const win = findWindow(entity);
  return !win || !win.minimized;
}

/** True when keyboard input should reach this entity's window. */
export function isWindowFocused(entity: Entity | null | undefined): boolean {
  const win = findWindow(entity);
  return !win || win.focused;
}

/** Minimal shape of the hosting window the rim patch reads. */
export interface RimHost {
  readonly maximized: boolean;
  readonly isDialog: boolean;
  readonly chrome: { resizeHandle: number };
}

/**
 * Re-open the top resize rim above the titlebar drag handle (audit-3 P1,
 * issue #33).
 *
 * Engine pointer dispatch lets children own their points before the window
 * root, and the handle spans the full titlebar — so presses within
 * `chrome.resizeHandle` px of the top edge begin a move while the SAME strip
 * is also the N/NW/NE resize rim (`hitResizeEdge`). The rim was unreachable.
 *
 * Excluding the rim from the handle's OWN hit-test sends those presses to the
 * window root, whose resize handler owns them. Patching the predicate instead
 * of shrinking/moving the handle keeps working across engine geometry
 * re-application (`applyGeom` resets width/height, which would revert a box
 * change) and leaves the tabbable full-width titlebar for AT users intact.
 * Maximized windows keep the whole handle: they have no rim, and their
 * titlebar must stay draggable for restore-under-cursor.
 */
export function exposeTopResizeRim(handle: Entity, host: RimHost): void {
  const patched = handle as Entity & { __topRimPatched?: boolean };
  if (patched.__topRimPatched) return;
  patched.__topRimPatched = true;
  const base = handle.isPointInside.bind(handle);
  handle.isPointInside = (gx: number, gy: number): boolean => {
    if (!base(gx, gy)) return false;
    if (host.maximized || host.isDialog) return true;
    const local = handle.worldToLocal(gx, gy);
    return local !== null && local.y >= host.chrome.resizeHandle;
  };
}
