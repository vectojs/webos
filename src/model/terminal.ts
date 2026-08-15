/**
 * Terminal command engine — pure TS, no canvas imports.
 * Parsing and command semantics live here so they are `bun test`-able;
 * the terminal app only renders the returned lines.
 */

import type { Vfs } from '@vectojs/desktop';

export interface ParsedCommand {
  /** Lowercased command word. */
  cmd: string;
  /** Everything after the first space, trimmed. */
  arg: string;
}

export interface CommandResult {
  /** Output lines to append after the echoed prompt line. */
  lines: string[];
  /** When true the caller replaces the whole history (clear). */
  clear?: boolean;
  /** Theme id requested by `theme <id>`, if any. */
  themeId?: string;
}

export interface CommandContext {
  vfs: Vfs | null;
  /** Ids the `theme` command accepts. */
  themeIds: string[];
}

/** Hard cap on retained history lines (oldest dropped). */
export const HISTORY_LIMIT = 50;

export function parseCommand(line: string): ParsedCommand {
  const parts = line.trim().split(' ');
  const cmd = (parts[0] ?? '').toLowerCase();
  const arg = parts.slice(1).join(' ').trim();
  return { cmd, arg };
}

export function trimHistory(history: string[]): string[] {
  return history.length > HISTORY_LIMIT ? history.slice(history.length - HISTORY_LIMIT) : history;
}

export async function executeCommand(line: string, ctx: CommandContext): Promise<CommandResult> {
  const { cmd, arg } = parseCommand(line);
  const out: CommandResult = { lines: [] };
  switch (cmd) {
    case '':
      return out;
    case 'help':
      out.lines = [
        'Available commands:',
        '  help        - Show this help message',
        '  neofetch    - Display system overview and ASCII art',
        '  ls [dir]    - List files in memory VFS',
        '  cat <file>  - Read content from VFS file',
        '  echo <msg>  - Print message to terminal',
        '  date        - Show current system timestamp',
        '  theme <id>  - Switch theme (' + ctx.themeIds.join(', ') + ')',
        '  clear       - Clear terminal history',
      ];
      return out;
    case 'clear':
      out.clear = true;
      return out;
    case 'date':
      out.lines = [new Date().toString()];
      return out;
    case 'echo':
      out.lines = [arg];
      return out;
    case 'theme': {
      const preset = ctx.themeIds.includes(arg) ? arg : null;
      if (preset) {
        out.themeId = preset;
        out.lines = [`Switched desktop theme to: ${preset}`];
      } else {
        out.lines = [`Unknown theme '${arg}'. Options: ${ctx.themeIds.join(', ')}`];
      }
      return out;
    }
    case 'ls': {
      if (!ctx.vfs) {
        out.lines = ['VFS not attached.'];
        return out;
      }
      const target = arg || '/';
      try {
        const entries = await ctx.vfs.list(target);
        out.lines = entries.map(
          (e) => `  ${e.kind === 'dir' ? '📁' : '📄'} ${e.name} (${e.size} B)`,
        );
      } catch {
        out.lines = [`ls: ${target}: No such file or directory`];
      }
      return out;
    }
    case 'cat': {
      if (!arg) {
        out.lines = ['Usage: cat <filename>'];
        return out;
      }
      if (!ctx.vfs) {
        out.lines = ['VFS not attached.'];
        return out;
      }
      try {
        const data = await ctx.vfs.read(arg);
        out.lines = data.split('\n');
      } catch {
        out.lines = [`cat: ${arg}: No such file or directory`];
      }
      return out;
    }
    case 'neofetch':
      out.lines = [
        '   __   __   _          user@vectojs-webos',
        '   \\ \\ / /__| |_____    ------------------',
        '    \\ V / -_) / / _ \\   OS: VectoJS Zero-DOM WebOS',
        '     \\_/\\___|_|\\_\\___/   Kernel: Virtual Math Tree (VMT)',
        '                        Shell: Canvas Vector Terminal',
        '                        Renderer: Single <canvas>',
        `                        DPR: ${globalThis.devicePixelRatio || 1}x`,
        `                        Themes: ${ctx.themeIds.length} Built-in Presets`,
      ];
      return out;
    default:
      out.lines = [`command not found: ${cmd}. Type 'help' for options.`];
      return out;
  }
}
