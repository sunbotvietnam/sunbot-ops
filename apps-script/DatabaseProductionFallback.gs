// Production safety net: nếu Script Properties bị mất sau migration/deploy,
// khôi phục liên kết tới database và root folder đã được pin trong Production.gs.
function ensureProductionProperties_() {
  const props = PropertiesService.getScriptProperties();
  let dbId = props.getProperty(APP.PROP_DB_ID);
  let rootId = props.getProperty(APP.PROP_ROOT_FOLDER_ID);

  if (!dbId && typeof PRODUCTION !== 'undefined' && PRODUCTION.DB_ID) {
    SpreadsheetApp.openById(PRODUCTION.DB_ID).getName();
    dbId = PRODUCTION.DB_ID;
    props.setProperty(APP.PROP_DB_ID, dbId);
  }
  if (!rootId && typeof PRODUCTION !== 'undefined' && PRODUCTION.ROOT_FOLDER_ID) {
    DriveApp.getFolderById(PRODUCTION.ROOT_FOLDER_ID).getName();
    rootId = PRODUCTION.ROOT_FOLDER_ID;
    props.setProperty(APP.PROP_ROOT_FOLDER_ID, rootId);
  }
  if (!props.getProperty('SUNBOT_OPS_OWNER_EMAIL') && typeof PRODUCTION !== 'undefined' && PRODUCTION.OWNER_EMAIL) {
    props.setProperty('SUNBOT_OPS_OWNER_EMAIL', PRODUCTION.OWNER_EMAIL);
  }
  return {dbId: dbId, rootId: rootId};
}

// Gọi được từ các entry-point server-side trước khi truy cập DB.
function productionDb_() {
  const ids = ensureProductionProperties_();
  if (!ids.dbId) throw new Error('Chưa khởi tạo database.');
  return SpreadsheetApp.openById(ids.dbId);
}
