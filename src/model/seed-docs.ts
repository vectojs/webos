/**
 * Single source of the boot seed documents (audit #25 P2-D).
 *
 * Previously /docs content existed twice — inline in main.ts's boot seeder
 * and again in Files' "Seed Samples" action — and had drifted apart. Both
 * consumers now write these exact objects.
 */

export const SEED_DOCS: Readonly<Record<string, string>> = {
  '/docs/readme.txt':
    'Welcome to VectoJS WebOS!\n\nA complete Zero-DOM Canvas operating environment.\nShortcuts:\n  • Ctrl+Alt+T:    New Terminal\n  • Ctrl+N:        New Notepad\n  • Ctrl+W:        Close Focused Window\n  • Ctrl+Space:    Toggle Start Menu\n',
  '/docs/shortcuts.txt':
    'Keybindings:\n  • Ctrl+Space  - Start Menu\n  • Ctrl+N      - Notes\n  • Ctrl+Alt+T  - Terminal\n  • Ctrl+W      - Close Window\n',
};

/** Directories every WebOS install expects, seeded at boot. */
export const SEED_DIRS: readonly string[] = ['/docs', '/notes', '/system'];
