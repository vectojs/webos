import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

/**
 * happy-dom has no canvas rasterizer (`getContext('2d')` returns null), so
 * the engine's CanvasRenderer would crash on `scene.resize()`. Give the
 * boot smoke a no-op 2d context — same pattern as the monorepo's
 * `packages/core/test/Scene.test.ts` mockCtx, generalized with a Proxy so
 * every method/property the renderer touches resolves harmlessly.
 */
const makeMockCtx = (canvas: HTMLCanvasElement): CanvasRenderingContext2D =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'canvas') return canvas;
        return (..._args: unknown[]) => (prop === 'measureText' ? { width: 0 } : undefined);
      },
      set() {
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

// Size the test viewport like a desktop — windows open at absolute
// positions and a 1024x768 default would flag every one as escaping.
Object.defineProperties(window, {
  innerWidth: { configurable: true, value: 1920 },
  innerHeight: { configurable: true, value: 1080 },
});

HTMLCanvasElement.prototype.getContext = function (kind: string) {
  if (kind === '2d') return makeMockCtx(this as unknown as HTMLCanvasElement);
  return null;
};
