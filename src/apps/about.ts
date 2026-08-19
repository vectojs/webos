/**
 * About app — static showcase copy for the WebOS forge.
 */

import type { AppDefinition } from '@vectojs/desktop';
import { p, ScrollableClientRoot, t, vstack } from '../app/ui-helpers';
import { HRule } from './_hrule';

export const aboutApp: AppDefinition = {
  id: 'about',
  title: 'About VectoJS WebOS',
  icon: '💻',
  instances: 'single',
  defaultWidth: 520,
  defaultHeight: 440,
  minWidth: 400,
  minHeight: 300,
  create: () => {
    const title = t('VectoJS WebOS', 16);
    const ver = p('Version 0.1.0');
    const spec1 = p(
      '• Zero-DOM Canvas Architecture: a single <canvas> handles all visual components.',
      12,
      '#475569',
      440,
    );
    const spec2 = p(
      '• Virtual Math Tree (VMT): full retained scene graph with exact numeric state space.',
      12,
      '#475569',
      440,
    );
    const spec3 = p(
      '• Semantic A11y Projection: transparent ARIA tree for screen readers and automated agents.',
      12,
      '#475569',
      440,
    );
    const spec4 = p(
      '• Built on @vectojs/desktop — the reference template for create-webos.',
      12,
      '#475569',
      440,
    );
    const shortcuts = p(
      'Shortcuts:\n• Start Menu: Ctrl+Space / Meta+Space\n• New Terminal: Ctrl+Alt+T\n• New Notes: Ctrl+N\n• Close Window: Ctrl+W',
    );
    const architectureTitle = t('Architecture Highlights', 14);
    const shortcutsTitle = t('Desktop Shortcuts', 14);
    const stack = vstack(
      [
        title,
        ver,
        new HRule(),
        architectureTitle,
        spec1,
        spec2,
        spec3,
        spec4,
        new HRule(),
        shortcutsTitle,
        shortcuts,
      ],
      8,
    );
    return new ScrollableClientRoot(stack, [
      title,
      ver,
      architectureTitle,
      spec1,
      spec2,
      spec3,
      spec4,
      shortcutsTitle,
      shortcuts,
    ]);
  },
};
