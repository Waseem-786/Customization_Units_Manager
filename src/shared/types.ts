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

export type PrepareItemAction = 'create' | 'unchanged' | 'conflict';

export interface PreparePlanItem {
  source: string;
  destination: string;
  relativePath: string;
  role: Exclude<FolderRole, 'IGNORE'>;
  action: PrepareItemAction;
  isBinary: boolean;
  sourceSize: number;
  destSize: number | null;
}

export interface PreparePlan {
  customization: string;
  change: string;
  finalPath: string;
  items: PreparePlanItem[];
  ignoredFolders: string[];
  unmappedFolders: string[];
  toCreate: number;
  toUnchanged: number;
  conflicts: number;
}

export type ConflictResolution =
  | { action: 'use-new' }
  | { action: 'keep-current' }
  | { action: 'merged'; content: string };

export type ConflictResolutions = Record<string, ConflictResolution>;

export type AppliedAction =
  | 'created'
  | 'unchanged'
  | 'overwritten'
  | 'kept-current'
  | 'merged';

export interface PreparedFile {
  source: string;
  destination: string;
  relativePath: string;
  role: Exclude<FolderRole, 'IGNORE'>;
  action: AppliedAction;
}

export interface DeploymentScriptInfo {
  filePath: string;
  spoolPath: string;
  fileCount: number;
  generatedAt: string;
}

export interface PrepareResult {
  customization: string;
  change: string;
  finalPath: string;
  filesCopied: number;
  created: number;
  overwritten: number;
  unchanged: number;
  keptCurrent: number;
  merged: number;
  ignored: string[];
  unmapped: string[];
  files: PreparedFile[];
  deploymentScript: DeploymentScriptInfo | null;
}

export interface IpcApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  pickFolder: (title?: string) => Promise<string | null>;
  listCustomizations: () => Promise<CustomizationSummary[]>;
  getCustomizationDetail: (name: string) => Promise<CustomizationDetail | null>;
  createNextChange: (name: string) => Promise<CreateChangeResult>;
  saveMapping: (name: string, mapping: MappingConfig) => Promise<MappingConfig>;
  planPrepareChange: (name: string, changeName: string) => Promise<PreparePlan>;
  applyPreparePlan: (plan: PreparePlan, resolutions: ConflictResolutions) => Promise<PrepareResult>;
  readFileText: (filePath: string) => Promise<string>;
  regenerateDeploymentScript: (name: string) => Promise<DeploymentScriptInfo | null>;
  openInExplorer: (path: string) => Promise<void>;
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
