# Changelog

## Unreleased

### Added (WEB-0034, webos#28 — theme identity & desktop-OS feel)

- Era-faithful token matrices for all 7 presets (spec §3.2) plus app-side
  era chrome tokens: menu set, tray well, caption shape, chrome font,
  per-era taskbar height, window shadow/glow/pinstripe/bevel composites
- WebOS-owned taskbar (Start tile, pinned launchers, running entries with
  per-era indicator, tray cluster, two-line clock)
- Searchable start menu (search field, 6-column pinned grid, recents,
  footer); y2k era gets cascading program groups instead
- Desktop right-click context menu; 900ms boot splash
- Per-era icon treatments with live re-skin on theme switch
- Refreshed wallpaper art for all 7 eras (inline SVG + CDN, byte-identical)

### Changed

- aero is now the Modern Fluent default and aqua the Classic Aqua era
  (category labels fixed)
- 11 spec-proposed token values adjusted to keep the WEB-0023 contrast
  contract green; deviations recorded in the preset files


## Unreleased

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

### Fixed

- Taskbar clock no longer overlaps entry buttons at narrow viewports
  (#27): the clock is re-pinned to the right edge on every resize, theme
  switch, and window open/close/retitle instead of only when the formatted
  minute string changes, and taskbar entries truncate at the entries-host
  edge instead of spilling toward the clock.

## 0.1.0 — 2026-08-15

Initial release: port of the WebOS demo as a forge app.

- Window manager, taskbar, start menu on `@vectojs/desktop@0.3.0`
- 10 apps: Terminal, Files, Notes, Paint, Browser, Calculator, Sysmon,
  Settings, Clock, About
- 7 theme presets (aero, breeze, aqua, y2k, vaporwave, dreamcore, cloud)
- `?debug` devtools hook, `auditScene` clean gate, model-layer `bun test`
