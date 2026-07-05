/// <reference path="../../sdk/types.d.ts" />
// sidecar-search — replaces Cmd-K with a plugin-owned popup palette that also covers
// collections hidden from the native palette (show_cmdpal_items: false).
//
// Shortcut model (live-verified via plugins/cmdp-probe, 2026-07-05, web app):
// - We steal Cmd-K at window-capture BEFORE Thymer's handler (preventDefault +
//   stopImmediatePropagation suppresses the native palette).
// - Cmd+Shift+P is natively an alias of Cmd-K and we deliberately do NOT intercept it,
//   so it remains the escape hatch to the native palette (needed for collection
//   settings, which the SDK cannot navigate to — only 'edit_panel'/'overview' exist).
// - The "Open native palette" row works because Thymer's listener ignores isTrusted.
// - Suppression exists only while this plugin is loaded; if it crashes, Cmd-K reverts.
//
// UI is raw DOM appended to document.body — never touches editor content (DATA-LOSS
// DIRECTIVE: no editor DOM, no MutationObserver on body, no content rewriting).
//
// `export` works only in the esbuild dev/build loop; paste dist/plugin.js instead.

const CSS = `
.scs-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.35);
  display:flex;align-items:flex-start;justify-content:center;padding-top:12vh;}
.scs-palette{width:620px;max-width:92vw;max-height:62vh;display:flex;flex-direction:column;
  background:#1f2126;color:#e8e8ea;border:1px solid rgba(255,255,255,.09);
  border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.5);overflow:hidden;
  font-family:var(--font-sans,-apple-system,BlinkMacSystemFont,sans-serif);}
.scs-inputrow{display:flex;align-items:center;gap:8px;padding:12px 14px;
  border-bottom:1px solid rgba(255,255,255,.07);}
.scs-crumb{background:rgba(255,255,255,.1);border-radius:6px;padding:2px 8px;
  font-size:12px;white-space:nowrap;}
.scs-input{flex:1;background:transparent;border:none;outline:none;color:inherit;font-size:16px;}
.scs-list{overflow-y:auto;flex:1;padding:6px;}
.scs-head{font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;
  padding:8px 10px 2px;}
.scs-row{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;
  cursor:pointer;font-size:14px;}
.scs-row.scs-sel{background:rgba(94,129,244,.25);}
.scs-icon{width:20px;text-align:center;opacity:.8;flex:none;}
.scs-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.scs-label mark{background:transparent;color:#8ab4ff;font-weight:600;}
.scs-sub{opacity:.45;font-size:12px;flex:none;max-width:35%;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;}
.scs-badge{font-size:10px;border:1px solid rgba(255,255,255,.25);border-radius:4px;
  padding:0 5px;opacity:.6;flex:none;}
.scs-footer{padding:8px 14px;font-size:11px;opacity:.45;
  border-top:1px solid rgba(255,255,255,.07);}
.scs-empty{padding:18px;text-align:center;opacity:.5;font-size:13px;}
`;

const MAX_ITEM_ROWS = 50;
const MAX_PAGE_ROWS = 20;
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
        this._searchRows = [];
        this._searchToken = 0;
        this._debounce = null;
        this._prevFocus = null;
        this._cols = [];
        this._colRecords = new Map(); // colGuid -> PluginRecord[]
        this._recCol = new Map();     // recordGuid -> collection name

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
        const cols = await this.data.getAllCollections();
        if (!cols || !cols.length) return; // transient-empty after reload; keep old cache
        this._cols = cols.map((col) => {
            const conf = col.getConfiguration() || {};
            return {
                col,
                guid: col.getGuid(),
                name: col.getName() || "(unnamed)",
                itemName: conf.item_name || "page",
                icon: conf.icon || null,
                hidden: conf.show_cmdpal_items === false,
                views: (conf.views || []).filter((v) => v.shown !== false),
            };
        });
        // Record cache: powers sub-palette item lists and the collection label on
        // page results. Built in the background; UI works without it.
        for (const entry of this._cols) {
            entry.col.getAllRecords().then((records) => {
                this._colRecords.set(entry.guid, records || []);
                for (const r of records || []) this._recCol.set(r.guid, entry.name);
            }).catch(() => {});
        }
    }

    // ---------- open/close ----------

    _open() {
        if (this._overlay) return;
        this._prevFocus = document.activeElement;
        this._level = { mode: "root" };
        this._searchRows = [];
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
        this._crumb = document.createElement("span");
        this._crumb.className = "scs-crumb";
        this._crumb.style.display = "none";
        this._input = document.createElement("input");
        this._input.className = "scs-input";
        this._input.placeholder = "Search collections, views, pages…";
        this._input.addEventListener("input", () => {
            clearTimeout(this._debounce);
            this._debounce = setTimeout(() => this._render(), DEBOUNCE_MS);
        });
        this._input.addEventListener("keydown", (e) => this._onInputKey(e));
        inputRow.appendChild(this._crumb);
        inputRow.appendChild(this._input);

        this._list = document.createElement("div");
        this._list.className = "scs-list";

        const footer = document.createElement("div");
        footer.className = "scs-footer";
        footer.textContent =
            "↑↓ navigate · ↵ open · ↵ on collection = submenu · esc back/close · ⌘⇧P native palette (settings)";

        palette.appendChild(inputRow);
        palette.appendChild(this._list);
        palette.appendChild(footer);
        backdrop.appendChild(palette);
        document.body.appendChild(backdrop);
        this._overlay = backdrop;

        this._render();
        this._input.focus();
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
            if (row) row.action();
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
        this._searchRows = [];

        if (this._level.mode === "root" && q) {
            this.data.searchByQuery(q, SEARCH_LIMIT).then((res) => {
                if (token !== this._searchToken || !this._overlay) return;
                this._searchRows = this._rowsFromSearch(res);
                this._renderList(q);
            }).catch(() => {});
        }
        this._renderList(q);
    }

    _renderList(q) {
        const sections =
            this._level.mode === "root" ? this._rootSections(q)
            : this._level.mode === "collection" ? this._collectionSections(q)
            : this._createPickSections(q);

        this._crumb.style.display = this._level.mode === "root" ? "none" : "";
        this._crumb.textContent =
            this._level.mode === "collection" ? this._level.entry.name + " ›"
            : this._level.mode === "create-pick" ? "New page ›" : "";

        this._list.textContent = "";
        this._rows = [];
        for (const section of sections) {
            if (!section.rows.length) continue;
            if (section.title) {
                const head = document.createElement("div");
                head.className = "scs-head";
                head.textContent = section.title;
                this._list.appendChild(head);
            }
            for (const row of section.rows) {
                row.el = this._rowEl(row, q);
                const index = this._rows.length;
                row.el.addEventListener("mouseenter", () => this._select(index));
                row.el.addEventListener("click", () => row.action());
                this._list.appendChild(row.el);
                this._rows.push(row);
            }
        }
        if (!this._rows.length) {
            const empty = document.createElement("div");
            empty.className = "scs-empty";
            empty.textContent = q ? "No results" : "Loading…";
            this._list.appendChild(empty);
        }
        this._sel = 0;
        this._select(0);
    }

    _rowEl(row, q) {
        const el = document.createElement("div");
        el.className = "scs-row";
        const badge = row.badge ? `<span class="scs-badge">${esc(row.badge)}</span>` : "";
        const sub = row.sub ? `<span class="scs-sub">${esc(row.sub)}</span>` : "";
        el.innerHTML =
            `<span class="scs-icon">${iconHTML(row.icon)}</span>` +
            `<span class="scs-label">${row.noHighlight ? esc(row.label) : highlight(row.label, q)}</span>` +
            badge + sub;
        return el;
    }

    // ---------- sections per level ----------

    _rootSections(q) {
        const match = (s) => !q || (s || "").toLowerCase().includes(q.toLowerCase());
        const colRows = this._cols.filter((c) => match(c.name)).map((c) => ({
            label: c.name,
            icon: c.icon || "ti-database",
            badge: c.hidden ? "hidden" : null,
            action: () => this._enterCollection(c),
        }));

        const viewRows = [];
        if (q) {
            for (const c of this._cols) {
                for (const v of c.views) {
                    if (!match(v.label)) continue;
                    viewRows.push({
                        label: v.label,
                        icon: v.icon || "ti-layout-list",
                        sub: c.name,
                        action: () => this._openView(c.guid, v.id),
                    });
                }
            }
        }

        const actionRows = [];
        if (q) {
            actionRows.push({
                label: `New page “${q}”…`,
                icon: "ti-plus",
                noHighlight: true,
                action: () => { this._level = { mode: "create-pick", name: q }; this._input.value = ""; this._render(); },
            });
        }
        actionRows.push({
            label: "Open native palette (settings, commands…)",
            icon: "ti-command",
            noHighlight: true,
            action: () => this._openNativePalette(),
        });

        const sections = [{ title: "Collections", rows: colRows }];
        if (viewRows.length) sections.push({ title: "Views", rows: viewRows });
        for (const s of this._searchRows) sections.push(s);
        sections.push({ title: "Actions", rows: actionRows });
        return sections;
    }

    _rowsFromSearch(res) {
        if (!res || res.error) return [];
        // Native Cmd-K parity: title matches only (res.records). The lines channel
        // (body-text matches) exists but is deliberately unused — dropped by design
        // decision 2026-07-05.
        const pageRows = (res.records || []).slice(0, MAX_PAGE_ROWS).map((r) => ({
            label: r.getName() || "(untitled)",
            icon: safeIcon(r),
            sub: this._recCol.get(r.guid) || null,
            action: () => this._openRecord(r.guid),
        }));
        return pageRows.length ? [{ title: "Pages", rows: pageRows }] : [];
    }

    _collectionSections(q) {
        const entry = this._level.entry;
        const match = (s) => !q || (s || "").toLowerCase().includes(q.toLowerCase());

        const actionRows = [];
        if (match("open " + entry.name)) {
            actionRows.push({
                label: "Open " + entry.name,
                icon: entry.icon || "ti-database",
                noHighlight: true,
                action: () => this._openView(entry.guid, null),
            });
        }
        actionRows.push({
            label: q ? `New ${entry.itemName} “${q}” in ${entry.name}`
                     : `New ${entry.itemName} in ${entry.name}`,
            icon: "ti-plus",
            noHighlight: true,
            action: () => this._createRecord(entry, q || null),
        });

        const viewRows = entry.views.filter((v) => match(v.label)).map((v) => ({
            label: v.label,
            icon: v.icon || "ti-layout-list",
            action: () => this._openView(entry.guid, v.id),
        }));

        const records = this._colRecords.get(entry.guid) || [];
        const itemRows = records
            .filter((r) => match(r.getName()))
            .slice(0, MAX_ITEM_ROWS)
            .map((r) => ({
                label: r.getName() || "(untitled)",
                icon: safeIcon(r),
                action: () => this._openRecord(r.guid),
            }));

        return [
            { title: null, rows: actionRows },
            { title: "Views", rows: viewRows },
            { title: "Items", rows: itemRows },
        ];
    }

    _createPickSections(q) {
        const match = (s) => !q || (s || "").toLowerCase().includes(q.toLowerCase());
        const name = this._level.name;
        return [{
            title: `Create “${name}” in…`,
            rows: this._cols.filter((c) => match(c.name)).map((c) => ({
                label: c.name,
                icon: c.icon || "ti-database",
                badge: c.hidden ? "hidden" : null,
                action: () => this._createRecord(c, name),
            })),
        }];
    }

    _enterCollection(entry) {
        this._level = { mode: "collection", entry };
        this._input.value = "";
        // Refresh this collection's items so the sub-palette isn't stale.
        entry.col.getAllRecords().then((records) => {
            this._colRecords.set(entry.guid, records || []);
            for (const r of records || []) this._recCol.set(r.guid, entry.name);
            if (this._overlay && this._level.mode === "collection" && this._level.entry === entry) {
                this._render();
            }
        }).catch(() => {});
        this._render();
    }

    // ---------- actions ----------

    async _targetPanel() {
        const panels = (this.ui.getPanels() || []).filter((p) => !p.isSidebar());
        let panel = panels.find((p) => p.isActive()) || panels[0];
        if (!panel) panel = await this.ui.createPanel();
        return panel;
    }

    async _openRecord(guid) {
        this._close();
        const panel = await this._targetPanel();
        if (!panel) return;
        panel.navigateTo({
            type: "edit_panel", rootId: guid, subId: null,
            workspaceGuid: this.getWorkspaceGuid(),
        });
        this.ui.setActivePanel(panel);
    }

    async _openView(colGuid, viewId) {
        this._close();
        const panel = await this._targetPanel();
        if (!panel) return;
        panel.navigateTo({
            type: "overview", rootId: colGuid, subId: viewId || null,
            workspaceGuid: this.getWorkspaceGuid(),
        });
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

    _openNativePalette() {
        this._close();
        setTimeout(() => {
            const synth = new KeyboardEvent("keydown", {
                key: "k", code: "KeyK", keyCode: 75, which: 75,
                metaKey: true, bubbles: true, cancelable: true,
            });
            (document.activeElement || document.body).dispatchEvent(synth);
        }, 50);
    }
}

// ---------- helpers ----------

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function highlight(label, q) {
    const safe = esc(label);
    if (!q) return safe;
    const idx = safe.toLowerCase().indexOf(esc(q).toLowerCase());
    if (idx < 0) return safe;
    const end = idx + esc(q).length;
    return safe.slice(0, idx) + "<mark>" + safe.slice(idx, end) + "</mark>" + safe.slice(end);
}

function iconHTML(icon) {
    if (!icon) return "·";
    if (/^ti[- ]/.test(icon)) return `<i class="ti ${esc(icon)}"></i>`;
    return esc(icon);
}

function safeIcon(record) {
    try { return record.getIcon ? record.getIcon(false) : null; } catch (e) { return null; }
}

