/**
 * Browser app — a text-mode browser: a real address bar (`@vectojs/ui` Input,
 * the sanctioned DOM exception for text entry) with Enter-to-navigate and
 * Back/Forward history.
 *
 * `vectojs://…` addresses render internal in-code pages. `http(s)://…`
 * addresses fetch the real page through the `webos-proxy` Cloudflare Worker
 * (`https://proxy.vectojs.org/?url=…`), which strips HTML to plain text
 * server-side — so the Zero-DOM canvas browser sidesteps both CORS and
 * X-Frame-Options by never iframing anything. The page body lives in a
 * `ScrollView`, so long fetched pages scroll instead of clipping.
 */

import type { AppDefinition } from '@vectojs/desktop';
import { Entity, type IRenderer } from '@vectojs/core';
import { DOCUMENT_SCROLL_PHYSICS, Input, ScrollView } from '@vectojs/ui';
import { btn, ClientRoot, hstack, p, t, vstack } from '../app/ui-helpers';
import { HRule } from './_hrule';

interface Page {
  title: string;
  body: string;
}

const PAGES: Record<string, Page> = {
  'vectojs://home': {
    title: 'Welcome to VectoJS WebOS',
    body:
      'VectoJS is a modern Canvas-native UI runtime with a Virtual Math Tree, semantic a11y DOM projection, and WebGL/WebGPU backends.\n\n' +
      '• Zero DOM overhead\n• Hardware accelerated rendering\n• Full keyboard navigation & screen-reader compatibility\n\n' +
      'Try a real URL above, e.g. https://example.com',
  },
  'vectojs://docs': {
    title: 'VectoJS Developer Documentation',
    body: 'Core Architecture:\n1. Scene / Entity Graph (the Virtual Math Tree)\n2. Semantic a11y projection\n3. Memory VFS & window manager',
  },
  'vectojs://gallery': {
    title: 'VectoJS Creation Gallery',
    body: 'Apps built with @vectojs: 3D Force Graphs, WebOS, LaTeX Typesetter, Video Exporter, and more.',
  },
  'vectojs://roadmap': {
    title: 'WebOS Roadmap',
    body: 'Shipped: theme persistence, scrollable Files, window snap/tiling, task-manager window list.\nNext: Settings persistence is live — try switching a theme and reloading.',
  },
  'vectojs://shortcuts': {
    title: 'Keyboard Shortcuts',
    body: 'Ctrl+Space  Start menu\nCtrl+N      Notes\nCtrl+Alt+T  Terminal\nCtrl+W      Close focused\nCtrl+Alt+←/→/↑/↓  Snap focused window\nCtrl+Alt+G  Tile all windows',
  },
};

const HOME = 'vectojs://home';
const PROXY_URL = 'https://proxy.vectojs.org/?url=';
const BODY_WIDTH = 570;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Fills the browser client area: a top bar (nav + address + title), a bottom
 * status band, and a ScrollView that takes every pixel in between — so the page
 * body grows/shrinks with the window instead of clipping (the outer Stack lays
 * out once and cannot give a child the remaining height).
 */
class BrowserLayout extends Entity {
  constructor(
    private readonly top: Entity,
    private readonly scroll: ScrollView,
    private readonly bottom: Entity,
    private readonly gap = 10,
  ) {
    super();
    this.clipChildren = true;
    this.add(top, scroll, bottom);
  }

  public override isPointInside(gx: number, gy: number): boolean {
    const local = this.worldToLocal(gx, gy);
    if (!local) return false;
    return local.x >= 0 && local.y >= 0 && local.x <= this.width && local.y <= this.height;
  }

  public override render(_r: IRenderer): void {
    this.top.x = 0;
    this.top.y = 0;
    const scrollY = this.top.height + this.gap;
    this.scroll.x = 0;
    this.scroll.y = scrollY;
    this.scroll.height = Math.max(0, this.height - scrollY - this.gap - this.bottom.height);
    this.bottom.x = 0;
    this.bottom.y = this.height - this.bottom.height;
  }
}

export const browserApp: AppDefinition = {
  id: 'browser',
  title: 'Web Browser',
  icon: '🌐',
  instances: 'single',
  defaultWidth: 640,
  defaultHeight: 460,
  minWidth: 440,
  minHeight: 320,
  create: () => {
    const addressBar = new Input({
      width: 460,
      value: HOME,
      placeholder: 'vectojs://… or https://…',
      font: '500 12px "Consolas", monospace',
    });
    const pageTitle = t('Welcome to VectoJS WebOS', 16, '#1e293b', true, BODY_WIDTH);
    const bodyText = p('', 12, '#475569', BODY_WIDTH);
    const scroll = new ScrollView({
      width: BODY_WIDTH,
      height: 200,
      scrollPhysics: DOCUMENT_SCROLL_PHYSICS,
    });
    scroll.content.add(bodyText);
    const status = p('', 11, '#94a3b8');

    const history: string[] = [HOME];
    let historyIndex = 0;

    /** Show body text and refresh the scroll extent (content grows/shrinks). */
    const setBody = (text: string): void => {
      bodyText.setText(text);
      scroll.content.width = scroll.width;
      scroll.content.height = Math.max(bodyText.height, scroll.height);
      scroll.scrollTo(0);
    };

    const render = async (): Promise<void> => {
      const url = history[historyIndex];
      addressBar.value = url;

      if (isHttpUrl(url)) {
        pageTitle.setText(url);
        setBody('Loading…');
        status.setText(`Fetching ${url} via proxy…`);
        addressBar.scene?.markDirty();
        try {
          const resp = await fetch(PROXY_URL + encodeURIComponent(url));
          const data = (await resp.json()) as {
            title?: string;
            text?: string;
            error?: string;
          };
          if (resp.ok && data.text) {
            pageTitle.setText(data.title || url);
            setBody(data.text);
            status.setText(`${url}  ·  ${data.text.length} chars via proxy`);
          } else {
            pageTitle.setText(`Error: ${url}`);
            setBody(data.error || `HTTP ${resp.status}`);
            status.setText('Fetch failed');
          }
        } catch {
          pageTitle.setText(`Error: ${url}`);
          setBody('Network error — is the proxy reachable?');
          status.setText('Fetch failed');
        }
      } else {
        const page = PAGES[url] ?? {
          title: `Unknown address: ${url}`,
          body: 'That page does not exist on the demo web. Try vectojs://home, /docs, /gallery, /roadmap, /shortcuts, or a real https:// URL.',
        };
        pageTitle.setText(page.title);
        setBody(page.body);
        status.setText(`History: ${history.length}  ·  ${historyIndex + 1} of ${history.length}`);
      }
      addressBar.scene?.markDirty();
    };

    const navigate = (url: string): void => {
      const target = isHttpUrl(url) ? url : url.startsWith('vectojs://') ? url : `vectojs://${url}`;
      history.splice(historyIndex + 1);
      history.push(target);
      historyIndex = history.length - 1;
      void render();
    };
    const goBack = (): void => {
      if (historyIndex > 0) {
        historyIndex--;
        void render();
      }
    };
    const goForward = (): void => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        void render();
      }
    };

    addressBar.on('keydown', (e) => {
      if (e.key === 'Enter') navigate(addressBar.value);
    });

    const navBar = hstack(
      [
        btn('◀ Back', false, goBack),
        btn('Forward ▶', false, goForward),
        btn('🏠 Home', false, () => navigate(HOME)),
        btn('📖 Docs', false, () => navigate('vectojs://docs')),
        btn('🎨 Gallery', false, () => navigate('vectojs://gallery')),
        btn('🗺 Roadmap', false, () => navigate('vectojs://roadmap')),
      ],
      6,
    );

    const top = vstack([navBar, addressBar, new HRule(), pageTitle], 10);
    const bottom = vstack([new HRule(), status], 10);
    const layout = new BrowserLayout(top, scroll, bottom, 10);

    void render();
    return new ClientRoot(layout, 18);
  },
};
