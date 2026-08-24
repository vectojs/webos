/**
 * Desktop icon activation semantics (audit #25 P1-A):
 * keyboard Enter/Space launches immediately; pointer clicks keep the
 * double-click-to-launch metaphor.
 */

import { describe, expect, it } from 'bun:test';
import { DesktopIcon } from '../../src/desktop/icons';

function makeIcon() {
  const launched: string[] = [];
  const selections: string[] = [];
  const icon = new DesktopIcon(
    'terminal',
    'Terminal',
    (appId) => launched.push(appId),
    (target) => selections.push(target.appId),
  );
  return { icon, launched, selections };
}

/** Shape the engine's synthetic-activation click event for a keyboard key. */
function keyClick(key: string): Parameters<typeof DesktopIcon.prototype.emit>[1] {
  return { nativeEvent: { key }, stopPropagation: () => {} } as never;
}

function pointerClick(): Parameters<typeof DesktopIcon.prototype.emit>[1] {
  // A real mirror click forwards a mouse nativeEvent without a `key`.
  return { nativeEvent: {}, stopPropagation: () => {} } as never;
}

describe('desktop icon activation', () => {
  it('launches on synthetic Enter/Space click', () => {
    const { icon, launched } = makeIcon();
    icon.emit('click', keyClick('Enter'));
    expect(launched).toEqual(['terminal']);

    icon.emit('click', keyClick(' '));
    expect(launched).toEqual(['terminal', 'terminal']);
  });

  it('does not launch on a single pointer click', () => {
    const { icon, launched, selections } = makeIcon();
    icon.emit('click', pointerClick());
    expect(launched).toEqual([]);
    // Selection stays owned by the pointerdown handler; a lone mirror click
    // must not mutate launch timing either.
    expect(selections).toEqual([]);
  });

  it('keeps double-click-to-launch on the pointer path independent of clicks', () => {
    const { icon, launched } = makeIcon();
    // Two pointerdowns inside the 350ms window launch (existing metaphor).
    icon.emit('pointerdown', {
      nativeEvent: {},
      stopPropagation: () => {},
      localX: 10,
      localY: 10,
    } as never);
    icon.emit('pointerdown', {
      nativeEvent: {},
      stopPropagation: () => {},
      localX: 10,
      localY: 10,
    } as never);
    expect(launched).toEqual(['terminal']);
  });
});
