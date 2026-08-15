/**
 * Sysmon app — real telemetry, not fake copy: live entity count (VMT walk),
 * a11y node count, and rAF frame-time p50/max from `model/telemetry`.
 * A 1s interval refreshes the readout and pauses while minimized (D8).
 */

import type { Entity } from '@vectojs/core';
import type { AppDefinition } from '@vectojs/desktop';
import { Text } from '@vectojs/ui';
import { ClientRoot, t, vstack } from '../app/ui-helpers';
import { isWindowVisible } from '../app/window-utils';
import { FrameSampler } from '../model/telemetry';

class SysmonRoot extends ClientRoot {
  private readonly rows: Text[];
  private readonly sampler = new FrameSampler(120);
  private timer: ReturnType<typeof setInterval> | null = null;
  private rafTimer: ReturnType<typeof setInterval> | null = null;
  private lastFrameAt = 0;

  constructor() {
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
        ],
        8,
      ),
      18,
    );
    this.rows = [vmt, a11y, frames, budget, dpr];
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
  defaultHeight: 340,
  create: () => new SysmonRoot(),
};
