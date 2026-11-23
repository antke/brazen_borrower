<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Interface kits

The look comes from the Keyframery kit (`src/kits/keyframery/`) and its theme in `src/app/globals.css`. Every visual decision stays inside the kit and that theme. Be strict about what goes into pages and feature components.

- **Every component comes from the kit's wrapper.** Pages and feature components import controls and surfaces from `src/kits/<kit>/ui/<component>`, the styled wrapper, or from a kit composite built on those wrappers (`fields.tsx`, `cards.tsx`, `shell.tsx`). Don't import `ui/primitives/*`, `ui/core/*` or `@ui-sdk/*` there, and don't build a control from raw HTML (`<button>`, `<input>`, `<select>`, `<table>`, a styled `<a>`).
- **A missing component goes into the kit, not the page.** Install it from the kit's registry into `ui/`. If the registry doesn't have it, build a composite in the kit folder from existing `ui/` wrappers.
- **`ui/` stays as published.** Don't edit vendored files. Change their look through the theme variables listed at the top of each file (`--button-face`, `--card-radius`, …) set in `src/app/globals.css`, or through a variant the component already has.
- **No local style overrides.** Pages and composites don't pass classes that change how a kit component looks: colour, font size, weight or tracking, radius, shadow, border, background, inner padding, transitions or motion. Classes there only arrange components: flex, grid, gap, alignment, width limits, `sr-only`.
- **Exceptions are rare and visible.** If the kit really can't do something, the override gets a one-line comment saying why, and you mention it in your report. Prefer fixing it in the kit.
- **Shared code goes in `src/core`.** Hooks, rules and `labels` live there; nothing kit-specific goes there.
- **Check before finishing.** Read your diff for new `className` values, raw elements and imports against these rules.
