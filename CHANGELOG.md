# Changelog

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
  narrower than their preferred width; taskbar entries can no longer spill
  into the clock.

### Removed

- Ctrl+P shortcut that launched Paint on the print reflex.

## 0.1.0 — 2026-08-15

Initial release: port of the WebOS demo as a forge app.

- Window manager, taskbar, start menu on `@vectojs/desktop@0.3.0`
- 10 apps: Terminal, Files, Notes, Paint, Browser, Calculator, Sysmon,
  Settings, Clock, About
- 7 theme presets (aero, breeze, aqua, y2k, vaporwave, dreamcore, cloud)
- `?debug` devtools hook, `auditScene` clean gate, model-layer `bun test`
