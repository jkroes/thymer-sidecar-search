/// <reference path="../../sdk/types.d.ts" />
// sidecar-search — replaces Cmd-K with a plugin-owned popup palette that also covers
// collections hidden from the native palette (show_cmdpal_items: false).
//
// v2: native-palette parity per native-palette-spec.md (CDP-observed 2026-07-05):
// fuzzy subsequence matching in one ranked list, inline action rows (Open Collection /
// New <item> / Settings / Search-all-text / Create-in), native submenu ordering with
// "Back", Shift+Enter → other panel, date queries → journal jump row, "Open Today's
// Journal", and "> command mode" delegation to the native palette. Tags pseudo-
// collection is NOT replicated (no SDK hashtag enumeration).
//
// Shortcut model (live-verified via plugins/cmdp-probe, 2026-07-05, web app):
// - We steal Cmd-K at window-capture BEFORE Thymer's handler (preventDefault +
//   stopImmediatePropagation suppresses the native palette).
// - Cmd+Shift+P is natively an alias of Cmd-K and we deliberately do NOT intercept it,
//   so it remains the escape hatch to the native palette.
// - Suppression exists only while this plugin is loaded; if it crashes, Cmd-K reverts.
//
// Native surfaces the SDK doesn't document but reaches anyway (CDP-verified 2026-07-05
// by reading panel.getNavigation()): Search panel = navigateTo({type:'search_panel',
// state:{searchQuery}}); collection Settings = navigateTo({type:'collection_settings',
// rootId:<colGuid>}). These replaced the old palette-driving synthetic routes, so no
// native modal flashes on the way to the target. The one remaining synthetic route is
// "> command mode": a synthetic ⌘P opens the native command palette directly (it IS
// the destination — nothing flashes through), since that palette is a modal, not a
// panel nav type.
//
// UI is raw DOM appended to document.body — never touches editor content (DATA-LOSS
// DIRECTIVE: no editor DOM, no MutationObserver on body, no content rewriting).
//
// `export` works only in the esbuild dev/build loop; paste dist/plugin.js instead.

// Chrome cloned pixel-for-pixel from the native Cmd-K palette (.cmdpal--dialog),
// computed-styles extracted over CDP 2026-07-05. Theme-adaptive: the colors are CSS
// vars set at open time by _readThemeColors() (which measures a hidden probe built from
// the native class names, so it picks up whatever the active theme paints them). The
// literals below are thymer-dark fallbacks used if the probe can't read the app's CSS.
// Native uses NO backdrop dim (doc stays fully visible); the backdrop here is a
// transparent click-catcher only.
const CSS = `
.scs-backdrop{position:fixed;inset:0;z-index:99999;background:transparent;
  display:flex;align-items:flex-start;justify-content:center;padding-top:100px;}
.scs-palette{width:500px;max-width:92vw;max-height:62vh;display:flex;flex-direction:column;
  background:var(--scs-bg,color(display-p3 0.129 0.129 0.149));
  color:var(--scs-fg,color(display-p3 0.769 0.769 0.769));
  border:1px solid var(--scs-border,rgba(255,255,255,.1));border-radius:5px;
  overflow:hidden;font-weight:300;
  box-shadow:rgba(0,0,0,.14) 0 12px 17px 2px,rgba(0,0,0,.12) 0 5px 22px 4px,rgba(0,0,0,.2) 0 7px 8px -4px;
  font-family:var(--font-sans,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace);}
.scs-inputrow{display:flex;align-items:center;gap:0;padding:5px;}
.scs-searchtype{padding:5px 0 5px 5px;font-size:14px;white-space:nowrap;}
.scs-crumb{padding:5px 0 5px 5px;font-size:14px;white-space:nowrap;opacity:.6;}
.scs-input{flex:1;background:transparent;border:none;outline:none;color:inherit;
  font:inherit;font-size:15px;padding:10px;}
.scs-input::placeholder{color:inherit;opacity:.5;}
.scs-list{overflow-y:auto;flex:1;padding:0 0 5px;}
.scs-divider{height:0;margin:6px 10px 6px 5px;
  border-top:1.5px solid var(--scs-border,rgba(255,255,255,.1));opacity:.3;}
.scs-static{padding:5px 10px 5px 15px;font-size:14px;opacity:.6;}
.scs-row{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:3px;
  margin:0 5px;width:calc(100% - 10px);box-sizing:border-box;cursor:pointer;font-size:14px;}
.scs-row.scs-sel{background:var(--scs-sel-bg,color(display-p3 0.267 0.514 0.482));
  color:var(--scs-fg-bright,color(display-p3 0.929 0.929 0.929));}
.scs-icon{flex:none;min-width:16px;text-align:center;
  color:var(--scs-fg-bright,color(display-p3 0.929 0.929 0.929));}
.scs-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.scs-label mark{background:transparent;color:var(--scs-hilite,#fff);
  font-weight:var(--scs-hilite-weight,700);}
.scs-arrow{flex:none;color:var(--scs-fg-bright,color(display-p3 0.929 0.929 0.929));}
.scs-sub{flex:none;font-size:14px;max-width:38%;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;opacity:.6;}
.scs-key{flex:none;font-size:14px;opacity:.6;}
.scs-footer{padding:10px;font-size:11px;color:var(--scs-fg,color(display-p3 0.769 0.769 0.769));
  border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;}
.scs-empty{padding:18px;text-align:center;font-size:14px;opacity:.6;}
`;

const MAX_RESULTS = 40;
const SEARCH_LIMIT = 100;
const DEBOUNCE_MS = 120;
// New records aren't immediately readable after createRecord (see memory:
// thymer-sdk-write-read-model) — poll before navigating.
const CREATE_POLL_MS = 50;
const CREATE_POLL_TRIES = 160;

export class Plugin extends AppPlugin {
    onLoad() {
        this.ui.injectCSS(CSS);
        this._overlay = null;
        this._level = { mode: "root" };
        this._rows = [];
        this._sel = 0;
        this._searchRecs = [];
        this._searchToken = 0;
        this._debounce = null;
        this._prevFocus = null;
        this._cols = [];
        this._colRecords = new Map(); // colGuid -> PluginRecord[]
        this._recCol = new Map();     // recordGuid -> collection entry

        this._keyHandler = (e) => this._onGlobalKey(e);
        window.addEventListener("keydown", this._keyHandler, true);

        this.ui.addCommandPaletteCommand({
            label: "Sidecar Search: open",
            icon: "search",
            onSelected: () => this._open(),
        });

        this._refreshCollections();
    }

    onUnload() {
        this._close();
        window.removeEventListener("keydown", this._keyHandler, true);
    }

    // ---------- global keyboard ----------

    _onGlobalKey(e) {
        if (!e.isTrusted) return; // never react to our own synthetic dispatches
        const key = (e.key || "").toLowerCase();
        const cmd = e.metaKey || e.ctrlKey;
        if (cmd && !e.shiftKey && !e.altKey && key === "k") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            if (this._overlay) this._close();
            else this._open();
            return;
        }
        if (this._overlay && key === "escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            this._back();
        }
    }

    _back() {
        if (this._level.mode !== "root") {
            this._level = { mode: "root" };
            if (this._input) this._input.value = "";
            this._render();
        } else {
            this._close();
        }
    }

    // ---------- data ----------

    async _refreshCollections() {
        const [cols, dyns] = await Promise.all([
            this.data.getAllCollections(),
            this.data.getAllDynamicCollections().catch(() => []),
        ]);
        if (!cols || !cols.length) return; // transient-empty after reload; keep old cache
        const mapEntry = (col, isDynamic) => {
            const conf = col.getConfiguration() || {};
            return {
                col,
                guid: col.getGuid(),
                name: col.getName() || "(unnamed)",
                itemName: conf.item_name || "page",
                icon: conf.icon || (isDynamic ? "ti-filter" : null),
                hidden: conf.show_cmdpal_items === false,
                views: (conf.views || []).filter((v) => v.shown !== false),
                isJournal: !isDynamic && !!(col.isJournalPlugin && col.isJournalPlugin()),
                isDynamic,
            };
        };
        this._cols = cols.map((c) => mapEntry(c, false))
            .concat((dyns || []).map((c) => mapEntry(c, true)));
        // Record cache: powers submenu item lists, fuzzy title matching at root, and
        // the collection label on page results. Built in the background; UI works
        // without it. Dynamic collections own no records — skip them.
        for (const entry of this._cols) {
            if (entry.isDynamic) continue;
            entry.col.getAllRecords().then((records) => {
                this._colRecords.set(entry.guid, records || []);
                for (const r of records || []) this._recCol.set(r.guid, entry);
            }).catch(() => {});
        }
    }

    _creatable() {
        return this._cols.filter((c) => !c.isJournal && !c.isDynamic);
    }

    // ---------- open/close ----------

    _open() {
        if (this._overlay) return;
        this._prevFocus = document.activeElement;
        this._level = { mode: "root" };
        this._searchRecs = [];
        this._refreshCollections();

        const backdrop = document.createElement("div");
        backdrop.className = "scs-backdrop";
        backdrop.addEventListener("mousedown", (e) => {
            if (e.target === backdrop) this._close();
        });

        const palette = document.createElement("div");
        palette.className = "scs-palette";
        // Keep typing inside the popup from reaching Thymer's own shortcut handlers.
        for (const type of ["keydown", "keyup", "keypress"]) {
            palette.addEventListener(type, (e) => e.stopPropagation());
        }

        const inputRow = document.createElement("div");
        inputRow.className = "scs-inputrow";
        this._searchtype = document.createElement("span");
        this._searchtype.className = "scs-searchtype";
        this._searchtype.textContent = "@";
        this._crumb = document.createElement("span");
        this._crumb.className = "scs-crumb";
        this._crumb.style.display = "none";
        this._input = document.createElement("input");
        this._input.className = "scs-input";
        this._input.placeholder = "Search a doc name, date, user, or command...";
        this._input.addEventListener("input", () => {
            // ">" as first char = native command mode (Cmd-P's palette) — delegate.
            if (this._level.mode === "root" && this._input.value.startsWith(">")) {
                this._delegateCommandMode();
                return;
            }
            clearTimeout(this._debounce);
            this._debounce = setTimeout(() => this._render(), DEBOUNCE_MS);
        });
        this._input.addEventListener("keydown", (e) => this._onInputKey(e));
        inputRow.appendChild(this._searchtype);
        inputRow.appendChild(this._crumb);
        inputRow.appendChild(this._input);

        this._list = document.createElement("div");
        this._list.className = "scs-list";

        const footer = document.createElement("div");
        footer.className = "scs-footer";
        footer.textContent =
            "↑↓ Navigate · ↵ Select · ⇧↵ Use other panel · Esc Back/Close · ⌘⇧P Native palette";

        palette.appendChild(inputRow);
        palette.appendChild(this._list);
        palette.appendChild(footer);
        backdrop.appendChild(palette);
        document.body.appendChild(backdrop);
        this._overlay = backdrop;

        // Re-read the active theme's palette colors each open so the clone tracks
        // theme switches (they're set as CSS vars; CSS carries dark fallbacks).
        const colors = this._readThemeColors();
        for (const name in colors) backdrop.style.setProperty(name, colors[name]);

        this._render();
        this._input.focus();
    }

    // Measure the native palette's theme colors WITHOUT opening it (no flash): build a
    // hidden probe from the native class names and let the app's own CSS paint it, then
    // read the computed values. Returns only the vars it could resolve; the rest fall
    // back to the dark literals baked into CSS.
    _readThemeColors() {
        const box = document.createElement("div");
        box.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;";
        box.innerHTML =
            '<div class="cmdpal--dialog"><div class="cmdpal--ac-container">' +
            '<div class="autocomplete--option autocomplete--option-selected">' +
            '<span class="autocomplete--option-label"><span class="autocomplete--hilite">x</span></span>' +
            "</div></div></div>";
        document.body.appendChild(box);
        const out = {};
        try {
            const cs = (sel) => { const el = box.querySelector(sel); return el && getComputedStyle(el); };
            const isColor = (v) => v && v !== "rgba(0, 0, 0, 0)" && v !== "transparent";
            const put = (name, v) => { if (isColor(v)) out[name] = v; };
            const dialog = cs(".cmdpal--dialog");
            const sel = cs(".autocomplete--option-selected");
            const hil = cs(".autocomplete--hilite");
            if (dialog) {
                put("--scs-bg", dialog.backgroundColor);
                put("--scs-fg", dialog.color);
                put("--scs-border", dialog.borderTopColor);
            }
            if (sel) {
                put("--scs-sel-bg", sel.backgroundColor);
                put("--scs-fg-bright", sel.color);
            }
            if (hil) {
                put("--scs-hilite", hil.color);
                if (hil.fontWeight) out["--scs-hilite-weight"] = hil.fontWeight;
            }
        } catch (e) { /* fall back to CSS literals */ }
        box.remove();
        return out;
    }

    _close() {
        clearTimeout(this._debounce);
        this._searchToken++;
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        this._input = null;
        this._list = null;
        this._crumb = null;
        this._searchtype = null;
        this._rows = [];
        if (this._prevFocus && this._prevFocus.isConnected) {
            try { this._prevFocus.focus(); } catch (e) { /* focus is best-effort */ }
        }
        this._prevFocus = null;
    }

    // ---------- input keys ----------

    _onInputKey(e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!this._rows.length) return;
            const delta = e.key === "ArrowDown" ? 1 : -1;
            this._select((this._sel + delta + this._rows.length) % this._rows.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const row = this._rows[this._sel];
            if (row) row.action({ otherPanel: e.shiftKey });
        } else if (e.key === "Backspace" && !this._input.value && this._level.mode !== "root") {
            e.preventDefault();
            this._back();
        }
    }

    _select(i) {
        this._sel = i;
        this._rows.forEach((row, idx) => row.el.classList.toggle("scs-sel", idx === this._sel));
        const el = this._rows[this._sel] && this._rows[this._sel].el;
        if (el) el.scrollIntoView({ block: "nearest" });
    }

    // ---------- rendering ----------

    _render() {
        if (!this._overlay) return;
        const q = this._input.value.trim();
        const token = ++this._searchToken;

        if (this._level.mode === "root" && q) {
            // Async title-match channel; merged into the ranked list when it lands.
            this.data.searchByQuery(q, SEARCH_LIMIT).then((res) => {
                if (token !== this._searchToken || !this._overlay) return;
                this._searchRecs = (res && !res.error && res.records) || [];
                this._renderList(q);
            }).catch(() => {});
        } else {
            this._searchRecs = [];
        }
        this._renderList(q);
    }

    _renderList(q) {
        const entries =
            this._level.mode === "root" ? (q ? this._rootQueryEntries(q) : this._rootEmptyEntries())
            : this._level.mode === "collection" ? this._collectionEntries(q)
            : this._createPickEntries(q);

        this._crumb.style.display = this._level.mode === "root" ? "none" : "";
        this._crumb.textContent =
            this._level.mode === "collection" ? this._level.entry.name + " ›"
            : this._level.mode === "create-pick" ? "New page ›" : "";

        this._list.textContent = "";
        this._rows = [];
        let defaultSel = 0;
        for (const entry of entries) {
            if (entry.divider) {
                const div = document.createElement("div");
                div.className = "scs-divider";
                this._list.appendChild(div);
                continue;
            }
            if (entry.static) {
                const div = document.createElement("div");
                div.className = "scs-static";
                div.textContent = entry.static;
                this._list.appendChild(div);
                continue;
            }
            const row = entry;
            row.el = this._rowEl(row, q);
            const index = this._rows.length;
            if (row.defaultSel) defaultSel = index;
            row.el.addEventListener("mouseenter", () => this._select(index));
            row.el.addEventListener("click", (e) => row.action({ otherPanel: e.shiftKey }));
            this._list.appendChild(row.el);
            this._rows.push(row);
        }
        if (!this._rows.length) {
            const empty = document.createElement("div");
            empty.className = "scs-empty";
            empty.textContent = q ? "No results" : "Loading…";
            this._list.appendChild(empty);
        }
        this._select(Math.min(defaultSel, Math.max(0, this._rows.length - 1)));
    }

    _rowEl(row, q) {
        const el = document.createElement("div");
        el.className = "scs-row";
        const label = row.indices
            ? highlightIndices(row.label, row.indices)
            : (row.noHighlight ? esc(row.label) : highlight(row.label, q));
        const parts = [
            `<span class="scs-icon">${iconHTML(row.icon)}</span>`,
            `<span class="scs-label">${label}</span>`,
        ];
        if (row.arrow) parts.push(`<span class="scs-arrow">→</span>`);
        if (row.sub) parts.push(`<span class="scs-sub">${esc(row.sub)}</span>`);
        if (row.shortcut) parts.push(`<span class="scs-key">${esc(row.shortcut)}</span>`);
        el.innerHTML = parts.join("");
        return el;
    }

    // ---------- root: empty query (native layout) ----------

    _rootEmptyEntries() {
        const entries = [];
        entries.push({
            label: "Press > to filter commands only...",
            icon: "ti-chevron-right",
            shortcut: "⌘P",
            noHighlight: true,
            action: () => this._delegateCommandMode(),
        });
        entries.push({ divider: true });
        for (const c of this._cols) {
            entries.push({
                label: c.name,
                icon: c.icon || "ti-database",
                arrow: true,
                noHighlight: true,
                action: () => this._enterCollection(c),
            });
        }
        entries.push({ divider: true });
        if (this._cols.some((c) => c.isJournal)) {
            entries.push({
                label: "Open Today's Journal",
                icon: "ti-notebook",
                shortcut: "⌘J",
                noHighlight: true,
                action: (opts) => this._openJournal(null, opts),
            });
        }
        return entries;
    }

    // ---------- root: query (single ranked list, native parity) ----------

    _rootQueryEntries(q) {
        // Native orders one mixed list by ROW TYPE first, then match score within each
        // type (observed 2026-07-05): collection-enter rows → all Open Collection rows →
        // views → pages → create rows → settings → the searchByQuery tail. Each row gets
        // a typeRank; we sort by (typeRank asc, score desc). Score comes from a best-match
        // fuzzy scorer so e.g. "Open Collection 'Notes'" ranks on the "Not" in Notes.
        const scored = [];
        const add = (rank, m, row) => { if (m) scored.push(Object.assign(row, { rank, score: m.score, indices: m.indices })); };

        for (const c of this._cols) {
            // Enter-submenu row — only when the collection NAME matches (native).
            add(0, fuzzyMatch(q, c.name), {
                label: c.name, icon: c.icon || "ti-database", arrow: true,
                action: () => this._enterCollection(c),
            });
            // Open Collection row — matched on the whole label, so its "Open Collection"
            // prefix makes it appear for many queries (native shows every collection's
            // Open row for e.g. "not"). Ranked by the full-label best-match score, which
            // floats the name-matching collection (Open 'Notes' for "not") to the top.
            const openLabel = `Open Collection '${c.name}'`;
            add(1, fuzzyMatch(q, openLabel), {
                label: openLabel, icon: c.icon || "ti-database",
                action: (opts) => this._openView(c.guid, null, opts),
            });
            for (const v of c.views) {
                add(2, fuzzyMatch(q, v.label), {
                    label: v.label, icon: v.icon || "ti-layout-list", sub: c.name,
                    action: (opts) => this._openView(c.guid, v.id, opts),
                });
            }
            if (!c.isJournal && !c.isDynamic) {
                // Label carries both collection name and item_name, so fuzzy matches either.
                add(4, fuzzyMatch(q, `${c.name}: New ${c.itemName}`), {
                    label: `${c.name}: New ${c.itemName}`, icon: "ti-plus",
                    action: () => this._createRecord(c, null),
                });
            }
            add(5, fuzzyMatch(q, `${c.name}: Collection Settings...`), {
                label: `${c.name}: Collection Settings...`, icon: "ti-settings",
                action: () => this._openCollectionSettings(c),
            });
        }

        // Pages: fuzzy over the record-name cache + async searchByQuery title channel.
        const seen = new Set();
        for (const [guid, records] of this._colRecords) {
            const colEntry = this._cols.find((c) => c.guid === guid);
            for (const r of records) {
                const m = fuzzyMatch(q, r.getName() || "");
                if (!m) continue;
                seen.add(r.guid);
                add(3, m, this._pageRow(r, colEntry));
            }
        }
        // searchByQuery tail — records the app matched (often on body text) that the
        // title fuzzy didn't; rank 6, below the typed-title matches, like native.
        for (const r of this._searchRecs) {
            if (seen.has(r.guid)) continue;
            const colEntry = this._recCol.get(r.guid) || null;
            const m = fuzzyMatch(q, r.getName() || "");
            add(6, m || { score: 0, indices: [] }, this._pageRow(r, colEntry));
        }

        scored.sort((a, b) => a.rank - b.rank || b.score - a.score);
        const entries = scored.slice(0, MAX_RESULTS);

        // Date query → journal jump row on top (native shows calendar + jump row).
        const dt = parseDate(q);
        if (dt) {
            entries.unshift({
                label: fmtDate(dt), icon: "ti-calendar-event", noHighlight: true,
                action: (opts) => this._openJournal(dt, opts),
            });
        }

        // No-match: create actions, like native.
        if (!scored.length) {
            const def = this._creatable()[0];
            if (def) {
                entries.push({
                    label: `Create '${q}' in ${def.name}`, icon: "ti-plus", noHighlight: true,
                    action: () => this._createRecord(def, q),
                });
            }
            entries.push({
                label: `Create '${q}' in…`, icon: "ti-plus", noHighlight: true,
                action: () => { this._level = { mode: "create-pick", name: q }; this._input.value = ""; this._render(); },
            });
        }

        // Always last, like native.
        entries.push({
            label: `Search for '${q}' in all text`, icon: "ti-search", noHighlight: true,
            action: () => this._openSearchPanel(q),
        });
        return entries;
    }

    _pageRow(record, colEntry) {
        return {
            label: record.getName() || "(untitled)",
            icon: safeIcon(record) || (colEntry && colEntry.icon) || "ti-file",
            sub: colEntry ? colEntry.name : null,
            action: (opts) => this._openRecord(record.guid, opts),
        };
    }

    // ---------- collection submenu (native ordering) ----------

    _collectionEntries(q) {
        const entry = this._level.entry;
        const entries = [];
        const filter = (rows) => q ? rows.filter((r) => {
            const m = fuzzyMatch(q, r.label);
            if (m) { r.indices = m.indices; r.score = m.score; }
            return !!m;
        }) : rows;

        entries.push({
            label: "Back", icon: "ti-arrow-left", noHighlight: true,
            action: () => this._back(),
        });

        const actions = [];
        actions.push({
            label: `Open Collection '${entry.name}'`,
            icon: entry.icon || "ti-database",
            defaultSel: true,
            action: (opts) => this._openView(entry.guid, null, opts),
        });
        if (!entry.isJournal && !entry.isDynamic) {
            actions.push({
                label: `${entry.name}: New ${entry.itemName}`,
                icon: "ti-plus",
                action: () => this._createRecord(entry, q || null),
            });
        }
        for (const v of entry.views) {
            actions.push({
                label: v.label, icon: v.icon || "ti-layout-list",
                action: (opts) => this._openView(entry.guid, v.id, opts),
            });
        }
        actions.push({
            label: `${entry.name}: Collection Settings...`, icon: "ti-settings",
            action: () => this._openCollectionSettings(entry),
        });
        entries.push(...filter(actions));

        if (entry.isJournal) {
            // Native journal submenu: date hint, no New row, no items.
            const dt = parseDate(q);
            if (dt) {
                entries.splice(1, 0, {
                    label: fmtDate(dt), icon: "ti-calendar-event", noHighlight: true,
                    action: (opts) => this._openJournal(dt, opts),
                });
            } else if (!q) {
                entries.push({ static: "Try: monday, 7 days, aug 1" });
            }
            return this._fixSubmenuSel(entries, q);
        }
        if (entry.isDynamic) return this._fixSubmenuSel(entries, q); // no owned items

        const records = this._colRecords.get(entry.guid) || [];
        const itemRows = filter(records.map((r) => {
            const row = this._pageRow(r, entry);
            row.sub = null; // collection label is redundant inside its own submenu
            return row;
        }));
        if (q) itemRows.sort((a, b) => b.score - a.score);
        if (itemRows.length) {
            entries.push({ divider: true });
            entries.push(...itemRows);
        }
        return this._fixSubmenuSel(entries, q);
    }

    // When filtering a submenu, select the first match — never the "Back" row.
    _fixSubmenuSel(entries, q) {
        if (q) {
            for (const en of entries) en.defaultSel = false;
            const first = entries.find((en) => en.action && en.label !== "Back");
            if (first) first.defaultSel = true;
        }
        return entries;
    }

    // ---------- create-picker submenu ----------

    _createPickEntries(q) {
        const name = this._level.name;
        const entries = [{
            label: "Back", icon: "ti-arrow-left", noHighlight: true,
            action: () => this._back(),
        }];
        // Native create-picker: only creatable collections (no Journal/Tags/dynamic).
        for (const c of this._creatable()) {
            const m = fuzzyMatch(q, c.name);
            if (q && !m) continue;
            entries.push({
                label: c.name,
                icon: c.icon || "ti-database",
                indices: m ? m.indices : null,
                defaultSel: entries.length === 1,
                action: () => this._createRecord(c, name),
            });
        }
        return entries;
    }

    _enterCollection(entry) {
        this._level = { mode: "collection", entry };
        this._input.value = "";
        if (!entry.isDynamic) {
            // Refresh this collection's items so the sub-palette isn't stale.
            entry.col.getAllRecords().then((records) => {
                this._colRecords.set(entry.guid, records || []);
                for (const r of records || []) this._recCol.set(r.guid, entry);
                if (this._overlay && this._level.mode === "collection" && this._level.entry === entry) {
                    this._render();
                }
            }).catch(() => {});
        }
        this._render();
    }

    // ---------- actions ----------

    async _targetPanel(otherPanel) {
        const panels = (this.ui.getPanels() || []).filter((p) => !p.isSidebar());
        let active = panels.find((p) => p.isActive()) || panels[0];
        if (!active) return await this.ui.createPanel();
        if (!otherPanel) return active;
        // "Use other panel, if openable" — reuse an existing second panel, else split.
        const activeId = active.getId ? active.getId() : null;
        const other = panels.find((p) => (p.getId ? p.getId() : null) !== activeId);
        return other || await this.ui.createPanel({ afterPanel: active });
    }

    async _openRecord(guid, opts) {
        this._close();
        const panel = await this._targetPanel(opts && opts.otherPanel);
        if (!panel) return;
        panel.navigateTo({
            type: "edit_panel", rootId: guid, subId: null,
            workspaceGuid: this.getWorkspaceGuid(),
        });
        this.ui.setActivePanel(panel);
    }

    async _openView(colGuid, viewId, opts) {
        this._close();
        const panel = await this._targetPanel(opts && opts.otherPanel);
        if (!panel) return;
        panel.navigateTo({
            type: "overview", rootId: colGuid, subId: viewId || null,
            workspaceGuid: this.getWorkspaceGuid(),
        });
        this.ui.setActivePanel(panel);
    }

    async _openJournal(dt, opts) {
        this._close();
        const user = (this.data.getActiveUsers() || [])[0];
        if (!user) return;
        const panel = await this._targetPanel(opts && opts.otherPanel);
        if (!panel) return;
        const ok = panel.navigateToJournal(user, dt || undefined);
        if (!ok) {
            this.ui.addToaster({ title: "Sidecar Search", message: "No journal available.", dismissible: true });
            return;
        }
        this.ui.setActivePanel(panel);
    }

    async _createRecord(entry, name) {
        this._close();
        // SDK createRecord ignores the app's "Untitled <item name>" naming convention
        // (live-verified 2026-07-05) — replicate it from the collection's item_name.
        const guid = entry.col.createRecord(name || `Untitled ${entry.itemName}`);
        if (!guid) {
            this.ui.addToaster({ title: "Sidecar Search", message: "Couldn't create page.", dismissible: true });
            return;
        }
        for (let i = 0; i < CREATE_POLL_TRIES; i++) {
            if (this.data.getRecord(guid)) break;
            await new Promise((resolve) => setTimeout(resolve, CREATE_POLL_MS));
        }
        this._openRecord(guid);
    }

    // ---------- panel-nav routes (undocumented but live-verified nav types) ----------
    // navigateTo accepts more `type`s than the SDK docs list (only edit_panel/overview
    // are documented). CDP-observed 2026-07-05 by reading panel.getNavigation() after
    // driving the native UI: the Search panel is `search_panel` with
    // state.searchQuery, and collection Settings is `collection_settings` with the
    // collection guid as rootId. Navigating straight to them avoids the palette flash
    // the old synthetic-keystroke routes caused.

    async _openCollectionSettings(entry) {
        this._close();
        // Utility surface — always a side panel so the current doc stays put.
        const panel = await this._targetPanel(true);
        if (!panel) return;
        panel.navigateTo({
            type: "collection_settings", rootId: entry.guid, subId: null,
            workspaceGuid: this.getWorkspaceGuid(),
        });
        this.ui.setActivePanel(panel);
    }

    async _openSearchPanel(query) {
        this._close();
        // Utility surface — always a side panel so the current doc stays put.
        const panel = await this._targetPanel(true);
        if (!panel) return;
        panel.navigateTo({
            type: "search_panel", rootId: null, subId: null,
            workspaceGuid: this.getWorkspaceGuid(),
            state: { searchQuery: query || null },
        });
        this.ui.setActivePanel(panel);
    }

    // Command mode is the native command palette — a modal, not a panel nav. Synthetic
    // ⌘P opens it directly (Thymer's listeners ignore isTrusted), so there's no
    // intermediate-modal flash: the palette we open IS the destination.
    _delegateCommandMode() {
        this._close();
        setTimeout(() => {
            (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", {
                key: "p", code: "KeyP", keyCode: 80, which: 80,
                metaKey: true, bubbles: true, cancelable: true,
            }));
        }, 50);
    }
}

// ---------- helpers ----------

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const WORD_SEP = /[\s\-_:'".(/\\]/;

// Best-match fuzzy scorer (fzf-style DP). Every query char must appear in order, but
// unlike a greedy left-to-right scan it picks the highest-scoring subsequence — so
// "Open Collection 'Notes'" scores/highlights on the contiguous "Not" in Notes, not the
// scattered n…o…t in the prefix. Bonuses for consecutive runs and word starts; small
// penalties for gaps, late starts, and length. Returns {score, indices} or null.
// O(m·n²) with tiny m,n (palette labels) — negligible.
function fuzzyMatch(query, text) {
    const t = String(text || "");
    const tl = t.toLowerCase();
    const q = String(query || "").toLowerCase().replace(/ /g, ""); // spaces optional
    if (!q) return { score: 0, indices: [] };
    const n = tl.length, m = q.length;
    if (m > n) return null;
    const NEG = -1e9;
    const isStart = (j) => j === 0 || WORD_SEP.test(t[j - 1]);
    // score[i][j] = best score matching q[0..i] with q[i] placed at text position j.
    const score = [], back = [];
    for (let i = 0; i < m; i++) { score.push(new Float64Array(n).fill(NEG)); back.push(new Int32Array(n).fill(-1)); }
    for (let i = 0; i < m; i++) {
        for (let j = i; j < n; j++) {
            if (tl[j] !== q[i]) continue;
            const charScore = 1 + (isStart(j) ? 6 : 0);
            if (i === 0) {
                score[i][j] = charScore - Math.min(j, 12) * 0.5; // prefer early starts
            } else {
                let best = NEG, bestK = -1;
                for (let k = i - 1; k < j; k++) {
                    if (score[i - 1][k] === NEG) continue;
                    let s = score[i - 1][k] + charScore;
                    if (k === j - 1) s += 8;                       // consecutive run
                    else s -= Math.min(j - k - 1, 12) * 0.5;       // gap penalty
                    if (s > best) { best = s; bestK = k; }
                }
                if (bestK < 0) continue;
                score[i][j] = best; back[i][j] = bestK;
            }
        }
    }
    let best = NEG, bestJ = -1;
    for (let j = m - 1; j < n; j++) if (score[m - 1][j] > best) { best = score[m - 1][j]; bestJ = j; }
    if (bestJ < 0) return null;
    const indices = [];
    for (let i = m - 1, j = bestJ; i >= 0 && j >= 0; i--) { indices.push(j); j = back[i][j]; }
    indices.reverse();
    return { score: best - tl.length * 0.05, indices };
}

function highlightIndices(label, indices) {
    const set = new Set(indices || []);
    let out = "";
    for (let i = 0; i < label.length; i++) {
        const c = esc(label[i]);
        out += set.has(i) ? `<mark>${c}</mark>` : c;
    }
    return out;
}

function highlight(label, q) {
    const m = fuzzyMatch(q, label);
    return m ? highlightIndices(label, m.indices) : esc(label);
}

function iconHTML(icon) {
    if (!icon) return "·";
    if (/^ti[- ]/.test(icon)) return `<i class="ti ${esc(icon)}"></i>`;
    return esc(icon);
}

function safeIcon(record) {
    try { return record.getIcon ? record.getIcon(false) : null; } catch (e) { return null; }
}

function parseDate(q) {
    if (!q || q.length < 2 || /^\d+$/.test(q)) return null; // bare numbers: too noisy
    try {
        return (typeof DateTime !== "undefined" && DateTime.parseDateTimeString)
            ? DateTime.parseDateTimeString(q) : null;
    } catch (e) { return null; }
}

function fmtDate(dt) {
    try {
        return dt.toDate().toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
        });
    } catch (e) { return "Open journal for date"; }
}
