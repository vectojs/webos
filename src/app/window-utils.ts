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
