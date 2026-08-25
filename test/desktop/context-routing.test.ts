/**
 * Right-click zone classification matrix (WEB-0039 / issue #40) — the pure
 * router the shell's document-level capture listener feeds. Pins the Browser
 * viewport passthrough, titlebar vs client split, minimized-window skip,
 * taskbar and desktop-icon suppression.
 */

import { describe, expect, it } from 'bun:test';
import {
  classifyRightClick,
  FALLBACK_TITLEBAR_HEIGHT,
  pointInRect,
  titlebarRect,
  type RoutableWindow,
} from '../../src/desktop/context-routing';

function win(overrides: Partial<RoutableWindow> = {}): RoutableWindow {
  return {
    appId: 'files',
    x: 100,
    y: 80,
    width: 400,
    height: 300,
    minimized: false,
    chrome: { titlebarHeight: 32 },
    ...overrides,
  };
}

const NO_TASKBAR = null;
const NO_ICONS: readonly never[] = [];

describe('classifyRightClick', () => {
  it('empty desktop when nothing is hit', () => {
    const zone = classifyRightClick({ x: 900, y: 600 }, [win()], NO_TASKBAR, NO_ICONS);
    expect(zone.kind).toBe('desktop');
  });

  it('splits titlebar strip from window client', () => {
    const w = win();
    const top = classifyRightClick({ x: 120, y: 90 }, [w], NO_TASKBAR, NO_ICONS);
    expect(top.kind).toBe('titlebar');
    const client = classifyRightClick({ x: 120, y: 150 }, [w], NO_TASKBAR, NO_ICONS);
    expect(client.kind).toBe('window-client');
  });

  it('browser viewport is the only passthrough zone; its titlebar still routes', () => {
    const browser = win({ appId: 'browser' });
    const viewport = classifyRightClick({ x: 200, y: 200 }, [browser], NO_TASKBAR, NO_ICONS);
    expect(viewport.kind).toBe('browser-viewport');
    if (viewport.kind === 'browser-viewport') expect(viewport.window.appId).toBe('browser');
    const chrome = classifyRightClick({ x: 110, y: 85 }, [browser], NO_TASKBAR, NO_ICONS);
    expect(chrome.kind).toBe('titlebar');
  });

  it('skips minimized windows entirely', () => {
    const zone = classifyRightClick(
      { x: 200, y: 200 },
      [win({ minimized: true })],
      NO_TASKBAR,
      NO_ICONS,
    );
    expect(zone.kind).toBe('desktop');
  });

  it('first window in list order wins an overlap', () => {
    const bottom = win({ appId: 'notes' });
    const top = win({ appId: 'paint' });
    const zone = classifyRightClick({ x: 200, y: 200 }, [bottom, top], NO_TASKBAR, NO_ICONS);
    expect(zone.kind).toBe('window-client');
    if (zone.kind === 'window-client') expect(zone.window.appId).toBe('notes');
  });

  it('claims the taskbar band below windows', () => {
    const zone = classifyRightClick(
      { x: 500, y: 770 },
      [],
      { x: 0, y: 760, width: 1024, height: 40 },
      NO_ICONS,
    );
    expect(zone.kind).toBe('taskbar');
  });

  it('suppresses over desktop icons before falling through to the desktop menu', () => {
    const icon = { x: 14, y: 14, width: 64, height: 64 };
    const onIcon = classifyRightClick({ x: 30, y: 30 }, [], NO_TASKBAR, [icon]);
    expect(onIcon.kind).toBe('desktop-icon');
    const beside = classifyRightClick({ x: 100, y: 100 }, [], NO_TASKBAR, [icon]);
    expect(beside.kind).toBe('desktop');
  });

  it('falls back to a default titlebar height without engine chrome', () => {
    const bare = {
      appId: 'files',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      minimized: false,
      chrome: undefined as unknown as RoutableWindow['chrome'],
    };
    expect(titlebarRect(bare).height).toBe(FALLBACK_TITLEBAR_HEIGHT);
    const edge = classifyRightClick(
      { x: 5, y: FALLBACK_TITLEBAR_HEIGHT - 1 },
      [bare],
      NO_TASKBAR,
      NO_ICONS,
    );
    expect(edge.kind).toBe('titlebar');
  });

  it('pointInRect is inclusive of edges (windows share screen edges)', () => {
    expect(pointInRect(10, 10, { x: 10, y: 10, width: 5, height: 5 })).toBe(true);
    expect(pointInRect(15, 15, { x: 10, y: 10, width: 5, height: 5 })).toBe(true);
    expect(pointInRect(16, 10, { x: 10, y: 10, width: 5, height: 5 })).toBe(false);
  });
});
