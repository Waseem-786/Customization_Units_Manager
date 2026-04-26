import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSettings, saveSettings } from './settings';
import { listCustomizations, getCustomizationDetail, createNextChange } from './customizations';
import { saveMapping as saveMappingToDisk } from './mapping';
import { prepareChange } from './prepare';
import type { AppSettings, MappingConfig } from '../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Customization Units Manager',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => win.show());
  return win;
}

function registerIpc(): void {
  ipcMain.handle('settings:get', async () => loadSettings());
  ipcMain.handle('settings:save', async (_evt, settings: AppSettings) => saveSettings(settings));

  ipcMain.handle('dialog:pickFolder', async (evt, title?: string) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: title ?? 'Select folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('customizations:list', async () => {
    const settings = await loadSettings();
    return listCustomizations(settings);
  });

  ipcMain.handle('customizations:detail', async (_evt, name: string) => {
    const settings = await loadSettings();
    return getCustomizationDetail(settings, name);
  });

  ipcMain.handle('customizations:createNextChange', async (_evt, name: string) => {
    const settings = await loadSettings();
    return createNextChange(settings, name);
  });

  ipcMain.handle('mapping:save', async (_evt, name: string, mapping: MappingConfig) => {
    const settings = await loadSettings();
    if (!settings.rawRoot) throw new Error('RAW root is not configured.');
    const customRawPath = path.join(settings.rawRoot, name);
    return saveMappingToDisk(customRawPath, mapping);
  });

  ipcMain.handle('prepare:change', async (_evt, name: string, changeName: string) => {
    const settings = await loadSettings();
    return prepareChange(settings, name, changeName);
  });

  ipcMain.handle('shell:open', async (_evt, target: string) => {
    await shell.openPath(target);
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
