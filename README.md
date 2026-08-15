# VectoJS WebOS

A canvas-native desktop environment built on
[`@vectojs/desktop`](https://www.npmjs.com/package/@vectojs/desktop): window
manager, taskbar, Kickoff-style start menu, 10 demo apps, 7 theme presets,
keyboard shortcuts, and an in-memory VFS — all rendered on a single `<canvas>`
with semantic accessibility projection.

This repository is the flagship demo for the desktop shell **and** the
reference template that `create-webos` scaffolds for you: everything
customizable — apps, themes, shortcuts, wallpaper, storage — is config-first.

- Live: <https://webos.vectojs.org> (append `?debug` for the VMT devtools
  panel)
- Framework docs: <https://vectojs.org>

## Run

```bash
bun install
bun run dev
# → http://127.0.0.1:5201/
```

`bun run build` type-checks with `tsc` and bundles with Vite.

## Try

| Action             | How                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Start menu         | taskbar ☰ or `Ctrl+Space` / `Meta+Space`                                                      |
| New note           | `Ctrl+N` (multi-instance)                                                                      |
| Terminal           | `Ctrl+Alt+T`; `help` lists commands                                                            |
| Close window       | titlebar × or `Ctrl+W` / `Meta+W`                                                              |
| Move / resize      | drag titlebar · focus titlebar handle + arrow keys · edges/corners (grips shown while focused) |
| Maximize           | □ or double-click titlebar                                                                     |
| Minimize / restore | – then taskbar entry                                                                           |
| Switch theme       | Settings app or terminal `theme <id>`                                                          |
| Devtools           | open `?debug` (or `window.webos.toggleDevtools()`)                                             |

## Customize

The single customization entry point is `src/config.ts` (declares
`WebosConfig`). See `webos-docs/ARCHITECTURE.md` for the full template
contract, or the repo layout below.

## Layout

```text
src/
├── model/       # pure TS: terminal commands, calculator, telemetry, themes (bun test)
├── config.ts    # WebosConfig: apps, shortcuts, desktop, theme, VFS
├── apps/        # one module per app, each exports an AppDefinition
├── desktop/     # icon grid, boot, devtools hook
└── app/         # shared UI helpers
```

## Packages

`@vectojs/core`, `@vectojs/desktop`, `@vectojs/ui`, `@vectojs/styles`,
`@vectojs/devtools` — exact-pinned published versions, no workspace links.

## License

MIT
