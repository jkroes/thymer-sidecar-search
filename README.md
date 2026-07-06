# thymer-sidecar-search

A plugin-owned replacement for [Thymer](https://thymer.com)'s **Cmd-K** jump palette.
It clones the native palette pixel-for-pixel (theme-adaptive) and extends it to also
search collections whose items are hidden from the native palette
(`show_cmdpal_items: false`).

Every way of opening the native jump palette — Cmd-K, the sidebar/statusbar "Jump To"
buttons, mobile swipe — lands in Sidecar Search instead. Commands stay in the **native
Cmd-P palette** (type `>` or press Cmd-P in Sidecar to hand off to it). Palette
switching is symmetric: Cmd-K inside the native command palette swaps to Sidecar, and
Cmd-P inside Sidecar swaps to native commands. The native jump-palette shortcut
(default **Cmd+Shift+P**) is the deliberate escape hatch to true-native jump.

## What it does

- **Native parity** — fuzzy-ranked single result list (fzf-style best-match scorer),
  matching native's row ordering: collection rows → `Open Collection 'X'` → views →
  pages → `X: New <item>` → settings → full-text search tail.
- **Per-collection sub-palette** — Enter a collection to get Open / New / views /
  Settings / full item list, with a `Back` row.
- **Hidden collections** — items from `show_cmdpal_items: false` collections still show
  up in results (the native palette hides them).
- **Jump-palette redirection** — a `focusin` listener notices any native palette the
  moment it opens (it always focuses its own input) and, if it's in jump mode, replaces
  it with Sidecar Search, carrying anything already typed. A native *command* palette
  is left alone, but typing `@` on its empty input (native's switch-to-jump) or
  pressing the jump shortcut inside it swaps to Sidecar too — same for clicking its
  "Press @ to jump to..." row.
- **Escape hatch** — a native jump palette opened via a keyboard shortcut the plugin
  doesn't own (default `Cmd+Shift+P`, or whatever `launch_cmdpal_jump` is bound to) is
  treated as deliberate and stays native. That's the way to reach the Tags
  pseudo-collection, which the plugin can't replicate (no SDK hashtag enumeration).
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

Cmd-K now opens Sidecar Search. Removing/disabling the plugin reverts everything to
native.

## Custom shortcut

The jump binding is configurable in the **Configuration** field (the `plugin.json` you
pasted). Edit the `custom` block and Save:

```json
"custom": {
  "jumpShortcut": "Mod+K",
  "commandShortcut": "Mod+P"
}
```

- `Mod` means Cmd on macOS and Ctrl on Windows/Linux. Also accepted: `Cmd`/`Meta`,
  `Ctrl`, `Alt`/`Option`, `Shift`, combined with a letter or digit — e.g.
  `"Mod+Shift+K"`.
- A binding must include Cmd/Ctrl or Alt; invalid or missing values fall back to the
  default.
- If you bind a combo Thymer already uses, Sidecar Search wins. Native jump palettes
  opened by OTHER shortcuts are redirected here anyway (see escape hatch above for the
  one exception), so there's no key you have to keep free.
- `commandShortcut` is only used while the Sidecar popup is open: pressing it there
  closes the popup and opens the native command palette. The plugin can't read what
  `launch_cmdpal` is bound to, so if you've remapped the native command palette, set
  `commandShortcut` to match.

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
read off its `searchType` field (`"JUMP"` / `"COMMANDS"`), a native palette is closed
via its own component `destroy()` (the only safe close), and the `>` handoff opens the
native command palette by calling the sidebar component's `showCommandPalette()` — the
app's own `launch_cmdpal` handler, so it survives shortcut remaps.
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
