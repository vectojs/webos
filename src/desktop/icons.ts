/**
 * Desktop icon grid — SVGEntity-based icons over a click-catcher that clears
 * selection (D7: the canvas-level DOM listener is gone; selection clearing
 * is an entity in the scene graph, and topmost-hit dispatch means icon
 * clicks never reach it).
 */

import { Entity, SVGEntity, type IRenderer } from '@vectojs/core';
import { Text } from '@vectojs/ui';

interface IconDef {
  /** Full `<svg>` source for the 24x24 viewBox icon. */
  svg: string;
}

function svgPath(
  d: string,
  fill: string,
  opts: { stroke?: string; strokeWidth?: number } = {},
): string {
  const strokeAttr = opts.stroke
    ? ` fill="none" stroke="${opts.stroke}" stroke-width="${opts.strokeWidth ?? 1.5}" stroke-linecap="round" stroke-linejoin="round"`
    : ` fill="${fill}"`;
  return `<path d="${d}"${strokeAttr}/>`;
}

function iconDef(...paths: string[]): IconDef {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${paths.join('')}</svg>`;
  return { svg };
}

const ICON_DEFS: Record<string, IconDef> = {
  terminal: iconDef(
    svgPath('M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', '#0f172a'),
    svgPath('M7 8l4 4-4 4M13 16h5', '', { stroke: '#22c55e', strokeWidth: 2 }),
  ),
  files: iconDef(
    svgPath(
      'M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8L10 4H4z',
      '#f59e0b',
    ),
    svgPath('M2 10h20v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8z', '#fbbf24'),
  ),
  notes: iconDef(
    svgPath('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z', '#38bdf8'),
    svgPath('M14 2v6h6M8 13h8M8 17h5', '', {
      stroke: '#ffffff',
      strokeWidth: 1.5,
    }),
  ),
  paint: iconDef(
    svgPath('M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', '#f43f5e'),
    svgPath('M3 21h18', '', { stroke: '#fbbf24', strokeWidth: 2 }),
  ),
  browser: iconDef(
    svgPath('M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', '#0ea5e9'),
    svgPath(
      'M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
      '',
      { stroke: '#ffffff', strokeWidth: 1.5 },
    ),
  ),
  calculator: iconDef(
    svgPath('M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', '#3b82f6'),
    svgPath(
      'M8 5h8v3H8V5zm0 6h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z',
      '#ffffff',
    ),
  ),
  sysmon: iconDef(
    svgPath('M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', '#10b981'),
    svgPath('M4 13h3.5l2.5-6 4 11 2.5-5H20', '', {
      stroke: '#ffffff',
      strokeWidth: 2,
    }),
  ),
  settings: iconDef(
    svgPath(
      'M12 2C6.49 2 2 6.49 2 12c0 5.51 4.49 10 10 10a2.5 2.5 0 0 0 2.5-2.5c0-.65-.25-1.24-.66-1.68-.41-.44-.66-1.04-.66-1.68 0-1.38 1.12-2.5 2.5-2.5h1.82c3.08 0 5.5-2.42 5.5-5.5C22 5.61 17.51 2 12 2z',
      '#ec4899',
    ),
    svgPath(
      'M6.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
      '#ffffff',
    ),
  ),
  clock: iconDef(
    svgPath('M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', '#6366f1'),
    svgPath('M12 6v6l4 2.5', '', { stroke: '#ffffff', strokeWidth: 2 }),
  ),
  about: iconDef(
    svgPath(
      'M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4l-2 3v1h12v-1l-2-3h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z',
      '#64748b',
    ),
    svgPath('M7 8l3 3-3 3M12 14h5', '', { stroke: '#38bdf8', strokeWidth: 2 }),
  ),
};

/** Return the stable SVG source used by shell chrome for an app id. */
export function appIconSvg(appId: string): string | undefined {
  return ICON_DEFS[appId]?.svg;
}

// ------------------------------------------------------- era icon treatments
// Spec 2026-08-24 §3.4: per-era treatments as data-level wrappers around the
// 24x24 defs. Each treatment layers era-telling chrome (gloss, bevels, neon,
// haze) over the same base glyph so every preset reads differently.

type IconTreatment = {
  /** Layers inserted BEFORE the base glyph (under it). */
  under?: string;
  /** Layers appended AFTER the base glyph (over it). */
  over?: string;
};

const ICON_TREATMENTS: Record<string, IconTreatment> = {
  // Fluent flat: subtle bottom-edge darker rim.
  aero: {
    over: '<rect x="2" y="18" width="20" height="4.5" rx="2.25" fill="rgba(0,0,0,0.12)"/>',
  },
  // Material: 2px drop shadow via feDropShadow.
  cloud: {
    over:
      '<rect x="0" y="0" width="0" height="0" fill="none" filter="url(#cloudSh)"/>' +
      '<defs><filter id="cloudSh" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.35"/></filter></defs>',
  },
  // Breeze: flat 1.5px outline, no gradient.
  breeze: {
    over: '<rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="#8C9196" stroke-width="1.5" opacity="0.9"/>',
  },
  // Aqua candy: vertical gloss ellipse on the upper half.
  aqua: {
    over:
      '<defs><linearGradient id="aquaGloss" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(255,255,255,0.55)"/>' +
      '<stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient></defs>' +
      '<ellipse cx="12" cy="8" ry="6" rx="9" fill="url(#aquaGloss)"/>',
  },
  // Win98 beveled tile: light TL / dark BR pixel borders.
  y2k: {
    under:
      '<path d="M2 22 L2 2 L22 2 L22 4 L4 4 L4 22 Z" fill="#FFFFFF"/>' +
      '<path d="M22 2 L22 22 L2 22 L2 20 L20 20 L20 2 Z" fill="#404040"/>',
  },
  // Vaporwave neon wireframe: dark plate + cyan/pink double stroke.
  vaporwave: {
    under: '<rect x="2" y="2" width="20" height="20" rx="2" fill="rgba(10,4,26,0.85)"/>',
    over:
      '<rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="#01CDFE" stroke-width="1.5"/>' +
      '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="#FF71CE" stroke-width="1" opacity="0.8"/>',
  },
  // Dreamcore pastel duotone: white haze wash.
  dreamcore: {
    over: '<rect x="1" y="1" width="22" height="22" rx="5" fill="rgba(255,255,255,0.30)"/>',
  },
};

/** Active preset id for icon treatments; '' = untreated bases. */
let iconPresetId = '';

/** Set the era whose icon treatments apply (called by the theme path). */
export function setIconPreset(presetId: string): void {
  iconPresetId = presetId;
}

/** The currently applied icon-era id. */
export function getIconPreset(): string {
  return iconPresetId;
}

/**
 * Base def wrapped in the active era's treatment. Unknown app ids fall back
 * to the emoji placeholder (treated like any other glyph).
 */
export function themedIconSvg(appId: string, presetId: string): string {
  const base = ICON_DEFS[appId]?.svg ?? fallbackSvg('❓');
  const t = ICON_TREATMENTS[presetId];
  if (!t) return base;
  const inner = base.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `${base.slice(0, base.indexOf('>') + 1)}${t.under ?? ''}${inner}${t.over ?? ''}</svg>`;
}

export interface DesktopIconSpec {
  id: string;
  appId: string;
  label: string;
}

/** One desktop shortcut: SVG icon + label, hover/select highlight, double-click launch. */
export class DesktopIcon extends Entity {
  private hovered = false;
  private focused = false;
  private selected = false;
  private lastClickTime = 0;
  private appliedTreatment = '';
  private readonly icon: SVGEntity;
  private readonly label: Text;

  constructor(
    public readonly appId: string,
    label: string,
    private readonly onLaunch: (appId: string) => void,
    private readonly onSelect: (icon: DesktopIcon, toggle: boolean) => void,
  ) {
    super();
    this.width = 76;
    this.height = 76;
    this.interactive = true;

    const svg = themedIconSvg(appId, iconPresetId);
    this.icon = new SVGEntity(svg);
    this.appliedTreatment = iconPresetId;
    this.icon.width = 32;
    this.icon.height = 32;
    this.icon.x = (this.width - 32) / 2;
    this.icon.y = 4;
    this.icon.interactive = false;
    this.add(this.icon);

    this.label = new Text(label, {
      font: '600 11px "Segoe UI", system-ui, sans-serif',
      color: '#ffffff',
      maxWidth: this.width,
      textAlign: 'center',
    });
    this.label.y = 42;
    this.label.interactive = false;
    this.add(this.label);

    this.on('hover', () => {
      this.hovered = true;
      this.scene?.markDirty();
    });
    this.on('pointerleave', () => {
      this.hovered = false;
      this.scene?.markDirty();
    });
    this.on('focus', () => {
      this.focused = true;
      this.scene?.markDirty();
    });
    this.on('blur', () => {
      this.focused = false;
      this.scene?.markDirty();
    });
    this.on('pointerdown', (e) => {
      e.stopPropagation?.();
      const native = e.nativeEvent as PointerEvent | undefined;
      const toggle = !!(native && (native.ctrlKey || native.metaKey));
      const now = Date.now();
      if (now - this.lastClickTime < 350) {
        this.onLaunch(this.appId);
        this.lastClickTime = 0;
      } else {
        this.lastClickTime = now;
        this.onSelect(this, toggle);
      }
      this.scene?.markDirty();
    });
    // Keyboard activation (audit #25 P1-A): the core synthesizes `click` from
    // Enter/Space on the projected mirror for interactive roles, so the icon's
    // `role="button"` promise is honored here. Entity-level `keydown` never
    // fires for plain (non-input) mirrors, so this is the only transport.
    // Pointer clicks arrive through the same event with a mouse nativeEvent —
    // those must keep the double-click-to-launch metaphor, hence the key check.
    this.on('click', (e) => {
      const native = e.nativeEvent as KeyboardEvent | undefined;
      if (!native || (native.key !== 'Enter' && native.key !== ' ')) return;
      this.lastClickTime = 0;
      this.onLaunch(this.appId);
      this.scene?.markDirty();
    });
  }

  public setSelected(selected: boolean): void {
    if (this.selected !== selected) {
      this.selected = selected;
      this.scene?.markDirty();
    }
  }

  public isSelected(): boolean {
    return this.selected;
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override getA11yAttributes() {
    return {
      role: 'button',
      label: `Open ${this.label.text}`,
      selected: this.selected,
    };
  }

  public override render(r: IRenderer): void {
    // Re-skin the glyph when the era changed (theme switch path calls
    // setIconPreset then markDirty; SVGEntity re-rasterizes lazily).
    if (this.appliedTreatment !== iconPresetId) {
      this.appliedTreatment = iconPresetId;
      this.icon.setSVGSource(themedIconSvg(this.appId, iconPresetId));
    }
    if (this.selected || this.hovered || this.focused) {
      r.beginPath();
      r.roundRect(0, 0, this.width, this.height, 6);
      r.fill(this.selected ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.14)');
      r.stroke(
        this.selected || this.focused ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.35)',
        this.focused ? 2 : 1,
      );
    }
  }
}

/**
 * Windows-style marquee: translucent selection rectangle drawn during a
 * left-button drag on empty desktop.
 */
export class MarqueeSelection extends Entity {
  constructor() {
    super();
    this.interactive = false;
    this.a11yProjection = 'never';
    this.opacity = 0;
  }

  public override isPointInside(): boolean {
    return false;
  }

  public override render(r: IRenderer): void {
    r.beginPath();
    r.roundRect(0, 0, this.width, this.height, 2);
    r.fill('rgba(56, 189, 248, 0.15)');
    r.stroke('rgba(56, 189, 248, 0.9)', 1);
  }
}

export interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Full-desktop pointer surface below the icons.
 *
 * The engine routes mouse input ONLY through a11y mirror elements (the canvas
 * itself has no pointerdown listeners — forge finding `core-a11y-and-input.md`
 * 2026-08-15), so this MUST project a mirror: `a11yFullViewport` +
 * role-less `tabIndex: -1` keeps it AT-invisible while pointer-visible, and
 * icon mirrors drawn above it keep their own clicks (topmost hit).
 */
export class DesktopClickCatcher extends Entity {
  private dragging = false;
  private moved = false;
  private startX = 0;
  private startY = 0;

  constructor(
    private readonly onEmptyClick: () => void,
    private readonly onMarquee: (rect: MarqueeRect, final: boolean) => void,
    private readonly isExcluded?: (x: number, y: number) => boolean,
  ) {
    super();
    this.interactive = true;
    this.a11yProjection = 'eager';
    this.a11yFullViewport = true;
    this.on('pointerdown', (e) => {
      const p = this.point(e);
      // Taskbar areas without their own mirrors (the empty strip between
      // entries) fall through to the catcher; a desktop marquee must not
      // start there.
      if (this.isExcluded?.(p.x, p.y)) return;
      this.dragging = true;
      this.moved = false;
      this.startX = p.x;
      this.startY = p.y;
    });
    this.on('pointermove', (e) => {
      if (!this.dragging) return;
      const p = this.point(e);
      const dx = p.x - this.startX;
      const dy = p.y - this.startY;
      if (!this.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      this.moved = true;
      this.onMarquee(this.rect(p.x, p.y), false);
    });
    this.on('pointerup', (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (!this.moved) {
        this.onEmptyClick();
        return;
      }
      const p = this.point(e);
      this.onMarquee(this.rect(p.x, p.y), true);
    });
    // A gesture can end without a pointerup on this surface: the browser may
    // cancel it, or the pointer may leave the canvas mid-drag. Without these
    // resets, dragging/moved latch and later buttonless pointermove keeps
    // drawing marquees (same defensive pattern as ThemedButton).
    this.on('pointercancel', () => this.abandonDrag());
    this.on('pointerleave', () => this.abandonDrag());
  }

  /** Drop an in-flight drag: no spurious click, any latched marquee collapsed. */
  private abandonDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    const hadMoved = this.moved;
    this.moved = false;
    if (hadMoved) {
      // final=true hides the marquee overlay again and clears the
      // rubber-band selection made so far.
      this.onMarquee({ x: this.startX, y: this.startY, w: 0, h: 0 }, true);
    }
  }

  public override getA11yAttributes() {
    return { tabIndex: -1 };
  }

  public override isPointInside(): boolean {
    return true;
  }

  public override render(_r: IRenderer): void {}

  private point(e: { nativeEvent?: unknown }): { x: number; y: number } {
    const native = e.nativeEvent as PointerEvent | undefined;
    const scene = this.scene;
    if (native && scene) {
      return scene.clientToScene(native.clientX, native.clientY);
    }
    return { x: this.startX, y: this.startY };
  }

  private rect(px: number, py: number): MarqueeRect {
    const x = Math.min(this.startX, px);
    const y = Math.min(this.startY, py);
    return {
      x,
      y,
      w: Math.abs(px - this.startX),
      h: Math.abs(py - this.startY),
    };
  }
}

function fallbackSvg(emoji: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><text x="12" y="17" text-anchor="middle" font-size="14">${emoji}</text></svg>`;
}

export const DESKTOP_ICON_SPECS: readonly DesktopIconSpec[] = [
  { id: 'terminal', appId: 'terminal', label: 'Terminal' },
  { id: 'files', appId: 'files', label: 'Computer' },
  { id: 'notes', appId: 'notes', label: 'Notepad' },
  { id: 'paint', appId: 'paint', label: 'Paint' },
  { id: 'browser', appId: 'browser', label: 'Browser' },
  { id: 'calculator', appId: 'calculator', label: 'Calculator' },
  { id: 'sysmon', appId: 'sysmon', label: 'System' },
  { id: 'settings', appId: 'settings', label: 'Themes' },
  { id: 'clock', appId: 'clock', label: 'Clock' },
  { id: 'about', appId: 'about', label: 'About' },
];
