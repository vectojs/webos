/**
 * Browser address bar select-on-focus (audit-3, issue #33): focusing the
 * address bar must select the existing text on the projected <input>, so
 * typing replaces the URL instead of appending to it.
 */

import { describe, expect, it } from 'bun:test';
import { Entity } from '@vectojs/core';
import { Input } from '@vectojs/ui';
import { browserApp } from '../../src/apps/browser';

function findInput(root: Entity): Input | null {
  if (root instanceof Input) return root;
  for (const child of root.children) {
    const hit = findInput(child);
    if (hit) return hit;
  }
  return null;
}

describe('browser address bar focus', () => {
  it('selects the whole projected input text when focused', () => {
    const root = browserApp.create();
    const input = findInput(root);
    expect(input).not.toBeNull();

    const el = document.createElement('input');
    el.value = 'vectojs://home';
    document.body.appendChild(el);
    el.focus();
    expect(document.activeElement).toBe(el);

    // The engine dispatches this entity event from the DOM focus listener.
    input!.emit('focus', {} as never);

    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(el.value.length);

    el.remove();
  });

  it('leaves the DOM alone when focus arrives without a projected input', () => {
    const root = browserApp.create();
    const input = findInput(root)!;
    // No activeElement input: the handler must be a no-op, not throw.
    expect(() => input.emit('focus', {} as never)).not.toThrow();
  });
});
