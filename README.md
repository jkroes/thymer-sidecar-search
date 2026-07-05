# thymer-sidecar-search

A plugin-owned replacement for [Thymer](https://thymer.com)'s **Cmd-K** search palette.
It clones the native palette pixel-for-pixel (theme-adaptive) and extends it to also
search collections whose items are hidden from the native palette
(`show_cmdpal_items: false`).

Cmd-K opens this palette; the native palette stays available on **Cmd+Shift+P**.

## What it does

- **Native parity** — fuzzy-ranked single result list (fzf-style best-match scorer),
  matching native's row ordering: collection rows → `Open Collection 'X'` → views →
  pages → `X: New <item>` → settings → full-text search tail.
- **Per-collection sub-palette** — Enter a collection to get Open / New / views /
  Settings / full item list, with a `Back` row.
- **Cloned chrome** — the dialog, colors, monospace font, teal selection, dividers, and
  matched-character highlight are read from the live theme at open time, so it tracks
  light/dark and custom themes automatically. No backdrop dim, like native.
- **Create, dates, journal** — `Create 'q' in…`, date queries (`monday`, `aug 1`) that
  jump to a journal day, and `Open Today's Journal`.
- **Side panels** — Shift+Enter opens a result in the other panel; Search and collection
  Settings open in a side panel so your current doc stays put.
- **Hidden collections** — items from `show_cmdpal_items: false` collections still show
  up in results (the native palette hides them).

## Install

Thymer plugins are pasted into the app — there's no store yet.

1. In Thymer: **Cmd+P → Plugins → New Global Plugin** (or select an existing one) →
   **Edit Code**.
2. Paste [`dist/plugin.js`](dist/plugin.js) into the **Custom Code** field.
3. Paste [`plugin.json`](plugin.json) into the **Configuration** field.
4. **Save.**

Cmd-K now opens Sidecar Search. Removing/disabling the plugin reverts Cmd-K to native.

## Build

`dist/plugin.js` is committed (that's the pasteable bundle). To rebuild from source:

```bash
npm install
npm run build      # esbuild plugin.js → dist/plugin.js (IIFE)
```

`plugin.js` is the source (uses `export class Plugin extends AppPlugin`, which the SDK
build strips). Its `/// <reference .../types.d.ts />` line points at the Thymer plugin
SDK's type definitions for editor typechecking during development; it's an inert comment
at build time, so you can ignore it, delete it, or repoint it at a local copy of the
SDK's `types.d.ts`.

## How it reaches native surfaces

The SDK doesn't expose the command palette, the Search panel, or the collection Settings
dialog directly. This plugin reaches them via `panel.navigateTo` with two nav types the
SDK docs omit but the app honors — `search_panel` (with `state.searchQuery`) and
`collection_settings` (with the collection guid as `rootId`) — plus a synthetic ⌘P for
command mode. None of these flash an intermediate modal. See
[`native-palette-spec.md`](native-palette-spec.md) for the full observed spec of the
native palette that this clones, and [`README.dev.md`](README.dev.md) for the build/verify
history.

## Notes

- Thymer is a fast-moving alpha; this is built against the desktop app v1.0.16 era and
  reads live DOM class names (`.cmdpal--*`, `.autocomplete--*`) for the theme clone, so an
  app update can require re-tuning. It fails safe — a disabled plugin reverts Cmd-K.
- Never touches editor content (raw DOM appended to `document.body` only).

## License

MIT — see [LICENSE](LICENSE).
