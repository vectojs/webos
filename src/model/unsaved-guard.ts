/**
 * Unsaved-changes guard — pure decision core behind document-app confirm
 * dialogs (WEB-0021). The baseline is the content that is safe to lose: what
 * was last loaded from disk, last saved, or present at boot. Anything else is
 * an unsaved edit.
 */

/** The three verb actions a confirm dialog can resolve to. */
export type ConfirmChoice = 'confirm' | 'discard' | 'cancel';

/**
 * Tracks the last-known-saved snapshot for one document. The view layer feeds
 * `current` in; dirtiness and commit points stay testable without a scene.
 */
export class UnsavedGuard {
  private baselineValue: string;

  constructor(initial = '') {
    this.baselineValue = initial;
  }

  /** Content that is safe to lose (boot text, loaded data, or saved data). */
  get baseline(): string {
    return this.baselineValue;
  }

  /** True when `current` diverges from the last-known-saved snapshot. */
  isDirty(current: string): boolean {
    return current !== this.baselineValue;
  }

  /**
   * Disk became authoritative for `content` — after a successful save or an
   * external load that replaced the editor content.
   */
  commit(content: string): void {
    this.baselineValue = content;
  }
}

/**
 * Map a raw keyboard key to the dialog action it activates while a confirm
 * dialog is open. Enter always means the SAFE action (confirm); Escape always
 * means Cancel (keep editing) regardless of where focus sits — the destructive
 * action is reachable only by explicit Tab navigation or pointer, never by the
 * two reflex keys.
 */
export function dialogChoiceForKey(key: string): ConfirmChoice | null {
  if (key === 'Enter') return 'confirm';
  if (key === 'Escape') return 'cancel';
  return null;
}
