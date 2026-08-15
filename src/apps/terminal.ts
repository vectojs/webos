/**
 * Terminal app — focus-scoped keyboard (D3), real caret blink (D4), and
 * `r.*`-only text rendering (D2). Command semantics live in `model/terminal`.
 */

import type { IRenderer } from '@vectojs/core';
import { Entity } from '@vectojs/core';
import type { AppDefinition, Vfs } from '@vectojs/desktop';
import { isWindowFocused, isWindowVisible } from '../app/window-utils';
import { executeCommand, trimHistory } from '../model/terminal';

const PROMPT = 'user@vectojs:~$ ';
/** Approximate advance of the 12px monospace prompt (12 chars ≈ 86px). */
const PROMPT_WIDTH = 86;
/** 12px monospace advance per character. */
const CHAR_WIDTH = 7.2;

export interface TerminalAppOptions {
  onTheme: (id: string) => void;
  themeIds: string[];
}

class TerminalRoot extends Entity {
  private history: string[] = [
    'VectoJS Zero-DOM Shell [Version 0.1.0]',
    'user@vectojs:~$ neofetch',
    '   __   __   _          user@vectojs-webos',
    '   \\ \\ / /__| |_____    ------------------',
    '    \\ V / -_) / / _ \\   OS: VectoJS Zero-DOM WebOS',
    '     \\_/\\___|_|\\_\\___/   Kernel: Virtual Math Tree (VMT)',
    '                        Shell: Canvas Vector Terminal',
    '                        Renderer: Single <canvas>',
    '',
  ];
  private currentInput = '';
  private cursorPos = 0;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;
  private caretTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly vfs: Vfs | null,
    private readonly opts: TerminalAppOptions,
  ) {
    super();
    this.interactive = true;
  }

  protected override onMounted(): void {
    this.keyListener = (e: KeyboardEvent) => {
      // D3: only respond while this window is focused — typing in Notes or
      // another Terminal instance must not reach this handler.
      if (!isWindowFocused(this)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        const line = this.currentInput;
        this.currentInput = '';
        this.cursorPos = 0;
        this.history.push(PROMPT + line);
        void this.run(line);
        this.scene?.markDirty();
      } else if (e.key === 'Backspace') {
        if (this.currentInput.length > 0 && this.cursorPos > 0) {
          this.currentInput =
            this.currentInput.slice(0, this.cursorPos - 1) +
            this.currentInput.slice(this.cursorPos);
          this.cursorPos--;
          this.scene?.markDirty();
        }
      } else if (e.key === 'ArrowLeft') {
        this.cursorPos = Math.max(0, this.cursorPos - 1);
        this.scene?.markDirty();
      } else if (e.key === 'ArrowRight') {
        this.cursorPos = Math.min(this.currentInput.length, this.cursorPos + 1);
        this.scene?.markDirty();
      } else if (e.key.length === 1) {
        this.currentInput =
          this.currentInput.slice(0, this.cursorPos) +
          e.key +
          this.currentInput.slice(this.cursorPos);
        this.cursorPos++;
        this.scene?.markDirty();
      }
    };
    window.addEventListener('keydown', this.keyListener);

    // D4: real 500ms blink, gated on window visibility so a minimized or
    // hidden terminal never wakes the onDemand scene.
    this.caretTimer = setInterval(() => {
      if (!isWindowVisible(this)) return;
      this.scene?.markDirty();
    }, 500);
  }

  public override destroy(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
    if (this.caretTimer !== null) {
      clearInterval(this.caretTimer);
      this.caretTimer = null;
    }
    super.destroy();
  }

  private async run(line: string): Promise<void> {
    const result = await executeCommand(line, {
      vfs: this.vfs,
      themeIds: this.opts.themeIds,
    });
    if (result.clear) {
      this.history = [];
      this.scene?.markDirty();
      return;
    }
    if (result.themeId) this.opts.onTheme(result.themeId);
    this.history = trimHistory([...this.history, ...result.lines]);
    this.scene?.markDirty();
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(r: IRenderer): void {
    r.beginPath();
    r.roundRect(0, 0, this.width, this.height, 0);
    r.fill('#0c1017');

    const font = '12px "Consolas", "Fira Code", monospace';
    const lineHeight = 16;
    let y = 10;
    const maxVisibleLines = Math.floor((this.height - 30) / lineHeight);
    const visible = this.history.slice(-maxVisibleLines);

    for (const line of visible) {
      r.fillText(line, 12, y, font, lineColor(line));
      y += lineHeight;
    }

    // Active input line
    r.fillText(PROMPT, 12, y, font, '#22c55e');
    r.fillText(this.currentInput, 12 + PROMPT_WIDTH, y, font, '#ffffff');

    // Blinking caret — monospace advance needs no measuring context
    // (IRenderer deliberately has none; the app owns its font).
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      const before = this.currentInput.slice(0, this.cursorPos);
      const caretX = 12 + PROMPT_WIDTH + before.length * CHAR_WIDTH;
      r.beginPath();
      r.roundRect(caretX, y, 7, 13, 0);
      r.fill('#38bdf8');
    }
  }
}

function lineColor(line: string): string {
  if (line.startsWith('user@vectojs:')) return '#22c55e';
  if (line.startsWith('Available') || line.startsWith('  help')) return '#f59e0b';
  return '#e2e8f0';
}

export function createTerminalApp(opts: TerminalAppOptions): AppDefinition {
  return {
    id: 'terminal',
    title: 'Terminal',
    icon: '💻',
    instances: 'multiple',
    defaultWidth: 620,
    defaultHeight: 400,
    create: (ctx) => new TerminalRoot(ctx.vfs, opts),
  };
}
