/// <reference path="../../sdk/types.d.ts" />
// sidecar-search — replaces Cmd-K AND Cmd-P with a plugin-owned popup palette that also
// covers collections hidden from the native palette (show_cmdpal_items: false).
//
// v2: native-palette parity per native-palette-spec.md (CDP-observed 2026-07-05):
// fuzzy subsequence matching in one ranked list, inline action rows (Open Collection /
// New <item> / Settings / Search-all-text / Create-in), native submenu ordering with
// "Back", Shift+Enter → other panel, date queries → journal jump row, "Open Today's
// Journal". Tags pseudo-collection is NOT replicated (no SDK hashtag enumeration).
//
// v3: "> command mode" (Cmd-P) implemented natively — see native-palette-spec.md's
// command-mode section for the observed native spec and README.dev.md for the build
// history. The command catalog is context-built by the app at palette open, so we
// read it live rather than hardcoding. Architecture (learned the hard way — the
// pitfalls below are all real):
//   - ONE kept-alive native palette per command-mode session (this._nativePal),
//     opened via a SINGLE synthetic ⌘P. Repeated/retried ⌘P desync the palette's
//     open/close toggle into a wedged empty-catalog state, so we open exactly once
//     and only ever destroy() to close (node.remove() desyncs the component too).
//   - The palette is hidden with opacity:0, NOT visibility:hidden — a
//     visibility:hidden element can't focus its own input, and that self-focus is
//     what lets us locate the palette component (via the app's g_focusedComponent →
//     tree walk) in ~5ms instead of a ~1s fallback walk. opacity:0 hides it just as
//     completely while keeping it focusable, so there is no native-palette flash.
//   - Rendering + ranking read the live palette's categoryFilters/staticOptions and
//     run through the app's own window.fuzzysort with the same keys/scoreFactor/
//     cutoff pipeline — identical results and sorting by construction (0/12 parity).
//   - Executing a command calls the palette's own confirmOptionEx(optionObject) —
//     the app's real dispatch path — matching the option by field (value+label+
//     category+json; the palette rebuilds option objects per search so identity
//     won't hold). If the palette is still open ~180ms after confirm, the command
//     opened a follow-up widget (Set Theme, Display Name, Move..., New Page in...):
//     we lift the veil and hand the real native follow-up UI to the user in place.
//
// Shortcut model (live-verified via plugins/cmdp-probe, 2026-07-05, web app):
// - We steal the jump/command shortcuts at window-capture BEFORE Thymer's handler
//   (preventDefault + stopImmediatePropagation suppresses the native palette).
// - Both bindings are user-configurable via the plugin Configuration tab
//   ("custom": {"jumpShortcut": "Mod+K", "commandShortcut": "Mod+P"}); "Mod" is Cmd
//   on macOS, Ctrl elsewhere. Unparseable values fall back to the defaults. Moving
//   a binding off ⌘K/⌘P hands that key back to the native palette automatically
//   (we simply stop swallowing it). Parsing adapted from parham-shafti/
//   thymer-reference-extravaganza (MIT).
// - Cmd+Shift+P is natively an alias of Cmd-K and we deliberately do NOT intercept it,
//   so it remains the escape hatch to the native palette. While a VISIBLE native
//   palette is open, we don't intercept anything.
// - Suppression exists only while this plugin is loaded; if it crashes, both revert.
//
// Native surfaces the SDK doesn't document but reaches anyway (CDP-verified 2026-07-05
// by reading panel.getNavigation()): Search panel = navigateTo({type:'search_panel',
// state:{searchQuery}}); collection Settings = navigateTo({type:'collection_settings',
// rootId:<colGuid>}). These replaced the old palette-driving synthetic routes, so no
// native modal flashes on the way to the target.
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
/* > command mode extras (metrics probed from the native classes at open; the literals
   are fallbacks): 5px divider slots, 30px labeled heading rows, the settings user
   card, and shortcut text. */
.scs-cdiv{height:var(--scs-cdiv-height,5px);margin:var(--scs-cdiv-margin,0 10px 0 5px);
  border-top:var(--scs-cdiv-border,1px solid rgba(255,255,255,.08));box-sizing:border-box;}
.scs-chdr{display:flex;align-items:center;gap:8px;margin:0 5px;
  padding:var(--scs-chdr-padding,5px 10px);font-size:var(--scs-chdr-fontsize,12px);
  color:var(--scs-chdr-color,inherit);opacity:var(--scs-chdr-opacity,.55);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.scs-chtml{margin:0 5px;}
.scs-ckbd{flex:none;font-size:var(--scs-kbd-fontsize,14px);
  color:var(--scs-kbd-color,inherit);opacity:var(--scs-kbd-opacity,.6);white-space:nowrap;}
/* Native "No results" is a non-selectable row with the normal option layout
   (empty icon slot + left-aligned label), not a dimmed/centered message. */
.scs-noresults{display:flex;align-items:center;gap:8px;padding:5px 10px;
  margin:0 5px;font-size:14px;cursor:default;}
.scs-noresults .scs-icon{flex:none;min-width:16px;}
.scs-noresults .scs-label{flex:1;}
/* Veil that hides the native palette while we drive it. opacity:0 (NOT
   visibility:hidden) is deliberate: a visibility:hidden element can't receive focus,
   which stops the native palette from focusing its own input on open — and that
   focus is what lets us locate its component in ~5ms instead of a ~1s tree-walk.
   opacity:0 hides it just as completely while keeping it focusable. Scoped under a
   class on <html> so a crash/unload can't leave the app veiled (removed in onUnload). */
html.scs-cmdveil .cmdpal--dialog{opacity:0 !important;pointer-events:none !important;}
`;

const MAX_RESULTS = 40;
const SEARCH_LIMIT = 100;
const DEBOUNCE_MS = 120;
const JUMP_PLACEHOLDER = "Search a doc name, date, user, or command...";
const CMD_PLACEHOLDER = "Search a command...";
const VEIL_CLASS = "scs-cmdveil";
// Native palette waits: catalog is ready ~7ms after a synthetic ⌘P; these are
// generous upper bounds, not expected latencies.
const NATIVE_FOLLOWUP_WAIT_MS = 180;
const DYN_ALLOW_LIMIT = 500; // per dynamic view, when resolving its member records
// New records aren't immediately readable after createRecord (see memory:
// thymer-sdk-write-read-model) — poll before navigating.
const CREATE_POLL_MS = 50;
const CREATE_POLL_TRIES = 160;
// Configurable global bindings (plugin Configuration tab → "custom"). "Mod" = Cmd on
// macOS, Ctrl elsewhere. A binding must include Cmd/Ctrl or Alt so a bad config can't
// hijack plain typing; anything unparseable falls back to these defaults.
const DEFAULT_JUMP_SHORTCUT = "Mod+K";
const DEFAULT_CMD_SHORTCUT = "Mod+P";
const IS_MAC = /Mac|iP(hone|ad|od)/.test(
    // navigator.platform is deprecated but is the only signal on Safari/Firefox
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator["platform"] || ""
);

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
        this._dynAllowRecs = new Set(); // record guids rescued by a visible dynamic view
        this._dynAllowCols = new Set(); // collection guids fully rescued ("*" = all)
        this._nativePal = null;       // kept-alive veiled native palette (command mode)
        this._appRoot = null;         // cached app-root component (palette tree walk)
        this._opening = false;        // command-mode open in flight (before overlay)

        const cust = (this.getConfiguration() || {}).custom || {};
        this._jumpHotkey = this._parseShortcut(cust.jumpShortcut) ||
            this._parseShortcut(DEFAULT_JUMP_SHORTCUT);
        this._cmdHotkey = this._parseShortcut(cust.commandShortcut) ||
            this._parseShortcut(DEFAULT_CMD_SHORTCUT);

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
        document.documentElement.classList.remove(VEIL_CLASS); // never leave the app veiled
        window.removeEventListener("keydown", this._keyHandler, true);
    }

    // ---------- global keyboard ----------

    // "Mod+Shift+K" → exact modifier flags + key, or null if unusable. "Mod" = Cmd on
    // macOS, Ctrl elsewhere. Adapted from thymer-reference-extravaganza (MIT).
    _parseShortcut(str) {
        if (!str || typeof str !== "string") return null;
        const h = { meta: false, ctrl: false, shift: false, alt: false, key: null, code: null };
        for (const p of str.split("+").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
            if (p === "mod") { if (IS_MAC) h.meta = true; else h.ctrl = true; }
            else if (p === "cmd" || p === "meta" || p === "super" || p === "win") h.meta = true;
            else if (p === "ctrl" || p === "control") h.ctrl = true;
            else if (p === "shift") h.shift = true;
            else if (p === "alt" || p === "option" || p === "opt") h.alt = true;
            else {
                if (h.key) return null; // two non-modifier parts
                h.key = p;
                if (/^[a-z]$/.test(p)) h.code = "Key" + p.toUpperCase();
                else if (/^[0-9]$/.test(p)) h.code = "Digit" + p;
            }
        }
        if (!h.key) return null;
        if (!h.meta && !h.ctrl && !h.alt) return null;
        return h;
    }

    // Exact-modifier match; prefer e.code (keyboard-layout-stable) over e.key.
    _matchesHotkey(e, h) {
        if (!h) return false;
        if (!!e.metaKey !== h.meta || !!e.ctrlKey !== h.ctrl ||
            !!e.altKey !== h.alt || !!e.shiftKey !== h.shift) return false;
        if (h.code) return e.code === h.code;
        return (e.key || "").toLowerCase() === h.key;
    }

    _onGlobalKey(e) {
        if (!e.isTrusted) return; // never react to our own synthetic dispatches
        const key = (e.key || "").toLowerCase();
        const isJump = this._matchesHotkey(e, this._jumpHotkey);
        const isCmdMode = !isJump && this._matchesHotkey(e, this._cmdHotkey);
        if (isJump || isCmdMode) {
            // A VISIBLE native palette (opened via ⌘⇧P, the escape hatch) keeps its
            // own ⌘K/⌘P handling — ours is only for the veiled instance we drive.
            if (!this._overlay && document.querySelector(".cmdpal--dialog")) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            const inCmd = this._level.mode === "cmd-root" || this._level.mode === "cmd-cat";
            if (isJump) {
                // Native: ⌘K closes an open @ palette, switches a > palette to @.
                if (!this._overlay) this._open();
                else if (inCmd) this._switchToJumpMode();
                else this._close();
            } else {
                // Native: ⌘P closes an open > palette, switches an @ palette to >.
                if (!this._overlay) this._open("commands");
                else if (inCmd) this._close();
                else this._switchToCommandMode("");
            }
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
        if (this._level.mode === "cmd-cat") {
            this._level = { mode: "cmd-root" };
            if (this._input) this._input.value = "";
            this._render();
        } else if (this._level.mode === "root" || this._level.mode === "cmd-root") {
            // Native Esc semantics: > root closes outright (no fallback to @ mode).
            this._close();
        } else {
            this._level = { mode: "root" };
            if (this._input) this._input.value = "";
            this._render();
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
        const fetches = [];
        for (const entry of this._cols) {
            if (entry.isDynamic) continue;
            fetches.push(entry.col.getAllRecords().then((records) => {
                this._colRecords.set(entry.guid, records || []);
                for (const r of records || []) this._recCol.set(r.guid, entry);
            }).catch(() => {}));
        }
        // Needs _recCol populated to attribute query hits to source collections.
        Promise.all(fetches).then(() => this._rebuildDynAllow());
    }

    // show_cmdpal_items: a hidden collection's records stay out of the palette
    // UNLESS a view of a NON-hidden dynamic collection includes them — the dynamic
    // collection's flag overrides its sources'. Views define membership as
    // source_collections (guids or "*") + a search query; a view with no query
    // holds every record of its sources.
    async _rebuildDynAllow() {
        const allowRecs = new Set();
        const allowCols = new Set();
        const jobs = [];
        for (const c of this._cols) {
            if (!c.isDynamic || c.hidden) continue;
            for (const v of c.views) {
                const srcs = v.source_collections || ["*"];
                if (!v.query) {
                    for (const s of srcs) allowCols.add(s);
                    continue;
                }
                jobs.push(this.data.searchByQuery(v.query, DYN_ALLOW_LIMIT).then((res) => {
                    for (const r of (res && !res.error && res.records) || []) {
                        const col = this._recCol.get(r.guid);
                        if (srcs.includes("*") || (col && srcs.includes(col.guid))) {
                            allowRecs.add(r.guid);
                        }
                    }
                }).catch(() => {}));
            }
        }
        await Promise.all(jobs);
        this._dynAllowRecs = allowRecs;
        this._dynAllowCols = allowCols;
        if (this._overlay) this._render();
    }

    _recVisible(recGuid, colEntry) {
        if (!colEntry || !colEntry.hidden) return true;
        if (this._dynAllowCols.has("*") || this._dynAllowCols.has(colEntry.guid)) return true;
        return this._dynAllowRecs.has(recGuid);
    }

    _creatable() {
        return this._cols.filter((c) => !c.isJournal && !c.isDynamic);
    }

    // ---------- open/close ----------

    _open(mode) {
        if (this._overlay || this._opening) return;
        this._prevFocus = document.activeElement;
        // Cache the app root now, while focus is still in the app (a real component),
        // so command-mode palette lookups work regardless of later focus moves.
        this._cacheAppRoot();
        this._level = { mode: mode === "commands" ? "cmd-root" : "root" };
        this._searchRecs = [];
        this._refreshCollections();
        // Command mode: open the kept-alive native palette in the background (its
        // catalog powers our render). Mark _opening so the async open isn't cancelled
        // before our overlay exists. Re-render + focus when it lands (~15 ms); the
        // first render shows Loading.
        if (mode === "commands") {
            this._opening = true;
            this._ensureNativePal().then(() => {
                this._opening = false;
                if (this._overlay && (this._level.mode === "cmd-root" || this._level.mode === "cmd-cat")) {
                    this._render();
                    if (this._input) this._input.focus();
                }
            });
        }

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
        this._input.placeholder = JUMP_PLACEHOLDER;
        this._input.addEventListener("input", () => {
            // ">" as first char in @ mode switches to command mode (the char is
            // consumed, the rest stays as the query) — native behavior. The reverse
            // ("@" typed in > mode) is literal text in native, so no special-casing.
            if (this._level.mode === "root" && this._input.value.startsWith(">")) {
                this._switchToCommandMode(this._input.value.slice(1));
                return;
            }
            if (this._level.mode === "cmd-root" || this._level.mode === "cmd-cat") {
                // Command filtering is an in-memory fuzzysort pass — render per
                // keystroke like native, no debounce.
                this._render();
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

        this._footer = document.createElement("div");
        this._footer.className = "scs-footer";
        this._footer.textContent =
            "↑↓ Navigate · ↵ Select · ⇧↵ Use other panel · Esc Back/Close · ⌘⇧P Native palette";

        palette.appendChild(inputRow);
        palette.appendChild(this._list);
        palette.appendChild(this._footer);
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
            '<span class="autocomplete--option-right"><span class="autocomplete--kbd">' +
            '<span class="kbdmod kbdmod-mac">⌘</span>K</span></span>' +
            "</div>" +
            '<div class="autocomplete--divider autocomplete--empty"></div>' +
            '<div class="autocomplete-divider-heading autocomplete--empty">' +
            '<span class="autocomplete--option-label">x</span></div>' +
            "</div></div>";
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
            // Command-mode chrome: divider slot, heading rows, shortcut text — read
            // whatever the active theme paints the native classes.
            const cdiv = cs(".autocomplete--divider");
            if (cdiv) {
                if (cdiv.height) out["--scs-cdiv-height"] = cdiv.height;
                if (cdiv.margin) out["--scs-cdiv-margin"] = cdiv.margin;
                if (cdiv.borderTopWidth && cdiv.borderTopWidth !== "0px") {
                    out["--scs-cdiv-border"] =
                        `${cdiv.borderTopWidth} ${cdiv.borderTopStyle} ${cdiv.borderTopColor}`;
                }
            }
            const chdr = cs(".autocomplete-divider-heading");
            if (chdr) {
                put("--scs-chdr-color", chdr.color);
                if (chdr.fontSize) out["--scs-chdr-fontsize"] = chdr.fontSize;
                if (chdr.padding) out["--scs-chdr-padding"] = chdr.padding;
                if (chdr.opacity) out["--scs-chdr-opacity"] = chdr.opacity;
            }
            const ckbd = cs(".autocomplete--kbd");
            if (ckbd) {
                put("--scs-kbd-color", ckbd.color);
                if (ckbd.fontSize) out["--scs-kbd-fontsize"] = ckbd.fontSize;
                if (ckbd.opacity) out["--scs-kbd-opacity"] = ckbd.opacity;
            }
        } catch (e) { /* fall back to CSS literals */ }
        box.remove();
        return out;
    }

    _close(opts) {
        const keepNative = !!(opts && opts.keepNative);
        this._opening = false; // cancel any in-flight command-mode open
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
        this._footer = null;
        this._rows = [];
        const prev = this._prevFocus;
        this._prevFocus = null;
        // Cancel any in-flight command-mode open. Do this AFTER clearing _overlay so
        // a still-polling _ensureNativePal sees no overlay and self-aborts.
        this._opening = false;
        if (keepNative) return; // command execution owns the palette + focus handoff
        // Tear down the kept-alive native palette and lift the veil (also covers a
        // mid-open palette: _ensureNativePal's poll aborts when the overlay is gone,
        // and this destroys whatever is currently open).
        if (this._nativePal || document.documentElement.classList.contains(VEIL_CLASS)) {
            this._teardownNativePal();
        }
        if (prev && prev.isConnected) {
            try { prev.focus(); } catch (e) { /* focus is best-effort */ }
        }
    }

    // ---------- command-mode backend (one kept-alive native palette per session) ----
    //
    // The command catalog only lives inside a native-palette instance, which the app
    // assembles from the current editor/panel context at open (~10 ms to populate) —
    // reading it requires a real, open palette. We open ONE veiled native palette when
    // command mode is entered and keep it alive for the whole session: rendering reads
    // its live staticOptions/categoryFilters, and executing a command calls its own
    // confirmOptionEx. On close we destroy it. Learned the hard way (see README.dev):
    // a SINGLE synthetic ⌘P per session is reliable; repeated ⌘P (retries/toggles)
    // desync the palette into a wedged empty-catalog state, and node.remove() desyncs
    // its component — so we open exactly once and only ever destroy() to close.

    _setVeil(on) {
        document.documentElement.classList.toggle(VEIL_CLASS, !!on);
    }

    // The app's focused component. Belt-and-suspenders across realms: prefer the app
    // window that owns our document, fall back to our own globalThis.
    _gfc() {
        try {
            const w = document.defaultView;
            if (w && w.g_focusedComponent) return w.g_focusedComponent;
        } catch (e) { /* cross-realm access can throw */ }
        return (typeof globalThis !== "undefined" && globalThis.g_focusedComponent) || null;
    }

    _climbRoot(comp) {
        if (!comp) return null;
        let root = comp, guard = 0;
        while (root.parent && guard++ < 200) root = root.parent;
        return root;
    }

    _cacheAppRoot() {
        const root = this._climbRoot(this._gfc());
        if (root) this._appRoot = root;
    }

    // Locate the LIVE native palette component for an open .cmdpal--dialog. Its DOM
    // node has no back-reference to its component, so we DFS the component tree from
    // a root climbed fresh from g_focusedComponent (the just-opened palette is the
    // focused component during our flows), falling back to a cached root. Destroyed
    // components whose nodes linger are skipped.
    _findNativePal() {
        const dialogs = [...document.querySelectorAll(".cmdpal--dialog")];
        if (!dialogs.length) return null;
        const roots = [];
        const fresh = this._climbRoot(this._gfc());
        if (fresh) { roots.push(fresh); this._appRoot = fresh; }
        if (this._appRoot && this._appRoot !== fresh) roots.push(this._appRoot);
        for (const root of roots) {
            const stack = [root];
            while (stack.length) {
                const comp = stack.pop();
                if (!comp) continue;
                if (!comp._destroyed && dialogs.includes(comp.node)) return comp;
                if (comp.children) for (const ch of comp.children) stack.push(ch);
            }
        }
        return null;
    }

    // Close the native palette by its own destroy() — its Esc/cancel path ignores
    // untrusted key events, and node.remove() desyncs the component (leaving it
    // "open" so the next ⌘P toggles it closed), so destroy() is the only safe close.
    _destroyPal(pal) {
        const target = pal || (this._nativePal && !this._nativePal._destroyed ? this._nativePal : null) || this._findNativePal();
        if (target && !target._destroyed && typeof target.destroy === "function"
                && target.node && target.node.isConnected) {
            try { target.destroy(); } catch (e) { /* best-effort */ }
        }
    }

    _nativeAC() {
        const p = this._nativePal;
        return (p && !p._destroyed && p.node && p.node.isConnected && p.autocomplete
            && (p.autocomplete.staticOptions || []).length) ? p.autocomplete : null;
    }

    // Ensure a single veiled native command palette is open and populated, stored on
    // this._nativePal. Idempotent — reused across renders and executions in a session.
    // ONE synthetic ⌘P (Thymer ignores isTrusted); if a stray palette is already open
    // we destroy it first so our ⌘P opens fresh rather than toggling it closed.
    async _ensureNativePal() {
        if (this._nativeAC()) return this._nativePal;
        this._nativePal = null;
        // Close any stray dialog cleanly before opening (destroy, wait for detach).
        for (let i = 0; i < 12 && document.querySelector(".cmdpal--dialog"); i++) {
            this._destroyPal(this._findNativePal());
            await new Promise((resolve) => setTimeout(resolve, 15));
        }
        if (!this._overlayOrOpening()) return null;
        // Veil up front (opacity:0 keeps the palette invisible AND focusable, so it
        // still focuses its own input on open — which is what makes _findNativePal
        // locate it in ~5 ms). No flash: the palette is hidden from the first paint.
        this._setVeil(true);
        document.body.dispatchEvent(new KeyboardEvent("keydown", {
            key: "p", code: "KeyP", keyCode: 80, which: 80,
            metaKey: true, bubbles: true, cancelable: true,
        }));
        const deadline = Date.now() + 1500;
        while (Date.now() < deadline) {
            if (!this._overlayOrOpening()) { this._destroyPal(this._findNativePal()); this._setVeil(false); return null; }
            const pal = this._findNativePal();
            if (pal && pal.autocomplete && (pal.autocomplete.staticOptions || []).length) {
                this._nativePal = pal;
                if (this._input) this._input.focus(); // opening it moved focus; take it back
                return pal;
            }
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        this._destroyPal(this._findNativePal());
        this._setVeil(false);
        return null;
    }

    _overlayOrOpening() {
        return !!this._overlay || this._opening;
    }

    // Tear down the kept-alive palette and lift the veil (unless a follow-up widget
    // is being handed to the user, in which case the caller keeps it visible).
    _teardownNativePal() {
        const pal = this._nativePal;
        this._nativePal = null;
        this._destroyPal(pal);
        this._setVeil(false);
    }

    // Execute a command on the kept-alive palette via its own confirmOptionEx (takes
    // the option object directly — no query typing, no ac.results race). The option is
    // matched by field in staticOptions. If the palette is still open ~180 ms after
    // confirm, the command opened a follow-up widget (theme picker, rename input,
    // move/new-page picker) — unveil and hand the native dialog to the user.
    async _execCommand(optSnap, otherPanel) {
        const prev = this._prevFocus;
        const pal = this._nativePal;
        const ac = this._nativeAC();
        this._close({ keepNative: true }); // tear down our overlay; keep the palette
        if (!ac || typeof ac.confirmOptionEx !== "function") { this._teardownNativePal(); this._restoreFocus(prev); return; }
        const opt = (ac.staticOptions || []).find((o) => optMatches(o, optSnap));
        if (!opt) { this._teardownNativePal(); this._restoreFocus(prev); return; }
        try {
            ac.confirmOptionEx(opt, { shiftKey: !!otherPanel, preventDefault() {}, stopPropagation() {} });
        } catch (e) { this._teardownNativePal(); this._restoreFocus(prev); return; }
        await new Promise((resolve) => setTimeout(resolve, NATIVE_FOLLOWUP_WAIT_MS));
        this._nativePal = null;
        if (pal && pal.node && pal.node.isConnected) {
            // Follow-up widget: unveil and hand the native dialog over.
            this._setVeil(false);
            const inp = pal.node.querySelector(".cmdpal--input");
            if (inp) { try { inp.focus(); } catch (e) { /* best-effort */ } }
        } else {
            this._setVeil(false);
            this._restoreFocus(prev);
        }
    }

    _restoreFocus(prev) {
        if (prev && prev.isConnected) {
            try { prev.focus(); } catch (e) { /* best-effort */ }
        }
    }

    // ---------- mode switching (@ ↔ >) ----------

    _switchToCommandMode(query) {
        if (!this._overlay) return;
        this._level = { mode: "cmd-root" };
        this._input.value = query || "";
        this._render();
        // Reuse the kept-alive palette if present, else open it now.
        if (!this._nativeAC()) {
            this._opening = true;
            this._ensureNativePal().then(() => {
                this._opening = false;
                if (this._overlay && (this._level.mode === "cmd-root" || this._level.mode === "cmd-cat")) {
                    this._render();
                    if (this._input) this._input.focus();
                }
            });
        }
    }

    _switchToJumpMode() {
        if (!this._overlay) return;
        this._level = { mode: "root" };
        this._input.value = "";
        this._render();
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
        } else if (e.key === "Backspace" && !this._input.value
                && this._level.mode !== "root"
                && this._level.mode !== "cmd-root" && this._level.mode !== "cmd-cat") {
            // Backspace-on-empty goes back only in @ submenus; the native > mode
            // does nothing on it (live-verified), so neither do we.
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
        const isCmd = this._level.mode === "cmd-root" || this._level.mode === "cmd-cat";
        const entries =
            this._level.mode === "root" ? (q ? this._rootQueryEntries(q) : this._rootEmptyEntries())
            : this._level.mode === "cmd-root" ? (q ? this._cmdSearchEntries(q) : this._cmdRootEmptyEntries())
            : this._level.mode === "cmd-cat" ? this._cmdCatEntries(q)
            : this._level.mode === "collection" ? this._collectionEntries(q)
            : this._createPickEntries(q);

        // Mode chrome, matching native: '>' indicator, command placeholder, and NO
        // footer in command mode (native hides its status bar there).
        this._searchtype.textContent = isCmd ? ">" : "@";
        this._input.placeholder = isCmd ? CMD_PLACEHOLDER : JUMP_PLACEHOLDER;
        this._footer.style.display = isCmd ? "none" : "";

        this._crumb.style.display =
            (this._level.mode === "collection" || this._level.mode === "create-pick") ? "" : "none";
        this._crumb.textContent =
            this._level.mode === "collection" ? this._level.entry.name + " ›"
            : this._level.mode === "create-pick" ? "New page ›" : "";

        this._list.textContent = "";
        this._rows = [];
        let defaultSel = 0;
        for (const entry of entries) {
            if (entry.divider || entry.divider5) {
                const div = document.createElement("div");
                div.className = entry.divider5 ? "scs-cdiv" : "scs-divider";
                this._list.appendChild(div);
                continue;
            }
            if (entry.hdr != null) {
                // Labeled heading row (native autocomplete-divider-heading):
                // "Change into", "Insert", "Workspace (...)", the doc-name header.
                const div = document.createElement("div");
                div.className = "scs-chdr";
                div.innerHTML =
                    (entry.icon ? `<span class="scs-icon">${iconHTML(entry.icon)}</span>` : "") +
                    `<span>${esc(entry.hdr)}</span>`;
                this._list.appendChild(div);
                continue;
            }
            if (entry.html != null) {
                // App-generated inert header markup (the settings user card).
                const div = document.createElement("div");
                div.className = "scs-chtml";
                div.innerHTML = entry.html;
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
            const isCmd = this._level.mode === "cmd-root" || this._level.mode === "cmd-cat";
            const empty = document.createElement("div");
            if (isCmd && !this._nativeAC()) {
                // Catalog still loading (~100 ms). Show an empty list (just the palette
                // chrome) rather than a "Loading" flash, so it fills in like native.
                empty.className = "scs-empty";
                empty.textContent = "";
            } else if (isCmd && q) {
                // Native: a non-selectable option-layout row (empty icon + label).
                empty.className = "scs-noresults";
                empty.innerHTML = '<span class="scs-icon"></span><span class="scs-label">No results</span>';
            } else {
                empty.className = "scs-empty";
                empty.textContent = q ? "No results" : "Loading…";
            }
            this._list.appendChild(empty);
        }
        this._select(Math.min(defaultSel, Math.max(0, this._rows.length - 1)));
    }

    _rowEl(row, q) {
        const el = document.createElement("div");
        el.className = "scs-row";
        const label = row.labelHTML != null
            ? row.labelHTML
            : row.indices
            ? highlightIndices(row.label, row.indices)
            : (row.noHighlight ? esc(row.label) : highlight(row.label, q));
        const parts = [
            // Command rows keep an empty icon slot for alignment (native does the
            // same); @ rows keep their "·" placeholder.
            `<span class="scs-icon">${row.icon || !row.blankIcon ? iconHTML(row.icon) : ""}</span>`,
            `<span class="scs-label">${label}</span>`,
        ];
        if (row.subHTML) parts.push(`<span class="scs-sub">${row.subHTML}</span>`);
        else if (row.sub) parts.push(`<span class="scs-sub">${esc(row.sub)}</span>`);
        if (row.kbdHTML) parts.push(`<span class="scs-ckbd">${row.kbdHTML}</span>`);
        else if (row.shortcut) parts.push(`<span class="scs-key">${esc(row.shortcut)}</span>`);
        if (row.arrow) parts.push(`<span class="scs-arrow">→</span>`);
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
            action: () => this._switchToCommandMode(""),
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
                if (!this._recVisible(r.guid, colEntry)) continue;
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
            if (!this._recVisible(r.guid, colEntry)) continue;
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

        const records = (this._colRecords.get(entry.guid) || [])
            .filter((r) => this._recVisible(r.guid, entry));
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

    // ---------- > command mode entries (rendered from the live native palette) ------

    // The kept-alive palette's catalog, shaped like the old snapshot ({filters,
    // options}) so the render code below is unchanged. Null until the palette opens.
    _liveCat() {
        const ac = this._nativeAC();
        if (!ac) return null;
        return { filters: ac.categoryFilters || [], options: ac.staticOptions || [] };
    }

    // Root, empty query: category rows (with their dividers) in filter order, then
    // every option whose category has no submenu filter (the flat insert/edit
    // sections), in catalog order, rendering headings and dividers.
    _cmdRootEmptyEntries() {
        const cat = this._liveCat();
        if (!cat) return [];
        const entries = [];
        const catValues = new Set();
        for (const f of cat.filters || []) {
            if (f.type === ":cat:div") { entries.push({ divider5: true }); continue; }
            if (f.type !== ":cat") continue;
            catValues.add(f.value);
            entries.push(this._cmdCatRow(f, null));
        }
        for (const o of cat.options || []) {
            if (o.category && catValues.has(o.category)) continue;
            if (o.showOnlyWhenSearching) continue;
            const entry = this._cmdOptEntry(o, null);
            if (entry) entries.push(entry);
        }
        return entries;
    }

    // Search: the native pipeline, run with the app's own fuzzysort — category rows
    // matched on [label, tag] and kept in front; options matched on
    // [label, tag, _normalizedLabel] with per-option scoreFactor; weak matches
    // (score < -60000) dropped; equal scores tie-broken alphabetically.
    _cmdSearchEntries(q) {
        const cat = this._liveCat();
        const fz = appFuzzysort();
        if (!cat || !fz) return [];
        const filters = (cat.filters || []).filter((f) => f.type === ":cat");
        const catRes = fz.go(q, filters, { keys: ["label", "tag"] });
        const opts = (cat.options || []).filter((o) => !o.pinned);
        const optRes = fz.go(q, opts, {
            keys: ["label", "tag", "_normalizedLabel"],
            scoreFn: cmdScoreFn,
        }).filter(cmdScoreCutoff);
        const all = [...catRes, ...optRes];
        // Stable sort: keeps category rows in front and score order intact; only
        // equal scores reorder (alphabetically by normalized label) — like native.
        all.sort((a, b) => a.score !== b.score
            ? 0
            : normLabel(a.obj && a.obj.label).localeCompare(normLabel(b.obj && b.obj.label)));
        const entries = [];
        for (const r of all) {
            const o = r.obj;
            if (!o) continue;
            if (o.type === ":cat") { entries.push(this._cmdCatRow(o, r)); continue; }
            if (o.hideWhenSearching || o.type === ":hdr") continue;
            const entry = this._cmdOptEntry(o, r);
            if (entry && entry.action) entries.push(entry); // headings/dividers can't match
        }
        for (const o of (cat.options || []).filter((x) => x.pinned).reverse()) {
            const entry = this._cmdOptEntry(o, null);
            if (entry) entries.unshift(entry);
        }
        return entries;
    }

    // Category submenu: "← Back" (selectable, like native), optional hint, then the
    // category's options — catalog order when browsing, fuzzysort-ranked when typing.
    _cmdCatEntries(q) {
        const cat = this._liveCat();
        if (!cat) return [];
        const filter = this._level.filter;
        const entries = [{
            label: "← Back", noHighlight: true, blankIcon: true,
            action: () => this._back(),
        }];
        if (filter.hint) entries.push({ static: filter.hint });
        const opts = (cat.options || []).filter((o) => o.category === filter.value);
        if (!q) {
            for (const o of opts) {
                if (o.showOnlyWhenSearching) continue;
                const entry = this._cmdOptEntry(o, null);
                if (entry) entries.push(entry);
            }
        } else {
            const fz = appFuzzysort();
            if (!fz) return entries;
            const res = fz.go(q, opts.filter((o) => !o.pinned), {
                keys: ["label", "tag", "_normalizedLabel"],
                scoreFn: cmdScoreFn,
            }).filter(cmdScoreCutoff);
            res.sort((a, b) => a.score !== b.score
                ? 0
                : normLabel(a.obj && a.obj.label).localeCompare(normLabel(b.obj && b.obj.label)));
            for (const r of res) {
                const o = r.obj;
                if (!o || o.hideWhenSearching || o.type === ":hdr") continue;
                const entry = this._cmdOptEntry(o, r);
                if (entry && entry.action) entries.push(entry);
            }
        }
        // Default selection: the first command after Back (native lands there).
        const first = entries.find((en) => en.action && en.label !== "← Back");
        if (first) first.defaultSel = true;
        return entries;
    }

    _cmdCatRow(f, result) {
        const isJumpHint = f.value === "searchtype_JUMP";
        return {
            label: f.label,
            labelHTML: result ? fzHighlightKey(result[0], f.label) : esc(f.label),
            icon: f.icon || null,
            blankIcon: true,
            arrow: true,
            kbdHTML: f.kbd ? kbdHTML(f.kbd) : null,
            action: () => {
                if (isJumpHint) { this._switchToJumpMode(); return; }
                this._level = { mode: "cmd-cat", filter: f };
                this._input.value = "";
                this._render();
            },
        };
    }

    // One catalog option → one entry. Headings/dividers/HTML headers render as
    // non-selectable chrome; everything else is an executable command row.
    _cmdOptEntry(o, result) {
        if (o.type === ":div") return { divider5: true };
        if (o.type === ":hdr") return { hdr: o.label || "", icon: o.icon || null };
        if (o.type === ":html:hdr") return { html: (o.htmlHeader && o.htmlHeader.html) || "" };
        if (o.type) return null; // unknown chrome type — skip rather than guess
        const showTag = !o.hideTag && o.tag && result && result[1] && result[1].score != null;
        return {
            cmdOpt: o,
            label: o.label || "",
            labelHTML: result ? fzHighlightKey(result[0], o.label || "") : esc(o.label || ""),
            icon: o.icon || null,
            blankIcon: true,
            subHTML: showTag ? "&gt;" + fzHighlightKey(result[1], o.tag) : null,
            kbdHTML: o.kbd ? kbdHTML(o.kbd) : null,
            action: (opts) => this._execCommand(o, opts && opts.otherPanel),
        };
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

// ---------- > command mode helpers ----------

// Does a live native-palette option match the snapshot the user chose? The palette
// rebuilds its option objects on every search (identity won't hold), so compare by
// the fields that identify a command. value alone collides (Change Password/Change
// Email share "change_password"; three Retro Banner rows share "set_type_ascii_art"
// differing only in json.banner_style), so include label + category + json.
function optMatches(a, b) {
    if (!a || !b) return false;
    return (a.value || "") === (b.value || "")
        && (a.label || "") === (b.label || "")
        && (a.category || "") === (b.category || "")
        && JSON.stringify(a.json || null) === JSON.stringify(b.json || null);
}

// The app bundles fuzzysort (MIT, github.com/farzher/fuzzysort) and exposes its
// instance globally; ranking with the SAME instance and options as the native
// palette makes our result order identical by construction.
function appFuzzysort() {
    const fz = window.fuzzysort || window._fuzzysort;
    return fz && typeof fz.go === "function" ? fz : null;
}

// Native option score: best key match, scaled by the option's scoreFactor
// (fuzzysort scores are ≤ 0, so dividing by a factor > 1 boosts a row — e.g.
// Set Theme 4.2, Toggle Day/Night Theme 0.7). Returns null for "no match".
function cmdScoreFn(keyResults) {
    let best = -Infinity;
    for (let i = 0; i < keyResults.length; i++) {
        const r = keyResults[i];
        if (!r) continue;
        let s = r.score == null ? -Infinity : r.score;
        const factor = keyResults.obj && keyResults.obj.scoreFactor;
        if (factor) s = (s || 0) * (1 / factor);
        if (s > best) best = s;
    }
    return best === -Infinity ? null : best;
}

// Native drops weak matches below -60000 (checked on the label key and the total).
function cmdScoreCutoff(r) {
    if (r[0] && r[0].score && r[0].score < -6e4) return false;
    if (typeof r.score === "number" && r.score && r.score < -6e4) return false;
    return true;
}

// Tie-break normalization: diacritic-strip + lowercase (NFD, drop combining marks).
function normLabel(s) {
    if (!s || typeof s !== "string") return "";
    try { return s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(); }
    catch (e) { return s.toLowerCase(); }
}

// Highlight one key's fuzzysort match as <mark> spans. fuzzysort.highlight returns
// raw target text around the tags, so mark with sentinels, escape, then swap.
function fzHighlightKey(keyResult, label) {
    const fz = appFuzzysort();
    if (!fz || !keyResult || keyResult.score == null) return esc(label);
    let h = null;
    try { h = fz.highlight(keyResult, "\u0001", "\u0002"); } catch (e) { /* fall through */ }
    if (!h) return esc(label);
    return esc(h).split("\u0001").join("<mark>").split("\u0002").join("</mark>");
}

// Shortcut display: native wraps modifier/arrow glyphs in kbdmod spans (the app's
// stylesheet styles those globally); plain characters stay as-is.
const KBD_GLYPHS = new Set(["⌫", "⌦", "↵", "⇧", "⌃", "⌥", "⌘", "→", "←", "↑", "↓", "⇥"]);
function kbdHTML(kbd) {
    if (kbd && typeof kbd === "object") return kbd.safeHtml || "";
    let out = "";
    for (const ch of String(kbd || "")) {
        out += KBD_GLYPHS.has(ch) ? `<span class="kbdmod kbdmod-mac">${esc(ch)}</span>` : esc(ch);
    }
    return out;
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
