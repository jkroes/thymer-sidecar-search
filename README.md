# thymer-sidecar-search

A plugin-owned replacement for [Thymer](https://thymer.com)'s **Cmd-K** jump palette.
It clones the native palette pixel-for-pixel (theme-adaptive) and extends it to also
search collections whose items are hidden from the native palette
(`show_cmdpal_items: false`).

Every way of opening the native jump palette — the jump shortcut, the sidebar/statusbar
"Jump To" buttons, mobile swipe — lands in Sidecar Search instead. The plugin binds
**no global shortcut of its own**: whatever key you give the native jump palette in
Thymer (My Preferences → Change Keyboard Shortcuts) opens Sidecar while the plugin is
enabled, and true-native jump when it's disabled. Commands stay in the **native Cmd-P
palette** (type `>` or press Cmd-P in Sidecar to hand off to it), and the native
create palette is a `+` away.

## What it does

- **Native parity** — fuzzy-ranked single result list (fzf-style best-match scorer),
  matching native's row ordering: collection rows → `Open Collection 'X'` → views →
  pages → `X: New <item>` → settings → full-text search tail.
- **Tags pseudo-collection** — the native palette's Tags entry, replicated: a `Tags`
  row (first, like native) opens a submenu of every hashtag in the workspace, and
  `#tag` rows rank into query results; selecting one opens the Search panel filtered
  to that tag (native's own route).
- **Per-collection sub-palette** — Enter a collection to get Open / New / views /
  Settings / full item list, with a `Back` row.
- **Hidden collections** — items from `show_cmdpal_items: false` collections still show
  up in results (the native palette hides them).
- **Jump-palette redirection** — a `focusin` listener notices any native palette the
  moment it opens (it always focuses its own input) and, if it's in jump mode, replaces
  it with Sidecar Search, carrying anything already typed. A native *command* or
  *create* palette is left alone but watched: any transition into jump mode (typing `@`
  on an empty input, backspace on an empty input, a jump binding pressed inside it,
  the "Press @ to jump to..." row) swaps to Sidecar.
- **All three native modes** — `@` jump is Sidecar's; typing `>` hands off to the
  native command palette; typing `+` hands off to the native create palette
  ("Create a new item": sub-page, new item per collection, new collection).
- **Cloned chrome** — the dialog, colors, monospace font, teal selection, dividers, and
  matched-character highlight are read from the live theme at open time, so it tracks
  light/dark and custom themes automatically. No backdrop dim, like native.
- **Create, dates, journal** — `Create 'q' in…`, date queries (`monday`, `aug 1`) that
  jump to a journal day, and `Open Today's Journal`.
- **Side panels** — Shift+Enter opens a result in the other panel; Search and collection
  Settings open in a side panel so your current doc stays put.

## Install

Thymer plugins are pasted into the app — there's no store yet.

1. In Thymer: **Cmd+P → Plugins → New Global Plugin** (or select an existing one) →
   **Edit Code**.
2. Paste [`dist/plugin.js`](dist/plugin.js) into the **Custom Code** field.
3. Paste [`plugin.json`](plugin.json) into the **Configuration** field.
4. **Save.**

The native jump shortcut (default Cmd-K) now opens Sidecar Search. Removing/disabling
the plugin reverts everything to native — same shortcut, native palette.

## Shortcuts

The plugin has exactly one binding of its own, configurable in the **Configuration**
field (the `plugin.json` you pasted):

```json
"custom": {
  "commandShortcut": "Mod+P"
}
```

- `commandShortcut` is only used while the Sidecar popup is open: pressing it there
  closes the popup and opens the native command palette. The plugin can't read what
  `launch_cmdpal` is bound to, so if you've remapped the native command palette, set
  `commandShortcut` to match. `Mod` means Cmd on macOS and Ctrl on Windows/Linux; also
  accepted: `Cmd`/`Meta`, `Ctrl`, `Alt`/`Option`, `Shift`, combined with a letter or
  digit. A binding must include Cmd/Ctrl or Alt; invalid values fall back to `Mod+P`.
- The **jump** binding is Thymer's own (`launch_cmdpal_jump`) — change it in
  My Preferences → Change Keyboard Shortcuts. Sidecar redirects the palette it opens,
  so no plugin-side setting is needed.
- While the Sidecar popup is open, app-global shortcuts (e.g. ⌘J) don't fire — the
  popup keeps keystrokes away from the app because Thymer still routes keys to the
  previously-focused editor. Use the palette rows instead (`Open Today's Journal`).

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
`collection_settings` (with the collection guid as `rootId`).

The redirection layer goes one level deeper: palette components are located by walking
the app's component tree from `globalThis.g_focusedComponent`, the palette's mode is
read off its `searchType` field (`"JUMP"` / `"COMMANDS"` / `"NEW"`), a native palette is
closed via its own component `destroy()` (the only safe close), the `>` handoff opens
the native command palette by calling the sidebar component's `showCommandPalette()` —
the app's own `launch_cmdpal` handler, so it survives shortcut remaps — and the `+`
handoff flips that palette to create mode via its `setSearchType("NEW")`, the same
method native's own `+` prefix calls. Hashtags for the Tags submenu come from the
sidebar's cached collection controllers (`getTagsInWorkspace()`), a synchronous read of
the app's workspace cache with no SDK equivalent.
See [`native-palette-spec.md`](native-palette-spec.md) for the observed native-palette
spec and [`README.dev.md`](README.dev.md) for the build/verify history (including the
retired v3 command-mode clone).

## Notes

- Thymer is a fast-moving alpha; this is built against the desktop app v1.0.16 era and
  reads live DOM class names (`.cmdpal--*`) for the theme clone and redirection, so an
  app update can require re-tuning. It fails safe — a disabled plugin reverts everything.
- Never touches editor content (raw DOM appended to `document.body` only; no
  MutationObserver).

## License

MIT — see [LICENSE](LICENSE).
