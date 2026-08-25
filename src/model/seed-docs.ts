/**
 * Single source of the boot seed documents (audit #25 P2-D).
 *
 * Previously /docs content existed twice — inline in main.ts's boot seeder
 * and again in Files' "Seed Samples" action — and had drifted apart. Both
 * consumers now write these exact objects.
 */

export const SEED_DOCS: Readonly<Record<string, string>> = {
  '/docs/readme.txt':
    'Welcome to VectoJS WebOS!\n\nA complete Zero-DOM Canvas operating environment.\nShortcuts:\n  • Right-click:   Context menus on desktop, files, editor, canvas\n  • Ctrl+S:        Save Notepad document (focused)\n  • F5:            Refresh desktop layout & icons\n  • Ctrl+Space:    Toggle Start Menu\n',
  '/docs/shortcuts.txt':
    'Keybindings:\n  • Right-click    - Surface menus (Browser viewport keeps native)\n  • Ctrl+S         - Save focused document\n  • F5             - Refresh desktop\n  • Ctrl+Space     - Start Menu\n  • Ctrl+W/T/N     - Reserved by host browser (not interceptable)\n',
};

/** Directories every WebOS install expects, seeded at boot. */
export const SEED_DIRS: readonly string[] = ['/docs', '/notes', '/system'];
