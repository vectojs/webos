/**
 * Desktop context menu — right-click empty desktop: Refresh / Change
 * Wallpaper / Display settings / About (spec §4 gap #7), themed by the
 * era's `desktop-menu-*` tokens through @vectojs/ui ContextMenu.
 */

import type { Scene } from '@vectojs/core';
import { ContextMenu, type ContextMenuItem } from '@vectojs/ui';
import { appTheme } from '../model/app-theme';

export interface DesktopContextMenuActions {
  refresh: () => void;
  openSettings: () => void;
  openAbout: () => void;
}

export function buildDesktopContextMenuItems(
  actions: DesktopContextMenuActions,
): ContextMenuItem[] {
  return [
    { label: 'Refresh', onClick: actions.refresh },
    { separator: true },
    { label: 'Change wallpaper', onClick: actions.openSettings },
    { label: 'Display settings', onClick: actions.openSettings },
    { separator: true },
    { label: 'About WebOS', onClick: actions.openAbout },
  ];
}

let activeMenu: ContextMenu | null = null;

/** Show the desktop context menu at scene coords; dismisses any previous. */
export function showDesktopContextMenu(
  scene: Scene,
  x: number,
  y: number,
  actions: DesktopContextMenuActions,
): void {
  if (activeMenu) {
    activeMenu.hide();
    activeMenu.destroy();
    activeMenu = null;
  }
  const t = appTheme();
  const menu = new ContextMenu({
    items: buildDesktopContextMenuItems(actions),
    width: 210,
    bg: t.menuBg,
    hoverBg: t.menuHover,
    borderColor: t.menuBorder,
    color: t.text,
  });
  activeMenu = menu;
  menu.showAtPoint(x, y, scene);
}

/** Test seam: whether a menu is currently open. */
export function desktopContextMenuOpen(): boolean {
  return activeMenu !== null;
}
