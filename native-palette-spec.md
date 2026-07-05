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
  STILL appear. Items don't appear even inside its own submenu. This is the gap
  sidecar-search exists to fill.

## Collection submenu (Enter on `<name> →`; ArrowRight does NOT enter)

Regular collection (ZZ Sandbox):
```
← Back                        (row at top; also reachable by wrap)
Open Collection 'ZZ Sandbox'  (default selection)
ZZ Sandbox: New Test Note     (item_name)
Table                         (one row per view)
ZZ Sandbox: Collection Settings...
──────────
ZZ Test Page 1                (items — RECENT ones only; a collection with no
Untitled ×3                    recently-touched items shows NO item rows, and
Untitled Test Note ×2          typing in the submenu does NOT search all items —
                               only filters the recent list. "get" in Examples
                               submenu → "No results" despite "Getting Started")
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
- Typing filters within the current submenu (recent items only, see above).

## Gaps vs sidecar-search v1 (parity work)

Achievable with SDK:
1. Fuzzy subsequence matching + single ranked list (drop our fixed sections when querying).
2. Inline action rows at root: `Open Collection 'X'`, `X: New <item>`, matching on
   item_name too; create-picker limited to creatable collections (exclude journal +
   dynamic; `isJournalPlugin()` exists).
3. Submenu: `← Back` row, native ordering (Open → New → views → Settings → divider →
   items), recent-items-only list (approximate: sort by updatedAt desc, cap).
4. Hint/footer chrome: mode indicator, placeholder text, footer hints.
5. Shift+Enter → other panel (`ui.createPanel({afterPanel})` / second panel).
6. Date parsing → jump row via `panel.navigateToJournal(user, DateTime...)` (SDK has
   it). Calendar widget optional.
7. `Open Today's Journal` command row (⌘J hint).
8. Hidden-items extension: KEEP — surface flagged collections' items (badge them).

NOT achievable via SDK (delegate to native or omit):
- `X: Collection Settings...` → settings dialog is unreachable; either omit or
  synthesize native palette open.
- `Search for 'q' in all text` → Search panel unreachable; either reimplement with
  searchByQuery lines channel in our own UI, or omit.
- Tag rows' target (Search panel) — same limitation; tag LIST itself may be
  enumerable (unverified).
- `>` command mode contents (built-in command registry is opaque) → keep the hint row
  but delegate to native (synthetic ⌘P-equivalent) or drop.

Unobservable/undetermined: exact fuzzy ranking weights; recent-items window/cap;
user-row behavior (single-user workspace); date-row effect (untested to avoid
creating journal records).
