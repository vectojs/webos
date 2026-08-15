/**
 * About app — static showcase copy for the WebOS forge.
 */

import type { AppDefinition } from '@vectojs/desktop';
import { ClientRoot, p, t, vstack } from '../app/ui-helpers';
import { HRule } from './_hrule';

export const aboutApp: AppDefinition = {
  id: 'about',
  title: 'About VectoJS WebOS',
  icon: '💻',
  instances: 'single',
  defaultWidth: 520,
  defaultHeight: 440,
  create: () => {
    const title = t('VectoJS WebOS', 16);
    const ver = p('Version 0.1.0');
    const spec1 = p(
      '• Zero-DOM Canvas Architecture: a single <canvas> handles all visual components.',
    );
    const spec2 = p(
      '• Virtual Math Tree (VMT): full retained scene graph with exact numeric state space.',
    );
    const spec3 = p(
      '• Semantic A11y Projection: transparent ARIA tree for screen readers and automated agents.',
    );
    const spec4 = p('• Built on @vectojs/desktop — the reference template for create-webos.');
    const shortcuts = p(
      'Shortcuts:\n• Start Menu: Ctrl+Space / Meta+Space\n• New Terminal: Ctrl+Alt+T\n• New Notes: Ctrl+N\n• Close Window: Ctrl+W',
    );
    const stack = vstack(
      [
        title,
        ver,
        new HRule(),
        t('Architecture Highlights', 14),
        spec1,
        spec2,
        spec3,
        spec4,
        new HRule(),
        t('Desktop Shortcuts', 14),
        shortcuts,
      ],
      8,
    );
    return new ClientRoot(stack, 18);
  },
};
