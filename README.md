# Customization Units Manager

A desktop application for **application consultants** who receive customization packages from developers, prepare them into final unit bundles, test them across multiple revisions, and produce a deployment-ready Toad/SQL\*Plus script for the database side.

It turns a manual, error-prone copy-paste workflow into a structured tool with per-customization mapping, change tracking, hunk-by-hunk merging, and one-click deployment-script generation.

## Download

Pre-built Windows binaries are published on the [Releases page](https://github.com/Waseem-786/Customization_Units_Manager/releases/latest).

| File | Use it when |
| --- | --- |
| `Customization-Units-Manager-Setup-1.0.0.exe` | You want a normal installer with desktop + start-menu shortcuts. |
| `Customization-Units-Manager-1.0.0-Portable.exe` | You don't want to install — run from a USB stick or a network share. |

The installer is **unsigned**, so Windows SmartScreen will show a "Publisher unknown" warning the first time. Click **More info → Run anyway**.

## The workflow it supports

When a developer hands you a customization (e.g. `RSD_2025_0497_Customization`), it usually arrives as a bundle of folders — `INC`, `JS`, `SQL`, `SPC`, `DDL`, `UIXML`, `RADXML`, etc. — sometimes with loose files at the root. As a consultant, you typically:

1. Drop the developer's bundle into a `Change_01` folder under the customization's **RAW** location.
2. Decide where each detected folder or file goes — `APP_UNITS`, `DB_UNITS`, a custom destination of your own, or *ignore*.
3. Copy the mapped items into a clean **FINAL** directory.
4. Test the prepared units in your environment, find issues, request a fix.
5. The developer sends `Change_02` containing only revised files. Prepare again — only the affected files change in FINAL; everything else stays intact, with a side-by-side diff for any per-file conflict.
6. Run the auto-generated **`Deployment_Script.txt`** in Toad / SQL\*Plus to deploy every DB unit in one go.

This app gives you a UI for every step.

## Features

- **First-run wizard** for setting two roots: **RAW** (where developer customizations live) and **FINAL** (where prepared bundles go). Both editable later from the Settings page.
- **Customization browser** auto-detects every customization in the RAW folder, with a search box, "all / prepared / pending" filters, and at-a-glance change count + final-exists status.
- **Per-customization detail view** with a collapsible accordion of `Change_NN` folders, each showing a recursive file tree.
- **`+ New Change`** auto-numbers (`Change_02`, `Change_03`, …) and creates the next change folder, then opens it in Explorer ready for the developer's drop.
- **Generalized folder mapping** — detects both top-level folders *and* loose files in each Change. You assign each to any **destination bucket** (`APP_UNITS`, `DB_UNITS`, or any custom name you create), or ignore it. Defaults are pre-suggested for common names; mapping is required to be saved before a Prepare can run.
- **Prepare units** copies mapped items into `FINAL_ROOT/{customization}/{bucket}/...`, preserving subdirectory structure. Identical files are left alone, new files created, differing files surfaced as conflicts.
- **Hunk-by-hunk merge editor** — when a file conflicts, an in-app Monaco diff opens with directional `◀` / `▶` arrows on each hunk so you can pick which side wins per-chunk, plus a free-edit fallback if you want to hand-merge. Auto-applies once the last conflict is resolved.
- **Deployment script** (`Deployment_Script.txt`) is generated/refreshed automatically after every Prepare, listing every file under `DB_UNITS/` as `@<absolute_path>` between a `spool` header and `SPOOL OFF;` footer, ready to run in Toad. A button on the customization detail page lets you regenerate it manually.
- **Theme + density + nav** toggles in the top bar — dark/light, compact/cozy, sidebar/top — persisted in localStorage.

## Tech stack

- **Electron 32** — desktop runtime
- **Vite 5** + **electron-vite** — build tooling
- **React 18** + **TypeScript 5**
- **react-router-dom** (HashRouter)
- **monaco-editor** — embedded VS Code-style diff editor for the merge UI
- **diff** (jsdiff) — line-level diff for the hunk-pick layer
- App settings persisted as JSON in Electron's `userData` directory; per-customization mapping persisted as `.units-manager.json` inside the RAW folder.

## Prerequisites

- **Node.js ≥ 18** (Node 20 or 22 recommended)
- **npm** (ships with Node)
- **Windows / macOS / Linux** — tested on Windows 11

## Installation

```sh
git clone https://github.com/Waseem-786/Customization_Units_Manager.git
cd Customization_Units_Manager
npm install
```

The first install pulls in Electron's prebuilt binary (~150 MB) and Monaco's language bundles. Subsequent installs are cached.

## Running in development

```sh
npm run dev
```

This builds the main + preload + renderer, starts the Vite dev server with HMR for the React UI, and launches Electron pointed at it.

> **Windows note:** if you launch from VSCode's integrated terminal, the variable `ELECTRON_RUN_AS_NODE=1` is often inherited from VSCode's own internals and prevents Electron from booting as a GUI app. The launcher at [scripts/run.cjs](scripts/run.cjs) scrubs this variable before invoking electron-vite, so `npm run dev`, `npm run build`, and `npm start` always work regardless of the parent shell.

## Building for production

```sh
npm run build
```

Outputs the bundled main, preload, and renderer assets to `out/`. To run the production bundle locally:

```sh
npm start
```

Packaging into a signed installer (`.exe` / `.dmg` / `AppImage`) via `electron-builder` is on the roadmap.

## Type checking

```sh
npm run typecheck
```

## Usage

1. Start the app with `npm run dev`.
2. **First-run wizard** asks for two folders:
   - **RAW**: where developer customizations live, e.g. `D:\UNITS`. Each subfolder is one customization.
   - **FINAL**: where prepared final units go, e.g. `D:\FINAL_UNITS`. The app uses the same customization name and creates one subfolder per destination bucket inside it.

   Both paths are editable later from **Settings**.
3. **Home** lists every subfolder of RAW as a customization card with its change count and a *Prepared* / *Pending* badge.
4. Click a card → **Customization detail** view.
5. Click **+ New Change** to create the next `Change_NN` folder; Explorer opens at it so you can drag the developer's bundle in. Click **Refresh** when done.
6. The **Folder mapping** panel detects every folder and loose file across all Changes and pre-suggests destinations based on common conventions. Review, adjust, and click **Save mapping** — this is required before a Prepare can run.
7. On any Change's accordion, click **Prepare units** to plan the copy. A summary dialog shows new / unchanged / conflicts counts. If there are conflicts, choose *Compare each conflict* (opens the merge editor) or *Overwrite all with new*.
8. After apply, `Deployment_Script.txt` is regenerated next to APP_UNITS / DB_UNITS in FINAL — open it in Toad and run.
9. For subsequent changes (`Change_02`, `Change_03`, …), repeat step 7. FINAL accumulates: only files present in the new Change are touched.

## Folder mapping

Each customization stores its mapping at `<RAW>/<customization>/.units-manager.json`. The format is **v2**:

```json
{
  "version": 2,
  "buckets": ["APP_UNITS", "DB_UNITS", "DOCS"],
  "entries": {
    "JS":           { "kind": "folder", "destination": "APP_UNITS" },
    "UIXML":        { "kind": "folder", "destination": "APP_UNITS" },
    "INC":          { "kind": "folder", "destination": "DB_UNITS" },
    "SPC":          { "kind": "folder", "destination": "DB_UNITS" },
    "SQL":          { "kind": "folder", "destination": "DB_UNITS" },
    "RADXML":       { "kind": "folder", "destination": "IGNORE" },
    "release-notes.md": { "kind": "file", "destination": "DOCS" }
  }
}
```

- `buckets` is the list of destination subfolders the app will create inside `<FINAL>/<customization>/`. You can add custom buckets (e.g. `DOCS`, `CONFIG`, `SCRIPTS`) from the **Folder mapping** panel.
- `entries` is keyed by the detected name; each entry records its `kind` (`folder` or `file`) and which bucket (or the special `IGNORE`) it maps to.
- The app hides this file from the in-app file tree, but you'll see it in Explorer. Because it lives with the customization, the mapping survives moves and backups.
- Older `version: 1` mapping files are auto-migrated on first load.

**Strict validation:** Prepare refuses to run if the file doesn't exist or any detected item has no entry. The error message points back at the mapping panel and lists the offending names.

## Hunk-by-hunk diff & merge

When Prepare detects a per-file conflict (existing FINAL file with different content), the **Conflict Resolver** opens:

- **Top toolbar** — *Per-hunk pick* / *Free edit* mode toggle, `↑` / `↓` icon-only buttons for prev/next change in the file.
- **Monaco diff editor** showing CURRENT (FINAL) on the left and the live MERGED result on the right. As you flip hunks, the diff highlights only the *remaining* differences.
- **Hunks list** below — one card per change hunk with the actual current-side text and new-side text shown side-by-side, and two large directional arrows in between:
  - **`◀ Use CURRENT`** — keep the existing version for that hunk.
  - **`Use NEW ▶`** — take the developer's version for that hunk.
- **Footer actions** — *Keep CURRENT entirely*, *Use NEW entirely*, *Save merged* (commits the live merged result). Saving on the last unresolved conflict auto-applies the whole batch and writes everything to FINAL.

Binary files (detected via null-byte sniff) skip the diff editor and offer just *Keep CURRENT* / *Use NEW*.

## Deployment script

After every successful Prepare (or whenever you click **Deployment script** on the customization detail header), the app writes `Deployment_Script.txt` at the root of `<FINAL>/<customization>/`, alongside `APP_UNITS` / `DB_UNITS`:

```
spool D:\FINAL_UNITS\RSD_2025_0497\RSD_2025_0497_26042026.spl
ALTER SESSION SET CURRENT_SCHEMA=FLEXCUBE;
SET DEFINE OFF;
@D:\FINAL_UNITS\RSD_2025_0497\DB_UNITS\INC\CSTB_FID_DATA_BLOCKS__IADREDMN.INC
@D:\FINAL_UNITS\RSD_2025_0497\DB_UNITS\INC\ERTB_MSGS.sql
@D:\FINAL_UNITS\RSD_2025_0497\DB_UNITS\SPC\iapks_iadredmn_main.spc
@D:\FINAL_UNITS\RSD_2025_0497\DB_UNITS\SQL\iapks_iadredmn_main.sql
...
SPOOL OFF;
```

- The script walks `<FINAL>/<customization>/DB_UNITS/` recursively and emits one `@<absolute_path>` line per file, sorted by relative path (so DDL → INC → SPC → SQL falls out alphabetically).
- The spool filename is `<customization>_DDMMYYYY.spl` and points back into the same customization folder.
- Line endings use the OS default (CRLF on Windows for Toad compatibility).
- Skipped if `DB_UNITS` is missing or empty (consistent with "only needful for DB units").
- The deployment-script generator currently keys off the literal bucket name `DB_UNITS`. If you rename that bucket, the script won't auto-generate.

## Folder structure

```
src/
  main/                       # Electron main process
    index.ts                  # window + IPC registration
    settings.ts               # load/save app settings (JSON in userData)
    customizations.ts         # scan RAW root, detect items, build summaries + detail
    mapping.ts                # v2 mapping + v1 migration + suggestions
    prepare.ts                # plan + apply with strict validation, custom buckets
    deploymentScript.ts       # auto-generate Deployment_Script.txt
  preload/index.ts            # contextBridge → window.api
  renderer/                   # React app (Vite root)
    src/
      App.tsx                 # routes + theme/density/nav toggles
      monaco/setup.ts         # Monaco bootstrapping + worker bundling
      merge/hunks.ts          # line-diff hunk computation
      pages/
        FirstRunWizard.tsx
        Home.tsx
        CustomizationDetail.tsx
        Settings.tsx
      components/
        FileTree.tsx
        MappingPanel.tsx      # generalized buckets + per-item destination
        PrepareModeDialog.tsx # plan summary, mode picker
        ConflictResolver.tsx  # hunk-by-hunk merge editor
        DiffViewer.tsx        # Monaco diff React wrapper
        PrepareResultDialog.tsx
        Icons.tsx
      styles.css
  shared/
    types.ts                  # types shared across main / preload / renderer
scripts/
  run.cjs                     # launcher that strips ELECTRON_RUN_AS_NODE
electron.vite.config.ts
tsconfig.json                 # references node + web configs
tsconfig.node.json            # main + preload + shared
tsconfig.web.json             # renderer + shared
```

## Troubleshooting

- **`Cannot read properties of undefined (reading 'whenReady')` on launch** — `ELECTRON_RUN_AS_NODE=1` is set in your shell. The launcher at [scripts/run.cjs](scripts/run.cjs) already strips it; if you bypass the launcher (e.g. by running `npx electron-vite dev` directly), unset the variable manually before launching.
- **`Unable to move the cache: Access is denied` on Windows** — harmless GPU cache warning, usually because a previous Electron instance is still cleaning up. Safe to ignore.
- **Customizations don't show up on Home** — verify your RAW root path in Settings, and that each customization is its own subfolder of RAW.
- **"Folder mapping is not configured" / "These items have no destination set" on Prepare** — open the customization, set a destination for every detected folder/file (or *Ignore*), and click **Save mapping**. Suggestions in the panel don't count until saved.
- **Deployment script didn't generate** — `<FINAL>/<customization>/DB_UNITS/` is missing or empty, or you renamed the `DB_UNITS` bucket. Click **Deployment script** in the detail header to regenerate manually after the folder is populated.

## Roadmap

- Issue tracking — capture and track issues you've reported back to developers per change.
- Distribution — signed installers for Windows / macOS / Linux via `electron-builder`.
- Multi-customization batch operations.
- Per-bucket "include in deployment script" flag (so renaming `DB_UNITS` doesn't break the script).

## License

[MIT](LICENSE)
