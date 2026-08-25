/**
 * WebOS taskbar — replaces the engine Taskbar through the public
 * `shell.taskbar` field (spec 2026-08-24 §4 gap #3; composition friction
 * recorded in forge finding desktop-webos.md 2026-08-25).
 *
 * Anatomy: Start tile | pinned launchers | running-window entries with an era
 * indicator (accent underline / dock dot / pressed bevel) | tray cluster |
 * two-line clock. Era styling comes from the active preset's taskbar tokens +
 * app-side era tokens (`desktop-taskbar-height`, tray/bevel/pinstripe).
 *
 * Mirrors the engine contract consumed by DesktopShell/main.ts:
 * `setGeometry(width, y)`, `startButtonRight`, toolbar a11y role, and a
 * `destroy()` that clears timers/subscriptions. Theme switches recreate the
 * instance (single applyTheme path), so tokens are captured per construction.
 */

import { Entity, SVGEntity, type A11yAttributes, type IRenderer } from '@vectojs/core';
import type { DesktopWindow, WindowManager } from '@vectojs/desktop';
import { UIComponent } from '@vectojs/ui';
import { appTheme } from '../model/app-theme';
import type { ThemePreset } from '../model/theme-types';
import { formatTaskbarClock, type ClockReading } from '../model/clock-format';
import { drawPinstripes, drawRaisedBevel, drawSunkenBevel } from '../chrome/bevels';
import { scaleHex } from '../chrome/color';
import { DESKTOP_ICON_SPECS, themedIconSvg } from './icons';

/** Apps shown as pinned launcher tiles (subset keeps narrow viewports sane). */
const PINNED_APPS: readonly string[] = [
  'terminal',
  'files',
  'notes',
  'browser',
  'calculator',
  'settings',
];

const TRAY_GLYPHS: readonly string[] = [
  // network
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 20h.01M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0" fill="none" stroke="{FG}" stroke-width="2" stroke-linecap="round"/></svg>',
  // volume
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="{FG}"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="{FG}" stroke-width="2" stroke-linecap="round"/></svg>',
  // power
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 3v8" stroke="{FG}" stroke-width="2" stroke-linecap="round"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0" fill="none" stroke="{FG}" stroke-width="2" stroke-linecap="round"/></svg>',
];

/** Concrete non-drawing container (Entity is abstract). */
class Box extends Entity {
  public override isPointInside(): boolean {
    return false;
  }

  public override render(_r: IRenderer): void {}
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

type EntryStyle = 'underline' | 'dot' | 'bevel';

function entryStyleFor(presetId: string): EntryStyle {
  if (presetId === 'y2k') return 'bevel';
  if (presetId === 'aqua') return 'dot';
  return 'underline';
}

interface TaskbarColors {
  bg: string;
  fg: string;
  hover: string;
  active: string;
}

/** One running-window entry: era indicator + ≤100ms hover/press feedback. */
class TaskEntry extends Entity {
  private hovered = false;
  private pressed = false;
  private active = false;
  private readonly style: EntryStyle;

  constructor(
    public readonly win: DesktopWindow,
    private readonly colors: TaskbarColors,
    private readonly font: string,
    era: string,
  ) {
    super();
    this.style = entryStyleFor(era);
    this.width = 160;
    this.height = 30;
    this.interactive = true;
    this.a11yProjection = 'eager';
    this.on('hover', () => {
      this.hovered = true;
      this.scene?.markDirty();
    });
    this.on('pointerleave', () => {
      this.hovered = false;
      this.pressed = false;
      this.scene?.markDirty();
    });
    this.on('pointerdown', () => {
      this.pressed = true;
      this.scene?.markDirty();
    });
    const release = (): void => {
      if (!this.pressed) return;
      this.pressed = false;
      this.scene?.markDirty();
    };
    this.on('pointerup', release);
    this.on('pointercancel', release);
    this.on('click', () => this.emitActivate());
  }

  private onClick: ((win: DesktopWindow) => void) | null = null;

  public setActivation(fn: (win: DesktopWindow) => void): void {
    this.onClick = fn;
  }

  private emitActivate(): void {
    this.onClick?.(this.win);
  }

  /** Called by rebuild() to refresh stateful bits without recreation. */
  public sync(x: number, y: number, h: number, active: boolean): void {
    this.x = x;
    this.y = y;
    this.height = h;
    if (this.active !== active) {
      this.active = active;
    }
  }

  public override getA11yAttributes(): A11yAttributes {
    return { role: 'button', label: this.win.title, selected: this.active };
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(r: IRenderer): void {
    const t = appTheme();
    const w = this.width;
    const h = this.height;

    if (this.style === 'bevel') {
      const bevel = t.bevel;
      if (bevel) {
        r.beginPath();
        r.roundRect(0, 0, w, h, 0);
        r.fill(this.colors.bg);
        const pressed = this.active || this.pressed;
        drawRaisedBevel(
          r,
          0,
          0,
          w,
          h,
          pressed
            ? {
                lightOuter: bevel.darkOuter,
                lightInner: bevel.darkInner,
                darkInner: bevel.lightInner,
                darkOuter: bevel.lightOuter,
              }
            : bevel,
        );
        r.fillText(truncate(this.win.title, 18), 8, h * 0.68, this.font, this.colors.fg);
        return;
      }
    }

    let bg = this.active ? this.colors.active : this.colors.bg;
    if (this.hovered && !this.active) bg = this.colors.hover;

    if (this.style === 'underline') {
      r.beginPath();
      r.roundRect(0, 0, w, h - 3, 4);
      r.fill(bg);
      r.fillText(truncate(this.win.title, 18), 8, h * 0.58, this.font, this.colors.fg);
      r.beginPath();
      r.roundRect(6, h - 3, w - 12, 3, 1.5);
      r.fill(this.active ? t.accent : t.border);
    } else {
      // Dock-style entry (aqua): rounded plate + running dot.
      r.beginPath();
      r.roundRect(0, 0, w, h - 5, 8);
      r.fill(bg);
      r.fillText(truncate(this.win.title, 18), 8, (h - 5) * 0.66, this.font, this.colors.fg);
      r.beginPath();
      r.arc(w / 2, h - 2.5, 2, 0, Math.PI * 2);
      r.fill(this.active ? t.accent : t.border);
    }
    if (this.pressed) {
      r.beginPath();
      r.roundRect(0, 0, w, h, 4);
      r.stroke(t.focus, 1);
    }
  }
}

/** Start tile — era-aware visuals drawn in render(). */
class StartTile extends Entity {
  public readonly isStart = true;
  private hovered = false;
  private pressed = false;

  constructor(
    private readonly era: string,
    private readonly beveled: boolean,
    private readonly onStart: () => void,
  ) {
    super();
    this.width = 54;
    this.height = 32;
    this.interactive = true;
    this.a11yProjection = 'eager';
    this.on('hover', () => {
      this.hovered = true;
      this.scene?.markDirty();
    });
    this.on('pointerleave', () => {
      this.hovered = false;
      this.pressed = false;
      this.scene?.markDirty();
    });
    this.on('pointerdown', () => {
      this.pressed = true;
      this.scene?.markDirty();
    });
    const release = (): void => {
      if (!this.pressed) return;
      this.pressed = false;
      this.scene?.markDirty();
    };
    this.on('pointerup', release);
    this.on('pointercancel', release);
    this.on('click', () => this.onStart());
  }

  public place(x: number, y: number, w: number, h: number): void {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }

  public override getA11yAttributes(): A11yAttributes {
    return { role: 'button', label: 'Start' };
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(r: IRenderer): void {
    const t = appTheme();
    if (this.beveled && t.bevel) {
      r.beginPath();
      r.roundRect(this.x, this.y, this.width, this.height, 0);
      r.fill('#C0C0C0');
      drawRaisedBevel(
        r,
        this.x,
        this.y,
        this.width,
        this.height,
        this.pressed
          ? {
              lightOuter: t.bevel.darkOuter,
              lightInner: t.bevel.darkInner,
              darkInner: t.bevel.lightInner,
              darkOuter: t.bevel.lightOuter,
            }
          : t.bevel,
      );
      r.fillText(
        'Start',
        this.x + 8,
        this.y + this.height * 0.7,
        '600 11px Tahoma, sans-serif',
        '#000000',
      );
      return;
    }
    const radius = this.era === 'cloud' ? this.height / 2 : 6;
    r.beginPath();
    r.roundRect(this.x, this.y, this.width, this.height, radius);
    r.fill(t.accent);
    if (this.hovered || this.pressed) {
      r.beginPath();
      r.roundRect(this.x, this.y, this.width, this.height, radius);
      r.fill(this.pressed ? t.accentHover : t.focus);
    }
    r.fillText(
      'Start',
      this.x + 10,
      this.y + this.height * 0.64,
      `600 12px ${t.chromeFont}`,
      t.accentText,
    );
  }
}

/** Pinned launcher tile: era-treated icon, hover/press backplate. */
class PinnedTile extends Entity {
  private hovered = false;
  private pressed = false;

  constructor(
    era: string,
    size: number,
    private readonly appId: string,
    private readonly label: string,
    private readonly onLaunchApp: (appId: string) => void,
  ) {
    super();
    this.width = size;
    this.height = size;
    this.interactive = true;
    this.a11yProjection = 'eager';
    const svg = new SVGEntity(themedIconSvg(appId, era));
    svg.interactive = false;
    svg.a11yProjection = 'never';
    svg.width = Math.max(14, size - 12);
    svg.height = Math.max(14, size - 12);
    svg.x = (this.width - svg.width) / 2;
    svg.y = (this.height - svg.height) / 2;
    this.add(svg);
    this.on('hover', () => {
      this.hovered = true;
      this.scene?.markDirty();
    });
    this.on('pointerleave', () => {
      this.hovered = false;
      this.pressed = false;
      this.scene?.markDirty();
    });
    this.on('pointerdown', () => {
      this.pressed = true;
      this.scene?.markDirty();
    });
    const release = (): void => {
      if (!this.pressed) return;
      this.pressed = false;
      this.scene?.markDirty();
    };
    this.on('pointerup', () => {
      this.onLaunchApp(this.appId);
      release();
    });
    this.on('pointercancel', release);
    this.on('click', () => this.onLaunchApp(this.appId));
  }

  public override getA11yAttributes(): A11yAttributes {
    return { role: 'button', label: `Open ${this.label}` };
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(r: IRenderer): void {
    const t = appTheme();
    if (this.hovered || this.pressed) {
      r.beginPath();
      r.roundRect(0, 0, this.width, this.height, 6);
      r.fill(this.pressed ? t.menuHover : t.surfaceRaised);
    }
  }
}

/** Two-line/single-line clock view; placement is refreshed every tick. */
class ClockView extends Entity {
  private reading: ClockReading = { time: '--:--', date: null };

  constructor(private readonly fg: string) {
    super();
    this.interactive = false;
    this.a11yProjection = 'never';
    this.width = 96;
    this.height = 30;
  }

  public override isPointInside(): boolean {
    return false;
  }

  public setReading(reading: ClockReading): void {
    this.reading = reading;
  }

  public preferredWidth(): number {
    return this.reading.date ? 100 : 72;
  }

  public override render(r: IRenderer): void {
    const t = appTheme();
    const x = this.x;
    if (this.reading.date) {
      r.fillText(this.reading.time, x + 2, 17, `600 13px ${t.chromeFont}`, this.fg);
      r.fillText(
        this.reading.date,
        x + 2,
        this.height - 3,
        `400 10px ${t.chromeFont}`,
        scaleHex(this.fg, 0.72),
      );
    } else {
      r.fillText(
        this.reading.time,
        x + 2,
        this.y === 0 ? 15 : 15,
        `500 12px ${t.chromeFont}`,
        this.fg,
      );
    }
  }
}

export interface WebOSTaskbarOptions {
  windowManager: WindowManager;
  /** Active preset — raw engine tokens + era id for anatomy decisions. */
  preset: ThemePreset;
  onStartMenu: () => void;
  onLaunch: (appId: string) => void;
  width: number;
  y: number;
}

/**
 * The WebOS-owned bar. Created AFTER the theme is applied so it can capture
 * both the raw taskbar tokens and the derived era chrome.
 */
export class WebOSTaskbar extends UIComponent {
  declare public height: number;
  private readonly wm: WindowManager;
  private readonly presetId: string;
  private readonly colors: TaskbarColors;
  private readonly font: string;
  private readonly entries = new Map<DesktopWindow, TaskEntry>();
  private readonly entriesHost: Entity;
  private readonly startTile: StartTile;
  private readonly pinnedTiles: PinnedTile[] = [];
  private readonly clock: ClockView;
  private readonly trayHolders: Entity[] = [];
  private unsub: () => void;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: WebOSTaskbarOptions) {
    super();
    this.wm = opts.windowManager;
    this.presetId = opts.preset.id;
    const tk = opts.preset.tokens;
    this.colors = {
      bg: String(tk['desktop-taskbar-bg'] ?? '#0f172a'),
      fg: String(tk['desktop-taskbar-fg'] ?? '#e2e8f0'),
      hover: String(tk['desktop-taskbar-hover'] ?? '#1e293b'),
      active: String(tk['desktop-taskbar-active'] ?? '#1d4ed8'),
    };
    this.font = this.entryFont();
    this.width = opts.width;
    this.height = appTheme().taskbarHeight;
    this.x = 0;
    this.y = opts.y;
    this.interactive = true;
    this.a11yProjection = 'eager';

    // Passive container (engine EntriesHost precedent): children own hits,
    // the host itself never projects or intercepts, so the audit's
    // non-overlap gate sees one mirror per entry instead of nested stacks.
    this.entriesHost = new Box();
    this.entriesHost.interactive = false;
    this.entriesHost.a11yProjection = 'never';
    this.entriesHost.clipChildren = true;
    this.add(this.entriesHost);

    this.startTile = new StartTile(this.presetId, this.presetId === 'y2k', opts.onStartMenu);
    this.add(this.startTile);

    for (const appId of PINNED_APPS) {
      const spec = DESKTOP_ICON_SPECS.find((s) => s.appId === appId);
      if (!spec) continue;
      const size = Math.min(38, this.height - 8);
      const tile = new PinnedTile(this.presetId, size, appId, spec.label, opts.onLaunch);
      this.pinnedTiles.push(tile);
      this.add(tile);
    }

    this.clock = new ClockView(this.colors.fg);
    this.add(this.clock);

    for (const glyph of TRAY_GLYPHS) {
      const holder = new Box();
      holder.interactive = false;
      holder.a11yProjection = 'never';
      holder.width = 26;
      holder.height = 22;
      const svg = new SVGEntity(glyph.replace(/\{FG\}/g, this.colors.fg));
      svg.interactive = false;
      svg.a11yProjection = 'never';
      svg.width = 16;
      svg.height = 16;
      svg.x = 5;
      svg.y = 3;
      holder.add(svg);
      this.add(holder);
      this.trayHolders.push(holder);
    }

    this.layout();
    this.unsub = this.wm.on(() => this.rebuild());
    this.updateClock();
    this.rebuild();
    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => this.updateClock(), 1000);
    }
  }

  /** Right edge of the Start region in taskbar-local coordinates. */
  get startButtonRight(): number {
    return this.startTile.x + this.startTile.width;
  }

  /**
   * The Start tile entity, for focus-restoration fallbacks (issue #36): a
   * theme switch destroys a captured opener with the old bar, so restore
   * paths need the live tile to re-target Start.
   */
  get startButton(): Entity {
    return this.startTile;
  }

  /** Engine-compatible geometry hook (DesktopShell.resize calls this). */
  public setGeometry(width: number, y: number): void {
    this.width = width;
    this.y = y;
    this.layout();
    this.updateClock();
    this.rebuild();
  }

  public override getA11yAttributes(): A11yAttributes {
    return { role: 'toolbar', label: 'Taskbar', pointerEvents: 'none' };
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  private layout(): void {
    const h = this.height;
    const startH = Math.min(34, h - 10);
    this.startTile.place(8, Math.round((h - startH) / 2), 54, startH);
    let cursor = 8 + 54 + 8;

    const tileSize = Math.min(38, h - 8);
    for (const tile of this.pinnedTiles) {
      tile.x = cursor;
      tile.y = Math.round((h - tileSize) / 2);
      cursor += tileSize + 4;
    }

    this.clock.setReading(formatTaskbarClock(new Date(), this.presetId));
    const clockW = this.clock.preferredWidth();
    this.clock.x = Math.max(cursor + 12, this.width - clockW - 12);
    this.clock.y = 3;
    this.clock.height = h - 6;

    let tx = this.clock.x - 8 - this.trayHolders.length * 28;
    for (const holder of this.trayHolders) {
      holder.x = tx;
      holder.y = Math.round((h - 22) / 2);
      tx += 28;
    }

    this.entriesHost.x = cursor;
    this.entriesHost.y = 0;
    this.entriesHost.width = Math.max(60, this.trayHolders[0].x - 6 - cursor);
    this.entriesHost.height = h;
  }

  private updateClock(): void {
    this.clock.setReading(formatTaskbarClock(new Date(), this.presetId));
    // Reposition on EVERY tick — coupling placement to content changes is the
    // WEB-0032 engine trap; this replacement owns its layout instead.
    this.clock.x = Math.max(
      this.entriesHost.x + this.entriesHost.width + 8,
      this.width - this.clock.preferredWidth() - 12,
    );
    this.scene?.markDirty();
  }

  private rebuild(): void {
    const windows = this.wm.list().filter((w) => !w.isDialog);
    const live = new Set<DesktopWindow>();
    const btnH = Math.min(30, this.height - 4);
    let x = 4;
    for (const win of windows) {
      let entry = this.entries.get(win);
      if (!entry) {
        entry = new TaskEntry(win, this.colors, this.font, this.presetId);
        entry.setActivation((w) => {
          if (this.wm.focusedWindow === w && !w.minimized) {
            w.minimize();
            return;
          }
          if (w.minimized) w.restoreFromMinimized();
          else this.wm.focus(w);
        });
        this.entries.set(win, entry);
        this.entriesHost.add(entry);
      }
      entry.sync(x, Math.round((this.height - btnH) / 2), btnH, this.isActive(win));
      live.add(win);
      x += entry.width + 4;
      if (x > this.entriesHost.width) break;
    }
    for (const [win, entry] of this.entries) {
      if (live.has(win)) continue;
      this.entriesHost.remove(entry);
      entry.destroy();
      this.entries.delete(win);
    }
    this.scene?.markDirty();
  }

  private isActive(win: DesktopWindow): boolean {
    return this.wm.focusedWindow === win && !win.minimized;
  }

  private entryFont(): string {
    const family =
      this.presetId === 'y2k' ? 'Tahoma, sans-serif' : '"Segoe UI", system-ui, sans-serif';
    return `500 ${this.presetId === 'y2k' ? 11 : 12}px ${family}`;
  }

  public override render(r: IRenderer): void {
    const t = appTheme();

    // Bar surface.
    r.beginPath();
    r.roundRect(0, 0, this.width, this.height, 0);
    r.fill(this.colors.bg);

    // Aqua dock: top gloss line + faint pinstripes.
    if (this.presetId === 'aqua') {
      r.beginPath();
      r.moveTo(0, 1.5);
      r.lineTo(this.width, 1.5);
      r.stroke('rgba(255,255,255,0.65)', 1);
      if (t.pinstripe) {
        drawPinstripes(r, 0, 3, this.width, this.height - 3, t.pinstripe.color, t.pinstripe.gap);
      }
    }

    // Tray well.
    if (this.trayHolders.length > 0) {
      const trayX = this.trayHolders[0].x - 6;
      const last = this.trayHolders[this.trayHolders.length - 1];
      const trayW = last.x + last.width + 6 - trayX;
      if (t.bevel && this.presetId === 'y2k' && t.trayBg) {
        r.beginPath();
        r.roundRect(trayX, 3, trayW, this.height - 6, 0);
        r.fill(t.trayBg);
        drawSunkenBevel(r, trayX, 3, trayW, this.height - 6, t.bevel);
      } else if (t.trayBg) {
        r.beginPath();
        r.roundRect(trayX, 3, trayW, this.height - 6, 4);
        r.fill(t.trayBg);
      }
    }

    // Win98 raised frame around the whole bar.
    if (t.bevel && this.presetId === 'y2k') {
      drawRaisedBevel(r, 0, 0, this.width, this.height, t.bevel);
    }
  }

  public override destroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.unsub();
    super.destroy();
  }
}
