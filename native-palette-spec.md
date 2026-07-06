# Native search palette (Cmd-K / Cmd-Shift-P) — observed spec

Systematically driven via CDP in the web app, 2026-07-05 (v1.0.16 era). Every state
below was observed live; DOM classes are real. Target for sidecar-search parity.

## Chrome / markup

```
.cmdpal--dialog
  .cmdpal--input-container
    .cmdpal--searchtype     ← mode indicator: "@" (jump) or ">" (commands)
    input.cmdpal--input     ← placeholder "Search a doc name, date, user, or command..."
    .cmdpal--loading
  .cmdpal--ac-container > .autocomplete > .vscroll-node > .vcontent
    .autocomplete--option           ← result row (selected: .autocomplete--option-selected)
    .autocomplete--divider          ← section separator (mostly unlabeled)
  .cmdpal--status          ← footer: "Arrow Keys Navigate · ↵ Select · ⇧↵ Use other panel, if openable"
```

List is virtualized (vscroll) — only visible rows exist in DOM.

## Modes

- `@` (default; what Cmd-K / Cmd-Shift-P opens): jump-to. Typing `>` as first char
  switches to `>` command mode (placeholder "Search a command...", = Cmd-P's palette).
  Each mode's top hint row switches to the other ("Press > to filter commands only… ⌘P",
  "Press @ to jump to… ⌘K"). Command mode is Cmd-P's domain — OUT OF SCOPE for
  sidecar-search except possibly a delegate row.

## Root, empty query (@ mode)

```
Press > to filter commands only...   ⌘P →     (hint; Enter switches mode)
──────────
Tags →                               ti-hash
ZZ Sandbox →                         ti-flask     (collection rows, sidebar order,
New Dynamic Collection →             ti-filter     dynamic collections included,
Journal →                            ti-notebook   Tags pseudo-collection first)
Notes →                              ti-notes
Examples →                           ti-bulb
──────────
Open Today's Journal                 ⌘J           (command row)
```

## Query results (@ mode)

- **Fuzzy subsequence matching**, not substring: "test" matches view "No**tes** Li**st**",
  page "Development history", item-name "Test Note". Results are RANKED IN ONE MIXED
  LIST — no type sections when querying.
- Observed for "test": pages (recency-ish order) → `ZZ Sandbox: New Test Note` →
  view `Notes List` → `Notes: New Note` → `Notes: Collection Settings...` → page
  `Development history` → `Search for 'test' in all text`.
- Row types that can appear for a query:
  - Collection row `<name> →` (enters submenu) + separate `Open Collection '<name>'` row
  - Page rows (icon = collection icon)
  - View rows (view's icon)
  - `<Collection>: New <item_name>` (create) — matches on collection name OR item_name
  - `<Collection>: Collection Settings...`
  - `Search for '<q>' in all text` (always last)
- **No-match query**: `Search for '<q>' in all text` + `Create '<q>' in <default coll>`
  + `Create '<q>' in…` (opens create-picker submenu).
- **Date queries** ("monday", "aug 1", "7 days"): renders an inline CALENDAR WIDGET row
  (month grid, ti-x to dismiss) + a `Mon Jul 6` [ti-calendar-event] jump row + search
  fallback. (Jump row presumably opens that day's journal — not pressed to avoid
  creating journal records.)
- **`show_cmdpal_items: false`** (Examples is flagged here): hides the collection's
  ITEMS from all palette search — the collection row, views, create, and settings rows
  STILL appear. Items don't appear even inside its own submenu. Use case driving
  sidecar-search: hide a big master collection's items, then surface them through
  dynamic collections representing subsets — but native dynamic collections can't
  override the flag (tested 2026-07-04), hence the plugin.

## Collection submenu (Enter on `<name> →`; ArrowRight does NOT enter)

Regular collection (ZZ Sandbox):
```
← Back                        (row at top; also reachable by wrap)
Open Collection 'ZZ Sandbox'  (default selection)
ZZ Sandbox: New Test Note     (item_name)
Table                         (one row per view)
ZZ Sandbox: Collection Settings...
──────────
ZZ Test Page 1                (items — ALL of them; verified on unflagged Notes:
Untitled ×3                    full item list shown and typing searches all items.
Untitled Test Note ×2          A flagged collection (show_cmdpal_items:false) shows
                               NO item rows and its submenu search finds nothing —
                               the flag, not recency, hides them)
```
- Journal submenu: `Try: monday, 7 days, aug 1` hint + Open Collection + Settings
  (no New row, no items).
- Dynamic collection submenu: Open Collection + views + Settings (no New row).
- Tags submenu: one row per hashtag (`#demo`).
- Create-picker submenu (`Create 'x' in…`): only creatable collections — ZZ Sandbox,
  Notes, Examples (EXCLUDES Journal, Tags, dynamic collections).

## Selection effects (all verified except journal/date rows)

| Row | Effect |
|---|---|
| Page | Opens in current panel; palette closes |
| Page + Shift+Enter | Opens in the other panel ("if openable") |
| `Open Collection 'X'` / view row | Opens collection view (title = view name) |
| `X: Collection Settings...` | Opens the Settings DIALOG (`panel-dialog-*`); Esc closes |
| `X: New <item>` / `Create 'q' in X` | Creates record (named per item_name convention) and opens it |
| `Search for 'q' in all text` | Opens the dedicated Search panel (title "Search") |
| Tag row (#demo) | Opens Search panel filtered to the tag |
| Hint rows | Switch @/> mode in place |

## Keyboard semantics

- ArrowUp/Down navigate (wraps); Enter select; Shift+Enter other-panel; mouse hover moves selection.
- Esc: in submenu → back to root; at root → close.
- Backspace: edits text; on EMPTY input in submenu → back to root.
- Typing filters within the current submenu (all items; flagged collections excluded).

## Gaps vs sidecar-search v1 (parity work)

Achievable with SDK:
1. Fuzzy subsequence matching + single ranked list (drop our fixed sections when querying).
2. Inline action rows at root: `Open Collection 'X'`, `X: New <item>`, matching on
   item_name too; create-picker limited to creatable collections (exclude journal +
   dynamic; `isJournalPlugin()` exists).
3. Submenu: `← Back` row, native ordering (Open → New → views → Settings → divider →
   items), full item list.
4. Hint/footer chrome: mode indicator, placeholder text, footer hints.
5. Shift+Enter → other panel (`ui.createPanel({afterPanel})` / second panel).
6. Date parsing → jump row via `panel.navigateToJournal(user, DateTime...)` (SDK has
   it). Calendar widget optional.
7. `Open Today's Journal` command row (⌘J hint).
8. Hidden-items extension: KEEP — surface flagged collections' items (badge them).

Not in the SDK but REACHABLE via synthetic DOM driving (all live-verified 2026-07-05;
Thymer's UI responds fully to isTrusted:false events):
- `>` command mode → synthetic ⌘P keydown opens the native palette already in > mode.
- Search panel → synthetic click on `.sidebar-item-search` (`event="onToggleSearch"`).
  (Query prefill into the Search panel input: untested, likely the same trick.)
- `X: Collection Settings...` → drive the native palette invisibly: synthetic ⌘⇧P,
  set `.cmdpal--input` value to "<collection> settings" + input event, synthetic Enter
  on the input → real Settings dialog opens. (Brief palette flash possible.)
- Tag rows → same Search-panel route.

Unobservable/undetermined: exact fuzzy ranking weights; user-row behavior
(single-user workspace); date-row effect (untested to avoid creating journal
records).

---

# `>` command mode (Cmd-P) — observed spec (2026-07-05)

Studied for the Cmd-P replacement. Sources: CDP driving of the live web app +
inspection of the app bundle's runtime state (the palette component is reachable at
`globalThis.g_focusedComponent` while focused; its data model is described below from
live reads, not from guessing).

## Data model (live-read from the palette instance)

The palette component (`.cmdpal--dialog`, `g_focusedComponent` when focused) has
`searchType` ("JUMP" = `@`, "COMMANDS" = `>`, "NEW" = `+`), `input`, and `autocomplete`.
The autocomplete holds:

- **`categoryFilters`** — submenu rows + the mode-switch hint. In > mode (6 entries):
  `searchtype_JUMP` hint ("Press @ to jump to...", kbd ⌘K), `:cat:div` divider,
  `colview_record_options` ("This document...", icon = collection icon), divider,
  `operation` ("Commands", ti-terminal), `settings` ("Settings", ti-settings).
- **`staticOptions`** — the full flat catalog (164 observed with an editor focused).
  Each option: `category`, `value` (action id), `label`, `tag` (hidden search
  keywords, e.g. Set Theme → "settings Theme Dark Light Appearance"; MCP settings →
  "...Claude Clawd GPT LLM CLI ChatGPT Codex"), `icon`, `kbd` (display string like
  "⌘⇧↵"), `scoreFactor` (rank boost; e.g. Set Theme 4.2, Toggle Day/Night 0.7,
  insert rows 1.2, code-language rows 0.1), `json` (action payload, may hold live
  object refs), `hideTag`, `showOnlyWhenSearching` (42 code-language "Code block: X"
  rows), `hideWhenSearching`, `pinned`, `_normalizedLabel`. Row types: options
  (no `type`), `:hdr` = 30px labeled heading ("Change into", "Insert",
  "Workspace (...)", "Account Admin", the doc-name header), `:div` = 5px divider,
  `:html:hdr` = the 65px settings user card (`htmlHeader.html`), `:cat`/`:cat:div`.
- Categories observed: `insert` (65), `edit_cmdpal_actions` (36),
  `colview_record_options` (11), `settings` (25), `operation` (27). Plugin palette
  commands (ui.addCommandPaletteCommand) are appended into the settings category
  region when plugins are loaded.

## Rendering rules

- **Root, empty query**: categoryFilters in order (`:cat` rows get `→`; the JUMP hint
  also shows ⌘K), then every staticOption whose category has NO categoryFilter
  (= `insert` + `edit_cmdpal_actions`) in catalog order, rendering `:hdr` headings and
  `:div` dividers, skipping `showOnlyWhenSearching` rows. Status footer is
  `display:none` in > mode (no keyboard hints).
- **Submenu** (Enter/click on a category row; ArrowRight does NOT enter): "← Back"
  placeholder row first (arrow-SELECTABLE, sits before the wrap point), then that
  category's options in catalog order (`:hdr`/`:div`/`:html:hdr` rendered). Default
  selection = first selectable row after Back (Settings: "Display Name" — the card
  and divider aren't selectable).
- **Search** (any level): one ranked list.
  - Matcher is **fuzzysort** (the app exposes its instance at `window.fuzzysort` /
    `globalThis._fuzzysort`), over keys `[label, tag, _normalizedLabel]`
    (`_normalizedLabel` = NFD diacritic-strip + lowercase).
  - Score = max over key matches of `score / scoreFactor` (fuzzysort v1 negative
    scores; dividing a negative score by a factor >1 boosts it). Results with
    score < -60000 are dropped.
  - At root, categoryFilters are matched separately (keys `[label, tag]`) and placed
    BEFORE option matches (that's why "This document..." outranks "Set Theme" for
    "set" despite a scattered match). Equal scores tie-break alphabetically by
    normalized label; otherwise fuzzysort's score order is kept (stable sort).
  - `:hdr` rows and `hideWhenSearching` rows are excluded while searching. In a
    submenu, "← Back" stays on top while searching; only that category's options are
    matched (no category rows).
  - Label highlight = the label key's fuzzysort match (bold bright spans). If the
    match was on `tag` and `hideTag` is false, the right side shows `>` + the
    highlighted tag; `hideTag:true` rows (most settings) match invisibly ("Move..."
    matches "pa" via its "move collection sub-page reparent" tag with no visible
    highlight).
  - No match: single "No results" row (no create/search fallbacks in > mode).
- **kbd rendering**: modifier glyphs (⌘⇧⌃⌥↵⇥ arrows ⌫⌦) get
  `<span class="kbdmod kbdmod-mac">` wrapping; letters are plain text.

## Keyboard/mode semantics (all live-verified)

- ⌘P opens > mode; ⌘P while the palette is open in @ mode SWITCHES it to > in place;
  ⌘P while already in > mode closes it. ⌘K is the same in reverse.
- Typing `>` as first char in @ mode switches to > mode (the char is consumed).
  Typing `@` in > mode does NOT switch back — it's literal text.
- Esc: submenu → root; root → close. Backspace on empty input: does NOTHING in
  > mode (no back-navigation, unlike @ submenus).
- Arrow nav wraps at both ends. Enter executes; hint row Enter switches mode.
- Selecting a category row clears the input and enters the submenu.
- Multi-step commands (Set Theme, Display Name, Move..., New Page in...) keep the
  palette open and swap in a follow-up widget (color grid / input / picker) inside
  the same dialog.

## Context dependence

The catalog is rebuilt at every open from live app state: `insert`,
`edit_cmdpal_actions`, and `colview_record_options` exist only with a
document/editor context; the This-document category carries the current record's
name/guid; properties-visibility rows vary with panel state; desktop vs web differ
("Change Thymer App Icon" vs "Create Desktop Shortcut"); Leave Workspace/Logout
appear conditionally. A clone must therefore read the catalog live, not hardcode it.

## Mechanics that make a clone possible (spiked 2026-07-05)

- Synthetic ⌘P opens the palette with the full catalog ready in **~7ms**.
- The palette survives focus moving to another input, and stays open (veiled) while
  a `visibility:hidden !important` rule hides it.
- Execution: set the veiled palette's input value to the target label, dispatch an
  `input` event, find the result row by option-object identity, `selectOption(idx)`,
  dispatch Enter on its input → the command runs through the app's own dispatcher.
  Verified end-to-end with Toggle Sidebar (and toggled back).
- If the dialog still exists ~150ms after Enter, the command opened a follow-up
  widget → remove the veil to reveal the native follow-up in place.

---

# Addendum: full mode model + Tags internals (CDP + bundle read, 2026-07-06)

Read out of the live app and the minified bundle (`app-U7WKRYZI.js`), driving the
real components over CDP. Supersedes the "@/> two modes" picture above.

## Three searchTypes, one table

The palette component has exactly three modes, defined in one bundle table:

| searchType | prefix char | placeholder |
|---|---|---|
| `JUMP` | `@` | "Search a doc name, date, user, or command..." |
| `COMMANDS` | `>` | "Search a command..." |
| `NEW` | `+` | "Create a new item" |

- `onInput`: if the ENTIRE input equals one of the prefix chars and it differs from
  the current mode → `setSearchType(mode)` (the char is consumed). So `+` works from
  @ mode and > mode alike.
- `onBeforeInput`: backspace/delete-word on an EMPTY input in any mode →
  `setSearchType("JUMP")`. This is a mode transition with no focus change — a clone
  watching a native palette must poll `searchType` after keys, not rely on focusin.
- `setSearchType` clears the input and repopulates via the per-mode setup switch.

## NEW mode ("+", create palette)

Populated by `sideBar.populateAutoCompleteWithNewOptions(autocomplete)`:
"Sub-page of <current page>" (when the focused panel's collection supports sub-pages)
→ "New <item>" for the focused panel's collection → divider → one "New <item>" row
per creatable collection (default-new collection sorted first) → divider →
"New Collection..." (+ "New Dynamic Collection..." when enabled).

Programmatic open (live-verified): `sideBar.showCommandPalette()` then
`palette.setSearchType("NEW")` — identical to native's own `+` transition.

## Tags pseudo-collection internals

- Root "Tags" row = a **category filter**: `addCategoryFilters([{value:"tag",
  label:"Tags", icon:"ti ti-hash"}])` — why it sorts before collection rows.
- Tag rows = static options from `getTagsInWorkspace(wsGuid)`: one per hashtag,
  `{category:"tag", value:"search_tag", label:"#"+tag}`.
- Selecting a tag opens the Search panel with `searchQuery: "#"+tag` (same route as
  the sidebar's Tags section: `targetPanelType: SearchPanel`).
- `getTagsInWorkspace` is a SYNCHRONOUS read of a per-workspace cache
  (`tagsInWorkspace`, rebuilt from the line index on data-cache reloads). No SDK
  exposure; reachable from a plugin via the sidebar component:
  `sideBar.getCachedPlugins()[n].getTagsInWorkspace()` (any cached collection
  controller works — it reads workspace-level state). Also present on the SDK
  `PluginCollection` wrapper's internal controller (`col._getPlugin()`).

## App key handling (why palette clones must block keys)

The app's entire keyboard dispatch is ONE window **bubble-phase** keydown listener
(plus idle/timer listeners); there are NO capture-phase app listeners. Consequences:

- A clone that stops propagation at its own root swallows everything: app-global
  shortcuts (⌘J etc.) can't fire while it's open. They also SHOULDN'T be allowed
  through wholesale — `g_focusedComponent` still points at the previously-focused
  editor, so leaked combos would act on the document.
- Nothing needs a capture-phase race for redirection: the app opens its palette from
  the bubble dispatcher, then the palette focuses its input → a capture `focusin`
  hook always sees it.
- Native's own toggle: `showCommandPalette(type)` closes an existing palette of the
  same searchType instead of reopening.

## Journal submenu, exact behavior (CDP-observed 2026-07-06)

Row order: `← Back` → inline calendar widget (`:wdg-date`, not replicated in
sidecar) → date row → `Open Collection 'Journal'` → `Journal: Collection
Settings...`. No New row, no page items.

- The date row (`value: "set_date"`) is ALWAYS present and selectable: on an empty
  query it's labeled "Try: monday, 7 days, aug 1" and carries TODAY's date; a
  parsed date query relabels it ("Mon Jul 13") and retargets. It is the DEFAULT
  SELECTION — Journal → Enter opens today's journal. (Other collection submenus
  default to their Open Collection row.)
- Both `set_date` and root `journal_gohome` ("Open Today's Journal") navigate the
  focused panel to `edit_panel` with a SYNTHETIC rootId:
  `S-<journalCollGuid>-<userGuid>-0-<yyyymmdd>`. `getJournalLineForDate(ws, user,
  date)` is generative — it returns that guid for ANY date, no record needs to
  exist (the day page materializes on demand). The SDK's
  `panel.navigateToJournal(user, dt)` produces the identical navigation.
