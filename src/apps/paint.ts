/**
 * Paint app — working palette (D5), entity-relative coordinates (D6), and
 * `r.*`-only stroke rendering (D2).
 */

import type { IRenderer } from '@vectojs/core';
import { Entity } from '@vectojs/core';
import type { AppContext, AppDefinition } from '@vectojs/desktop';
import type { ContextMenuItem } from '@vectojs/ui';
import { appIconSvg } from '../desktop/icons';
import {
  registerWindowSurface,
  showSurfaceMenu,
  unregisterWindowSurface,
} from '../desktop/context-menu';

interface PaintStroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

interface Swatch {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const TOOLBAR_H = 40;
const COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

/** Exported for hit-test/clear unit tests; the app surface is `paintApp`. */
export class PaintRoot extends Entity {
  private strokes: PaintStroke[] = [
    {
      color: '#3b82f6',
      size: 4,
      points: [
        { x: 60, y: 120 },
        { x: 100, y: 180 },
        { x: 160, y: 100 },
        { x: 220, y: 220 },
        { x: 280, y: 140 },
        { x: 360, y: 200 },
      ],
    },
    {
      color: '#ec4899',
      size: 3,
      points: [
        { x: 80, y: 240 },
        { x: 140, y: 200 },
        { x: 200, y: 260 },
        { x: 300, y: 180 },
        { x: 400, y: 230 },
      ],
    },
  ];
  private currentStroke: PaintStroke | null = null;
  private currentColor = '#000000';
  private currentSize = 3;
  private readonly swatches: Swatch[];
  // Clear is NOT a swatch: keeping it out of the color list means the toolbar
  // hit-test can never match it first and swallow the clear action (audit-3
  // P1, PX-0125 — the old sentinel {color:''} entry made Clear dead code and
  // left currentColor as '' after a click).
  private readonly clearBtn: Swatch;

  constructor() {
    super();
    this.interactive = true;

    let sx = 12;
    this.swatches = COLORS.map((color) => {
      const sw = { x: sx, y: 8, w: 22, h: 22, color };
      sx += 28;
      return sw;
    });
    this.clearBtn = { x: sx + 12, y: 8, w: 48, h: 22, color: '' };

    this.on('pointerdown', (e: any) => {
      const lx = e.localX ?? 0;
      const ly = e.localY ?? 0;
      // Toolbar: hit-test color swatches first, then Clear.
      if (ly < TOOLBAR_H) {
        const swatch = this.swatches.find(
          (s) => lx >= s.x && lx <= s.x + s.w && ly >= s.y && ly <= s.y + s.h,
        );
        if (swatch) {
          this.currentColor = swatch.color;
          this.scene?.markDirty();
          return;
        }
        const c = this.clearBtn;
        if (lx >= c.x && lx <= c.x + c.w && ly >= c.y && ly <= c.y + c.h) {
          this.strokes = [];
          this.scene?.markDirty();
          return;
        }
        return;
      }
      this.currentStroke = {
        points: [{ x: lx, y: ly }],
        color: this.currentColor,
        size: this.currentSize,
      };
      this.strokes.push(this.currentStroke);
      this.scene?.markDirty();
    });

    this.on('pointermove', (e: any) => {
      if (!this.currentStroke) return;
      // D6: entity-relative coordinates — no worldToLocal(clientX) hacks.
      const lx = e.localX ?? 0;
      const ly = e.localY ?? 0;
      this.currentStroke.points.push({ x: lx, y: ly });
      this.scene?.markDirty();
    });

    this.on('pointerup', () => {
      this.currentStroke = null;
    });
  }

  /**
   * Completed VISIBLE strokes on the canvas (context menu enable state).
   * Counts exactly what render() draws: it skips sub-2-point strokes
   * (single-click dots), so counting them let Undo/Clear present themselves
   * with nothing visible to remove (review PX-0227).
   */
  public get strokeCount(): number {
    return this.strokes.filter((s) => s.points.length >= 2).length;
  }

  /**
   * Undo (WEB-0039, DEC-0025): pop the last completed stroke — the existing
   * `strokes[]` array IS the history, so undo needs no new infrastructure.
   */
  public undoStroke(): boolean {
    if (this.strokes.length === 0) return false;
    this.strokes.pop();
    this.currentStroke = null;
    this.scene?.markDirty();
    return true;
  }

  /** Remove every stroke — the toolbar Clear button's action. */
  public clearAll(): boolean {
    if (this.strokes.length === 0) return false;
    this.strokes = [];
    this.currentStroke = null;
    this.scene?.markDirty();
    return true;
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(r: IRenderer): void {
    r.beginPath();
    r.roundRect(0, 0, this.width, this.height, 0);
    r.fill('#ffffff');

    for (const s of this.strokes) {
      if (s.points.length < 2) continue;
      r.beginPath();
      r.moveTo(s.points[0]!.x, s.points[0]!.y);
      for (let i = 1; i < s.points.length; i++) {
        r.lineTo(s.points[i]!.x, s.points[i]!.y);
      }
      r.stroke(s.color, s.size);
    }

    // Toolbar
    r.beginPath();
    r.roundRect(0, 0, this.width, TOOLBAR_H, 0);
    r.fill('#f1f5f9');
    r.stroke('#cbd5e1', 1);

    for (const s of this.swatches) {
      r.beginPath();
      r.roundRect(s.x, s.y, s.w, s.h, 4);
      r.fill(s.color);
      r.stroke(
        this.currentColor === s.color ? '#2563eb' : 'rgba(0,0,0,0.2)',
        this.currentColor === s.color ? 2 : 1,
      );
    }

    const c = this.clearBtn;
    r.beginPath();
    r.roundRect(c.x, c.y, c.w, c.h, 4);
    r.fill('#fee2e2');
    r.stroke('rgba(0,0,0,0.2)', 1);
    r.fillText('Clear', c.x + 10, c.y + 15, '500 11px "Segoe UI", sans-serif', '#b91c1c');

    // Hint sits right of the Clear button. IRenderer has no measureText, so
    // budget ~5.5px per glyph at 11px and hide rather than clip when the
    // window cannot fit it (the palette alone spans most of the minimum width).
    const hintX = c.x + c.w + 16;
    const hint = 'Click a color, then drag on the canvas to draw';
    if (hintX + hint.length * 5.5 <= this.width) {
      r.fillText(hint, hintX, 22, '500 11px "Segoe UI", sans-serif', '#475569');
    }
  }
}

export const paintApp: AppDefinition = {
  id: 'paint',
  title: 'Paint Studio',
  iconSvg: appIconSvg('paint'),
  instances: 'multiple',
  defaultWidth: 600,
  defaultHeight: 420,
  minWidth: 360,
  minHeight: 300,
  create: (ctx: AppContext) => {
    const root = new PaintRoot();
    // Canvas right-click (issue #40): Undo / Clear over the whole Paint
    // surface; both disable on an empty canvas.
    registerWindowSurface(ctx.windowId, {
      openContextMenu: (scene, x, y) => {
        showSurfaceMenu(
          scene,
          x,
          y,
          buildPaintCanvasMenuItems(
            { strokeCount: root.strokeCount },
            {
              undo: () => root.undoStroke(),
              clear: () => root.clearAll(),
            },
          ),
        );
      },
    });
    ctx.windowManager.on((event) => {
      if (event.type === 'close' && event.window.windowId === ctx.windowId) {
        unregisterWindowSurface(ctx.windowId);
      }
    });
    return root;
  },
};

/**
 * Menu inventory for the Paint canvas. Both verbs act on the stroke history;
 * they disable when there is nothing to undo/clear.
 */
export function buildPaintCanvasMenuItems(
  state: { strokeCount: number },
  actions: { undo: () => void; clear: () => void },
): ContextMenuItem[] {
  const empty = state.strokeCount === 0;
  return [
    { label: 'Undo', disabled: empty, onClick: actions.undo },
    { label: 'Clear canvas', disabled: empty, onClick: actions.clear },
  ];
}
