import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  ConflictResolutions,
  IpcApi,
  MappingConfig,
  PreparePlan
} from '../shared/types';

const api: IpcApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('settings:save', settings),
  pickFolder: (title?: string) => ipcRenderer.invoke('dialog:pickFolder', title),
  listCustomizations: () => ipcRenderer.invoke('customizations:list'),
  getCustomizationDetail: (name: string) => ipcRenderer.invoke('customizations:detail', name),
  createNextChange: (name: string) => ipcRenderer.invoke('customizations:createNextChange', name),
  saveMapping: (name: string, mapping: MappingConfig) => ipcRenderer.invoke('mapping:save', name, mapping),
  planPrepareChange: (name: string, changeName: string) =>
    ipcRenderer.invoke('prepare:plan', name, changeName),
  applyPreparePlan: (plan: PreparePlan, resolutions: ConflictResolutions) =>
    ipcRenderer.invoke('prepare:apply', plan, resolutions),
  readFileText: (filePath: string) => ipcRenderer.invoke('fs:readText', filePath),
  openInExplorer: (target: string) => ipcRenderer.invoke('shell:open', target)
};

contextBridge.exposeInMainWorld('api', api);
