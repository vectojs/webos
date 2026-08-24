import { describe, expect, it } from 'bun:test';
import { Entity, SVGEntity } from '@vectojs/core';
import { Button, Card, Text } from '@vectojs/ui';
import {
  applyTaskbarGuard,
  CLOCK_RESERVE_PX,
  clockClearOfEntries,
  clockX,
  clockY,
  ENTRIES_HOST_RESERVE_PX,
  ENTRIES_HOST_X_PX,
  entriesHostBox,
} from '../../src/desktop/taskbar-guard';

/**
 * Engine-shaped taskbar stub: taskbar → bar(Card) → [Start(Button),
 * clock(Text), entries host(plain Entity)]. Matches @vectojs/desktop 0.7.0's
 * private subtree without instantiating the engine — including the exact
 * markers the engine puts on the clock Text (selectable off, non-interactive,
 * a11yProjection "never").
 */
function engineShapedTaskbar(
  width: number,
  height = 40,
): { tb: Entity; bar: Card; clock: Text; host: Entity } {
  const tb = new Entity();
  tb.width = width;
  tb.height = height;
  const bar = new Card({
    width,
    height,
    bg: '#000',
    radius: 0,
    borderWidth: 0,
  });
  const start = new Button('Start', {
    padding: 6,
    radius: 6,
    width: 54,
    height: 32,
  });
  start.x = 8;
  const clock = new Text('', {
    font: '600 12px sans-serif',
    selectable: false,
  });
  clock.interactive = false;
  clock.a11yProjection = 'never';
  const host = new Entity();
  host.x = ENTRIES_HOST_X_PX;
  host.width = Math.max(0, width - ENTRIES_HOST_RESERVE_PX);
  host.height = height;
  bar.add(start, clock, host);
  tb.add(bar);
  return { tb, bar, clock, host };
}

describe('clock pinning math', () => {
  it('pins the clock one reserve from the right edge', () => {
    expect(clockX(950)).toBe(950 - CLOCK_RESERVE_PX);
    expect(clockX(1920)).toBe(1920 - CLOCK_RESERVE_PX);
  });

  it('clamps at zero on ultra-narrow bars instead of going negative', () => {
    expect(clockX(64)).toBe(0);
    expect(clockX(10)).toBe(0);
  });

  it('vertically centers the clock line in the bar', () => {
    expect(clockY(40)).toBe(13);
    expect(clockY(32)).toBe(9);
  });
});

describe('entries-host geometry contract', () => {
  it('keeps a 16px clearance between the clipped host edge and the pinned clock', () => {
    for (const width of [200, 400, 640, 950, 1280, 1920, 3840]) {
      const host = entriesHostBox(width);
      expect(host.x).toBe(ENTRIES_HOST_X_PX);
      expect(clockX(width) - (host.x + host.width)).toBe(16);
      expect(clockClearOfEntries(width)).toBe(true);
    }
  });

  it('collapses the host at the same widths the engine does', () => {
    expect(entriesHostBox(150).width).toBe(0);
    expect(entriesHostBox(149).width).toBe(0);
    // Below the collapse point the invariant degenerates with the engine's
    // own layout — the guard must not claim clearance there.
    expect(clockClearOfEntries(100)).toBe(false);
  });

  it("mirrors the engine's unrounded placement for any width", () => {
    expect(clockX(950.4)).toBe(950.4 - CLOCK_RESERVE_PX);
  });
});

describe('applyTaskbarGuard on an engine-shaped subtree', () => {
  it('pins the clock to the live size and clips the host in one pass', () => {
    const { tb, clock, host } = engineShapedTaskbar(300);
    const result = applyTaskbarGuard(
      tb as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );
    expect(result).toEqual({ pinnedClock: true, clippedEntries: true });
    expect(clock.x).toBe(clockX(300));
    expect(clock.y).toBe(clockY(40));
    expect(host.clipChildren).toBe(true);
  });

  it('re-pins after a resize within the same minute — the bug scenario (#27)', () => {
    // Boot mounts at default canvas width 300 → engine parks the clock at
    // x=236; fit() then resizes to 950 but the minute string is unchanged, so
    // the engine skips repositioning. The guard must not.
    const { tb, clock, host } = engineShapedTaskbar(300);
    applyTaskbarGuard(
      tb as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );
    clock.x = 236; // what the engine left behind
    (tb as unknown as { width: number }).width = 950;
    host.width = Math.max(0, 950 - ENTRIES_HOST_RESERVE_PX);

    applyTaskbarGuard(
      tb as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );

    expect(clock.x).toBe(clockX(950));
    expect(clock.x).toBeGreaterThan(host.x + host.width); // clear of entries
  });

  it('is idempotent across repeated applications', () => {
    const { tb, clock, host } = engineShapedTaskbar(950);
    const args = tb as unknown as {
      width: number;
      height: number;
      children: readonly unknown[];
    };
    applyTaskbarGuard(args);
    const before = { x: clock.x, y: clock.y };
    applyTaskbarGuard(args);
    expect(clock.x).toBe(before.x);
    expect(clock.y).toBe(before.y);
    expect(host.clipChildren).toBe(true);
  });

  it('does not clip the Start button or mistake the bar for the host', () => {
    const { tb, bar } = engineShapedTaskbar(950);
    const start = bar.children[0] as Button;
    applyTaskbarGuard(
      tb as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );
    expect(start.clipChildren).toBeFalsy();
    expect((bar as unknown as GuardTarget).clipChildren ?? false).toBe(false);
  });
});

type GuardTarget = { clipChildren?: boolean };

describe('structural fallbacks and fail-safe behavior', () => {
  it('falls back to structural discovery when internals are absent', () => {
    // A future desktop package could rename its privates; the walk must still
    // find host and clock by shape.
    const { tb, clock, host } = engineShapedTaskbar(800);
    const stripped = tb as unknown as Record<string, unknown>;
    delete stripped.clockLabel;
    delete stripped.entriesHost;

    const result = applyTaskbarGuard(
      stripped as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );

    expect(result.pinnedClock).toBe(true);
    expect(result.clippedEntries).toBe(true);
    expect(clock.x).toBe(clockX(800));
    expect(host.clipChildren).toBe(true);
  });

  it('prefers real internals over structural guesses when both exist', () => {
    const { tb } = engineShapedTaskbar(800);
    const decoy = new Text('decoy', {});
    (tb.children[0] as Entity).add(decoy);
    const result = applyTaskbarGuard(
      tb as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );
    expect(result.pinnedClock).toBe(true);
    // Real clockLabel moved; the decoy Text is untouched.
    expect(decoy.x).toBe(0);
  });

  it('pins nothing when the clock Text lacks the engine markers (fallback path)', () => {
    // A future desktop could drop the "never" projection from the clock; the
    // structural walk must then refuse to guess rather than pin a wrong node.
    const { tb, clock } = engineShapedTaskbar(800);
    clock.a11yProjection = 'eager';
    const stripped = tb as unknown as Record<string, unknown>;
    delete stripped.clockLabel;
    delete stripped.entriesHost;

    const result = applyTaskbarGuard(
      stripped as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );

    expect(result.pinnedClock).toBe(false);
    expect(clock.x).toBe(0); // untouched — no mis-pin
  });

  it('rejects an ordinary (selectable, eager) Text in the bar on the fallback path', () => {
    // The engine's clock is non-interactive, selectable:false and projected
    // "never"; any other Text fails the marker checks and must not be pinned.
    const { tb, clock } = engineShapedTaskbar(800);
    const ordinary = new Text('8:88', { font: '600 12px sans-serif' });
    (tb.children[0] as Entity).add(ordinary);
    const stripped = tb as unknown as Record<string, unknown>;
    delete stripped.clockLabel;
    delete stripped.entriesHost;

    const result = applyTaskbarGuard(
      stripped as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );

    expect(result.pinnedClock).toBe(true);
    // The marked clock was found and moved; the ordinary Text keeps defaults.
    expect(clock.x).toBe(clockX(800));
    expect(ordinary.x).toBe(0);
  });

  it('fails safe to a no-op on an unrecognized subtree', () => {
    const empty = new Entity();
    empty.width = 100;
    empty.height = 30;
    const result = applyTaskbarGuard(
      empty as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );
    expect(result).toEqual({ pinnedClock: false, clippedEntries: false });
  });

  it('treats an SVGEntity control as a control, never as the host', () => {
    const tb = new Entity();
    const bar = new Entity();
    const icon = new SVGEntity('<svg xmlns="http://www.w3.org/2000/svg"/>');
    icon.width = 16;
    icon.height = 16;
    const host = new Entity();
    host.width = 500;
    host.height = 40;
    bar.add(icon, host);
    tb.add(bar);
    const result = applyTaskbarGuard(
      tb as unknown as {
        width: number;
        height: number;
        children: readonly unknown[];
      },
    );
    expect(result.clippedEntries).toBe(true);
    expect(icon.clipChildren).toBeFalsy();
    expect(host.clipChildren).toBe(true);
  });
});
