# Customization Units Manager

A desktop application for **application consultants** who receive customization packages from developers, prepare them into final unit bundles, test them, and track revisions across multiple changes.

It turns a manual, error-prone copy-paste workflow into a structured tool with per-customization mapping, change tracking, and one-click unit preparation.

## The workflow it supports

When a developer hands you a customization (e.g. `CUSTOMIZATION__2025_0497`), it usually arrives as a bundle of folders — `INC`, `JS`, `SQL`, `SPC`, `DDL`, `UIXML`, `RADXML`, etc. As a consultant, you typically:

1. Drop the developer's bundle into a `Change_01` folder.
2. Decide which source folders go to **APP_UNITS** (e.g. JS, UIXML), which to **DB_UNITS** (e.g. DDL, INC, SPC, SQL), and which to **ignore** (e.g. RADXML).
3. Copy the mapped folders into a clean **FINAL** directory.
4. Test the prepared units, find issues, request a fix.
5. The developer sends `Change_02` containing only revised files. Prepare again — only the affected files are updated; the rest of `FINAL` stays intact.

This app gives you a UI for every step.

## Features

- **First-run wizard** for setting two roots: **RAW** (where developer customizations live) and **FINAL** (where prepared unit bundles go). Both editable later from the Settings page.
- **Customization browser** auto-detects every customization in the RAW folder and shows change count + "Final exists" status at a glance.
- **Per-customization detail view** with collapsible accordion of `Change_NN` folders, each showing a recursive file tree.
- **`+ New Change`** auto-numbers (`Change_02`, `Change_03`, …) and creates the next change folder, then opens it in Explorer ready for the developer's drop.
- **Folder mapping panel** with a per-folder 3-way toggle (`APP_UNITS` / `DB_UNITS` / `Ignore`). Sensible defaults are pre-suggested. Saved as `.units-manager.json` inside the customization, so the mapping travels with the project.
- **Prepare units** copies a Change's mapped folders into `FINAL_ROOT/{customization}/APP_UNITS|DB_UNITS/{folder}/...`, preserving subdirectory structure. Identical files are skipped (no needless mtime churn); new files are created; differing files are overwritten. A result dialog summarizes per-file actions and lists ignored / unmapped folders.

> **Coming next (M4):** instead of silent overwrite on conflict, surface each conflict in a Monaco side-by-side diff viewer with three actions — *Use NEW*, *Keep CURRENT*, or *Edit & save merged result*.

## Tech stack

- **Electron 32** — desktop runtime
- **Vite 5** + **electron-vite** — build tooling
- **React 18** + **TypeScript 5**
- **react-router-dom** (HashRouter) — multi-page navigation
- App settings stored as JSON in Electron's `userData` directory; per-customization mapping stored as `.units-manager.json` inside the RAW folder.

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

The first install pulls in Electron's prebuilt binary (~150 MB). Subsequent installs are cached.

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
   - **FINAL**: where prepared final units go, e.g. `D:\FINAL_UNITS`. The app uses the same customization name and creates `APP_UNITS` / `DB_UNITS` subfolders inside.

   Both paths are editable later from **Settings**.
3. **Home** lists every subfolder of RAW as a customization card with its change count and a *Final exists* badge if a matching folder is in FINAL.
4. Click a card → **Customization detail** view.
5. Click **+ New Change** to create the next `Change_NN` folder; Explorer opens at it so you can drag the developer's bundle in. Click **Refresh** when done.
6. The **Folder mapping** panel auto-suggests destinations based on common conventions (JS, UIXML → APP_UNITS; DDL, INC, SPC, SQL → DB_UNITS; RADXML → Ignore). Adjust if needed and click **Save mapping**. Mapping is persisted alongside the customization.
7. On any Change's accordion, click **Prepare units** to copy that change's mapped folders into FINAL. The result dialog summarizes created / overwritten / unchanged / ignored / unmapped files.
8. For subsequent changes (`Change_02`, `Change_03`, …), repeat step 7. The FINAL folder accumulates: only files present in the new Change are touched; everything else in FINAL is left alone.

## Folder structure

```
src/
  main/                     # Electron main process
    index.ts                # window + IPC registration
    settings.ts             # load/save app settings (JSON in userData)
    customizations.ts       # scan RAW root, build summaries + detail
    mapping.ts              # load/save .units-manager.json + defaults
    prepare.ts              # copy mapped folders into FINAL
  preload/index.ts          # contextBridge → window.api
  renderer/                 # React app (Vite root)
    src/
      App.tsx
      pages/
        FirstRunWizard.tsx
        Home.tsx
        CustomizationDetail.tsx
        Settings.tsx
      components/
        FileTree.tsx
        MappingPanel.tsx
        PrepareResultDialog.tsx
      styles.css
  shared/
    types.ts                # types shared across main / preload / renderer
scripts/
  run.cjs                   # launcher that strips ELECTRON_RUN_AS_NODE
electron.vite.config.ts
tsconfig.json               # references node + web configs
tsconfig.node.json          # main + preload + shared
tsconfig.web.json           # renderer + shared
```

## The `.units-manager.json` file

Whenever you save a mapping, the app writes a config file at the root of that customization's RAW folder:

```json
{
  "version": 1,
  "folders": {
    "JS":     "APP_UNITS",
    "UIXML":  "APP_UNITS",
    "DDL":    "DB_UNITS",
    "INC":    "DB_UNITS",
    "SPC":    "DB_UNITS",
    "SQL":    "DB_UNITS",
    "RADXML": "IGNORE"
  }
}
```

The app hides this file from the in-app file tree, but you'll see it in Explorer. Because it lives with the customization, the mapping survives moves and backups.

## Troubleshooting

- **`Cannot read properties of undefined (reading 'whenReady')` on launch** — `ELECTRON_RUN_AS_NODE=1` is set in your shell. The included launcher at [scripts/run.cjs](scripts/run.cjs) already strips it; if you bypass the launcher (e.g. by running `npx electron-vite dev` directly), unset the variable manually before launching.
- **`Unable to move the cache: Access is denied` on Windows** — harmless GPU cache warning, usually because a previous Electron instance is still cleaning up. Safe to ignore.
- **Customizations don't show up on Home** — verify your RAW root path in Settings, and that each customization is its own subfolder of RAW.
- **Mapping changes aren't reflected after Prepare** — click the **Save mapping** button before preparing; an in-memory edit isn't persisted until saved.

## Roadmap

- **M4 — Diff & Merge**: surface per-file conflicts during prepare with a Monaco side-by-side diff editor and three resolution actions (use new / keep current / edit + save merged).
- Issue tracking — capture and track issues you've reported back to developers per change.
- Distribution — signed installers for Windows / macOS / Linux via `electron-builder`.
- Multi-customization batch operations.

## License

[MIT](LICENSE)
