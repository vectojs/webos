/**
 * Sysmon app — real telemetry, not fake copy: live entity count (VMT walk),
 * a11y node count, rAF frame-time p50/max from `model/telemetry`, plus a
 * live window list with focus and close buttons (via `ctx.windowManager`).
 * A 1s interval refreshes the readout and pauses while minimized (D8).
 */

import { Entity, type IRenderer } from '@vectojs/core';
import type { AppDefinition, WindowManager } from '@vectojs/desktop';
import { DOCUMENT_SCROLL_PHYSICS, ScrollView, Stack, Text, type Button } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, t, themedButton, vstack } from '../app/ui-helpers';
import { isWindowVisible } from '../app/window-utils';
import { appIconSvg } from '../desktop/icons';
import { FrameSampler } from '../model/telemetry';

/** One reconciled window row: focus label + close button inside an hstack. */
interface WindowRow {
  row: Stack;
  label: Button;
  close: Button;
}

class SysmonLayout extends Entity {
  constructor(
    private readonly scroll: ScrollView,
    private readonly rows: Text[],
    private readonly top: Stack,
    private readonly windowsHost: Stack,
    private readonly gap = 10,
  ) {
    super();
    this.clipChildren = true;
    this.add(scroll);
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {
    const width = Math.max(0, this.width);
    for (const row of this.rows) row.setMaxWidth(width);
    this.scroll.x = 0;
    this.scroll.y = 0;
    this.scroll.width = width;
    this.scroll.height = Math.max(0, this.height);
    for (const child of this.windowsHost.children) {
      if (!(child instanceof Stack)) continue;
      const [label, close] = child.children;
      if (!label || !close) continue;
      close.width = 28;
      label.width = Math.max(0, width - close.width - child.gap);
      child.layout();
    }
    this.top.width = width;
    this.top.layout();
    this.windowsHost.width = width;
    this.windowsHost.layout();
    this.top.x = 0;
    this.top.y = 0;
    this.windowsHost.x = 0;
    this.windowsHost.y = this.top.height + this.gap;
    this.scroll.content.width = width;
    this.scroll.content.height = this.windowsHost.y + this.windowsHost.height;
  }
}

class SysmonRoot extends ClientRoot {
  private readonly rows: Text[];
  private readonly windowsHost: Stack;
  private readonly wm: WindowManager;
  /** Live window rows keyed by windowId — reused across refreshes. */
  private readonly windowRows = new Map<string, WindowRow>();
  private emptyRow: Text | null = null;
  private readonly sampler = new FrameSampler(120);
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFrameAt = 0;

  constructor(wm: WindowManager) {
    const rows = ['', '', '', '', ''].map((content) => {
      const row = t(content, 12);
      row.font = '500 12px monospace';
      return row;
    });
    const [vmt, a11y, frames, budget, dpr] = rows;

    const windowsHost = new Stack({ direction: 'vertical', gap: 2 });
    windowsHost.interactive = false;

    const top = vstack(
      [
        t('System Telemetry', 16),
        t('Live VectoJS scene statistics.', 12, '#475569', false),
        vmt,
        a11y,
        frames,
        budget,
        dpr,
        t('Windows', 14),
        p('Click a row to focus, ✕ to close.', 11),
      ],
      8,
    );
    const scroll = new ScrollView({
      width: 400,
      height: 120,
      scrollPhysics: DOCUMENT_SCROLL_PHYSICS,
    });
    scroll.content.add(top, windowsHost);
    const layout = new SysmonLayout(scroll, rows, top, windowsHost);

    super(layout, 18);
    this.rows = rows;
    this.windowsHost = windowsHost;
    this.wm = wm;
  }

  protected override onMounted(): void {
    // Approximates frame cadence with a self-chained 16ms timer — independent
    // of the scene's onDemand loop (it measures scheduler jitter around the
    // display interval, not true rAF frames).
    this.lastFrameAt = performance.now();
    const tick = () => {
      // Reschedule FIRST: no early return below may kill the chain, or
      // p50/max freeze permanently after the first minimize.
      this.frameTimer = window.setTimeout(tick, 16);
      const now = performance.now();
      if (isWindowVisible(this)) {
        this.sampler.push(now - this.lastFrameAt);
      }
      // Advance the timestamp even while hidden so the first sample after
      // restore measures one tick, not the whole minimized duration.
      this.lastFrameAt = now;
    };
    this.frameTimer = window.setTimeout(tick, 16);

    this.timer = setInterval(() => {
      if (!isWindowVisible(this)) return;
      this.refresh();
      this.scene?.markDirty();
    }, 1000);
    this.refresh();
  }

  public override destroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.frameTimer !== null) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    super.destroy();
  }

  private refreshWindows(): void {
    const wins = this.wm.list();
    if (wins.length === 0) {
      this.clearWindowRows();
      if (!this.emptyRow) {
        this.emptyRow = p('(no windows)', 11);
        this.windowsHost.add(this.emptyRow);
      }
      return;
    }
    if (this.emptyRow) {
      this.windowsHost.remove(this.emptyRow);
      this.emptyRow.destroy();
      this.emptyRow = null;
    }

    // Drop rows whose windows closed, then reconcile the survivors: rows are
    // reused and only relabeled when focus/minimize state changes — rebuilding
    // every second churned entities and reset pressed/hover/a11y state.
    const live = new Set(wins.map((w) => w.windowId));
    for (const [id, entry] of [...this.windowRows]) {
      if (!live.has(id)) {
        this.clearWindowRow(id, entry);
      }
    }

    for (const w of wins) {
      const glyph = w.minimized ? '▁' : w.focused ? '▮' : '□';
      const state = w.focused ? 'focused' : w.minimized ? 'minimized' : 'open';
      const text = `${glyph} ${w.title}  (${w.appId}, ${state})`;
      let entry = this.windowRows.get(w.windowId);
      if (!entry) {
        const label = btn(text, false, () => {
          this.wm.focus(w);
          this.scene?.markDirty();
        });
        label.height = 22;
        const close = themedButton(
          '✕',
          'danger',
          () => {
            this.wm.close(w);
            this.scene?.markDirty();
          },
          `Close ${w.title}`,
        );
        close.height = 22;
        const row = hstack([label, close], 4);
        row.height = 22;
        entry = { row, label, close };
        this.windowRows.set(w.windowId, entry);
        this.windowsHost.add(row);
      } else if (entry.label.label !== text) {
        entry.label.setLabel(text);
      }
    }
  }

  /** Remove one tracked row from the host and the reconciliation map. */
  private clearWindowRow(id: string, entry: WindowRow): void {
    this.windowsHost.remove(entry.row);
    entry.row.destroy();
    this.windowRows.delete(id);
  }

  /** Remove every tracked row (used when no windows remain). */
  private clearWindowRows(): void {
    for (const [id, entry] of [...this.windowRows]) {
      this.clearWindowRow(id, entry);
    }
  }

  private refresh(): void {
    const scene = this.scene;
    if (!scene) return;
    let entities = 0;
    const walk = (e: Entity | null | undefined): void => {
      if (!e) return;
      entities++;
      for (const c of e.children) walk(c);
    };
    walk(scene.root);

    this.rows[0]!.setText(`Retained entities (VMT): ${entities}`);
    this.rows[1]!.setText(`Projected a11y nodes: ${scene.getA11yTree().length}`);
    const p50 = this.sampler.p50();
    const max = this.sampler.max();
    this.rows[2]!.setText(
      `Frame time — p50 ${fmt(p50)} / max ${fmt(max)} (${this.sampler.count} samples)`,
    );
    const overflow = this.sampler.overflowShare(16.67);
    this.rows[3]!.setText(
      `Frames over 16.67ms budget: ${overflow === null ? 'n/a' : (overflow * 100).toFixed(1)}%`,
    );
    this.rows[4]!.setText(`DPR: ${window.devicePixelRatio || 1}`);

    this.refreshWindows();
  }
}

function fmt(v: number | null): string {
  return v === null ? 'n/a' : `${v.toFixed(1)}ms`;
}

export const sysmonApp: AppDefinition = {
  id: 'sysmon',
  title: 'Task Manager',
  iconSvg: appIconSvg('sysmon'),
  instances: 'single',
  defaultWidth: 460,
  defaultHeight: 420,
  minWidth: 340,
  minHeight: 300,
  create: (ctx) => new SysmonRoot(ctx.windowManager),
};
