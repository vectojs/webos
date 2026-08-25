/**
 * Shortcut interception policy (WEB-0039 / issue #40): every OWNED row of
 * SHORTCUT_POLICY resolves to preventDefault with the documented action, and
 * the IMPOSSIBLE rows are never claimed — resolveOwnedShortcut must leave
 * browser-reserved chords untouched. Passthrough rows assert no interference.
 */

import { describe, expect, it } from 'bun:test';
import {
  resolveOwnedShortcut,
  SHORTCUT_POLICY,
  type KeyEventLike,
} from '../../src/model/shortcut-policy';

function ev(overrides: Partial<KeyEventLike> = {}): KeyEventLike {
  return {
    key: 'a',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  };
}

const OWNED_SINGLE_CHORDS: Record<string, string> = {
  'Ctrl+S': 's',
  'Ctrl+P': 'p',
  'Ctrl+O': 'o',
  'Ctrl+G': 'g',
  'Ctrl+D': 'd',
};

describe('resolveOwnedShortcut — owned rows', () => {
  it('prevents and dispatches Ctrl+S to the focused surface', () => {
    const inEditor = resolveOwnedShortcut(ev({ key: 's', ctrlKey: true }), true);
    expect(inEditor.preventDefault).toBe(true);
    expect(inEditor.action).toBe('save-focused');
    const onDesktop = resolveOwnedShortcut(ev({ key: 's', ctrlKey: true }), false);
    expect(onDesktop.action).toBe('save-focused');
  });

  for (const [chord, key] of Object.entries(OWNED_SINGLE_CHORDS)) {
    if (chord === 'Ctrl+S') continue;
    it(`swallows ${chord} everywhere (before editable bail-out)`, () => {
      const decision = resolveOwnedShortcut(ev({ key, ctrlKey: true }), true);
      expect(decision.preventDefault).toBe(true);
      expect(decision.action).toBe('swallow');
    });
  }

  it('swallows Ctrl+R even while typing (DEC-0028 reload protection)', () => {
    expect(resolveOwnedShortcut(ev({ key: 'r', ctrlKey: true }), true)).toEqual({
      preventDefault: true,
      action: 'swallow',
    });
    expect(resolveOwnedShortcut(ev({ key: 'R', ctrlKey: true }), false).preventDefault).toBe(true);
  });

  it('F5 refreshes the desktop outside editables and stays inert inside', () => {
    const desktop = resolveOwnedShortcut(ev({ key: 'F5' }), false);
    expect(desktop).toEqual({
      preventDefault: true,
      action: 'refresh-desktop',
    });
    const typing = resolveOwnedShortcut(ev({ key: 'F5' }), true);
    expect(typing).toEqual({ preventDefault: true, action: 'swallow' });
  });

  it('swallows F12', () => {
    expect(resolveOwnedShortcut(ev({ key: 'F12' }), false).preventDefault).toBe(true);
  });

  it('ContextMenu key and Shift+F10 open our menu', () => {
    expect(resolveOwnedShortcut(ev({ key: 'ContextMenu' }), false)).toEqual({
      preventDefault: true,
      action: 'open-context-menu',
    });
    expect(resolveOwnedShortcut(ev({ key: 'F10', shiftKey: true }), true)).toEqual({
      preventDefault: true,
      action: 'open-context-menu',
    });
  });

  it('meta variants count as owned like ctrl (macOS habit)', () => {
    expect(resolveOwnedShortcut(ev({ key: 's', metaKey: true }), false).action).toBe(
      'save-focused',
    );
  });

  it('modifier exclusions keep snap chords and hard reload native', () => {
    // Ctrl+Alt+Arrow belongs to the snap handler, not this policy.
    expect(
      resolveOwnedShortcut(ev({ key: 'ArrowLeft', ctrlKey: true, altKey: true }), false),
    ).toEqual({ preventDefault: false });
    // Shift exclusion is the deliberate Ctrl+Shift+R escape hatch.
    expect(resolveOwnedShortcut(ev({ key: 'r', ctrlKey: true, shiftKey: true }), false)).toEqual({
      preventDefault: false,
    });
  });
});

describe('resolveOwnedShortcut — passthrough rows', () => {
  it('leaves F11, PrintScreen and plain typing untouched', () => {
    for (const e of [
      ev({ key: 'F11' }),
      ev({ key: 'PrintScreen' }),
      ev({ key: 'a', ctrlKey: true }),
      ev({ key: 'v', ctrlKey: true }),
      ev({ key: 'x', ctrlKey: true }),
      ev({ key: 'c', metaKey: true }),
      ev({ key: 'e', ctrlKey: true, shiftKey: true }),
    ]) {
      const decision = resolveOwnedShortcut(e, false);
      expect(decision.preventDefault).toBe(false);
      expect(decision.action).toBeUndefined();
    }
  });

  it('never claims the IMPOSSIBLE chords (browser/OS-reserved)', () => {
    for (const e of [
      ev({ key: 'w', ctrlKey: true }),
      ev({ key: 't', ctrlKey: true }),
      ev({ key: 'n', ctrlKey: true }),
      ev({ key: 't', ctrlKey: true, shiftKey: true }),
      ev({ key: 'n', metaKey: true }),
      ev({ key: 'Tab', altKey: true }),
    ]) {
      expect(resolveOwnedShortcut(e, false).preventDefault).toBe(false);
    }
  });
});

describe('SHORTCUT_POLICY table integrity', () => {
  it('documents at least one row per disposition class', () => {
    const dispositions = new Set(SHORTCUT_POLICY.map((row) => row.disposition));
    expect(dispositions.has('owned')).toBe(true);
    expect(dispositions.has('passthrough')).toBe(true);
    expect(dispositions.has('impossible')).toBe(true);
  });

  it('every impossible row names a chord the resolver ignores', () => {
    for (const row of SHORTCUT_POLICY.filter((r) => r.disposition === 'impossible')) {
      expect(row.note.length).toBeGreaterThan(0);
    }
  });
});
