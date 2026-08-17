/**
 * Sysmon app — real telemetry, not fake copy: live entity count (VMT walk),
 * a11y node count, rAF frame-time p50/max from `model/telemetry`, plus a
 * live window list with focus and close buttons (via `ctx.windowManager`).
 * A 1s interval refreshes the readout and pauses while minimized (D8).
 */

import type { Entity } from '@vectojs/core';
import type { AppDefinition, WindowManager } from '@vectojs/desktop';
import { Button, Stack, Text } from '@vectojs/ui';
import { ClientRoot, hstack, t, vstack } from '../app/ui-helpers';
import { isWindowVisible } from '../app/window-utils';
import { FrameSampler } from '../model/telemetry';

class SysmonRoot extends ClientRoot {
  private readonly rows: Text[];
  private readonly windowsHost: Stack;
  private readonly wm: WindowManager;
  private readonly sampler = new FrameSampler(120);
  private timer: ReturnType<typeof setInterval> | null = null;
  private rafTimer: ReturnType<typeof setInterval> | null = null;
  private lastFrameAt = 0;

  constructor(wm: WindowManager) {
    const vmt = new Text('', { font: '500 12px monospace', color: '#0f172a' });
    const a11y = new Text('', { font: '500 12px monospace', color: '#0f172a' });
    const frames = new Text('', {
      font: '500 12px monospace',
      color: '#0f172a',
    });
    const budget = new Text('', {
      font: '500 12px monospace',
      color: '#0f172a',
    });
    const dpr = new Text('', { font: '500 12px monospace', color: '#0f172a' });

    const windowsHost = new Stack({ direction: 'vertical', gap: 2 });
    windowsHost.interactive = false;

    super(
      vstack(
        [
          t('System Telemetry', 16),
          t('Live VectoJS scene statistics.', 12, '#475569', false),
          vmt,
          a11y,
          frames,
          budget,
          dpr,
          t('Windows', 14),
          t('Click a row to focus, ✕ to close.', 11, '#94a3b8', false),
          windowsHost,
        ],
        8,
      ),
      18,
    );
    this.rows = [vmt, a11y, frames, budget, dpr];
    this.windowsHost = windowsHost;
    this.wm = wm;
  }

  protected override onMounted(): void {
    // Frame cadence comes from rAF — independent of the scene's onDemand loop.
    this.lastFrameAt = performance.now();
    const tick = () => {
      if (!isWindowVisible(this)) return;
      const now = performance.now();
      this.sampler.push(now - this.lastFrameAt);
      this.lastFrameAt = now;
      this.rafTimer = window.setTimeout(tick, 16);
    };
    this.rafTimer = window.setTimeout(tick, 16);

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
    if (this.rafTimer !== null) {
      clearTimeout(this.rafTimer);
      this.rafTimer = null;
    }
    super.destroy();
  }

  private refreshWindows(): void {
    for (const child of [...this.windowsHost.children]) {
      this.windowsHost.remove(child);
      child.destroy();
    }
    const wins = this.wm.list();
    if (wins.length === 0) {
      const empty = new Text('(no windows)', {
        font: '400 11px "Segoe UI", system-ui, sans-serif',
        color: '#94a3b8',
      });
      this.windowsHost.add(empty);
      return;
    }
    for (const w of wins) {
      const glyph = w.minimized ? '▁' : w.focused ? '▮' : '□';
      const label = new Button(`${glyph} ${w.title}  (${w.appId})`, {
        bg: '#f8fafc',
        hoverBg: '#e2e8f0',
        color: '#0f172a',
        font: '500 11px "Segoe UI", system-ui, sans-serif',
        padding: 4,
        radius: 4,
        height: 22,
        onClick: () => {
          this.wm.focus(w);
          this.scene?.markDirty();
        },
      });
      label.a11yProjection = 'eager';
      const close = new Button('✕', {
        bg: '#fee2e2',
        hoverBg: '#fecaca',
        color: '#b91c1c',
        font: '700 11px "Segoe UI", system-ui, sans-serif',
        padding: 4,
        radius: 4,
        height: 22,
        onClick: () => {
          this.wm.close(w);
          this.scene?.markDirty();
        },
      });
      close.a11yProjection = 'eager';
      this.windowsHost.add(hstack([label, close], 4));
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
  icon: '📊',
  instances: 'single',
  defaultWidth: 460,
  defaultHeight: 420,
  minWidth: 340,
  minHeight: 300,
  create: (ctx) => new SysmonRoot(ctx.windowManager),
};
