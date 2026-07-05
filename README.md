# sidecar-search

**Status (2026-07-05): v2 implemented AND live-verified in the web app (CDP-driven,
hot-reload push).** Verified live: root empty layout, fuzzy ranked mixed list
("test" reproduces the spec's observed row mix), date jump rows ("monday" → Mon Jul 6,
"7 days" → Sun Jul 12, "aug 1" in journal submenu), submenu ordering + full item list +
filter-with-selection-on-first-match, Backspace-to-root, Esc semantics, Enter-open,
Shift+Enter → new split panel, `>` → native palette in command mode, Settings row →
real Settings dialog, Search-for row → Search panel with query already applied. NOT
persisted in-app yet — hot-reload pushes are ephemeral; stop hot reload and save the
plugin in-app to keep v2.

**Cloned chrome (2026-07-05):** the palette's appearance is a pixel-clone of the native
`.cmdpal--dialog`, using computed styles extracted from the live element over CDP
(scratch scripts `inspect2/3.mjs`): fixed 500px dialog at `top:100px` centered, 5px
radius, 1px border, the native Material triple box-shadow, teal selection, Cascadia Code
monospace (`var(--font-sans)`) at weight 300, plain-text `@` indicator and shortcuts (no
pills), thin low-opacity dividers, `→` on submenu rows, matched-char highlight cloned
from native's `.autocomplete--hilite` (bold, brightest fg), and NO backdrop dim (the doc
stays visible behind, like native).

**Theme-adaptive (2026-07-05):** colors are CSS vars set on each open by
`_readThemeColors()`, which builds a hidden, off-screen probe from the native class
names (`.cmdpal--dialog`, `.autocomplete--option-selected`, `.autocomplete--hilite`) and
reads back whatever the active theme paints them — no palette flash, no hardcoded theme.
The CSS carries thymer-dark literals as fallbacks if the probe can't read the app's CSS.
Verified live: switching to `thymer-light` flips the clone to a white dialog, dark text,
light-teal selection, and a near-black (`rgb(17,17,17)`) highlight instead of white.
Secondary text (crumb, sub-label, shortcut) is the fg color at reduced opacity, so it
stays legibly dimmer in any theme. No longer clones the native `hidden`-collection badge
(native has none) — hidden collections' items still surface in results, just unbadged.

**Flash-free routing (2026-07-05):** the Settings and Search rows originally drove the
native palette with synthetic keystrokes (⌘⇧P → type → Enter for Settings; sidebar
click + input prefill for Search), which flashed native modals on the way to the
target. Replaced with direct `panel.navigateTo` calls using two nav `type`s the SDK
docs omit but the app honors (discovered by reading `panel.getNavigation()` after
driving the native UI over CDP): `search_panel` with `state.searchQuery` and
`collection_settings` with the collection guid as `rootId`. No intermediate modal now
appears. Command mode is the sole remaining synthetic route — a synthetic ⌘P opens the
native command palette, which is itself the destination (a modal, not a panel nav), so
nothing flashes through.

Live-test notes: the `hidden` badge currently appears on "New Dynamic Collection", not
Examples — the `show_cmdpal_items:false` flag moved since the spec study (data, not a
bug). Native's "test" → "Development history" match (not a title subsequence) is NOT
reproduced — native apparently matches beyond title subsequences; ours is title-only.

Implements the spec's full gap list:

1. Fuzzy subsequence matching, one ranked mixed list when querying (fixed sections
   dropped; native-observed row types: collection `→` + `Open Collection 'X'`, views,
   pages, `X: New <item>` matching name OR item_name, `X: Collection Settings...`,
   `Search for 'q' in all text` always last, create rows on no-match).
2. Root empty query = native layout: `Press > to filter commands only... ⌘P` hint row,
   divider, collections (regular + dynamic; hidden-flagged badged), divider,
   `Open Today's Journal` (⌘J).
3. Submenu: `Back` row (ti-arrow-left icon only — no inline `←`, unlike the native
   text label), native ordering (Open → New → views → Settings → divider → full item
   list), `Open Collection 'X'` as default selection; journal submenu = date hint +
   Open + Settings (no New/items, date query → jump row); dynamic submenu = no
   New/items; create-picker excludes journal + dynamic collections.
4. Chrome: `@` mode indicator, native placeholder, native-style footer.
5. Shift+Enter (and shift-click) → other panel (`createPanel({afterPanel})` when
   there's only one; panels compared by `getId()`).
6. Date queries (`monday`, `aug 1`, `7 days`) via `DateTime.parseDateTimeString` →
   `Mon Jul 6` jump row → `panel.navigateToJournal(user, dt)`. Calendar widget skipped
   (optional per spec). Bare-number queries excluded to avoid noise.
7. Hidden-items extension KEPT: flagged collections' items ranked + badged `hidden`.
8. Reaching native-only surfaces: `Search for 'q' in all text` →
   `navigateTo({type:'search_panel', state:{searchQuery:q}})`; Settings rows →
   `navigateTo({type:'collection_settings', rootId:colGuid})`. Both open in a SIDE
   panel (`_targetPanel(true)` — reuse a second panel or split) so the current doc
   stays put, since these are utility surfaces you read alongside your work. `>` as
   first char or the hint row → synthetic ⌘P opens the native command palette directly.
   All three land on
   the target with no native-modal flash (see "Flash-free routing" above).

Not replicated: Tags pseudo-collection (no SDK hashtag enumeration; tag rows would
need the Search-panel route anyway) and the inline calendar widget. Exact native
ranking weights are unobservable — ours favors consecutive runs/word starts.

**v1 status (superseded): working in BOTH the web app and the desktop app.** Verified:
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

**Native palette spec:** `native-palette-spec.md` — full CDP-driven observation of
Cmd-K/Cmd-Shift-P (rows, submenus, selection effects, keyboard semantics) + gap list.
Key correction from that study: `show_cmdpal_items: false` hides a collection's ITEMS
from the palette, not the collection row itself.

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
