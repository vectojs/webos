/**
 * Settings app — theme preset catalog; each preset applies tokens +
 * wallpaper via the shell's `setTheme` path.
 */

import type { AppDefinition } from '@vectojs/desktop';
import { btn, ClientRoot, p, t, vstack } from '../app/ui-helpers';
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
    create: () => {
      const status = p('Select a desktop theme preset for your environment:');
      const presetButtons = THEME_PRESETS.map((preset) =>
        btn(`${preset.name} (${preset.category})`, false, () => {
          status.setText(`Applied: ${preset.name} — ${preset.description}`);
          status.scene?.markDirty();
          opts.applyTheme(preset.id);
        }),
      );

      const stack = vstack(
        [
          t('Desktop Personalization Studio', 16),
          status,
          new HRule(),
          t('Preset Catalog', 14),
          ...presetButtons,
          new HRule(),
          t('Tip', 14),
          p(
            'Terminal users: `theme <id>` switches presets too. Ids: ' +
              THEME_PRESETS.map((x) => x.id).join(', '),
          ),
        ],
        6,
      );

      return new ClientRoot(stack, 18);
    },
  };
}
