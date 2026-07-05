# sidecar-search

**Status (2026-07-05): v1 working in BOTH the web app and the desktop app.** Verified:
Cmd-K takeover (desktop too — no menu-accelerator conflict), root palette (collections
incl. hidden badge, views, Pages/Content search sections, create action), sub-palette
(open/new/views/items), Backspace-back, Esc, open-record, open-view (`navigateTo`
`subId` = view id — confirmed), "Open native palette" synthetic-dispatch row (lands
focus in native `cmdpal--input`), create flow (user-verified).

Findings from testing:
- SDK `createRecord` ignores the app's "Untitled <item name>" naming convention
  (config `item_name` = the "What do you call a page in this collection?" setting);
  the plugin now replicates it explicitly.
- Hot-reload pushes are ephemeral: to persist/sync the plugin (e.g. to the desktop
  app), STOP hot reload and save the plugin in-app.
- Content section (body-text matches from `searchByQuery`'s `lines` channel) REMOVED
  by design decision 2026-07-05: native Cmd-K parity means title matches only. The
  lines channel + `navigateTo({itemGuid, highlight:true})` remain available if a
  full-text mode is ever wanted.

## Goal

**Duplicate and extend Cmd-K** (the search/navigation palette) as a plugin-owned popup
bound to Cmd-K itself, with the native palette rebound to another chord via synthetic
dispatch. The "extend" part: include collections hidden from the native palette
(`show_cmdpal_items: false`).

Native bindings for reference: Cmd-P = command/settings palette; **Cmd-K = search
palette** — collections, views, pages, create-new-item, collection settings, plus a
per-collection sub-palette (open collection, new note, views, settings, items within);
Cmd+Shift+P = native alias of Cmd-K.

## Test conclusion (live-verified 2026-07-04)

`show_cmdpal_items` gates ONLY the Cmd-P palette. There is no SDK hook to customize Cmd-P
itself (the only palette API is `ui.addCommandPaletteCommand`, one static entry per plugin),
and a dynamic collection cannot override the flag. But every programmatic channel ignores it:
`data.searchByQuery()` (both the `records`/title channel and the `lines`/content channel),
`data.getAllRecords()`, and MCP `search` all return results from hidden collections. So no
custom index is needed — `searchByQuery` alone can power the sidecar.

## Shortcut takeover spike (live-verified 2026-07-05, web app)

Spike plugin: `plugins/cmdp-probe/` (results in its README). Verified against BOTH
Cmd-P (v1) and Cmd-K (v2) on the web app:

1. **Intercept**: plugin `window`-capture keydown fires BEFORE Thymer's handler;
   preventDefault + stopImmediatePropagation fully suppresses the native palette.
2. **Rebind**: Thymer's palette listeners do NOT check `isTrusted` — dispatching a
   synthetic KeyboardEvent opens the native palette. So native Cmd-K can be rebound to
   any chord we choose.
3. Our capture handler can steal even natively-bound chords (demonstrated on
   Cmd+Shift+P, the native Cmd-K alias).
4. Desktop app NOT yet verified (menu-accelerator risk).
5. Failure-safe: suppression exists only while the plugin is loaded — a crashed or
   disabled plugin reverts Cmd-K to native.

## Community patterns to reuse (agent-mined 2026-07-05)

From `thymer-workflow-search` (fullest palette precedent): capture-phase document keydown
shortcut with onUnload cleanup; 150 ms debounce + stale-result token guard; arrow-key
navigation with wraparound + `mouseenter` selection + Enter-to-open; focus check via
`document.activeElement` containment (`ui.getActivePanel()` doesn't track input focus);
navigate via active non-sidebar panel `navigateTo({type:'edit_panel', rootId})`, ~350 ms
delay before `navigateTo({itemGuid, highlight:true})` for line hits.

From `thymer-enhanced-search`: two-channel `searchByQuery` merge (`lines` + `records`);
`<mark>` highlight pipeline with HTML escaping; panels compared by `getId()` (object
identity unstable).

Persistence: use our Plugins-collection record architecture — workflow-search's
`config.custom` approach reloads the plugin on every save (its own comments admit it).

## Reference repos (all by RobbK17)

- https://github.com/RobbK17/thymer-enhanced-search — palette command opens a cross-collection
  search panel (filters, duplicates, compare)
- https://github.com/RobbK17/thymer-workflow-search — full sidecar palette: own shortcut
  (⌘⇧S), own index, query syntax, saved searches
- https://github.com/RobbK17/thymer-supertypes — same author; not search, but a good settings-UI
  pattern

Local copies: `examples/community/`.
