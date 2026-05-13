// Mock window.api for screenshots / portfolio demos.
// Activated by appending `?mock=1` to the URL (see main.tsx).
// Returns deterministic FLEXCUBE-flavoured fixtures so every screen renders
// with realistic-looking data without touching the disk.

import type {
  CustomizationDetail,
  CustomizationSummary,
  IpcApi,
  PreparePlan,
  PreparePlanItem
} from '../../../shared/types';

const ORIGINAL_SQL = `CREATE OR REPLACE PACKAGE BODY IAPKS_IADREDMN_MAIN AS

PROCEDURE Pr_Log_Change(p_field VARCHAR2, p_action CHAR, p_old VARCHAR2) IS
BEGIN
  INSERT INTO STTM_LOG VALUES (p_field, p_action, p_old, SYSDATE);
  COMMIT;
END;

PROCEDURE Pr_Validate_Account(p_acc_no VARCHAR2) IS
  l_status VARCHAR2(1);
BEGIN
  SELECT status
    INTO l_status
    FROM STTM_ACCOUNT
   WHERE acc_no = p_acc_no;

  IF l_status = 'C' THEN
    Pr_Log_Change('STATUS', 'D', l_status);
  END IF;
END;

PROCEDURE Pr_Update_Rate(p_acc_no VARCHAR2, p_rate NUMBER) IS
BEGIN
  UPDATE STTM_ACCOUNT
     SET interest_rate = p_rate,
         modified_on   = SYSDATE
   WHERE acc_no = p_acc_no;
  COMMIT;
END;

END IAPKS_IADREDMN_MAIN;
`;

const NEW_SQL = `CREATE OR REPLACE PACKAGE BODY IAPKS_IADREDMN_MAIN AS

PROCEDURE Pr_Log_Change(p_field VARCHAR2, p_action CHAR, p_old VARCHAR2, p_new VARCHAR2 DEFAULT NULL) IS
BEGIN
  INSERT INTO STTM_LOG VALUES (p_field, p_action, p_old, p_new, SYSDATE, USER);
  COMMIT;
END;

PROCEDURE Pr_Validate_Account(p_acc_no VARCHAR2) IS
  l_status VARCHAR2(1);
  l_branch VARCHAR2(3);
BEGIN
  SELECT status, branch_code
    INTO l_status, l_branch
    FROM STTM_ACCOUNT
   WHERE acc_no = p_acc_no;

  IF l_status = 'C' THEN
    Pr_Log_Change('STATUS', 'D', l_status, 'A');
  END IF;

  IF l_branch IS NOT NULL THEN
    UPDATE STTM_BRANCH
       SET last_check = SYSDATE
     WHERE branch = l_branch;
  END IF;
END;

PROCEDURE Pr_Update_Rate(p_acc_no VARCHAR2, p_rate NUMBER) IS
BEGIN
  UPDATE STTM_ACCOUNT
     SET interest_rate = p_rate,
         modified_on   = SYSDATE,
         modified_by   = USER
   WHERE acc_no = p_acc_no;
  COMMIT;
END;

END IAPKS_IADREDMN_MAIN;
`;

const ORIGINAL_INC = `INSERT INTO GWTM_AMEND_FIELDS
  (function_id, field_name, field_label, field_type, is_amendable)
VALUES
  ('IADREDMN', 'ACC_NO',    'Account Number',    'VARCHAR2', 'N'),
  ('IADREDMN', 'STATUS',    'Account Status',    'CHAR',     'Y'),
  ('IADREDMN', 'BALANCE',   'Current Balance',   'NUMBER',   'N');
COMMIT;
`;

const NEW_INC = `INSERT INTO GWTM_AMEND_FIELDS
  (function_id, field_name, field_label, field_type, is_amendable, default_value)
VALUES
  ('IADREDMN', 'ACC_NO',     'Account Number',     'VARCHAR2', 'N', NULL),
  ('IADREDMN', 'STATUS',     'Account Status',     'CHAR',     'Y', 'A'),
  ('IADREDMN', 'BALANCE',    'Current Balance',    'NUMBER',   'N', 0),
  ('IADREDMN', 'BRANCH_CODE','Branch Code',        'VARCHAR2', 'Y', NULL);
COMMIT;
`;

const CUSTOMIZATIONS: CustomizationSummary[] = [
  { name: 'RSD_2025_0497_Customization', rawPath: 'D:\\UNITS\\RSD_2025_0497_Customization', finalPath: 'D:\\FINAL_UNITS\\RSD_2025_0497_Customization', hasFinal: true,  changeCount: 2, changes: ['Change_01', 'Change_02'] },
  { name: 'RSD_2025_0499_AmendModule',   rawPath: 'D:\\UNITS\\RSD_2025_0499_AmendModule',   finalPath: 'D:\\FINAL_UNITS\\RSD_2025_0499_AmendModule',   hasFinal: false, changeCount: 1, changes: ['Change_01'] },
  { name: 'RSD_2025_0501_GatewayMap',    rawPath: 'D:\\UNITS\\RSD_2025_0501_GatewayMap',    finalPath: 'D:\\FINAL_UNITS\\RSD_2025_0501_GatewayMap',    hasFinal: true,  changeCount: 3, changes: ['Change_01', 'Change_02', 'Change_03'] },
  { name: 'RSD_2025_0503_LoanRollover',  rawPath: 'D:\\UNITS\\RSD_2025_0503_LoanRollover',  finalPath: 'D:\\FINAL_UNITS\\RSD_2025_0503_LoanRollover',  hasFinal: false, changeCount: 1, changes: ['Change_01'] },
  { name: 'RSD_2025_0510_ChargeWaiver',  rawPath: 'D:\\UNITS\\RSD_2025_0510_ChargeWaiver',  finalPath: 'D:\\FINAL_UNITS\\RSD_2025_0510_ChargeWaiver',  hasFinal: true,  changeCount: 4, changes: ['Change_01', 'Change_02', 'Change_03', 'Change_04'] }
];

function buildDetail(name: string): CustomizationDetail {
  return {
    name,
    rawPath: 'D:\\UNITS\\' + name,
    finalPath: 'D:\\FINAL_UNITS\\' + name,
    hasFinal: true,
    changes: [
      {
        name: 'Change_01',
        path: 'D:\\UNITS\\' + name + '\\Change_01',
        fileCount: 24,
        tree: [
          { name: 'INC', path: '...', isDir: true, children: [
            { name: 'CSTB_FID_DATA_BLOCKS__IADREDMN.INC', path: '...', isDir: false, size: 4502 },
            { name: 'CSTB_FID_SCREENS__IADREDMN.INC',     path: '...', isDir: false, size: 8120 },
            { name: 'GWTM_AMEND_FIELDS__IADREDMN.INC',    path: '...', isDir: false, size: 3204 },
            { name: 'SMTB_FUNCTION_DESCRIPTION__IADREDMN.INC', path: '...', isDir: false, size: 1804 }
          ]},
          { name: 'JS',  path: '...', isDir: true, children: [
            { name: 'IADREDMN_VAL.js', path: '...', isDir: false, size: 12005 }
          ]},
          { name: 'SQL', path: '...', isDir: true, children: [
            { name: 'iapks_iadredmn_main.sql', path: '...', isDir: false, size: 152034 },
            { name: 'PR_ACCOUNT_RATE_UPDATE.prc', path: '...', isDir: false, size: 3201 }
          ]},
          { name: 'SPC', path: '...', isDir: true, children: [
            { name: 'iapks_iadredmn_main.spc', path: '...', isDir: false, size: 5421 }
          ]},
          { name: 'UIXML', path: '...', isDir: true, children: [
            { name: 'IADREDMN.uixml', path: '...', isDir: false, size: 28104 }
          ]},
          { name: 'RADXML', path: '...', isDir: true, children: [
            { name: 'IADREDMN.radxml', path: '...', isDir: false, size: 102450 }
          ]}
        ]
      },
      {
        name: 'Change_02',
        path: 'D:\\UNITS\\' + name + '\\Change_02',
        fileCount: 3,
        tree: [
          { name: 'SQL', path: '...', isDir: true, children: [
            { name: 'iapks_iadredmn_main.sql', path: '...', isDir: false, size: 158211 },
            { name: 'PR_BRANCH_VALIDATE.prc',  path: '...', isDir: false, size: 4012 }
          ]},
          { name: 'INC', path: '...', isDir: true, children: [
            { name: 'GWTM_AMEND_FIELDS__IADREDMN.INC', path: '...', isDir: false, size: 3450 }
          ]}
        ]
      }
    ],
    hasUnstructuredLayout: false,
    topLevelFolders: [],
    detectedItems: [
      { name: 'INC',    kind: 'folder' },
      { name: 'JS',     kind: 'folder' },
      { name: 'RADXML', kind: 'folder' },
      { name: 'SPC',    kind: 'folder' },
      { name: 'SQL',    kind: 'folder' },
      { name: 'UIXML',  kind: 'folder' },
      { name: 'release-notes.md', kind: 'file' }
    ],
    mapping: {
      version: 2,
      buckets: ['APP_UNITS', 'DB_UNITS', 'DOCS'],
      entries: {
        INC:    { kind: 'folder', destination: 'DB_UNITS' },
        JS:     { kind: 'folder', destination: 'APP_UNITS' },
        RADXML: { kind: 'folder', destination: 'IGNORE' },
        SPC:    { kind: 'folder', destination: 'DB_UNITS' },
        SQL:    { kind: 'folder', destination: 'DB_UNITS' },
        UIXML:  { kind: 'folder', destination: 'APP_UNITS' },
        'release-notes.md': { kind: 'file', destination: 'DOCS' }
      }
    },
    mappingExists: true,
    unmappedItems: []
  };
}

export function installMockApi(): void {
  const api: IpcApi = {
    getSettings: async () => ({ rawRoot: 'D:\\UNITS', finalRoot: 'D:\\FINAL_UNITS' }),
    saveSettings: async (s) => s,
    pickFolder: async () => null,
    listCustomizations: async () => CUSTOMIZATIONS,
    getCustomizationDetail: async (name) => buildDetail(name),
    createNextChange: async () => ({ name: 'Change_03', path: '...' }),
    saveMapping: async (_name, m) => m,
    planPrepareChange: async (custName, changeName) => {
      const finalPath = 'D:\\FINAL_UNITS\\' + custName;
      const items: PreparePlanItem[] = [
        {
          source: `D:\\UNITS\\${custName}\\${changeName}\\SQL\\iapks_iadredmn_main.sql`,
          destination: `${finalPath}\\DB_UNITS\\SQL\\iapks_iadredmn_main.sql`,
          relativePath: 'DB_UNITS/SQL/iapks_iadredmn_main.sql',
          role: 'DB_UNITS',
          action: 'conflict',
          isBinary: false,
          sourceSize: 158211,
          destSize: 152034
        },
        {
          source: `D:\\UNITS\\${custName}\\${changeName}\\INC\\GWTM_AMEND_FIELDS__IADREDMN.INC`,
          destination: `${finalPath}\\DB_UNITS\\INC\\GWTM_AMEND_FIELDS__IADREDMN.INC`,
          relativePath: 'DB_UNITS/INC/GWTM_AMEND_FIELDS__IADREDMN.INC',
          role: 'DB_UNITS',
          action: 'conflict',
          isBinary: false,
          sourceSize: 3450,
          destSize: 3204
        },
        {
          source: `D:\\UNITS\\${custName}\\${changeName}\\SQL\\PR_BRANCH_VALIDATE.prc`,
          destination: `${finalPath}\\DB_UNITS\\SQL\\PR_BRANCH_VALIDATE.prc`,
          relativePath: 'DB_UNITS/SQL/PR_BRANCH_VALIDATE.prc',
          role: 'DB_UNITS',
          action: 'create',
          isBinary: false,
          sourceSize: 4012,
          destSize: null
        }
      ];
      const plan: PreparePlan = {
        customization: custName,
        change: changeName,
        finalPath,
        items,
        ignoredFolders: ['RADXML'],
        unmappedFolders: [],
        toCreate: 1,
        toUnchanged: 8,
        conflicts: 2
      };
      return plan;
    },
    applyPreparePlan: async (plan) => ({
      customization: plan.customization,
      change: plan.change,
      finalPath: plan.finalPath,
      filesCopied: plan.toCreate + plan.conflicts,
      created: plan.toCreate,
      overwritten: 0,
      unchanged: plan.toUnchanged,
      keptCurrent: 0,
      merged: plan.conflicts,
      ignored: plan.ignoredFolders,
      unmapped: plan.unmappedFolders,
      files: plan.items.map((i) => ({
        source: i.source,
        destination: i.destination,
        relativePath: i.relativePath,
        role: i.role,
        action: i.action === 'create' ? 'created' : 'merged'
      })),
      deploymentScript: {
        filePath: plan.finalPath + '\\Deployment_Script.txt',
        spoolPath: plan.finalPath + '\\' + plan.customization + '_26042026.spl',
        fileCount: 14,
        generatedAt: new Date().toISOString()
      }
    }),
    readFileText: async (filePath: string) => {
      const isOriginal = filePath.includes('FINAL_UNITS');
      if (filePath.endsWith('.INC')) return isOriginal ? ORIGINAL_INC : NEW_INC;
      return isOriginal ? ORIGINAL_SQL : NEW_SQL;
    },
    regenerateDeploymentScript: async (name) => ({
      filePath: 'D:\\FINAL_UNITS\\' + name + '\\Deployment_Script.txt',
      spoolPath: 'D:\\FINAL_UNITS\\' + name + '\\' + name + '_26042026.spl',
      fileCount: 14,
      generatedAt: new Date().toISOString()
    }),
    openInExplorer: async () => {}
  };

  Object.defineProperty(window, 'api', { value: api, writable: true, configurable: true });
  // eslint-disable-next-line no-console
  console.log('[mock] window.api stubbed — screenshot/demo mode');
}
