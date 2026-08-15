/**
 * Shared canvas-view helpers — all drawing goes through the `IRenderer`
 * `r.*` API, never the raw `ctx`.
 */

import { Entity, type IRenderer } from '@vectojs/core';
import { Button, Stack, Text } from '@vectojs/ui';

export function t(content: string, size = 13, color = '#1e293b', bold = true): Text {
  const font = `${bold ? '600' : '400'} ${size}px "Segoe UI", system-ui, sans-serif`;
  const el = new Text(content, { font, color });
  el.height = size + 6;
  return el;
}

export function p(content: string, size = 12, color = '#475569'): Text {
  const font = `400 ${size}px/1.5 "Segoe UI", system-ui, sans-serif`;
  const el = new Text(content, { font, color });
  el.height = size + 8;
  return el;
}

export function btn(label: string, primary: boolean, onClick: () => void): Button {
  const b = new Button(label, {
    bg: primary ? '#2563eb' : '#f1f5f9',
    hoverBg: primary ? '#1d4ed8' : '#e2e8f0',
    color: primary ? '#ffffff' : '#0f172a',
    font: '500 12px "Segoe UI", system-ui, sans-serif',
    padding: 6,
    radius: 4,
    height: 28,
    onClick,
  });
  b.a11yProjection = 'eager';
  return b;
}

export function vstack(children: Entity[], gap = 8): Stack {
  const stack = new Stack({ direction: 'vertical', gap });
  for (const child of children) stack.add(child);
  return stack;
}

export function hstack(children: Entity[], gap = 8): Stack {
  const stack = new Stack({ direction: 'horizontal', gap });
  for (const child of children) stack.add(child);
  return stack;
}

/** Insets a content subtree inside a window client area; re-layouts on resize. */
export class ClientRoot extends Entity {
  constructor(
    private readonly content: Entity,
    private readonly inset = 12,
  ) {
    super();
    this.add(content);
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {
    this.content.x = this.inset;
    this.content.y = this.inset;
    this.content.width = Math.max(0, this.width - this.inset * 2);
    this.content.height = Math.max(0, this.height - this.inset * 2);
  }
}
