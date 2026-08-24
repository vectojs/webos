/**
 * Terminal app — focus-scoped keyboard (D3), real caret blink (D4), and
 * `r.*`-only text rendering (D2). Command semantics live in `model/terminal`.
 */

import type { ContentProjection, IRenderer } from '@vectojs/core';
import { Entity } from '@vectojs/core';
import type { AppDefinition, Vfs } from '@vectojs/desktop';
import { measureText } from '@vectojs/ui';
import { isWindowFocused, isWindowVisible } from '../app/window-utils';
import { executeCommand, trimHistory } from '../model/terminal';
import { appIconSvg } from '../desktop/icons';

const PROMPT = 'user@vectojs:~$ ';
const FONT = '12px "Consolas", "Fira Code", monospace';
/** Caret top offset from the text baseline for a 12px monospace line (~ascent). */
const CARET_ASCENT = 11;

/** Sample whose per-glyph advance defines the caret step; monospace, so uniform. */
const CHAR_SAMPLE = '0123456789abcdefghijklmnopqrstuvwxyz';
const CHAR_WIDTH = measureText(CHAR_SAMPLE, FONT) / CHAR_SAMPLE.length;
const PROMPT_WIDTH = measureText(PROMPT, FONT);

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
  /** Lines of scrollback hidden above the viewport; 0 follows the tail. */
  private scrollOffset = 0;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;
  private caretTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly vfs: Vfs | null,
    private readonly opts: TerminalAppOptions,
  ) {
    super();
    this.interactive = true;
    // Scrollback (audit #25 P2-D): wheeling scrolls the retained history
    // buffer instead of silently clipping to the last screenful.
    this.on('wheel', (e) => {
      const native = e.nativeEvent as WheelEvent | undefined;
      if (!native || native.deltaY === 0) return;
      const step = native.deltaY > 0 ? 3 : -3;
      const max = Math.max(0, this.history.length - this.visibleLineBudget() + 1);
      this.scrollOffset = Math.min(max, Math.max(0, this.scrollOffset + step));
      native.preventDefault?.();
      this.scene?.markDirty();
    });
  }

  /** How many output rows fit the current window height (matches render()). */
  private visibleLineBudget(): number {
    return Math.max(1, Math.floor((this.height - 30) / 16));
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
        this.scrollOffset = 0;
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
      this.scrollOffset = 0;
      this.scene?.markDirty();
      return;
    }
    if (result.themeId) this.opts.onTheme(result.themeId);
    // Fresh output snaps the view back to the tail, like a real terminal.
    this.history = trimHistory([...this.history, ...result.lines]);
    this.scrollOffset = 0;
    this.scene?.markDirty();
  }

  /**
   * AT / find-in-page surface for the buffer (audit #25 P2-D): the canvas
   * paints per-line fillText with no Text entities, so without a projection
   * the terminal is invisible to screen readers and find. Read-only on
   * purpose — `selectable: false` keeps mouse selection semantics unchanged.
   */
  public override getContentProjection(): ContentProjection {
    return {
      text: [...this.history, PROMPT + this.currentInput].join('\n'),
      font: FONT,
      selectable: false,
      ligatures: 'none',
    };
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

    const font = FONT;
    const lineHeight = 16;
    // fillText's y is the BASELINE (the renderer never sets textBaseline):
    // start the first baseline below the top so glyphs are not clipped.
    let y = 10 + CARET_ASCENT;
    const maxVisibleLines = Math.floor((this.height - 30) / lineHeight);
    // Scrollback window (audit #25 P2-D): scrollOffset lines ride above the
    // viewport, clamped here so a shrink can never overshoot the buffer.
    const maxOffset = Math.max(0, this.history.length - maxVisibleLines + 1);
    this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
    const end = this.history.length - this.scrollOffset;
    const visible = this.history.slice(Math.max(0, end - maxVisibleLines), end);

    for (const line of visible) {
      r.fillText(line, 12, y, font, lineColor(line));
      y += lineHeight;
    }

    // Active input line
    r.fillText(PROMPT, 12, y, font, '#22c55e');
    r.fillText(this.currentInput, 12 + PROMPT_WIDTH, y, font, '#ffffff');

    // Blinking caret — sits ON the text line: baseline-derived top, monospace
    // advance for the x (IRenderer deliberately has no measureText).
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      const before = this.currentInput.slice(0, this.cursorPos);
      const caretX = 12 + PROMPT_WIDTH + before.length * CHAR_WIDTH;
      r.beginPath();
      r.roundRect(caretX, y - CARET_ASCENT, 7, 14, 0);
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
    iconSvg: appIconSvg('terminal'),
    instances: 'multiple',
    defaultWidth: 620,
    defaultHeight: 400,
    minWidth: 420,
    minHeight: 280,
    create: (ctx) => new TerminalRoot(ctx.vfs, opts),
  };
}
