import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, IpcApi, MappingConfig } from '../shared/types';

const api: IpcApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('settings:save', settings),
  pickFolder: (title?: string) => ipcRenderer.invoke('dialog:pickFolder', title),
  listCustomizations: () => ipcRenderer.invoke('customizations:list'),
  getCustomizationDetail: (name: string) => ipcRenderer.invoke('customizations:detail', name),
  createNextChange: (name: string) => ipcRenderer.invoke('customizations:createNextChange', name),
  saveMapping: (name: string, mapping: MappingConfig) => ipcRenderer.invoke('mapping:save', name, mapping),
  prepareChange: (name: string, changeName: string) => ipcRenderer.invoke('prepare:change', name, changeName),
  openInExplorer: (target: string) => ipcRenderer.invoke('shell:open', target)
};

contextBridge.exposeInMainWorld('api', api);
