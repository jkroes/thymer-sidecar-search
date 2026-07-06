var plugins = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // plugins/sidecar-search/plugin.js
  var plugin_exports = {};
  __export(plugin_exports, {
    Plugin: () => Plugin
  });
  var CSS = `
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
/* Inline calendar (clone of native's :wdg-date picker in journal/date contexts). */
.scs-cal{margin:0 10px 4px 15px;font-size:14px;user-select:none;}
.scs-cal-head{display:flex;align-items:center;justify-content:space-between;padding:6px 4px;}
.scs-cal-title{font-weight:700;color:var(--scs-fg-bright,color(display-p3 0.929 0.929 0.929));}
.scs-cal-btns{display:flex;gap:18px;align-items:center;}
.scs-cal-btn{cursor:pointer;opacity:.65;padding:0 4px;}
.scs-cal-btn:hover{opacity:1;}
.scs-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);justify-items:center;
  text-align:center;row-gap:3px;}
.scs-cal-dow{opacity:.55;padding:2px 0;}
/* Compact chip like native: the highlight hugs the number, not the column. */
.scs-cal-day{cursor:pointer;border-radius:4px;padding:2px 0;min-width:2.2em;}
.scs-cal-day:hover{background:var(--scs-border,rgba(255,255,255,.1));}
.scs-cal-day.scs-cal-hl{background:var(--scs-sel-bg,color(display-p3 0.267 0.514 0.482));
  color:var(--scs-fg-bright,color(display-p3 0.929 0.929 0.929));}
/* Veil that hides a native palette during the destroy-and-replace swap so it can't
   paint a frame of native jump results. opacity:0 (NOT visibility:hidden) keeps the
   element focusable \u2014 the palette's self-focus is what our focusin discovery and
   fast component lookup rely on. Scoped under a class on <html> so a crash/unload
   can't leave the app veiled (removed in onUnload). */
html.scs-cmdveil .cmdpal--dialog{opacity:0 !important;pointer-events:none !important;}
`;
  var MAX_RESULTS = 40;
  var SEARCH_LIMIT = 100;
  var DEBOUNCE_MS = 120;
  var JUMP_PLACEHOLDER = "Search a doc name, date, user, or command...";
  var VEIL_CLASS = "scs-cmdveil";
  var DYN_ALLOW_LIMIT = 500;
  var CREATE_POLL_MS = 50;
  var CREATE_POLL_TRIES = 160;
  var DEFAULT_COMMAND_SHORTCUT = "Mod+P";
  var IS_MAC = /mac|ip(hone|ad|od)/i.test(
    navigator.userAgentData && navigator.userAgentData.platform || navigator["platform"] || ""
  );
  var Plugin = class extends AppPlugin {
    static {
      __name(this, "Plugin");
    }
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
      this._colRecords = /* @__PURE__ */ new Map();
      this._recCol = /* @__PURE__ */ new Map();
      this._dynAllowRecs = /* @__PURE__ */ new Set();
      this._dynAllowCols = /* @__PURE__ */ new Set();
      this._appRoot = null;
      this._palInput = null;
      this._palDlg = null;
      this._palKeyFn = null;
      this._palClickFn = null;
      this._tags = [];
      const cust = (this.getConfiguration() || {}).custom || {};
      this._cmdHotkey = this._parseShortcut(cust.commandShortcut) || this._parseShortcut(DEFAULT_COMMAND_SHORTCUT);
      this._keyHandler = (e) => this._onGlobalKey(e);
      window.addEventListener("keydown", this._keyHandler, true);
      this._focusHandler = (e) => this._onFocusIn(e);
      window.addEventListener("focusin", this._focusHandler, true);
      this.ui.addCommandPaletteCommand({
        label: "Sidecar Search: open",
        icon: "search",
        onSelected: /* @__PURE__ */ __name(() => this._open(), "onSelected")
      });
      this._refreshCollections();
    }
    onUnload() {
      this._close();
      this._detachPalInterceptor();
      document.documentElement.classList.remove(VEIL_CLASS);
      window.removeEventListener("keydown", this._keyHandler, true);
      window.removeEventListener("focusin", this._focusHandler, true);
    }
    // ---------- global keyboard ----------
    // "Mod+Shift+K" → exact modifier flags + key, or null if unusable. "Mod" = Cmd on
    // macOS, Ctrl elsewhere. Adapted from thymer-reference-extravaganza (MIT).
    _parseShortcut(str) {
      if (!str || typeof str !== "string") return null;
      const h = { meta: false, ctrl: false, shift: false, alt: false, key: null, code: null };
      for (const p of str.split("+").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
        if (p === "mod") {
          if (IS_MAC) h.meta = true;
          else h.ctrl = true;
        } else if (p === "cmd" || p === "meta" || p === "super" || p === "win") h.meta = true;
        else if (p === "ctrl" || p === "control") h.ctrl = true;
        else if (p === "shift") h.shift = true;
        else if (p === "alt" || p === "option" || p === "opt") h.alt = true;
        else {
          if (h.key) return null;
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
      if (!!e.metaKey !== h.meta || !!e.ctrlKey !== h.ctrl || !!e.altKey !== h.alt || !!e.shiftKey !== h.shift) return false;
      if (h.code) return e.code === h.code;
      return (e.key || "").toLowerCase() === h.key;
    }
    // Active ONLY while our palette is open (v5: the plugin owns no global binding —
    // the app opens its own palette on the native jump shortcut and we redirect).
    _onGlobalKey(e) {
      if (!e.isTrusted || !this._overlay) return;
      if (this._matchesHotkey(e, this._cmdHotkey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        this._handoffToNativeCommands("");
        return;
      }
      if ((e.key || "").toLowerCase() === "escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        this._back();
      }
    }
    _back() {
      if (this._level.mode === "root") {
        this._close();
      } else {
        this._level = { mode: "root" };
        if (this._input) this._input.value = "";
        this._render();
      }
    }
    // ---------- native palette discovery & redirection ----------
    // Fires for EVERY native palette open (it always focuses its own input), no
    // matter the entry path: shortcut fallthrough, sidebar/statusbar "Jump To"
    // buttons, mobile swipe, hint-row click. The single replacement mechanism.
    _onFocusIn(e) {
      const input = e.target;
      if (!input || !input.classList || !input.classList.contains("cmdpal--input")) return;
      const dlg = input.closest ? input.closest(".cmdpal--dialog") : null;
      if (!dlg) return;
      if (this._overlay && this._overlay.contains(dlg)) return;
      queueMicrotask(() => {
        if (!input.isConnected) return;
        const pal = this._findPalComp(dlg);
        if (!pal || pal._destroyed) return;
        if (pal.searchType === "JUMP") {
          this._swapFromNative(pal, input.value || "");
        } else if (pal.searchType === "COMMANDS" || pal.searchType === "NEW") {
          this._attachPalInterceptor(input, dlg, pal);
        }
      });
    }
    // Capture listeners on the live native COMMANDS/NEW palette: swap to our jump
    // palette whenever its mode transitions to JUMP.
    _attachPalInterceptor(input, dlg, pal) {
      if (this._palInput === input) return;
      this._detachPalInterceptor();
      const keyFn = /* @__PURE__ */ __name((e) => this._onPalKey(e, input, pal), "keyFn");
      const clickFn = /* @__PURE__ */ __name(() => this._schedulePalRecheck(pal, input), "clickFn");
      input.addEventListener("keydown", keyFn, true);
      dlg.addEventListener("click", clickFn, true);
      this._palInput = input;
      this._palDlg = dlg;
      this._palKeyFn = keyFn;
      this._palClickFn = clickFn;
    }
    _detachPalInterceptor() {
      if (this._palInput && this._palKeyFn) {
        this._palInput.removeEventListener("keydown", this._palKeyFn, true);
      }
      if (this._palDlg && this._palClickFn) {
        this._palDlg.removeEventListener("click", this._palClickFn, true);
      }
      this._palInput = null;
      this._palDlg = null;
      this._palKeyFn = null;
      this._palClickFn = null;
    }
    _onPalKey(e, input, pal) {
      if (!e.isTrusted) return;
      if (!input.isConnected || pal._destroyed) {
        this._detachPalInterceptor();
        return;
      }
      if (pal.searchType === "COMMANDS" && e.key === "@" && !e.metaKey && !e.ctrlKey && !e.altKey && !input.value) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        this._swapFromNative(pal, "");
        return;
      }
      this._schedulePalRecheck(pal, input);
    }
    // 0-tick mode recheck: runs after the app processed the triggering key/click.
    // JUMP → swap to ours (the swap veil hides any single-frame native paint).
    _schedulePalRecheck(pal, input) {
      setTimeout(() => {
        if (pal._destroyed || !pal.node || !pal.node.isConnected) {
          this._detachPalInterceptor();
          return;
        }
        if (pal.searchType === "JUMP") {
          this._swapFromNative(pal, input.isConnected && input.value || "");
        }
      }, 0);
    }
    // Destroy a live native jump palette and open ours in its place, carrying any
    // typed query. Veiled during the swap so native can't paint a frame of results.
    _swapFromNative(pal, rawValue) {
      this._detachPalInterceptor();
      this._setVeil(true);
      try {
        this._destroyPal(pal);
      } finally {
        this._setVeil(false);
      }
      const prefill = String(rawValue || "").replace(/^[@>]/, "").trim();
      if (this._overlay) {
        if (this._input) this._input.focus();
        return;
      }
      this._open();
      if (prefill && this._input) {
        this._input.value = prefill;
        this._render();
      }
    }
    // Typing ">" in our palette is the reverse handoff: commands live in the native
    // palette now, so close ours and open the real thing, carrying the remainder.
    _handoffToNativeCommands(query) {
      this._close();
      const sidebar = this._findSidebar();
      if (!sidebar) return;
      try {
        sidebar.showCommandPalette();
      } catch (e) {
        return;
      }
      if (!query) return;
      setTimeout(() => {
        const dlg = document.querySelector(".cmdpal--dialog");
        const inp = dlg && dlg.querySelector(".cmdpal--input");
        if (!inp) return;
        inp.value = query;
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }, 30);
    }
    // Typing "+" in our palette opens the native create palette: open COMMANDS via
    // the app's own entry point, then flip the component to NEW the same way native's
    // own "+" prefix does (setSearchType). Veiled during the flip so the one-frame
    // COMMANDS render can't paint. Live-verified 2026-07-06.
    async _handoffToNativeNew() {
      this._close();
      const sidebar = this._findSidebar();
      if (!sidebar) return;
      this._setVeil(true);
      try {
        await sidebar.showCommandPalette();
        const dlg = document.querySelector(".cmdpal--dialog");
        const pal = this._findPalComp(dlg);
        if (pal && !pal._destroyed && typeof pal.setSearchType === "function") {
          await pal.setSearchType("NEW");
        }
      } catch (e) {
      } finally {
        this._setVeil(false);
      }
    }
    // ---------- data ----------
    async _refreshCollections() {
      const [cols, dyns] = await Promise.all([
        this.data.getAllCollections(),
        this.data.getAllDynamicCollections().catch(() => [])
      ]);
      if (!cols || !cols.length) return;
      const mapEntry = /* @__PURE__ */ __name((col, isDynamic) => {
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
          isDynamic
        };
      }, "mapEntry");
      this._cols = cols.map((c) => mapEntry(c, false)).concat((dyns || []).map((c) => mapEntry(c, true)));
      const fetches = [];
      for (const entry of this._cols) {
        if (entry.isDynamic) continue;
        fetches.push(entry.col.getAllRecords().then((records) => {
          this._colRecords.set(entry.guid, records || []);
          for (const r of records || []) this._recCol.set(r.guid, entry);
        }).catch(() => {
        }));
      }
      Promise.all(fetches).then(() => this._rebuildDynAllow());
    }
    // show_cmdpal_items: a hidden collection's records stay out of the palette
    // UNLESS a view of a NON-hidden dynamic collection includes them — the dynamic
    // collection's flag overrides its sources'. Views define membership as
    // source_collections (guids or "*") + a search query; a view with no query
    // holds every record of its sources.
    async _rebuildDynAllow() {
      const allowRecs = /* @__PURE__ */ new Set();
      const allowCols = /* @__PURE__ */ new Set();
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
            for (const r of res && !res.error && res.records || []) {
              const col = this._recCol.get(r.guid);
              if (srcs.includes("*") || col && srcs.includes(col.guid)) {
                allowRecs.add(r.guid);
              }
            }
          }).catch(() => {
          }));
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
    // Workspace hashtags (the native Tags pseudo-collection). No SDK API exists;
    // the sidebar's cached collection controllers expose getTagsInWorkspace(), a
    // synchronous read of the app's workspace data cache (CDP-verified 2026-07-06).
    // Duck-typed and best-effort: if the internals move, the Tags row just disappears.
    _readTags() {
      try {
        const sidebar = this._findSidebar();
        if (!sidebar || typeof sidebar.getCachedPlugins !== "function") return;
        const ctrl = (sidebar.getCachedPlugins() || []).find((p) => p && typeof p.getTagsInWorkspace === "function");
        if (ctrl) this._tags = ctrl.getTagsInWorkspace() || [];
      } catch (e) {
      }
    }
    _creatable() {
      return this._cols.filter((c) => !c.isJournal && !c.isDynamic);
    }
    // ---------- open/close ----------
    _open() {
      if (this._overlay) return;
      this._prevFocus = document.activeElement;
      this._cacheAppRoot();
      this._readTags();
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
        if (this._level.mode === "root" && this._input.value.startsWith(">")) {
          this._handoffToNativeCommands(this._input.value.slice(1));
          return;
        }
        if (this._level.mode === "root" && this._input.value.startsWith("+")) {
          this._handoffToNativeNew();
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
      this._footer.textContent = "\u2191\u2193 Navigate \xB7 \u21B5 Select \xB7 \u21E7\u21B5 Use other panel \xB7 Esc Back/Close \xB7 > Commands \xB7 + New";
      palette.appendChild(inputRow);
      palette.appendChild(this._list);
      palette.appendChild(this._footer);
      backdrop.appendChild(palette);
      document.body.appendChild(backdrop);
      this._overlay = backdrop;
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
      box.innerHTML = '<div class="cmdpal--dialog"><div class="cmdpal--ac-container"><div class="autocomplete--option autocomplete--option-selected"><span class="autocomplete--option-label"><span class="autocomplete--hilite">x</span></span></div></div></div>';
      document.body.appendChild(box);
      const out = {};
      try {
        const cs = /* @__PURE__ */ __name((sel2) => {
          const el = box.querySelector(sel2);
          return el && getComputedStyle(el);
        }, "cs");
        const isColor = /* @__PURE__ */ __name((v) => v && v !== "rgba(0, 0, 0, 0)" && v !== "transparent", "isColor");
        const put = /* @__PURE__ */ __name((name, v) => {
          if (isColor(v)) out[name] = v;
        }, "put");
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
      } catch (e) {
      }
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
      this._footer = null;
      this._rows = [];
      const prev = this._prevFocus;
      this._prevFocus = null;
      if (prev && prev.isConnected) {
        try {
          prev.focus();
        } catch (e) {
        }
      }
    }
    // ---------- native palette plumbing (component tree walk) ----------
    _setVeil(on) {
      document.documentElement.classList.toggle(VEIL_CLASS, !!on);
    }
    // The app's focused component. Belt-and-suspenders across realms: prefer the app
    // window that owns our document, fall back to our own globalThis.
    _gfc() {
      try {
        const w = document.defaultView;
        if (w && w.g_focusedComponent) return w.g_focusedComponent;
      } catch (e) {
      }
      return typeof globalThis !== "undefined" && globalThis.g_focusedComponent || null;
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
    // The app's sidebar component, duck-typed by its showCommandPalette method — the
    // same method the app's own launch_cmdpal action calls. Lets us open the native
    // palette without synthesizing a keystroke, so it keeps working when the user
    // remaps the native palette bindings (custom keyboard shortcuts).
    _findSidebar() {
      const roots = [];
      const fresh = this._climbRoot(this._gfc());
      if (fresh) {
        roots.push(fresh);
        this._appRoot = fresh;
      }
      if (this._appRoot && this._appRoot !== fresh) roots.push(this._appRoot);
      for (const root of roots) {
        const stack = [root];
        const seen = /* @__PURE__ */ new Set();
        while (stack.length) {
          const comp = stack.pop();
          if (!comp || seen.has(comp)) continue;
          seen.add(comp);
          if (!comp._destroyed && typeof comp.showCommandPalette === "function") return comp;
          if (comp.children) for (const ch of comp.children) stack.push(ch);
          if (comp.sideBar) stack.push(comp.sideBar);
        }
      }
      return null;
    }
    // Locate the LIVE component owning a specific .cmdpal--dialog node. The DOM has
    // no back-reference to its component, so we DFS the component tree from a root
    // climbed fresh from g_focusedComponent (a just-opened palette IS the focused
    // component), falling back to a cached root. Destroyed components whose nodes
    // linger are skipped. Returns null for non-component markup (our theme probe).
    _findPalComp(dlgNode) {
      if (!dlgNode) return null;
      const roots = [];
      const fresh = this._climbRoot(this._gfc());
      if (fresh) {
        roots.push(fresh);
        this._appRoot = fresh;
      }
      if (this._appRoot && this._appRoot !== fresh) roots.push(this._appRoot);
      for (const root of roots) {
        const stack = [root];
        const seen = /* @__PURE__ */ new Set();
        while (stack.length) {
          const comp = stack.pop();
          if (!comp || seen.has(comp)) continue;
          seen.add(comp);
          if (!comp._destroyed && comp.node === dlgNode) return comp;
          if (comp.children) for (const ch of comp.children) stack.push(ch);
          if (comp.sideBar) stack.push(comp.sideBar);
        }
      }
      return null;
    }
    // Close a native palette by its own destroy() — its Esc/cancel path ignores
    // untrusted key events, and node.remove() desyncs the component (leaving it
    // "open" so the next open toggles it closed), so destroy() is the only safe close.
    _destroyPal(pal) {
      if (pal && !pal._destroyed && typeof pal.destroy === "function" && pal.node && pal.node.isConnected) {
        try {
          pal.destroy();
        } catch (e) {
        }
      }
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
        this.data.searchByQuery(q, SEARCH_LIMIT).then((res) => {
          if (token !== this._searchToken || !this._overlay) return;
          this._searchRecs = res && !res.error && res.records || [];
          this._renderList(q);
        }).catch(() => {
        });
      } else {
        this._searchRecs = [];
      }
      this._renderList(q);
    }
    _renderList(q) {
      const entries = this._level.mode === "root" ? q ? this._rootQueryEntries(q) : this._rootEmptyEntries() : this._level.mode === "collection" ? this._collectionEntries(q) : this._level.mode === "tags" ? this._tagEntries(q) : this._createPickEntries(q);
      this._crumb.style.display = this._level.mode === "root" ? "none" : "";
      this._crumb.textContent = this._level.mode === "collection" ? this._level.entry.name + " \u203A" : this._level.mode === "tags" ? "Tags \u203A" : this._level.mode === "create-pick" ? "New page \u203A" : "";
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
        if (entry.widget) {
          this._list.appendChild(entry.widget());
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
        empty.textContent = q ? "No results" : "Loading\u2026";
        this._list.appendChild(empty);
      }
      this._select(Math.min(defaultSel, Math.max(0, this._rows.length - 1)));
    }
    _rowEl(row, q) {
      const el = document.createElement("div");
      el.className = "scs-row";
      const label = row.indices ? highlightIndices(row.label, row.indices) : row.noHighlight ? esc(row.label) : highlight(row.label, q);
      const parts = [
        row.noIcon ? "" : `<span class="scs-icon">${iconHTML(row.icon)}</span>`,
        `<span class="scs-label">${label}</span>`
      ];
      if (row.sub) parts.push(`<span class="scs-sub">${esc(row.sub)}</span>`);
      if (row.shortcut) parts.push(`<span class="scs-key">${esc(row.shortcut)}</span>`);
      if (row.arrow) parts.push(`<span class="scs-arrow">\u2192</span>`);
      el.innerHTML = parts.join("");
      return el;
    }
    // ---------- root: empty query (native layout) ----------
    _rootEmptyEntries() {
      const entries = [];
      entries.push({
        label: "Press > to filter commands only...",
        icon: "ti-chevron-right",
        noHighlight: true,
        action: /* @__PURE__ */ __name(() => this._handoffToNativeCommands(""), "action")
      });
      entries.push({ divider: true });
      if (this._tags.length) {
        entries.push({
          label: "Tags",
          icon: "ti-hash",
          arrow: true,
          noHighlight: true,
          action: /* @__PURE__ */ __name(() => this._enterTags(), "action")
        });
      }
      for (const c of this._cols) {
        entries.push({
          label: c.name,
          icon: c.icon || "ti-database",
          arrow: true,
          noHighlight: true,
          action: /* @__PURE__ */ __name(() => this._enterCollection(c), "action")
        });
      }
      entries.push({ divider: true });
      if (this._cols.some((c) => c.isJournal)) {
        entries.push({
          label: "Open Today's Journal",
          icon: "ti-notebook",
          shortcut: "\u2318J",
          noHighlight: true,
          action: /* @__PURE__ */ __name((opts) => this._openJournal(null, opts), "action")
        });
      }
      return entries;
    }
    // ---------- root: query (single ranked list, native parity) ----------
    _rootQueryEntries(q) {
      const scored = [];
      const add = /* @__PURE__ */ __name((rank, m, row) => {
        if (m) scored.push(Object.assign(row, { rank, score: m.score, indices: m.indices }));
      }, "add");
      if (this._tags.length) {
        add(0, fuzzyMatch(q, "Tags"), {
          label: "Tags",
          icon: "ti-hash",
          arrow: true,
          action: /* @__PURE__ */ __name(() => this._enterTags(), "action")
        });
        for (const t of this._tags) {
          add(3, fuzzyMatch(q, "#" + t), this._tagRow(t));
        }
      }
      for (const c of this._cols) {
        add(0, fuzzyMatch(q, c.name), {
          label: c.name,
          icon: c.icon || "ti-database",
          arrow: true,
          action: /* @__PURE__ */ __name(() => this._enterCollection(c), "action")
        });
        const openLabel = `Open Collection '${c.name}'`;
        add(1, fuzzyMatch(q, openLabel), {
          label: openLabel,
          icon: c.icon || "ti-database",
          action: /* @__PURE__ */ __name((opts) => this._openView(c.guid, null, opts), "action")
        });
        for (const v of c.views) {
          add(2, fuzzyMatch(q, v.label), {
            label: v.label,
            icon: v.icon || "ti-layout-list",
            sub: c.name,
            action: /* @__PURE__ */ __name((opts) => this._openView(c.guid, v.id, opts), "action")
          });
        }
        if (!c.isJournal && !c.isDynamic) {
          add(4, fuzzyMatch(q, `${c.name}: New ${c.itemName}`), {
            label: `${c.name}: New ${c.itemName}`,
            icon: "ti-plus",
            action: /* @__PURE__ */ __name(() => this._createRecord(c, null), "action")
          });
        }
        add(5, fuzzyMatch(q, `${c.name}: Collection Settings...`), {
          label: `${c.name}: Collection Settings...`,
          icon: "ti-settings",
          action: /* @__PURE__ */ __name(() => this._openCollectionSettings(c), "action")
        });
      }
      const seen = /* @__PURE__ */ new Set();
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
      for (const r of this._searchRecs) {
        if (seen.has(r.guid)) continue;
        const colEntry = this._recCol.get(r.guid) || null;
        if (!this._recVisible(r.guid, colEntry)) continue;
        const m = fuzzyMatch(q, r.getName() || "");
        add(6, m || { score: 0, indices: [] }, this._pageRow(r, colEntry));
      }
      scored.sort((a, b) => a.rank - b.rank || b.score - a.score);
      const entries = scored.slice(0, MAX_RESULTS);
      const level = this._level;
      const dt = parseDate(q) || (level.calDate ? wrapDate(level.calDate) : null);
      if (dt) {
        entries.unshift(
          { widget: /* @__PURE__ */ __name(() => this._calendarEl(level, dt.toDate()), "widget") },
          { divider: true },
          {
            label: fmtDate(dt),
            icon: "ti-calendar-event",
            noHighlight: true,
            shortcut: !parseDate(q) && level.calDate ? "OK" : null,
            action: /* @__PURE__ */ __name((opts) => this._openJournal(dt, opts), "action")
          }
        );
      }
      if (!scored.length) {
        const def = this._creatable()[0];
        if (def) {
          entries.push({
            label: `Create '${q}' in ${def.name}`,
            icon: "ti-plus",
            noHighlight: true,
            action: /* @__PURE__ */ __name(() => this._createRecord(def, q), "action")
          });
        }
        entries.push({
          label: `Create '${q}' in\u2026`,
          icon: "ti-plus",
          noHighlight: true,
          action: /* @__PURE__ */ __name(() => {
            this._level = { mode: "create-pick", name: q };
            this._input.value = "";
            this._render();
          }, "action")
        });
      }
      entries.push({
        label: `Search for '${q}' in all text`,
        icon: "ti-search",
        noHighlight: true,
        action: /* @__PURE__ */ __name(() => this._openSearchPanel(q), "action")
      });
      return entries;
    }
    _pageRow(record, colEntry) {
      return {
        label: record.getName() || "(untitled)",
        icon: safeIcon(record) || colEntry && colEntry.icon || "ti-file",
        sub: colEntry ? colEntry.name : null,
        action: /* @__PURE__ */ __name((opts) => this._openRecord(record.guid, opts), "action")
      };
    }
    // Selecting a tag opens the Search panel filtered to it — the same route the
    // native palette and sidebar use (searchQuery: "#tag"). Native tag rows render
    // no icon cell (the "#" in the label is the marker).
    _tagRow(tag) {
      return {
        label: "#" + tag,
        noIcon: true,
        action: /* @__PURE__ */ __name(() => this._openSearchPanel("#" + tag), "action")
      };
    }
    // ---------- Tags submenu (native pseudo-collection) ----------
    _enterTags() {
      this._readTags();
      this._level = { mode: "tags" };
      this._input.value = "";
      this._render();
    }
    _tagEntries(q) {
      const entries = [{
        label: "Back",
        icon: "ti-arrow-left",
        noHighlight: true,
        action: /* @__PURE__ */ __name(() => this._back(), "action")
      }];
      const rows = [];
      for (const t of this._tags) {
        const m = fuzzyMatch(q, "#" + t);
        if (q && !m) continue;
        const row = this._tagRow(t);
        row.indices = m ? m.indices : null;
        row.score = m ? m.score : 0;
        rows.push(row);
      }
      if (q) rows.sort((a, b) => b.score - a.score);
      entries.push(...rows);
      return this._fixSubmenuSel(entries, q);
    }
    // ---------- inline calendar (clone of native's :wdg-date) ----------
    // Renders a month grid like native's date-picker widget. Clicking a day does NOT
    // navigate (native parity): it retargets the date row below the calendar (stored
    // as level.calDate; the row grows an "OK" chip) — Enter/click on the row opens.
    // ‹ ○ › page prev / today / next month (level.calMonth). Both live on the level
    // object, so calendar state dies naturally when leaving the level.
    _calendarEl(level, selDate) {
      const today = /* @__PURE__ */ new Date();
      const hl = selDate || today;
      const base = level.calMonth || new Date(hl.getFullYear(), hl.getMonth(), 1);
      const cal = document.createElement("div");
      cal.className = "scs-cal";
      const head = document.createElement("div");
      head.className = "scs-cal-head";
      const title = document.createElement("span");
      title.className = "scs-cal-title";
      title.textContent = base.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const btns = document.createElement("span");
      btns.className = "scs-cal-btns";
      const mkBtn = /* @__PURE__ */ __name((text, toMonth) => {
        const b = document.createElement("span");
        b.className = "scs-cal-btn";
        b.textContent = text;
        b.addEventListener("click", () => {
          level.calMonth = toMonth();
          this._render();
          if (this._input) this._input.focus();
        });
        btns.appendChild(b);
      }, "mkBtn");
      mkBtn("\u2039", () => new Date(base.getFullYear(), base.getMonth() - 1, 1));
      mkBtn("\u25CB", () => new Date(today.getFullYear(), today.getMonth(), 1));
      mkBtn("\u203A", () => new Date(base.getFullYear(), base.getMonth() + 1, 1));
      head.appendChild(title);
      head.appendChild(btns);
      cal.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "scs-cal-grid";
      for (const d of ["S", "M", "T", "W", "T", "F", "S"]) {
        const el = document.createElement("span");
        el.className = "scs-cal-dow";
        el.textContent = d;
        grid.appendChild(el);
      }
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      start.setDate(1 - start.getDay());
      const sameDay = /* @__PURE__ */ __name((a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(), "sameDay");
      for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const el = document.createElement("span");
        el.className = "scs-cal-day" + (sameDay(d, hl) ? " scs-cal-hl" : "");
        el.textContent = String(d.getDate());
        el.addEventListener("click", () => {
          level.calDate = d;
          level.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
          this._render();
          if (this._input) this._input.focus();
        });
        grid.appendChild(el);
      }
      cal.appendChild(grid);
      return cal;
    }
    // ---------- collection submenu (native ordering) ----------
    _collectionEntries(q) {
      const entry = this._level.entry;
      const entries = [];
      const filter = /* @__PURE__ */ __name((rows) => q ? rows.filter((r) => {
        const m = fuzzyMatch(q, r.label);
        if (m) {
          r.indices = m.indices;
          r.score = m.score;
        }
        return !!m;
      }) : rows, "filter");
      entries.push({
        label: "Back",
        icon: "ti-arrow-left",
        noHighlight: true,
        action: /* @__PURE__ */ __name(() => this._back(), "action")
      });
      const actions = [];
      actions.push({
        label: `Open Collection '${entry.name}'`,
        icon: entry.icon || "ti-database",
        defaultSel: true,
        action: /* @__PURE__ */ __name((opts) => this._openView(entry.guid, null, opts), "action")
      });
      if (!entry.isJournal && !entry.isDynamic) {
        actions.push({
          label: `${entry.name}: New ${entry.itemName}`,
          icon: "ti-plus",
          action: /* @__PURE__ */ __name(() => this._createRecord(entry, q || null), "action")
        });
      }
      for (const v of entry.views) {
        actions.push({
          label: v.label,
          icon: v.icon || "ti-layout-list",
          action: /* @__PURE__ */ __name((opts) => this._openView(entry.guid, v.id, opts), "action")
        });
      }
      actions.push({
        label: `${entry.name}: Collection Settings...`,
        icon: "ti-settings",
        action: /* @__PURE__ */ __name(() => this._openCollectionSettings(entry), "action")
      });
      entries.push(...filter(actions));
      if (entry.isJournal) {
        const level = this._level;
        const dt = parseDate(q) || (level.calDate ? wrapDate(level.calDate) : null);
        const picked = !parseDate(q) && !!level.calDate;
        if (dt || !q) {
          for (const en of entries) en.defaultSel = false;
          entries.splice(
            1,
            0,
            { widget: /* @__PURE__ */ __name(() => this._calendarEl(level, dt ? dt.toDate() : null), "widget") },
            { divider: true },
            {
              label: dt ? fmtDate(dt) : "Try: monday, 7 days, aug 1",
              icon: "ti-calendar-event",
              noHighlight: true,
              defaultSel: true,
              shortcut: picked ? "OK" : null,
              action: /* @__PURE__ */ __name((opts) => this._openJournal(dt, opts), "action")
            }
          );
        }
        return this._fixSubmenuSel(entries, q);
      }
      if (entry.isDynamic) return this._fixSubmenuSel(entries, q);
      const records = (this._colRecords.get(entry.guid) || []).filter((r) => this._recVisible(r.guid, entry));
      const itemRows = filter(records.map((r) => {
        const row = this._pageRow(r, entry);
        row.sub = null;
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
        label: "Back",
        icon: "ti-arrow-left",
        noHighlight: true,
        action: /* @__PURE__ */ __name(() => this._back(), "action")
      }];
      for (const c of this._creatable()) {
        const m = fuzzyMatch(q, c.name);
        if (q && !m) continue;
        entries.push({
          label: c.name,
          icon: c.icon || "ti-database",
          indices: m ? m.indices : null,
          defaultSel: entries.length === 1,
          action: /* @__PURE__ */ __name(() => this._createRecord(c, name), "action")
        });
      }
      return entries;
    }
    _enterCollection(entry) {
      this._level = { mode: "collection", entry };
      this._input.value = "";
      if (!entry.isDynamic) {
        entry.col.getAllRecords().then((records) => {
          this._colRecords.set(entry.guid, records || []);
          for (const r of records || []) this._recCol.set(r.guid, entry);
          if (this._overlay && this._level.mode === "collection" && this._level.entry === entry) {
            this._render();
          }
        }).catch(() => {
        });
      }
      this._render();
    }
    // ---------- actions ----------
    async _targetPanel(otherPanel) {
      const panels = (this.ui.getPanels() || []).filter((p) => !p.isSidebar());
      let active = panels.find((p) => p.isActive()) || panels[0];
      if (!active) return await this.ui.createPanel();
      if (!otherPanel) return active;
      const activeId = active.getId ? active.getId() : null;
      const other = panels.find((p) => (p.getId ? p.getId() : null) !== activeId);
      return other || await this.ui.createPanel({ afterPanel: active });
    }
    async _openRecord(guid, opts) {
      this._close();
      const panel = await this._targetPanel(opts && opts.otherPanel);
      if (!panel) return;
      panel.navigateTo({
        type: "edit_panel",
        rootId: guid,
        subId: null,
        workspaceGuid: this.getWorkspaceGuid()
      });
      this.ui.setActivePanel(panel);
    }
    async _openView(colGuid, viewId, opts) {
      this._close();
      const panel = await this._targetPanel(opts && opts.otherPanel);
      if (!panel) return;
      panel.navigateTo({
        type: "overview",
        rootId: colGuid,
        subId: viewId || null,
        workspaceGuid: this.getWorkspaceGuid()
      });
      this.ui.setActivePanel(panel);
    }
    async _openJournal(dt, opts) {
      this._close();
      const user = (this.data.getActiveUsers() || [])[0];
      if (!user) return;
      const panel = await this._targetPanel(opts && opts.otherPanel);
      if (!panel) return;
      const ok = panel.navigateToJournal(user, dt || void 0);
      if (!ok) {
        this.ui.addToaster({ title: "Sidecar Search", message: "No journal available.", dismissible: true });
        return;
      }
      this.ui.setActivePanel(panel);
    }
    async _createRecord(entry, name) {
      this._close();
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
      const panel = await this._targetPanel(true);
      if (!panel) return;
      panel.navigateTo({
        type: "collection_settings",
        rootId: entry.guid,
        subId: null,
        workspaceGuid: this.getWorkspaceGuid()
      });
      this.ui.setActivePanel(panel);
    }
    async _openSearchPanel(query) {
      this._close();
      const panel = await this._targetPanel(true);
      if (!panel) return;
      panel.navigateTo({
        type: "search_panel",
        rootId: null,
        subId: null,
        workspaceGuid: this.getWorkspaceGuid(),
        state: { searchQuery: query || null }
      });
      this.ui.setActivePanel(panel);
    }
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  __name(esc, "esc");
  var WORD_SEP = /[\s\-_:'".(/\\]/;
  function fuzzyMatch(query, text) {
    const t = String(text || "");
    const tl = t.toLowerCase();
    const q = String(query || "").toLowerCase().replace(/ /g, "");
    if (!q) return { score: 0, indices: [] };
    const n = tl.length, m = q.length;
    if (m > n) return null;
    const NEG = -1e9;
    const isStart = /* @__PURE__ */ __name((j) => j === 0 || WORD_SEP.test(t[j - 1]), "isStart");
    const score = [], back = [];
    for (let i = 0; i < m; i++) {
      score.push(new Float64Array(n).fill(NEG));
      back.push(new Int32Array(n).fill(-1));
    }
    for (let i = 0; i < m; i++) {
      for (let j = i; j < n; j++) {
        if (tl[j] !== q[i]) continue;
        const charScore = 1 + (isStart(j) ? 6 : 0);
        if (i === 0) {
          score[i][j] = charScore - Math.min(j, 12) * 0.5;
        } else {
          let best2 = NEG, bestK = -1;
          for (let k = i - 1; k < j; k++) {
            if (score[i - 1][k] === NEG) continue;
            let s = score[i - 1][k] + charScore;
            if (k === j - 1) s += 8;
            else s -= Math.min(j - k - 1, 12) * 0.5;
            if (s > best2) {
              best2 = s;
              bestK = k;
            }
          }
          if (bestK < 0) continue;
          score[i][j] = best2;
          back[i][j] = bestK;
        }
      }
    }
    let best = NEG, bestJ = -1;
    for (let j = m - 1; j < n; j++) if (score[m - 1][j] > best) {
      best = score[m - 1][j];
      bestJ = j;
    }
    if (bestJ < 0) return null;
    const indices = [];
    for (let i = m - 1, j = bestJ; i >= 0 && j >= 0; i--) {
      indices.push(j);
      j = back[i][j];
    }
    indices.reverse();
    return { score: best - tl.length * 0.05, indices };
  }
  __name(fuzzyMatch, "fuzzyMatch");
  function highlightIndices(label, indices) {
    const set = new Set(indices || []);
    let out = "";
    for (let i = 0; i < label.length; i++) {
      const c = esc(label[i]);
      out += set.has(i) ? `<mark>${c}</mark>` : c;
    }
    return out;
  }
  __name(highlightIndices, "highlightIndices");
  function highlight(label, q) {
    const m = fuzzyMatch(q, label);
    return m ? highlightIndices(label, m.indices) : esc(label);
  }
  __name(highlight, "highlight");
  function iconHTML(icon) {
    if (!icon) return "\xB7";
    if (/^ti[- ]/.test(icon)) return `<i class="ti ${esc(icon)}"></i>`;
    return esc(icon);
  }
  __name(iconHTML, "iconHTML");
  function safeIcon(record) {
    try {
      return record.getIcon ? record.getIcon(false) : null;
    } catch (e) {
      return null;
    }
  }
  __name(safeIcon, "safeIcon");
  function parseDate(q) {
    if (!q || q.length < 2 || /^\d+$/.test(q)) return null;
    try {
      return typeof DateTime !== "undefined" && DateTime.parseDateTimeString ? DateTime.parseDateTimeString(q) : null;
    } catch (e) {
      return null;
    }
  }
  __name(parseDate, "parseDate");
  function wrapDate(d) {
    return { toDate: /* @__PURE__ */ __name(() => d, "toDate") };
  }
  __name(wrapDate, "wrapDate");
  function fmtDate(dt) {
    try {
      const d = dt.toDate();
      const wd = d.toLocaleDateString("en-US", { weekday: "short" });
      const mo = d.toLocaleDateString("en-US", { month: "short" });
      const yr = d.getFullYear() === (/* @__PURE__ */ new Date()).getFullYear() ? "" : " " + d.getFullYear();
      return `${wd} ${mo} ${d.getDate()}${yr}`;
    } catch (e) {
      return "Open journal for date";
    }
  }
  __name(fmtDate, "fmtDate");
  return __toCommonJS(plugin_exports);
})();
