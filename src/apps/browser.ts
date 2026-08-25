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
import { DOCUMENT_SCROLL_PHYSICS, ScrollView, Stack, Text } from '@vectojs/ui';
import { btn, ClientRoot, p, t, ThemedInput, vstack } from '../app/ui-helpers';
import { humanizeProxyError } from '../model/proxy-errors';
import { appIconSvg } from '../desktop/icons';
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
    // Kept truthful against shortcut-policy.ts: browser-reserved chords are
    // listed as impossible instead of promised (issue #40).
    body:
      'Right-click          Menus on desktop, files, editor, canvas, titlebars\n' +
      'ContextMenu/Shift+F10  Menu for the focused surface\n' +
      'Ctrl+S               Save the focused Notepad document\n' +
      'F5                   Refresh desktop layout & icons\n' +
      'Ctrl+Space           Start menu\n' +
      'Ctrl+E / Ctrl+B      Files / Browser\n' +
      'Ctrl+Alt+T           Terminal\n' +
      'Ctrl+Alt+←/→/↑/↓     Snap focused window · Ctrl+Alt+G tiles all\n' +
      '\n' +
      'Host-browser reality: Ctrl+W/T/N close/tab/new-window are RESERVED by the\n' +
      'browser and cannot be intercepted from a page. F11, PrintScreen and\n' +
      'Ctrl+A/X/C/V inside documents pass through natively; Ctrl+Shift+R stays\n' +
      'available as a hard reload.',
  },
};

const HOME = 'vectojs://home';
const PROXY_URL = 'https://proxy.vectojs.org/?url=';
const BODY_WIDTH = 570;
/** Hard ceiling for a proxy fetch — below it the page hangs on "Loading…" forever. */
const FETCH_TIMEOUT_MS = 15_000;

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
    const width = Math.max(0, this.width);
    const navBar = this.top.children[0];
    if (navBar instanceof Stack) {
      navBar.maxWidth = width;
      navBar.layout();
    }
    const addressBar = this.top.children[1];
    if (addressBar instanceof Entity) addressBar.width = width;
    const pageTitle = this.top.children[3];
    if (pageTitle instanceof Text && pageTitle.maxWidth !== width) pageTitle.setMaxWidth(width);
    const status = this.bottom.children[1];
    if (status instanceof Text && status.maxWidth !== width) status.setMaxWidth(width);
    const bodyText = this.scroll.content.children[0];
    if (bodyText instanceof Text && bodyText.maxWidth !== width) bodyText.setMaxWidth(width);
    this.top.width = width;
    if (this.top instanceof Stack) this.top.layout();
    this.bottom.width = width;
    if (this.bottom instanceof Stack) this.bottom.layout();
    this.top.x = 0;
    this.top.y = 0;
    const scrollY = this.top.height + this.gap;
    this.scroll.x = 0;
    this.scroll.y = scrollY;
    this.scroll.width = width;
    this.scroll.height = Math.max(0, this.height - scrollY - this.gap - this.bottom.height);
    this.scroll.content.width = width;
    this.scroll.content.height = Math.max(bodyText?.height ?? 0, this.scroll.height);
    this.bottom.x = 0;
    this.bottom.y = this.height - this.bottom.height;
  }
}

export const browserApp: AppDefinition = {
  id: 'browser',
  title: 'Web Browser',
  iconSvg: appIconSvg('browser'),
  instances: 'single',
  defaultWidth: 640,
  defaultHeight: 460,
  minWidth: 440,
  minHeight: 320,
  create: () => {
    const addressBar = new ThemedInput({
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
    const status = p('', 11);

    const history: string[] = [HOME];
    let historyIndex = 0;
    // Audit #25 P2-D: the in-flight fetch, aborted on timeout or when a newer
    // navigation supersedes it — previously a hanging proxy left "Loading…"
    // on screen forever with no way out but another navigation.
    let inFlight: AbortController | null = null;

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
        inFlight?.abort();
        const controller = new AbortController();
        inFlight = controller;
        const timedOut = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), FETCH_TIMEOUT_MS),
        );
        try {
          // The race gives a deterministic timeout even where AbortSignal
          // delivery is delayed; the abort still cancels the underlying IO.
          const winner = await Promise.race([
            fetch(PROXY_URL + encodeURIComponent(url), {
              signal: controller.signal,
            }),
            timedOut,
          ]);
          if (winner === null) {
            // Timed out: abort the losing fetch so its socket/proxy work
            // stops instead of running to completion unheard.
            controller.abort();
            if (history[historyIndex] !== url) return;
            pageTitle.setText(`Timed out: ${url}`);
            setBody(
              `The proxy did not respond within ${FETCH_TIMEOUT_MS / 1000} s. ` +
                'The site may be down or too slow — try again or pick another page.',
            );
            status.setText('Timed out');
            return;
          }
          const resp = winner;
          const data = (await resp.json()) as {
            title?: string;
            text?: string;
            error?: string;
            truncated?: boolean;
          };
          // Stale-response guard: Back/re-navigation while this fetch was in
          // flight must not let the old page overwrite the newer one's
          // title/body/status (the address bar would disagree with the page).
          if (history[historyIndex] !== url) return;
          if (resp.ok && data.text) {
            pageTitle.setText(data.title || url);
            setBody(data.text);
            const truncated = data.truncated ? ' · truncated' : '';
            status.setText(`${url}  ·  ${data.text.length} chars via proxy${truncated}`);
          } else {
            // Failure branch: either a non-2xx or an empty body. Raw edge
            // payloads ("error code: 1016") get mapped to human copy.
            const raw = data.error ?? data.text ?? '';
            pageTitle.setText(`Error: ${url}`);
            setBody(humanizeProxyError(raw) || data.error || `HTTP ${resp.status}`);
            status.setText('Fetch failed');
          }
        } catch {
          if (history[historyIndex] !== url) return;
          pageTitle.setText(`Error: ${url}`);
          setBody('Network error — is the proxy reachable?');
          status.setText('Fetch failed');
        } finally {
          if (inFlight === controller) inFlight = null;
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
      syncNavigationState();
    };
    let backButton: ReturnType<typeof btn>;
    let forwardButton: ReturnType<typeof btn>;

    const syncNavigationState = (): void => {
      backButton.disabled = historyIndex <= 0;
      forwardButton.disabled = historyIndex >= history.length - 1;
    };

    const goBack = (): void => {
      if (historyIndex > 0) {
        historyIndex--;
        void render();
        syncNavigationState();
      }
    };
    const goForward = (): void => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        void render();
        syncNavigationState();
      }
    };

    addressBar.on('keydown', (e) => {
      if (e.key === 'Enter') navigate(addressBar.value);
    });

    // Audit-3 (#33): focus selects the whole address so typing replaces it
    // instead of appending mid-URL. select() runs on the projected <input>;
    // the engine forwards its native select event back to this Input, keeping
    // the canvas selection highlight in sync.
    addressBar.on('focus', () => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement) el.select();
    });

    const navBar = new Stack({ direction: 'horizontal', gap: 6, wrap: true });
    backButton = btn('◀ Back', false, goBack);
    forwardButton = btn('Forward ▶', false, goForward);
    for (const button of [
      backButton,
      forwardButton,
      btn('🏠 Home', false, () => navigate(HOME)),
      btn('📖 Docs', false, () => navigate('vectojs://docs')),
      btn('🎨 Gallery', false, () => navigate('vectojs://gallery')),
      btn('🗺 Roadmap', false, () => navigate('vectojs://roadmap')),
    ]) {
      navBar.add(button);
    }
    syncNavigationState();

    const top = vstack([navBar, addressBar, new HRule(), pageTitle], 10);
    const bottom = vstack([new HRule(), status], 10);
    const layout = new BrowserLayout(top, scroll, bottom, 10);

    void render();
    return new ClientRoot(layout, 18);
  },
};
