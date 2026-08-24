/**
 * Boot splash — 900ms era-branded mark before the first shell paint
 * (spec 2026-08-24 §4 gap #8). Non-interactive and never a11y-projected so
 * the audit gate and keyboard flows are unaffected; dissolves via opacity.
 */

import { type IRenderer, type Scene } from '@vectojs/core';
import { UIComponent } from '@vectojs/ui';
import { appTheme } from '../model/app-theme';

const SPLASH_MS = 900;
const FADE_MS = 220;

class Splash extends UIComponent {
  constructor(
    presetId: string,
    private readonly bg: string,
    private readonly fg: string,
  ) {
    super();
    this.interactive = false;
    this.a11yProjection = 'never';
    void presetId;
  }

  public override isPointInside(): boolean {
    return false;
  }

  /** Track the live viewport so the audit's overflow gate stays clean. */
  public override render(r: IRenderer): void {
    const w = this.scene?.width ?? 1;
    const h = this.scene?.height ?? 1;
    this.x = 0;
    this.y = 0;
    this.width = w;
    this.height = h;

    const t = appTheme();
    r.beginPath();
    r.roundRect(this.x, this.y, this.width, this.height, 0);
    r.fill(this.bg);
    // Centered wordmark + assembling four-pane mark.
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const s = 14;
    for (let i = 0; i < 4; i++) {
      const px = cx - s - 3 + (i % 2) * (s + 6);
      const py = cy - s - 26 + Math.floor(i / 2) * (s + 6);
      r.beginPath();
      r.roundRect(px, py, s, s, 3);
      r.fill(t.accent);
    }
    r.fillText('WebOS', cx - 34, cy + 44, `600 22px ${t.chromeFont}`, this.fg);
  }
}

/** Show the splash on the live scene; resolves once it is fully removed. */
export function showBootSplash(scene: Scene, presetId: string): Promise<void> {
  const t = appTheme();
  const splash = new Splash(presetId, t.menuBg === '#FFFFFF' ? '#F3F3F3' : t.menuBg, t.text);
  scene.add(splash);
  scene.markDirty();
  return new Promise((resolve) => {
    setTimeout(() => {
      const target = splash.opacity;
      const start = performance.now();
      const step = (): void => {
        const elapsed = performance.now() - start;
        const k = Math.min(1, elapsed / FADE_MS);
        splash.opacity = target * (1 - k);
        scene.markDirty();
        if (k < 1) {
          requestAnimationFrame(step);
        } else {
          scene.remove(splash);
          splash.destroy();
          resolve();
        }
      };
      requestAnimationFrame(step);
    }, SPLASH_MS);
  });
}
