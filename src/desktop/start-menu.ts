/**
 * WebOS start menu — searchable modern anatomy (search field, 6-column
 * pinned grid, recent list, user + power footer) replacing the engine's
 * vertical Kickoff-lite. The shell owns the toggle; `toggleStartMenu` is
 * overridden on the shell (startMenu is private — composition friction
 * recorded in forge finding desktop-webos.md 2026-08-25).
 *
 * Era styling: menu tokens (`desktop-menu-*`), fake elevation under the
 * panel, aqua pinstripes in the header, vaporwave glow title, Win98 bevel
 * frame. The y2k era gets a cascading program-group menu instead
 * (era-correct; spec §4 gap #4).
 */

import { Entity, SVGEntity, type A11yAttributes, type IRenderer } from '@vectojs/core';
import { UIComponent } from '@vectojs/ui';
import type { AppDefinition } from '@vectojs/desktop';
import type { Scene } from '@vectojs/core';
import { Button, ContextMenu, Flow, type ContextMenuItem } from '@vectojs/ui';
import { appTheme } from '../model/app-theme';
import { buildProgramGroups, filterApps, pushRecent } from '../model/start-menu-model';
import { drawPinstripes, drawRaisedBevel } from '../chrome/bevels';
import { glowStackColors } from '../chrome/color';
import { drawShadow, parseShadowToken } from '../chrome/shadow';
import { themedIconSvg } from './icons';
import { ThemedInput } from '../app/ui-helpers';

const GRID_COLS = 6;
const TILE = 56;
const PANEL_WIDTH = GRID_COLS * (TILE + 8) + 24;

/** One pinned-grid tile: era icon over an accessible button. */
class AppTile extends Button {
  constructor(appId: string, label: string, era: string, onLaunch: (appId: string) => void) {
    super(label, {
      width: TILE,
      height: TILE,
      font: '400 10px system-ui, sans-serif',
      padding: 2,
      radius: appTheme().menuRadius >= 12 ? 12 : 6,
    });
    const svg = new SVGEntity(themedIconSvg(appId, era));
    svg.interactive = false;
    svg.a11yProjection = 'never';
    svg.width = 26;
    svg.height = 26;
    svg.x = (TILE - 26) / 2;
    svg.y = 6;
    this.add(svg);
    this.on('click', () => onLaunch(appId));
  }

  public override getA11yAttributes(): A11yAttributes {
    const attrs = super.getA11yAttributes();
    attrs.label = attrs.label ?? this.label;
    return attrs;
  }
}

export interface WebOSStartMenuOptions {
  apps: readonly AppDefinition[];
  presetId: string;
  recents: readonly string[];
  onLaunch: (appId: string) => void;
  /** Owner-provided dismissal (overlay hide + destroy). */
  onClose: () => void;
}

/**
 * Modern searchable menu. Positioned by the owner above the taskbar; Escape /
 * outside click are handled by the owner via `containsPoint`.
 */
export class WebOSStartMenu extends UIComponent {
  public readonly width: number;
  declare public height: number;
  private readonly apps: readonly AppDefinition[];
  private readonly presetId: string;
  private readonly onLaunch: (appId: string) => void;
  private recents: readonly string[];
  private readonly searchInput: ThemedInput;
  private readonly gridHost: Flow;
  private readonly recentHost: Entity;
  private tiles: AppTile[] = [];
  private recentButtons: Button[] = [];

  constructor(opts: WebOSStartMenuOptions) {
    super();
    this.apps = opts.apps;
    this.presetId = opts.presetId;
    this.recents = opts.recents;
    this.onLaunch = opts.onLaunch;
    this.requestClose = opts.onClose;
    this.width = PANEL_WIDTH;
    const t = appTheme();
    this.height = 96 + 3 * Math.ceil(10 / GRID_COLS) * (TILE + 6);

    this.interactive = true;
    this.a11yProjection = 'eager';

    // Search field (single highest-signal modern-OS element).
    this.searchInput = new ThemedInput({
      width: this.width - 24,
      height: 30,
      placeholder: 'Search apps',
      font: '400 13px system-ui, sans-serif',
      radius: Math.min(6, t.menuRadius),
      padding: 8,
      onChange: (q) => this.refilter(q),
    });
    this.searchInput.x = 12;
    this.searchInput.y = 40;
    this.searchInput.a11yProjection = 'eager';
    this.searchInput.focus();
    this.add(this.searchInput);

    this.gridHost = new Flow({ gap: 6, maxWidth: this.width - 24 });
    this.gridHost.x = 12;
    this.gridHost.y = 80;
    this.gridHost.interactive = true;
    this.add(this.gridHost);

    this.recentHost = new Box();
    this.recentHost.interactive = true;
    this.recentHost.x = 12;
    this.add(this.recentHost);
    this.add(this.buildFooter());

    this.rebuildGrid('');
  }

  /** Hit-test for outside-click dismissal. */
  public containsPoint(gx: number, gy: number): boolean {
    return gx >= this.x && gx <= this.x + this.width && gy >= this.y && gy <= this.y + this.height;
  }

  private buildFooter(): Entity {
    const footer = new Box();
    footer.interactive = true;
    const user = new Button('User', {
      width: 120,
      height: 28,
      font: '500 12px system-ui, sans-serif',
      padding: 4,
      onClick: () => this.launch('about'),
    });
    user.x = 12;
    user.y = this.height - 38;
    const power = new Button('⏻', {
      width: 34,
      height: 28,
      font: '600 14px system-ui, sans-serif',
      padding: 2,
      onClick: () => this.launch('sysmon'),
    });
    power.x = this.width - 46;
    power.y = this.height - 38;
    footer.add(user);
    footer.add(power);
    return footer;
  }

  private launch(appId: string): void {
    this.recents = pushRecent(this.recents, appId);
    this.onLaunch(appId);
  }

  private rebuildGrid(query: string): void {
    const t = appTheme();
    for (const tile of this.tiles) {
      this.gridHost.remove(tile);
      tile.destroy();
    }
    this.tiles = [];
    const known = new Set(this.apps.map((a) => a.id));
    const filtered = filterApps(
      this.apps.map((a) => ({ id: a.id, title: a.title })),
      query,
    );
    let shown = 0;
    for (const app of filtered.slice(0, GRID_COLS * 3)) {
      const def = this.apps.find((a) => a.id === app.id)!;
      const tile = new AppTile(def.id, def.title, this.presetId, (id) => this.launch(id));
      this.tiles.push(tile);
      this.gridHost.add(tile);
      shown += 1;
    }

    // Recent row area sits below the grid.
    for (const b of this.recentButtons) {
      this.recentHost.remove(b);
      b.destroy();
    }
    this.recentButtons = [];
    const recentIds = this.recents.filter((id) => known.has(id)).slice(0, 3);
    let ry = 0;
    if (!query && recentIds.length > 0) {
      for (const id of recentIds) {
        const def = this.apps.find((a) => a.id === id);
        if (!def) continue;
        const row = new Button(`Recent: ${def.title}`, {
          width: this.width - 24,
          height: 26,
          font: '400 12px system-ui, sans-serif',
          bg: t.menuBg,
          hoverBg: t.menuHover,
          color: t.text,
          padding: 4,
          radius: Math.min(4, t.menuRadius),
          onClick: () => this.launch(id),
        });
        row.x = 0;
        row.y = ry;
        this.recentButtons.push(row);
        this.recentHost.add(row);
        ry += 30;
      }
    }
    this.recentHost.y = 80 + Math.max(1, Math.ceil(shown / GRID_COLS)) * (TILE + 6) + 4;
    this.scene?.markDirty();
  }

  private refilter(query: string): void {
    this.rebuildGrid(query);
  }

  /** Owner-provided dismissal wired at construction (overlay hide+destroy). */
  private requestClose: () => void = () => {};

  public handleMenuKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.requestClose();
    }
  }

  public override getA11yAttributes(): A11yAttributes {
    return { role: 'dialog', label: 'Start menu' };
  }

  public override isPointInside(gx: number, gy: number): boolean {
    return this.containsPoint(gx, gy);
  }

  public override render(r: IRenderer): void {
    const t = appTheme();

    // Fake elevation under the panel.
    drawShadow(
      r,
      this.x,
      this.y,
      this.width,
      this.height,
      t.menuRadius,
      parseShadowToken(t.windowShadow),
    );

    r.beginPath();
    r.roundRect(this.x, this.y, this.width, this.height, t.menuRadius);
    r.fill(t.menuBg);
    r.stroke(t.menuBorder, 1);

    // Header band with the wordmark; aqua gets pinstripes, vaporwave glow.
    r.fillText('WebOS', this.x + 14, this.y + 24, `600 14px ${t.chromeFont}`, t.text);
    if (this.presetId === 'aqua' && t.pinstripe) {
      drawPinstripes(r, this.x, this.y + 2, this.width, 32, t.pinstripe.color, t.pinstripe.gap);
    }
    if (t.glow && this.presetId === 'vaporwave') {
      // Hex glow tokens included: the shared helper applies the 0.25/i
      // falloff (review F1 — string replace silently no-opped on #RRGGBB).
      for (const glowColor of glowStackColors(t.glow.color, t.glow.strength)) {
        r.fillText('WebOS', this.x + 14, this.y + 24, `600 14px ${t.chromeFont}`, glowColor);
      }
    }

    // Footer separator.
    r.beginPath();
    r.moveTo(this.x + 8, this.y + this.height - 44);
    r.lineTo(this.x + this.width - 8, this.y + this.height - 44);
    r.stroke(t.menuBorder, 1);

    if (t.bevel && this.presetId === 'y2k') {
      drawRaisedBevel(r, this.x, this.y, this.width, this.height, t.bevel);
    }
  }
}

class Box extends Entity {
  public override isPointInside(): boolean {
    return false;
  }

  public override render(_r: IRenderer): void {}
}

// ------------------------------------------------------- y2k cascade variant

/**
 * Era-correct y2k start menu: cascading program groups rendered through the
 * ui ContextMenu (WCAG menu pattern, submenus built in). Anchored just above
 * the Start tile.
 */
export function openY2KProgramMenu(
  scene: Scene,
  apps: readonly AppDefinition[],
  x: number,
  y: number,
  onLaunch: (appId: string) => void,
): ContextMenu {
  const items: ContextMenuItem[] = [];
  for (const group of buildProgramGroups(apps.map((a) => ({ id: a.id, title: a.title })))) {
    items.push({
      label: group.label,
      children: group.apps.map((app) => ({
        label: app.title,
        onClick: () => onLaunch(app.id),
      })),
    });
  }
  items.push({ separator: true });
  const settings = apps.find((a) => a.id === 'settings');
  if (settings) {
    items.push({ label: 'Settings…', onClick: () => onLaunch('settings') });
  }
  const menu = new ContextMenu({
    items,
    width: 220,
    bg: appTheme().menuBg,
    hoverBg: appTheme().menuHover,
    borderColor: appTheme().menuBorder,
    color: appTheme().text,
  });
  menu.showAtPoint(x, y, scene);
  return menu;
}
