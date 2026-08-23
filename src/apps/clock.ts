/**
 * Clock app — analog dial drawn with `r.*` only; the 1s timer is gated on
 * window visibility (D8: a minimized clock never wakes the scene).
 */

import type { IRenderer } from '@vectojs/core';
import { Entity } from '@vectojs/core';
import type { AppDefinition } from '@vectojs/desktop';
import { isWindowVisible } from '../app/window-utils';
import { appIconSvg } from '../desktop/icons';

class ClockRoot extends Entity {
  private timer: ReturnType<typeof setInterval> | null = null;

  protected override onMounted(): void {
    this.timer = setInterval(() => {
      if (!isWindowVisible(this)) return;
      this.scene?.markDirty();
    }, 1000);
  }

  public override destroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.destroy();
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(r: IRenderer): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    // Reserve 24px under the dial for the digital readout so it never
    // crosses the bottom edge at the declared minimum window size.
    const radius = Math.min(cx, cy - 24) - 16;

    // Face
    r.beginPath();
    r.arc(cx, cy, radius, 0, Math.PI * 2);
    r.fill('#ffffff');
    r.stroke('#0f172a', 2);

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const isHour = i % 5 === 0;
      const outer = radius - 4;
      const inner = isHour ? radius - 14 : radius - 8;
      r.beginPath();
      r.moveTo(cx + Math.sin(angle) * inner, cy - Math.cos(angle) * inner);
      r.lineTo(cx + Math.sin(angle) * outer, cy - Math.cos(angle) * outer);
      r.stroke('#0f172a', isHour ? 2 : 1);
    }

    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    drawHand(r, cx, cy, ((h + m / 60) / 12) * Math.PI * 2, radius * 0.5, '#0f172a', 4);
    drawHand(r, cx, cy, ((m + s / 60) / 60) * Math.PI * 2, radius * 0.75, '#0f172a', 3);
    drawHand(r, cx, cy, (s / 60) * Math.PI * 2, radius * 0.85, '#e11d48', 1.5);

    // Center pin
    r.fillCircle(cx, cy, 4, '#e11d48');

    r.fillText(
      now.toLocaleTimeString(),
      cx - 40,
      cy + radius + 18,
      '600 12px "Segoe UI", system-ui, sans-serif',
      '#0f172a',
    );
  }
}

function drawHand(
  r: IRenderer,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  color: string,
  width: number,
): void {
  r.beginPath();
  r.moveTo(cx, cy);
  r.lineTo(cx + Math.sin(angle) * length, cy - Math.cos(angle) * length);
  r.stroke(color, width);
}

export const clockApp: AppDefinition = {
  id: 'clock',
  title: 'Clock',
  iconSvg: appIconSvg('clock'),
  instances: 'single',
  defaultWidth: 320,
  defaultHeight: 260,
  minWidth: 240,
  minHeight: 220,
  create: () => new ClockRoot(),
};
