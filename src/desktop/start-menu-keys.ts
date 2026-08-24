/**
 * Start-menu keyboard support (audit #25 P2-C).
 *
 * The engine's StartMenu opens without moving focus and offers no item
 * navigation, so keyboard/AT users had to Tab backwards through every window
 * control to reach it. This module adds the app-side half of the composite-
 * widget pattern (@vectojs/ui 2.1.0 keyboard conventions):
 *
 * - opening the menu focuses its first item immediately;
 * - ArrowUp/ArrowDown/Home/End rove focus across the items while open;
 * - closing the menu (any path) restores focus to the element that opened it;
 * - Escape-dismissal and click-launch stay engine-owned.
 *
 * The shell's toggleStartMenu is wrapped (public API), never patched
 * internally; when the menu entity is absent the wiring stands down, so a
 * future desktop release that owns this natively simply makes this module a
 * no-op candidate for removal.
 */

import { Entity } from '@vectojs/core';
import type { DesktopShell } from '@vectojs/desktop';
import { StartMenu } from '@vectojs/desktop';
import { Button } from '@vectojs/ui';
import { nextRovingIndex } from '../model/roving-focus';

function openStartMenu(shell: DesktopShell): StartMenu | null {
  for (const child of shell.scene.overlayRootEntity.children) {
    if (child instanceof StartMenu) return child;
  }
  return null;
}

/**
 * The engine keeps its item list private, so the items are read structurally:
 * every projected `Button` in the menu subtree, in tree order (= visual row
 * order). Public Entity.children walking only — no private-field access.
 */
function collectItems(menu: StartMenu): Button[] {
  const found: Button[] = [];
  const visit = (entity: Entity): void => {
    if (entity instanceof Button) found.push(entity);
    for (const child of entity.children) visit(child);
  };
  visit(menu);
  return found;
}

export function installStartMenuKeyboard(shell: DesktopShell): void {
  const baseToggle = shell.toggleStartMenu.bind(shell);

  const focusFirstItem = (): void => {
    const menu = openStartMenu(shell);
    const items = menu ? collectItems(menu) : [];
    // One shot mirrors Entity.focus()'s projection-lag handling: the menu's
    // shadow elements may not exist until the next a11y sync frame.
    if (items.length === 0) return;
    items[0].focus();
  };

  /**
   * Focus restoration (review PX-0077): the engine's closeStartMenu prunes
   * the menu's mirror elements synchronously (hideOverlay →
   * removeA11yRecursively) and never refocuses, so every dismissal dropped
   * DOM focus on document.body. The opener is captured at open and handed
   * back when the menu is observed gone — from the toggle path below, or
   * from the capture-phase observers for engine-owned dismissal.
   */
  let opener: HTMLElement | null = null;
  let openTracked = false;

  const restoreIfAbandoned = (): void => {
    if (!openTracked || openStartMenu(shell) !== null) return;
    openTracked = false;
    const el = opener;
    opener = null;
    // Only rescue focus that actually fell off; if dismissal already moved
    // it onto another control (e.g. a clicked taskbar mirror), that one
    // wins. A click-launch leaves the flag set until the next observed
    // event, but by then the opened window holds focus (not body), so this
    // clears state without stealing anything.
    const active = document.activeElement;
    if (
      el instanceof HTMLElement &&
      el.isConnected &&
      (active === null || active === document.body)
    ) {
      el.focus();
      shell.scene.markDirty();
    }
  };

  shell.toggleStartMenu = () => {
    const opening = openStartMenu(shell) === null;
    if (opening) {
      const active = document.activeElement;
      opener = active instanceof HTMLElement ? active : null;
      openTracked = true;
    }
    baseToggle();
    // Toggle-close lands here synchronously; after baseToggle() the mirrors
    // are already pruned and focus sits on body.
    restoreIfAbandoned();
    focusFirstItem();
  };

  // Engine-owned dismissals bypass the wrapper: Escape and outside
  // pointerdown are handled by document CAPTURE listeners registered at
  // shell.start(), before these — so these same-phase observers always run
  // after the engine within the very event that closed the menu.
  document.addEventListener('keydown', restoreIfAbandoned, true);
  document.addEventListener('pointerdown', restoreIfAbandoned, true);

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const menu = openStartMenu(shell);
    if (!menu) return;
    const items = collectItems(menu);
    if (items.length === 0) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    // Current stop = whichever item mirror holds DOM focus (its DOM id equals
    // the entity id); -1 means nothing focused yet → Home semantics.
    const current = items.findIndex((b) => b.id === target?.id);
    const next = nextRovingIndex(current, items.length, e.key);
    if (next === null || next === current) return;
    e.preventDefault();
    items[next].focus();
    menu.scene?.markDirty();
  });
}
