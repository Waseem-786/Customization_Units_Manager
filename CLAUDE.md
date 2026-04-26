# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # build main+preload, start Vite dev server, launch Electron
npm run build        # produce production bundle in out/ (main, preload, renderer)
npm start            # run the production bundle
npm run typecheck    # tsc --noEmit on both tsconfig.node.json and tsconfig.web.json
```

There is **no test suite**. Verification = `npm run typecheck` + `npm run build`. For runtime checks, launch dev mode and exercise the UI; smoke-testing tip is to `tail -f /tmp/edev.log` after running `npm run dev > /tmp/edev.log 2>&1 &`.

## Architecture

Standard electron-vite three-tier layout:

- **`src/main/`** — Electron main process. Owns filesystem and IPC. Entry [src/main/index.ts](src/main/index.ts) registers handlers and creates the BrowserWindow.
- **`src/preload/`** — Single file. Exposes a typed `window.api` via `contextBridge`. Renderer has `nodeIntegration: false`, `contextIsolation: true`, `sandbox: false` (sandbox off so the preload can `require('electron')`).
- **`src/renderer/`** — Vite root with React app. Routes via `HashRouter`. Uses theme/density/nav prefs persisted in `localStorage` under `cum.theme`, `cum.density`, `cum.nav`.

**The IPC contract is the `IpcApi` interface in [src/shared/types.ts](src/shared/types.ts).** Both preload and main use the same types. When adding an IPC channel: extend `IpcApi`, add the handler in [src/main/index.ts](src/main/index.ts), and add the `ipcRenderer.invoke(...)` call in [src/preload/index.ts](src/preload/index.ts). All three must change together.

### Critical Electron quirk: `ELECTRON_RUN_AS_NODE`

VSCode's integrated terminal often inherits `ELECTRON_RUN_AS_NODE=1`, which makes `electron.exe` boot in plain-Node mode (so `require('electron')` returns the binary path string instead of the API). All npm scripts go through [scripts/run.cjs](scripts/run.cjs), which spawns `electron-vite` via `process.execPath` and explicitly deletes that env var. **Do not bypass this** — running `npx electron-vite dev` directly will fail with `Cannot read properties of undefined (reading 'whenReady')` if the inherited env is still set.

## Key data flows

### Customization detection (`src/main/customizations.ts`)

`getCustomizationDetail` walks RAW root → customization folder → all `Change_NN` subfolders. It aggregates the **detected items** (top-level folders + loose files) across every change into a single deduplicated list. Returns `detectedItems`, `mapping` (merged with defaults), `mappingExists`, and `unmappedItems` (items present on disk but missing from the saved mapping).

### Folder mapping (`src/main/mapping.ts`, schema in `src/shared/types.ts`)

Stored as `.units-manager.json` at the customization root (so it travels with the project). **Schema is v2:**

```ts
interface MappingConfig {
  version: 2;
  buckets: string[];                   // user-defined destination buckets
  entries: Record<string, MappingEntry>; // keyed by item name (folder OR file)
}
interface MappingEntry { kind: 'folder' | 'file'; destination: string; }
```

`destination` is either a bucket name from `buckets` or the special `IGNORE_DESTINATION` constant (`'IGNORE'`). v1 files (`{ folders: { JS: 'APP_UNITS' ... } }`) are auto-migrated on load. Defaults (suggested in UI but not auto-saved): JS/UIXML → APP_UNITS, DDL/INC/SPC/SQL → DB_UNITS, RADXML → IGNORE; loose files routed by extension.

### Prepare flow (`src/main/prepare.ts`)

Two-step: `planPrepareChange` → user decision → `applyPreparePlan`.

1. **`planPrepareChange`** classifies every file as `create` (no FINAL counterpart), `unchanged` (byte-equal), or `conflict` (byte-different). It throws `PrepareValidationError` if the mapping file doesn't exist or any detected item is unmapped — this is **strict on purpose**: suggested defaults shown in the UI don't count until saved.
2. **`applyPreparePlan`** takes the plan + a `ConflictResolutions` map keyed by destination path, and writes everything: `create` items copy, `conflict` items follow their resolution (`use-new` / `keep-current` / `merged` with content). After apply, `generateDeploymentScript` runs — failures there are logged but don't fail the apply.

### Hunk-by-hunk merge ([ConflictResolver.tsx](src/renderer/src/components/ConflictResolver.tsx))

`merge/hunks.ts` uses jsdiff to split the original CURRENT vs NEW contents into a list of `{ kind: 'equal' | 'hunk' }` blocks; the merged text is recomputed from the per-hunk `choices: HunkSide[]` array (default all `'new'`). Each card has directional `◀ Use CURRENT` / `Use NEW ▶` arrows that flip its choice. A *Free edit* mode swaps the modified pane to editable; switching modes seeds `freeText` from the current `merged` so manual edits and per-hunk picks compose. **Critical implementation detail:** the Monaco diff editor's container div must stay in the DOM for the lifetime of the modal — DO NOT gate it behind a `loading` ternary, or the editor instance gets orphaned. Currently it's always rendered (with `display: none` for binary files) and the loading/error/hunks list render adjacent to it.

### Deployment script (`src/main/deploymentScript.ts`)

Always re-walks `<FINAL>/<customization>/DB_UNITS/` recursively after every successful apply (or via the manual `deployment:regenerate` IPC). Output is `Deployment_Script.txt` at the customization root with a `spool ... .spl` header, one `@<absolute_path>` per file (sorted by relative path), and `SPOOL OFF;` footer. Uses `os.EOL` (CRLF on Windows for Toad compatibility). **Generator currently keys off the literal bucket name `DB_UNITS`** — renaming that bucket via the mapping panel will silently disable script generation.

## Monaco editor specifics

- Imported from `monaco-editor` (full bundle including all languages — bundle is fat ~7.5 MB but Vite chunk-splits language definitions so they load on demand).
- Workers are bundled locally via Vite's `?worker` query syntax in [src/renderer/src/monaco/setup.ts](src/renderer/src/monaco/setup.ts). `MonacoEnvironment.getWorker` returns the right one per `label`.
- **CSP in [src/renderer/index.html](src/renderer/index.html) requires** `script-src 'self' 'unsafe-eval' blob:` and `worker-src 'self' blob:`. Don't tighten without testing — Monaco's language services use eval.
- A custom theme `'app-dark'` is defined in setup.ts; the resolver's diff editor uses `theme: 'app-dark'`.
- `monaco.editor.createDiffNavigator` was removed in 0.55. Prev/next change navigation is implemented manually via `getLineChanges()` + cursor position in [ConflictResolver.tsx](src/renderer/src/components/ConflictResolver.tsx).

## UI conventions

- All icons come from [src/renderer/src/components/Icons.tsx](src/renderer/src/components/Icons.tsx) (lucide-style SVG, `currentColor`, default 16px). Use `<I.IconName size={N} />`. Don't add inline SVGs or import `lucide-react`.
- Design tokens live in [src/renderer/src/styles.css](src/renderer/src/styles.css) under `:root[data-theme=...]` and `:root[data-density=...]`. Theme + density are switched by setting `document.documentElement.setAttribute(...)` from [App.tsx](src/renderer/src/App.tsx). Always use the CSS variables (`--gold`, `--panel`, `--text`, `--fs-body`, `--radius-sm`, etc.) — never hardcode colors or sizes in component styles.
- Buttons use `.btn` / `.btn-primary` / `.btn-ghost` / `.btn-sm` / `.btn-icon` classes from styles.css; toggle groups use `.toggle-group`.
- Long filenames in tables: wrap in flex container with `min-width: 0` and use `overflow-wrap: anywhere` on the text span (see `.folder-name` / `.item-name` in styles.css). Tables with long content tend to overflow without this.

## Things that look like bugs but aren't

- The `generateDeploymentScript` call inside `applyPreparePlan` is wrapped in try/catch and **swallows errors** (logged to console only). This is intentional — a deployment-script failure shouldn't roll back a successful prepare.
- `MappingPanel`'s Save button is enabled on first visit (when `mappingExists === false`) even with no edits. This is intentional — clicking it commits the inferred defaults to disk so subsequent Prepares can run.
- The Prepare result counts `unchanged` files even though they're not written. This is intentional reporting, not a bug.

## When making changes

- Editing the IPC contract: update [src/shared/types.ts](src/shared/types.ts) → [src/main/index.ts](src/main/index.ts) → [src/preload/index.ts](src/preload/index.ts) in lock-step. The preload wires by string channel name, so a typo shows up only at runtime.
- The `out/` directory is build output (gitignored). Edits there are wiped on next build.
- After significant renderer changes, run `npm run build` not just `npm run typecheck` — Vite does its own checks (worker imports, asset paths) that tsc skips.
