const PRODUCTION = Object.freeze({
  OWNER_EMAIL: 'hrmanager.kiro@gmail.com',
  DB_ID: '1H8ATStH9PMgmku5HSCqsFMEu4-LCXAvRxM7XHOY1XAo',
  ROOT_FOLDER_ID: '1bwXPfegpoU4YlSf-R9aoN4l1TrFBm6T5'
});

/**
 * Kết nối Apps Script project production hiện có với Drive/Sheet đã bootstrap.
 * Không tạo database/folder mới.
 */
function connectExistingProduction() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(PRODUCTION.DB_ID);
  const root = DriveApp.getFolderById(PRODUCTION.ROOT_FOLDER_ID);

  const missingSheets = Object.keys(SCHEMA).filter(name => !ss.getSheetByName(name));
  if (missingSheets.length) {
    throw new Error('Database production thiếu sheet: ' + missingSheets.join(', '));
  }

  props.setProperty(APP.PROP_DB_ID, PRODUCTION.DB_ID);
  props.setProperty(APP.PROP_ROOT_FOLDER_ID, PRODUCTION.ROOT_FOLDER_ID);
  props.setProperty('SUNBOT_OPS_OWNER_EMAIL', PRODUCTION.OWNER_EMAIL);

  installTriggers_();

  return {
    ok: true,
    ownerEmail: PRODUCTION.OWNER_EMAIL,
    databaseUrl: ss.getUrl(),
    rootFolderUrl: root.getUrl(),
    message: 'Đã kết nối Apps Script với SUNBOT OPS production hiện có.'
  };
}

/**
 * Health check production sau khi deploy/push source.
 */
function productionHealthCheck() {
  const props = PropertiesService.getScriptProperties();
  const dbId = props.getProperty(APP.PROP_DB_ID);
  const rootId = props.getProperty(APP.PROP_ROOT_FOLDER_ID);
  const clientId = props.getProperty(APP.PROP_GOOGLE_CLIENT_ID);
  const intelligenceToken = props.getProperty(APP.PROP_INTELLIGENCE_TOKEN);

  const checks = {
    dbProperty: dbId === PRODUCTION.DB_ID,
    rootFolderProperty: rootId === PRODUCTION.ROOT_FOLDER_ID,
    ownerEmail: props.getProperty('SUNBOT_OPS_OWNER_EMAIL') === PRODUCTION.OWNER_EMAIL,
    databaseAccessible: false,
    rootFolderAccessible: false,
    schemaComplete: false,
    googleClientConfigured: !!clientId,
    intelligenceTokenConfigured: !!intelligenceToken,
    weeklyTriggerInstalled: ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'triggerWeeklyDrafts')
  };

  try {
    const ss = SpreadsheetApp.openById(PRODUCTION.DB_ID);
    checks.databaseAccessible = true;
    checks.schemaComplete = Object.keys(SCHEMA).every(name => !!ss.getSheetByName(name));
  } catch (err) {}

  try {
    DriveApp.getFolderById(PRODUCTION.ROOT_FOLDER_ID).getName();
    checks.rootFolderAccessible = true;
  } catch (err) {}

  return {
    ok: Object.values(checks).every(Boolean),
    checks: checks,
    version: APP.VERSION,
    checkedAt: now_()
  };
}
