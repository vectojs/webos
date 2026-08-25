# Changelog

## Unreleased

### Fixed (WEB-0035, webos#32)

- Notes opens persisted documents with their saved content: the open path
  now reads the restored VFS instead of rendering seed text until an
  explicit Reload click (user-typed edits during the async read always
  win; read errors stay on the Reload path's status reporting).
- Start-menu dismissal focus contract pinned on the post-rewrite
  architecture: Escape, toggle and click-outside closes all restore the
  opener; orphaned pre-rewrite `start-menu-keys.ts` removed.
- A theme switch while the start menu is open no longer strands DOM focus
  on body: dismissal re-validates the captured opener and falls back to
  the rebuilt taskbar's Start tile (webos#36).

### Added (WEB-0034, webos#28 — theme identity & desktop-OS feel)

- Era-faithful token matrices for all 7 presets (spec §3.2) plus app-side
  era chrome tokens: menu set, tray well, caption shape, chrome font,
  per-era taskbar height, window shadow/glow/pinstripe/bevel composites
- WebOS-owned taskbar (Start tile, pinned launchers, running entries with
  per-era indicator, tray cluster, two-line clock)
- Searchable start menu (search field, 6-column pinned grid, recents,
  footer); y2k era gets cascading program groups instead
- Desktop right-click context menu; 900ms boot splash, skippable with
  `?nosplash` (same query-param convention as `?debug`) for tests and
  benchmarks
- Per-era icon treatments with live re-skin on theme switch — including the
  Material-era drop shadow, which now actually renders from a filter on the
  icon's painted group
- Refreshed wallpaper art for all 7 eras (inline SVG + CDN, byte-identical)

### Changed

- aero is now the Modern Fluent default and aqua the Classic Aqua era
  (category labels fixed)
- Spec-proposed token values adjusted where needed to keep the WEB-0023
  contrast contract green (16 values across all 7 presets); each deviation
  from spec §3.2 fails its floor at the proposed value — see the preset
  files and carryctx DEC-0017/0018.

### Fixed

- Vaporwave title glow overdraws and hex-colored fake-elevation shadow
  layers render with real alpha falloff instead of full opacity: hex color
  tokens now run through shared chrome color math (`src/chrome/color.ts`).

### Added

- Desktop icons launch from the keyboard: Enter/Space activates the focused
  icon through the core's synthetic click for its `role="button"` mirror.
- Durable VFS (`StorageVfs`): notes and docs survive page reloads via a
  debounced localStorage snapshot; boot seeding now applies to first boot
  only so it can never clobber restored documents.
- Start menu keyboard support: opening focuses the first item;
  ArrowUp/ArrowDown/Home/End rove focus between items.
- Terminal scrollback: the wheel scrolls the retained history buffer, and
  fresh output snaps back to the tail; the buffer projects for screen
  readers and find-in-page.

### Changed

- Browser: proxy fetches abort after 15 s with an explicit timed-out state
  instead of hanging on "Loading…"; superseded navigations cancel their
  in-flight fetch; raw edge payloads (e.g. `error code: 1016`) render as
  human-readable copy.
- Files: preview truncation is stated explicitly instead of silently cutting
  at 2000 characters; Seed Samples asks before replacing `/docs`.
- Notes/taskbar naming: Notes windows open titled by their document name
  (`note-N.txt - Notepad`) and extra instances of multi-instance apps get an
  ordinal, so identical taskbar entries ("Terminal" twice) are gone.
- Narrow viewports: window positions clamp into the work area on aspect-
  changing resizes without re-centering; boot windows shrink to fit viewports
  narrower than their preferred width.

### Removed

- Ctrl+P shortcut that launched Paint on the print reflex.
- Engine-taskbar guard from #27/#29 (`taskbar-guard.ts`): superseded by the
  WebOS-owned taskbar (WEB-0034), which owns clock placement and entry
  clipping structurally instead of pinning engine internals (DEC-0019); its
  dist contract lives on as `webos-taskbar.dist.test.ts` against the new
  seam.

### Fixed

- Paint Clear is no longer dead code (#33): the button descriptor lived in
  the color-swatch list, so the toolbar hit-test matched it first — clicks
  never cleared strokes and silently set an empty current color. Clear is
  now hit-tested separately from a palette of colors-only swatches.
- N/NW/NE window edges resize again (#33): the titlebar drag handle spanned
  the full titlebar and absorbed presses within the resize-rim band before
  the window root's resize handler could own them. The handle's hit-test now
  yields the top rim on resizable windows; maximized windows keep the full
  handle for restore-dragging.
- Restoring a maximized window by dragging its titlebar can no longer leave
  it stranded off-screen (#33): the engine drops the restored box under the
  cursor unclamped, so the shell re-clamps just-restored windows into the
  work area once the drag gesture ends. Normal drags keep engine behavior.
- Files: the inner listing scrolls in a viewport that grows/shrinks with the
  window client area instead of a fixed 150px strip (floored at 120px so
  minimum-size windows stay usable).
- Browser: focusing the address bar selects its text, so typing replaces the
  URL instead of appending to it.
- Taskbar clock no longer overlaps entry buttons at narrow viewports
  (#27): the clock is re-pinned to the right edge on every resize, theme
  switch, and window open/close/retitle instead of only when the formatted
  minute string changes, and taskbar entries truncate at the entries-host
  edge instead of spilling toward the clock. (The WebOS-owned taskbar from
  WEB-0034 now provides these guarantees directly.)
- Windows no longer strand outside the reachable work area after viewport
  or DPR changes (#30): re-clamping shrinks oversize windows into the work
  area instead of adjusting position only, maximized windows refit when
  the work area changes, and a maximize→restore replays through the clamp.
  Engine gaps are filed upstream (DesktopShell.resize maximized refit,
  Window.restore unclamped replay) and compensated app-side.

## 0.1.0 — 2026-08-15

Initial release: port of the WebOS demo as a forge app.

- Window manager, taskbar, start menu on `@vectojs/desktop@0.3.0`
- 10 apps: Terminal, Files, Notes, Paint, Browser, Calculator, Sysmon,
  Settings, Clock, About
- 7 theme presets (aero, breeze, aqua, y2k, vaporwave, dreamcore, cloud)
- `?debug` devtools hook, `auditScene` clean gate, model-layer `bun test`
