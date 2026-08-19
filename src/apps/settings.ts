/**
 * Settings app — theme preset catalog; each preset applies tokens +
 * wallpaper via the shell's `setTheme` path.
 */

import type { AppDefinition } from '@vectojs/desktop';
import { btn, p, ScrollableClientRoot, t, vstack } from '../app/ui-helpers';
import { HRule } from './_hrule';
import { THEME_PRESETS } from '../model/themes';

export interface SettingsAppOptions {
  applyTheme: (presetId: string) => void;
}

export function createSettingsApp(opts: SettingsAppOptions): AppDefinition {
  return {
    id: 'settings',
    title: 'Personalization',
    icon: '🎨',
    instances: 'single',
    defaultWidth: 620,
    defaultHeight: 460,
    minWidth: 420,
    minHeight: 340,
    create: () => {
      const status = p('Select a desktop theme preset for your environment:', 12, '#475569', 520);
      const presetButtons = THEME_PRESETS.map((preset) =>
        btn(`${preset.name} (${preset.category})`, false, () => {
          status.setText(`Applied: ${preset.name} — ${preset.description}`);
          status.scene?.markDirty();
          opts.applyTheme(preset.id);
        }),
      );

      const tip = p(
        'Terminal users: `theme <id>` switches presets too. Ids: ' +
          THEME_PRESETS.map((x) => x.id).join(', '),
        12,
      );
      const title = t('Desktop Personalization Studio', 16);
      const catalogTitle = t('Preset Catalog', 14);
      const tipTitle = t('Tip', 14);
      const stack = vstack(
        [title, status, new HRule(), catalogTitle, ...presetButtons, new HRule(), tipTitle, tip],
        6,
      );

      return new ScrollableClientRoot(stack, [title, status, catalogTitle, tipTitle, tip]);
    },
  };
}
