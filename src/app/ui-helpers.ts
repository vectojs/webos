/**
 * Shared canvas-view helpers — all drawing goes through the `IRenderer`
 * `r.*` API, never the raw `ctx`.
 */

import { Entity, type IRenderer } from '@vectojs/core';
import { Button, Input, Stack, Text, TextArea } from '@vectojs/ui';
import { appTheme } from '../model/app-theme';

type TextRole = 'text' | 'textMuted' | null;

class ThemedText extends Text {
  constructor(
    content: string,
    options: ConstructorParameters<typeof Text>[1],
    private readonly role: TextRole,
  ) {
    super(content, options);
  }

  public override render(renderer: IRenderer): void {
    if (this.role) this.color = appTheme()[this.role];
    super.render(renderer);
  }
}

type ButtonRole = 'primary' | 'secondary' | 'danger';

class ThemedButton extends Button {
  constructor(
    label: string,
    private readonly role: ButtonRole,
    options: ConstructorParameters<typeof Button>[1],
  ) {
    super(label, options);
  }

  public override render(renderer: IRenderer): void {
    const theme = appTheme();
    this.bg =
      this.role === 'primary'
        ? theme.accent
        : this.role === 'danger'
          ? theme.dangerSurface
          : theme.surfaceSunken;
    this.hoverBg = this.role === 'primary' ? theme.accentHover : theme.surfaceRaised;
    this.color =
      this.role === 'primary'
        ? theme.accentText
        : this.role === 'danger'
          ? theme.danger
          : theme.text;
    this.focusColor = theme.focus;
    super.render(renderer);
  }
}

export class ThemedInput extends Input {
  public override render(renderer: IRenderer): void {
    const theme = appTheme();
    this.bg = theme.inputSurface;
    this.border = theme.border;
    this.color = theme.text;
    this.placeholderColor = theme.textMuted;
    this.selectionColor = theme.accent;
    super.render(renderer);
  }
}

export class ThemedTextArea extends TextArea {
  public override render(renderer: IRenderer): void {
    const theme = appTheme();
    this.bg = theme.inputSurface;
    this.border = theme.border;
    this.color = theme.text;
    this.placeholderColor = theme.textMuted;
    this.selectionColor = theme.accent;
    super.render(renderer);
  }
}

export function t(
  content: string,
  size = 13,
  color = '#1e293b',
  bold = true,
  maxWidth?: number,
): Text {
  const font = `${bold ? '600' : '400'} ${size}px "Segoe UI", system-ui, sans-serif`;
  const role = color === '#1e293b' ? 'text' : null;
  const el = new ThemedText(
    content,
    {
      font,
      color: role ? appTheme().text : color,
      ...(maxWidth ? { maxWidth } : {}),
    },
    role,
  );
  el.height = size + 6;
  return el;
}

export function p(content: string, size = 12, color = '#475569', maxWidth?: number): Text {
  const font = `400 ${size}px/1.5 "Segoe UI", system-ui, sans-serif`;
  const role = color === '#475569' ? 'textMuted' : null;
  const el = new ThemedText(
    content,
    {
      font,
      color: role ? appTheme().textMuted : color,
      ...(maxWidth ? { maxWidth } : {}),
    },
    role,
  );
  el.height = size + 8;
  return el;
}

export function btn(label: string, primary: boolean, onClick: () => void): Button {
  return themedButton(label, primary ? 'primary' : 'secondary', onClick);
}

export function themedButton(label: string, role: ButtonRole, onClick: () => void): Button {
  const theme = appTheme();
  const b = new ThemedButton(label, role, {
    bg:
      role === 'primary'
        ? theme.accent
        : role === 'danger'
          ? theme.dangerSurface
          : theme.surfaceSunken,
    hoverBg: role === 'primary' ? theme.accentHover : theme.surfaceRaised,
    color: role === 'primary' ? theme.accentText : role === 'danger' ? theme.danger : theme.text,
    font: '500 12px "Segoe UI", system-ui, sans-serif',
    padding: 6,
    radius: 4,
    focusColor: theme.focus,
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
    this.clipChildren = true;
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
