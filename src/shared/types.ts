export interface AppSettings {
  rawRoot: string | null;
  finalRoot: string | null;
}

export interface CustomizationSummary {
  name: string;
  rawPath: string;
  finalPath: string | null;
  hasFinal: boolean;
  changeCount: number;
  changes: string[];
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  children?: FileNode[];
}

export interface ChangeDetail {
  name: string;
  path: string;
  tree: FileNode[];
  fileCount: number;
}

export interface CustomizationDetail {
  name: string;
  rawPath: string;
  finalPath: string | null;
  hasFinal: boolean;
  changes: ChangeDetail[];
  hasUnstructuredLayout: boolean;
  topLevelFolders: string[];
  detectedFolders: string[];
  mapping: MappingConfig;
  mappingExists: boolean;
}

export interface CreateChangeResult {
  name: string;
  path: string;
}

export type FolderRole = 'APP_UNITS' | 'DB_UNITS' | 'IGNORE';

export interface MappingConfig {
  version: 1;
  folders: Record<string, FolderRole>;
}

export interface PreparedFile {
  source: string;
  destination: string;
  role: Exclude<FolderRole, 'IGNORE'>;
  action: 'created' | 'overwritten' | 'unchanged';
}

export interface PrepareResult {
  customization: string;
  change: string;
  finalPath: string;
  filesCopied: number;
  created: number;
  overwritten: number;
  unchanged: number;
  ignored: string[];
  unmapped: string[];
  files: PreparedFile[];
}

export interface IpcApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  pickFolder: (title?: string) => Promise<string | null>;
  listCustomizations: () => Promise<CustomizationSummary[]>;
  getCustomizationDetail: (name: string) => Promise<CustomizationDetail | null>;
  createNextChange: (name: string) => Promise<CreateChangeResult>;
  saveMapping: (name: string, mapping: MappingConfig) => Promise<MappingConfig>;
  prepareChange: (name: string, changeName: string) => Promise<PrepareResult>;
  openInExplorer: (path: string) => Promise<void>;
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
