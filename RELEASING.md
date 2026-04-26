# Releasing

How to ship a new version of Customization Units Manager. Steps assume you're on the `main` branch with a clean tree.

## 1. Decide the version number

Follows [SemVer](https://semver.org/):

| Bump | When |
| --- | --- |
| `patch` (1.0.0 → 1.0.1) | Bug fix, no behaviour change for users. |
| `minor` (1.0.0 → 1.1.0) | New feature, fully backward-compatible. |
| `major` (1.0.0 → 2.0.0) | Breaking change — mapping schema bump, IPC contract change, etc. |

## 2. Bump the version, commit, tag

`npm version` does all three in one go: it updates `package.json` + `package-lock.json`, makes a commit titled with the new version, and creates a matching annotated tag.

```sh
npm version patch        # or: minor, major, or an exact like 1.2.3
git push origin main
git push origin --tags
```

After the push the tag is live on GitHub and electron-builder will use it as the Release identifier.

## 3. Build the Windows binaries

```sh
npm run dist:win
```

Output lands in `release/`:

- `Customization-Units-Manager-Setup-X.Y.Z.exe` — NSIS installer (desktop + start-menu shortcuts).
- `Customization-Units-Manager-X.Y.Z-Portable.exe` — no-install version.
- `Customization-Units-Manager-Setup-X.Y.Z.exe.blockmap` — diff metadata for delta updates (only matters once `electron-updater` is wired in).
- `latest.yml` — electron-updater feed; safe to ignore until auto-updates are wired in.

> **First time only:** If the build fails with *"Cannot create symbolic link"* errors during `winCodeSign` extraction, that's Windows blocking symlink creation without admin rights. Our [electron-builder.yml](electron-builder.yml) already sets `signAndEditExecutable: false` to avoid this — but if you ever need real signing you'll have to enable Windows Developer Mode (Settings → Privacy & Security → For Developers → Developer Mode) or run the build from an admin terminal.

## 4. Smoke-test the build

Before publishing, double-click the Setup .exe yourself:

- Click through *More info → Run anyway* on the SmartScreen warning.
- Run the installer, then launch from the Start menu.
- Verify the first-run wizard still works (or the saved config is honoured).
- Pick a customization, run a Prepare against an existing FINAL, confirm the deployment script regenerates.

If anything's broken, fix locally, bump again (`npm version patch`), repeat.

## 5. Publish the GitHub Release

Two options. The first is the only-once setup, the second is the per-release flow.

### 5a. One-time: install and authenticate `gh`

```sh
winget install GitHub.cli
gh auth login                # pick HTTPS + browser auth
```

### 5b. Per-release: create the GitHub Release with the binaries attached

```sh
gh release create vX.Y.Z \
  release/Customization-Units-Manager-Setup-X.Y.Z.exe \
  release/Customization-Units-Manager-X.Y.Z-Portable.exe \
  --title "vX.Y.Z" \
  --generate-notes
```

`--generate-notes` auto-summarises commits since the previous tag. Edit the result on the Release page if you want a hand-written highlight section.

### 5c. Web UI fallback (no `gh` needed)

1. Open `https://github.com/Waseem-786/Customization_Units_Manager/releases/new?tag=vX.Y.Z`
2. Title: `vX.Y.Z`
3. Drag the two .exe files from `release/` into the *Attach binaries* area at the bottom.
4. Use the **Generate release notes** button for a commit-based summary.
5. Click **Publish release**.

## 6. Verify the public download links

Replace `X.Y.Z` with the version you just shipped:

- `https://github.com/Waseem-786/Customization_Units_Manager/releases/latest/download/Customization-Units-Manager-Setup-X.Y.Z.exe`
- `https://github.com/Waseem-786/Customization_Units_Manager/releases/latest/download/Customization-Units-Manager-X.Y.Z-Portable.exe`

Open one in a private/incognito window — it should download without a GitHub login. Share these links with your team.

## 7. Update the README's Download table

If filenames or version numbers change, edit the table in [README.md](README.md) under the *Download* section so the displayed names match what's on the Releases page. Commit + push as a docs commit; no version bump needed.

---

## Future automation ideas

- **GitHub Actions workflow** that triggers on `git push --tags`, builds the .exe in the cloud, and uploads to the Release automatically. Removes the need to build locally.
- **Code signing certificate** (~$200/yr from Sectigo / DigiCert) so end-users no longer see the SmartScreen warning. Requires storing the cert in CI secrets.
- **`electron-updater`** wiring so installed copies notice new releases on GitHub and auto-update. The `latest.yml` and `.blockmap` files we already produce are the inputs it needs.
- **Custom .ico icon**: drop `build/icon.ico` (256×256 PNG converted to .ico) and re-enable `signAndEditExecutable: true` once Developer Mode is on or the build is running with admin / in CI. The .exe will then show your icon and version metadata in Windows Properties.
