/**
 * Browser app — an honestly-labeled demo browser serving static pages
 * (page content lives in-code; a real browser would swap in a fetch layer).
 */

import type { AppDefinition } from '@vectojs/desktop';
import { Text } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, t, vstack } from '../app/ui-helpers';
import { HRule } from './_hrule';

export const browserApp: AppDefinition = {
  id: 'browser',
  title: 'Web Browser',
  icon: '🌐',
  instances: 'single',
  defaultWidth: 640,
  defaultHeight: 460,
  create: () => {
    let currentUrl = 'vectojs://home';
    const addressBar = new Text(currentUrl, {
      font: '500 12px "Consolas", monospace',
      color: '#0f172a',
    });
    const pageTitle = t('Welcome to VectoJS WebOS', 16);
    const pageBody = p(
      'VectoJS is a modern Canvas-native UI runtime with a Virtual Math Tree, semantic a11y DOM projection, and WebGL/WebGPU backends.\n\n' +
        '• Zero DOM overhead\n• Hardware accelerated rendering\n• Full keyboard navigation & screen-reader compatibility',
    );

    const navigate = (url: string) => {
      currentUrl = url;
      addressBar.setText(url);
      if (url === 'vectojs://home') {
        pageTitle.setText('Welcome to VectoJS WebOS');
        pageBody.setText(
          'Zero-DOM Canvas Operating Environment.\nEnjoy high frame rate UI with rich window management.',
        );
      } else if (url === 'vectojs://docs') {
        pageTitle.setText('VectoJS Developer Documentation');
        pageBody.setText(
          'Core Architecture:\n1. Scene / Entity Graph\n2. Reactive Layout Reflow\n3. Memory VFS & Process Manager',
        );
      } else if (url === 'vectojs://gallery') {
        pageTitle.setText('VectoJS Creation Gallery');
        pageBody.setText(
          'Explore apps built with @vectojs: 3D Force Graphs, WebOS, LaTeX Typesetter, Video Exporter.',
        );
      }
      addressBar.scene?.markDirty();
    };

    const navBar = hstack(
      [
        btn('🏠 Home', false, () => navigate('vectojs://home')),
        btn('📖 Docs', false, () => navigate('vectojs://docs')),
        btn('🎨 Gallery', false, () => navigate('vectojs://gallery')),
      ],
      6,
    );

    const stack = vstack([navBar, addressBar, new HRule(), pageTitle, pageBody], 10);
    return new ClientRoot(stack, 18);
  },
};
