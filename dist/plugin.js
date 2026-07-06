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
   which stops the native palette from focusing its own input on open \u2014 and that
   focus is what lets us locate its component in ~5ms instead of a ~1s tree-walk.
   opacity:0 hides it just as completely while keeping it focusable. Scoped under a
   class on <html> so a crash/unload can't leave the app veiled (removed in onUnload). */
html.scs-cmdveil .cmdpal--dialog{opacity:0 !important;pointer-events:none !important;}
`;
  var MAX_RESULTS = 40;
  var SEARCH_LIMIT = 100;
  var DEBOUNCE_MS = 120;
  var JUMP_PLACEHOLDER = "Search a doc name, date, user, or command...";
  var CMD_PLACEHOLDER = "Search a command...";
  var VEIL_CLASS = "scs-cmdveil";
  var NATIVE_FOLLOWUP_WAIT_MS = 180;
  var DYN_ALLOW_LIMIT = 500;
  var CREATE_POLL_MS = 50;
  var CREATE_POLL_TRIES = 160;
  var DEFAULT_JUMP_SHORTCUT = "Mod+K";
  var DEFAULT_CMD_SHORTCUT = "Mod+P";
  var IS_MAC = /Mac|iP(hone|ad|od)/.test(
    // navigator.platform is deprecated but is the only signal on Safari/Firefox
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
      this._nativePal = null;
      this._appRoot = null;
      this._opening = false;
      const cust = (this.getConfiguration() || {}).custom || {};
      this._jumpHotkey = this._parseShortcut(cust.jumpShortcut) || this._parseShortcut(DEFAULT_JUMP_SHORTCUT);
      this._cmdHotkey = this._parseShortcut(cust.commandShortcut) || this._parseShortcut(DEFAULT_CMD_SHORTCUT);
      this._keyHandler = (e) => this._onGlobalKey(e);
      window.addEventListener("keydown", this._keyHandler, true);
      this.ui.addCommandPaletteCommand({
        label: "Sidecar Search: open",
        icon: "search",
        onSelected: /* @__PURE__ */ __name(() => this._open(), "onSelected")
      });
      this._refreshCollections();
    }
    onUnload() {
      this._close();
      document.documentElement.classList.remove(VEIL_CLASS);
      window.removeEventListener("keydown", this._keyHandler, true);
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
    _onGlobalKey(e) {
      if (!e.isTrusted) return;
      const key = (e.key || "").toLowerCase();
      const isJump = this._matchesHotkey(e, this._jumpHotkey);
      const isCmdMode = !isJump && this._matchesHotkey(e, this._cmdHotkey);
      if (isJump || isCmdMode) {
        if (!this._overlay && document.querySelector(".cmdpal--dialog")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        const inCmd = this._level.mode === "cmd-root" || this._level.mode === "cmd-cat";
        if (isJump) {
          if (!this._overlay) this._open();
          else if (inCmd) this._switchToJumpMode();
          else this._close();
        } else {
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
    _creatable() {
      return this._cols.filter((c) => !c.isJournal && !c.isDynamic);
    }
    // ---------- open/close ----------
    _open(mode) {
      if (this._overlay || this._opening) return;
      this._prevFocus = document.activeElement;
      this._cacheAppRoot();
      this._level = { mode: mode === "commands" ? "cmd-root" : "root" };
      this._searchRecs = [];
      this._refreshCollections();
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
          this._switchToCommandMode(this._input.value.slice(1));
          return;
        }
        if (this._level.mode === "cmd-root" || this._level.mode === "cmd-cat") {
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
      this._footer.textContent = "\u2191\u2193 Navigate \xB7 \u21B5 Select \xB7 \u21E7\u21B5 Use other panel \xB7 Esc Back/Close \xB7 \u2318\u21E7P Native palette";
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
      box.innerHTML = '<div class="cmdpal--dialog"><div class="cmdpal--ac-container"><div class="autocomplete--option autocomplete--option-selected"><span class="autocomplete--option-label"><span class="autocomplete--hilite">x</span></span><span class="autocomplete--option-right"><span class="autocomplete--kbd"><span class="kbdmod kbdmod-mac">\u2318</span>K</span></span></div><div class="autocomplete--divider autocomplete--empty"></div><div class="autocomplete-divider-heading autocomplete--empty"><span class="autocomplete--option-label">x</span></div></div></div>';
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
        const cdiv = cs(".autocomplete--divider");
        if (cdiv) {
          if (cdiv.height) out["--scs-cdiv-height"] = cdiv.height;
          if (cdiv.margin) out["--scs-cdiv-margin"] = cdiv.margin;
          if (cdiv.borderTopWidth && cdiv.borderTopWidth !== "0px") {
            out["--scs-cdiv-border"] = `${cdiv.borderTopWidth} ${cdiv.borderTopStyle} ${cdiv.borderTopColor}`;
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
      } catch (e) {
      }
      box.remove();
      return out;
    }
    _close(opts) {
      const keepNative = !!(opts && opts.keepNative);
      this._opening = false;
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
      this._opening = false;
      if (keepNative) return;
      if (this._nativePal || document.documentElement.classList.contains(VEIL_CLASS)) {
        this._teardownNativePal();
      }
      if (prev && prev.isConnected) {
        try {
          prev.focus();
        } catch (e) {
        }
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
      if (fresh) {
        roots.push(fresh);
        this._appRoot = fresh;
      }
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
      if (target && !target._destroyed && typeof target.destroy === "function" && target.node && target.node.isConnected) {
        try {
          target.destroy();
        } catch (e) {
        }
      }
    }
    _nativeAC() {
      const p = this._nativePal;
      return p && !p._destroyed && p.node && p.node.isConnected && p.autocomplete && (p.autocomplete.staticOptions || []).length ? p.autocomplete : null;
    }
    // Ensure a single veiled native command palette is open and populated, stored on
    // this._nativePal. Idempotent — reused across renders and executions in a session.
    // ONE synthetic ⌘P (Thymer ignores isTrusted); if a stray palette is already open
    // we destroy it first so our ⌘P opens fresh rather than toggling it closed.
    async _ensureNativePal() {
      if (this._nativeAC()) return this._nativePal;
      this._nativePal = null;
      for (let i = 0; i < 12 && document.querySelector(".cmdpal--dialog"); i++) {
        this._destroyPal(this._findNativePal());
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      if (!this._overlayOrOpening()) return null;
      this._setVeil(true);
      document.body.dispatchEvent(new KeyboardEvent("keydown", {
        key: "p",
        code: "KeyP",
        keyCode: 80,
        which: 80,
        metaKey: true,
        bubbles: true,
        cancelable: true
      }));
      const deadline = Date.now() + 1500;
      while (Date.now() < deadline) {
        if (!this._overlayOrOpening()) {
          this._destroyPal(this._findNativePal());
          this._setVeil(false);
          return null;
        }
        const pal = this._findNativePal();
        if (pal && pal.autocomplete && (pal.autocomplete.staticOptions || []).length) {
          this._nativePal = pal;
          if (this._input) this._input.focus();
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
      this._close({ keepNative: true });
      if (!ac || typeof ac.confirmOptionEx !== "function") {
        this._teardownNativePal();
        this._restoreFocus(prev);
        return;
      }
      const opt = (ac.staticOptions || []).find((o) => optMatches(o, optSnap));
      if (!opt) {
        this._teardownNativePal();
        this._restoreFocus(prev);
        return;
      }
      try {
        ac.confirmOptionEx(opt, { shiftKey: !!otherPanel, preventDefault() {
        }, stopPropagation() {
        } });
      } catch (e) {
        this._teardownNativePal();
        this._restoreFocus(prev);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, NATIVE_FOLLOWUP_WAIT_MS));
      this._nativePal = null;
      if (pal && pal.node && pal.node.isConnected) {
        this._setVeil(false);
        const inp = pal.node.querySelector(".cmdpal--input");
        if (inp) {
          try {
            inp.focus();
          } catch (e) {
          }
        }
      } else {
        this._setVeil(false);
        this._restoreFocus(prev);
      }
    }
    _restoreFocus(prev) {
      if (prev && prev.isConnected) {
        try {
          prev.focus();
        } catch (e) {
        }
      }
    }
    // ---------- mode switching (@ ↔ >) ----------
    _switchToCommandMode(query) {
      if (!this._overlay) return;
      this._level = { mode: "cmd-root" };
      this._input.value = query || "";
      this._render();
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
      } else if (e.key === "Backspace" && !this._input.value && this._level.mode !== "root" && this._level.mode !== "cmd-root" && this._level.mode !== "cmd-cat") {
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
      const isCmd = this._level.mode === "cmd-root" || this._level.mode === "cmd-cat";
      const entries = this._level.mode === "root" ? q ? this._rootQueryEntries(q) : this._rootEmptyEntries() : this._level.mode === "cmd-root" ? q ? this._cmdSearchEntries(q) : this._cmdRootEmptyEntries() : this._level.mode === "cmd-cat" ? this._cmdCatEntries(q) : this._level.mode === "collection" ? this._collectionEntries(q) : this._createPickEntries(q);
      this._searchtype.textContent = isCmd ? ">" : "@";
      this._input.placeholder = isCmd ? CMD_PLACEHOLDER : JUMP_PLACEHOLDER;
      this._footer.style.display = isCmd ? "none" : "";
      this._crumb.style.display = this._level.mode === "collection" || this._level.mode === "create-pick" ? "" : "none";
      this._crumb.textContent = this._level.mode === "collection" ? this._level.entry.name + " \u203A" : this._level.mode === "create-pick" ? "New page \u203A" : "";
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
          const div = document.createElement("div");
          div.className = "scs-chdr";
          div.innerHTML = (entry.icon ? `<span class="scs-icon">${iconHTML(entry.icon)}</span>` : "") + `<span>${esc(entry.hdr)}</span>`;
          this._list.appendChild(div);
          continue;
        }
        if (entry.html != null) {
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
        const isCmd2 = this._level.mode === "cmd-root" || this._level.mode === "cmd-cat";
        const empty = document.createElement("div");
        if (isCmd2 && !this._nativeAC()) {
          empty.className = "scs-empty";
          empty.textContent = "";
        } else if (isCmd2 && q) {
          empty.className = "scs-noresults";
          empty.innerHTML = '<span class="scs-icon"></span><span class="scs-label">No results</span>';
        } else {
          empty.className = "scs-empty";
          empty.textContent = q ? "No results" : "Loading\u2026";
        }
        this._list.appendChild(empty);
      }
      this._select(Math.min(defaultSel, Math.max(0, this._rows.length - 1)));
    }
    _rowEl(row, q) {
      const el = document.createElement("div");
      el.className = "scs-row";
      const label = row.labelHTML != null ? row.labelHTML : row.indices ? highlightIndices(row.label, row.indices) : row.noHighlight ? esc(row.label) : highlight(row.label, q);
      const parts = [
        // Command rows keep an empty icon slot for alignment (native does the
        // same); @ rows keep their "·" placeholder.
        `<span class="scs-icon">${row.icon || !row.blankIcon ? iconHTML(row.icon) : ""}</span>`,
        `<span class="scs-label">${label}</span>`
      ];
      if (row.subHTML) parts.push(`<span class="scs-sub">${row.subHTML}</span>`);
      else if (row.sub) parts.push(`<span class="scs-sub">${esc(row.sub)}</span>`);
      if (row.kbdHTML) parts.push(`<span class="scs-ckbd">${row.kbdHTML}</span>`);
      else if (row.shortcut) parts.push(`<span class="scs-key">${esc(row.shortcut)}</span>`);
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
        shortcut: "\u2318P",
        noHighlight: true,
        action: /* @__PURE__ */ __name(() => this._switchToCommandMode(""), "action")
      });
      entries.push({ divider: true });
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
      const dt = parseDate(q);
      if (dt) {
        entries.unshift({
          label: fmtDate(dt),
          icon: "ti-calendar-event",
          noHighlight: true,
          action: /* @__PURE__ */ __name((opts) => this._openJournal(dt, opts), "action")
        });
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
        const dt = parseDate(q);
        if (dt) {
          entries.splice(1, 0, {
            label: fmtDate(dt),
            icon: "ti-calendar-event",
            noHighlight: true,
            action: /* @__PURE__ */ __name((opts) => this._openJournal(dt, opts), "action")
          });
        } else if (!q) {
          entries.push({ static: "Try: monday, 7 days, aug 1" });
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
      const catValues = /* @__PURE__ */ new Set();
      for (const f of cat.filters || []) {
        if (f.type === ":cat:div") {
          entries.push({ divider5: true });
          continue;
        }
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
        scoreFn: cmdScoreFn
      }).filter(cmdScoreCutoff);
      const all = [...catRes, ...optRes];
      all.sort((a, b) => a.score !== b.score ? 0 : normLabel(a.obj && a.obj.label).localeCompare(normLabel(b.obj && b.obj.label)));
      const entries = [];
      for (const r of all) {
        const o = r.obj;
        if (!o) continue;
        if (o.type === ":cat") {
          entries.push(this._cmdCatRow(o, r));
          continue;
        }
        if (o.hideWhenSearching || o.type === ":hdr") continue;
        const entry = this._cmdOptEntry(o, r);
        if (entry && entry.action) entries.push(entry);
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
        label: "\u2190 Back",
        noHighlight: true,
        blankIcon: true,
        action: /* @__PURE__ */ __name(() => this._back(), "action")
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
          scoreFn: cmdScoreFn
        }).filter(cmdScoreCutoff);
        res.sort((a, b) => a.score !== b.score ? 0 : normLabel(a.obj && a.obj.label).localeCompare(normLabel(b.obj && b.obj.label)));
        for (const r of res) {
          const o = r.obj;
          if (!o || o.hideWhenSearching || o.type === ":hdr") continue;
          const entry = this._cmdOptEntry(o, r);
          if (entry && entry.action) entries.push(entry);
        }
      }
      const first = entries.find((en) => en.action && en.label !== "\u2190 Back");
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
        action: /* @__PURE__ */ __name(() => {
          if (isJumpHint) {
            this._switchToJumpMode();
            return;
          }
          this._level = { mode: "cmd-cat", filter: f };
          this._input.value = "";
          this._render();
        }, "action")
      };
    }
    // One catalog option → one entry. Headings/dividers/HTML headers render as
    // non-selectable chrome; everything else is an executable command row.
    _cmdOptEntry(o, result) {
      if (o.type === ":div") return { divider5: true };
      if (o.type === ":hdr") return { hdr: o.label || "", icon: o.icon || null };
      if (o.type === ":html:hdr") return { html: o.htmlHeader && o.htmlHeader.html || "" };
      if (o.type) return null;
      const showTag = !o.hideTag && o.tag && result && result[1] && result[1].score != null;
      return {
        cmdOpt: o,
        label: o.label || "",
        labelHTML: result ? fzHighlightKey(result[0], o.label || "") : esc(o.label || ""),
        icon: o.icon || null,
        blankIcon: true,
        subHTML: showTag ? "&gt;" + fzHighlightKey(result[1], o.tag) : null,
        kbdHTML: o.kbd ? kbdHTML(o.kbd) : null,
        action: /* @__PURE__ */ __name((opts) => this._execCommand(o, opts && opts.otherPanel), "action")
      };
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
  function optMatches(a, b) {
    if (!a || !b) return false;
    return (a.value || "") === (b.value || "") && (a.label || "") === (b.label || "") && (a.category || "") === (b.category || "") && JSON.stringify(a.json || null) === JSON.stringify(b.json || null);
  }
  __name(optMatches, "optMatches");
  function appFuzzysort() {
    const fz = window.fuzzysort || window._fuzzysort;
    return fz && typeof fz.go === "function" ? fz : null;
  }
  __name(appFuzzysort, "appFuzzysort");
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
  __name(cmdScoreFn, "cmdScoreFn");
  function cmdScoreCutoff(r) {
    if (r[0] && r[0].score && r[0].score < -6e4) return false;
    if (typeof r.score === "number" && r.score && r.score < -6e4) return false;
    return true;
  }
  __name(cmdScoreCutoff, "cmdScoreCutoff");
  function normLabel(s) {
    if (!s || typeof s !== "string") return "";
    try {
      return s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
    } catch (e) {
      return s.toLowerCase();
    }
  }
  __name(normLabel, "normLabel");
  function fzHighlightKey(keyResult, label) {
    const fz = appFuzzysort();
    if (!fz || !keyResult || keyResult.score == null) return esc(label);
    let h = null;
    try {
      h = fz.highlight(keyResult, "", "");
    } catch (e) {
    }
    if (!h) return esc(label);
    return esc(h).split("").join("<mark>").split("").join("</mark>");
  }
  __name(fzHighlightKey, "fzHighlightKey");
  var KBD_GLYPHS = /* @__PURE__ */ new Set(["\u232B", "\u2326", "\u21B5", "\u21E7", "\u2303", "\u2325", "\u2318", "\u2192", "\u2190", "\u2191", "\u2193", "\u21E5"]);
  function kbdHTML(kbd) {
    if (kbd && typeof kbd === "object") return kbd.safeHtml || "";
    let out = "";
    for (const ch of String(kbd || "")) {
      out += KBD_GLYPHS.has(ch) ? `<span class="kbdmod kbdmod-mac">${esc(ch)}</span>` : esc(ch);
    }
    return out;
  }
  __name(kbdHTML, "kbdHTML");
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
  function fmtDate(dt) {
    try {
      return dt.toDate().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return "Open journal for date";
    }
  }
  __name(fmtDate, "fmtDate");
  return __toCommonJS(plugin_exports);
})();
