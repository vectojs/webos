/**
 * Taskbar guard — clock pinning + entries-host clipping.
 *
 * Engine limitation (@vectojs/desktop 0.7.0, forge finding desktop-webos
 * 2026-08-24): `Taskbar.updateClock()` only repositions the clock inside the
 * branch where the formatted time string changed, so a bar mounted before the
 * canvas reaches its real size keeps its boot-time clock x until the next
 * minute tick (measured: clock parked at x=236 from a 300px boot width while
 * the scene was already 950px), and any same-minute viewport resize leaves it
 * off the right edge the same way. `Taskbar.rebuild()` also places a boundary
 * entry button before checking the remaining host width, letting it spill up
 * to one max-width entry (~160px) past the host edge toward the clock.
 *
 * Both `clockLabel` and `entriesHost` are private on the published Taskbar
 * surface, so this guard reads them through a narrow structural contract:
 * direct fields first, then a subtree walk that treats non-control,
 * positive-size nodes as the entries host — failing safe to a no-op if a
 * future desktop package reshapes the subtree.
 */

import { SVGEntity } from '@vectojs/core';
import { Button, Text } from '@vectojs/ui';

/** Bar-right padding the engine reserves for the 600 12px sans-serif clock. */
export const CLOCK_RESERVE_PX = 64;
/** Engine clock line height used to vertically center the label in the bar. */
export const CLOCK_LINE_HEIGHT_PX = 14;
/** Engine entries-host left inset (right edge of Start + margin). */
export const ENTRIES_HOST_X_PX = 70;
/** Engine entries-host right reserve (clock zone + margin). */
export const ENTRIES_HOST_RESERVE_PX = 150;

/** Minimal geometry surface the guard needs; satisfied by Entity. */
export interface GuardNode {
  x: number;
  y: number;
  width: number;
  height: number;
  clipChildren?: boolean;
  interactive?: boolean;
  selectable?: boolean;
  a11yProjection?: 'eager' | 'onDemand' | 'never';
  children?: readonly unknown[];
}

/** Minimal taskbar surface; satisfied by @vectojs/desktop Taskbar. */
export interface GuardTaskbar {
  width: number;
  height: number;
  children: readonly unknown[];
}

/** What the guard actually managed to apply — callers may assert on it. */
export interface GuardResult {
  /** Clock re-pinned to the right edge for the current bar width. */
  pinnedClock: boolean;
  /** Entries host found and marked clipChildren. */
  clippedEntries: boolean;
}

interface TaskbarInternals {
  clockLabel?: Partial<GuardNode> | null;
  entriesHost?: GuardNode | null;
}

/**
 * Clock x for a bar width — mirrors the engine's placement without its
 * "only when the minute string changed" early return.
 */
export function clockX(taskbarWidth: number): number {
  return Math.max(0, taskbarWidth - CLOCK_RESERVE_PX);
}

/** Clock y for a bar height — mirrors the engine's vertical centering. */
export function clockY(taskbarHeight: number): number {
  return (taskbarHeight - CLOCK_LINE_HEIGHT_PX) / 2;
}

/**
 * Entries-host box for a bar width — mirrors the engine's layout so tests can
 * assert the invariant the visual guarantee rests on: with the host clipped at
 * its right edge, no entry pixel can reach the pinned clock's left edge.
 */
export function entriesHostBox(taskbarWidth: number): {
  x: number;
  width: number;
} {
  return {
    x: ENTRIES_HOST_X_PX,
    width: Math.max(0, taskbarWidth - ENTRIES_HOST_RESERVE_PX),
  };
}

/**
 * True when the pinned clock clears the (clipped) entries region at this bar
 * width — the predicate the whole guard exists to keep true.
 */
export function clockClearOfEntries(taskbarWidth: number): boolean {
  const host = entriesHostBox(taskbarWidth);
  return clockX(taskbarWidth) >= host.x + host.width;
}

function isControl(node: unknown): boolean {
  return node instanceof Button || node instanceof Text || node instanceof SVGEntity;
}

function isGuardNode(node: unknown): node is GuardNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof (node as GuardNode).width === 'number' &&
    (node as GuardNode).width > 0 &&
    typeof (node as GuardNode).height === 'number'
  );
}

/**
 * The engine-private clock label, identified structurally. On
 * @vectojs/desktop 0.7.0 the clock Text is constructed `selectable: false`
 * and explicitly marked non-interactive with `a11yProjection = "never"`
 * (Entity's default is "eager"). Requiring all three markers keeps a future
 * ordinary Text node in the bar — which is already non-interactive by
 * default, so interactivity alone cannot discriminate — from being mis-pinned
 * as the clock. Fails safe to null (and the guard to a no-op, leaving the
 * engine's per-minute tick as fallback) when nothing carries them.
 */
function findClockLabel(bars: readonly unknown[]): Partial<GuardNode> | null {
  for (const bar of bars) {
    for (const child of (bar as GuardNode).children ?? []) {
      if (
        child instanceof Text &&
        child.interactive === false &&
        child.selectable === false &&
        child.a11yProjection === 'never'
      ) {
        return child;
      }
    }
  }
  return null;
}

/**
 * The engine-private entries host, identified structurally: the bar's first
 * non-control child with a positive size. Grandchildren only — the bar itself
 * (a Card) is a non-control positive-size node and must not match.
 */
function findEntriesHost(bars: readonly unknown[]): GuardNode | null {
  for (const bar of bars) {
    for (const child of (bar as GuardNode).children ?? []) {
      if (!isControl(child) && 'clipChildren' in (child as object) && isGuardNode(child)) {
        return child;
      }
    }
  }
  return null;
}

/**
 * Pin the clock to the bar's right edge for the CURRENT width and mark the
 * entries host for clipping. Idempotent and cheap — safe to call on every
 * resize, theme remount, and window-manager change. Never throws on an
 * unrecognized subtree: unrecognized means unmanaged, and the engine's own
 * per-minute tick remains the fallback.
 */
export function applyTaskbarGuard(taskbar: GuardTaskbar): GuardResult {
  const internals = taskbar as unknown as TaskbarInternals;
  const bars = taskbar.children;
  const clock =
    internals.clockLabel && typeof internals.clockLabel === 'object'
      ? internals.clockLabel
      : findClockLabel(bars);
  const host =
    internals.entriesHost && typeof internals.entriesHost === 'object'
      ? internals.entriesHost
      : findEntriesHost(bars);

  let pinnedClock = false;
  if (clock) {
    clock.x = clockX(taskbar.width);
    clock.y = clockY(taskbar.height);
    pinnedClock = true;
  }

  let clippedEntries = false;
  if (host) {
    host.clipChildren = true;
    clippedEntries = true;
  }

  return { pinnedClock, clippedEntries };
}
