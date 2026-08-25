/**
 * Global shortcut interception policy (WEB-0039 / issue #40).
 *
 * A browser-hosted desktop must decide, for every keyboard chord, whether the
 * SHELL owns it, the HOST BROWSER keeps it, or the chord is simply UNWINNABLE.
 * Fighting unwinnable chords (Ctrl+W/T/N, Alt+Tab) is a documented
 * non-goal: preventDefault on them is ignored by browser engines, so claiming
 * them would only make the shortcut page lie. The table below is the single
 * source of truth — `resolveOwnedShortcut` implements its owned rows and the
 * smoke tests pin both directions.
 *
 * Owned chords are checked BEFORE the editable bail-out in main.ts (the
 * PX-0079 pattern): none of their keys produce text, so gating on focus bought
 * nothing and previously let F5/Ctrl+R reload the page mid-typing, destroying
 * unsaved Notes state (DEC-0028).
 */

/** What the shell should do with an owned chord after preventing the default. */
export type OwnedChordAction =
  /** Save the focused Notepad document via its registered window surface. */
  | 'save-focused'
  /** Shell refresh semantics: refit viewport + re-flow icon grid (F5 only). */
  | 'refresh-desktop'
  /** Open the focused surface's context menu at its keyboard anchor. */
  | 'open-context-menu'
  /** Swallow the browser binding; no shell action exists (Ctrl+P/O/R/G/D). */
  | 'swallow';

export interface ChordDecision {
  /** True when the browser's native binding must be suppressed. */
  preventDefault: boolean;
  action?: OwnedChordAction;
}

/** Structural KeyboardEvent subset the resolver reads. */
export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Browser-native chords the shell swallows before the editable bail-out
 * (pre-existing guard, audit #25): Save/Print/Open/Reload/Find-group/Bookmark.
 */
const SWALLOWED_LETTER_CHORDS = new Set(['s', 'p', 'o', 'r', 'g', 'd']);

export function resolveOwnedShortcut(e: KeyEventLike, editable: boolean): ChordDecision {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (mod && !e.altKey && !e.shiftKey && SWALLOWED_LETTER_CHORDS.has(key)) {
    // Ctrl+S additionally dispatches to the focused surface (Notes save);
    // every other letter is a pure swallow.
    return key === 's'
      ? { preventDefault: true, action: 'save-focused' }
      : { preventDefault: true, action: 'swallow' };
  }
  // Ctrl+R reloads like F5 — owned EVERYWHERE (DEC-0028): an accidental
  // reload destroys unsaved session state, and unlike F5 there is no useful
  // desktop semantic to give it.
  if (mod && !e.altKey && !e.shiftKey && key === 'r') {
    return { preventDefault: true, action: 'swallow' };
  }
  if (e.key === 'F5') {
    // Outside editables F5 becomes the desktop Refresh; inside editables it
    // is swallowed inertly so typing can never reload the page either.
    return editable
      ? { preventDefault: true, action: 'swallow' }
      : { preventDefault: true, action: 'refresh-desktop' };
  }
  if (e.key === 'F12') {
    return { preventDefault: true, action: 'swallow' };
  }
  // The ContextMenu key (and its Shift+F10 alias) opens OUR menu — a real OS
  // never shows the browser's.
  if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
    return { preventDefault: true, action: 'open-context-menu' };
  }
  return { preventDefault: false };
}

export type ChordDisposition = 'owned' | 'passthrough' | 'impossible';

export interface PolicyRow {
  chord: string;
  disposition: ChordDisposition;
  note: string;
}

/**
 * Documentation-grade policy table mirrored by tests. `impossible` rows are
 * assertions about the host platform, not features: resolveOwnedShortcut must
 * NEVER claim them, and no code path may pretend otherwise.
 */
export const SHORTCUT_POLICY: readonly PolicyRow[] = [
  {
    chord: 'Ctrl+S',
    disposition: 'owned',
    note: 'preventDefault + save focused Notepad document',
  },
  {
    chord: 'Ctrl+P / Ctrl+O / Ctrl+G / Ctrl+D',
    disposition: 'owned',
    note: 'preventDefault, swallow browser dialog/finding/bookmark',
  },
  {
    chord: 'Ctrl+R',
    disposition: 'owned',
    note: 'preventDefault everywhere — reload protection (DEC-0028)',
  },
  {
    chord: 'F5',
    disposition: 'owned',
    note: 'preventDefault; desktop refresh semantics outside editables',
  },
  {
    chord: 'F12',
    disposition: 'owned',
    note: 'preventDefault — no devtools chrome in a desktop',
  },
  {
    chord: 'ContextMenu / Shift+F10',
    disposition: 'owned',
    note: 'opens our context menu for the focused surface',
  },
  {
    chord: 'F11',
    disposition: 'passthrough',
    note: 'native fullscreen — deliberately untouched',
  },
  {
    chord: 'PrintScreen',
    disposition: 'passthrough',
    note: 'OS-owned screenshot — deliberately untouched',
  },
  {
    chord: 'Ctrl+A/X/C/V in editable',
    disposition: 'passthrough',
    note: 'native textarea editing; context-menu items drive the same mirror programmatically',
  },
  {
    chord: 'Ctrl+Shift+R',
    disposition: 'passthrough',
    note: 'deliberate escape hatch: hard reload survives because shift-excluded (DEC-0028 valve)',
  },
  {
    chord: 'Ctrl+W / Ctrl+T / Ctrl+N',
    disposition: 'impossible',
    note: 'browser-reserved; preventDefault ignored by engines. Engine config maps Control+w/Meta+w close-focused, which fires only where the engine permits',
  },
  {
    chord: 'Alt+Tab / Win-key chords',
    disposition: 'impossible',
    note: 'OS-reserved, unreachable from page content',
  },
];
