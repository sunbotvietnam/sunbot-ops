const PRODUCTION = Object.freeze({
  OWNER_EMAIL: 'tuongvan1906@gmail.com',
  DB_ID: '1xgXFFHKZxWQFRyExeMqcDYFGUxYzxooSBLu0xUvTi3w',
  ROOT_FOLDER_ID: '1broBFd7biHsGrqGHyHvxjHoCsygawfUa'
});

const COMMERCIAL_PRODUCTION_SCHEMA = Object.freeze({
  THI_TRUONG_TIN_HIEU: ['signal_id','captured_at','user_id','account_id','competitor_id','offer_id','raw_signal','source_type','source_person','evidence_url','needs_verification','review_status','verified_fact','confidence','reviewed_by_user_id','reviewed_at','created_at','updated_at'],
  DOI_THU: ['competitor_id','ten_don_vi','actor_type','dia_ban','segments','core_model','school_channel_strength','radar_priority','baseline_summary','baseline_source','last_verified_at','updated_at','created_at'],
  CHAO_BAN_THI_TRUONG: ['offer_id','competitor_id','ten_offer','do_tuoi','components','delivery_model','price_value','price_unit','payer','equipment_model','positioning_message','evidence_url','verified_at','confidence','created_at','updated_at']
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
  if (missingSheets.length) throw new Error('Database production thiếu sheet: ' + missingSheets.join(', '));
  const commercial = commercialProductionSchemaCheck_(ss);
  if (!commercial.ok) throw new Error('Commercial Intelligence schema chưa hoàn chỉnh: ' + commercial.errors.join('; '));

  props.setProperty(APP.PROP_DB_ID, PRODUCTION.DB_ID);
  props.setProperty(APP.PROP_ROOT_FOLDER_ID, PRODUCTION.ROOT_FOLDER_ID);
  props.setProperty('SUNBOT_OPS_OWNER_EMAIL', PRODUCTION.OWNER_EMAIL);
  getSessionSecret_();
  installTriggers_();

  return {
    ok: true,
    authMode: 'SESSION',
    ownerEmail: PRODUCTION.OWNER_EMAIL,
    databaseUrl: ss.getUrl(),
    rootFolderUrl: root.getUrl(),
    commercialSchema: commercial,
    message: 'Đã kết nối Apps Script với SUNBOT OPS production hiện có.'
  };
}

/**
 * Chạy một lần trong Apps Script IDE dưới tài khoản owner production.
 * Hàm này ép Google hiện consent screen nếu project còn thiếu quyền gửi mail OTP.
 */
function authorizeProduction() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, [
    'https://www.googleapis.com/auth/script.send_mail'
  ]);

  const remainingQuota = MailApp.getRemainingDailyQuota();
  return {
    ok: remainingQuota > 0,
    ownerEmail: PRODUCTION.OWNER_EMAIL,
    mailQuotaRemaining: remainingQuota,
    message: remainingQuota > 0
      ? 'Đã cấp quyền gửi email cho SUNBOT OPS production.'
      : 'Đã có quyền MailApp nhưng quota gửi mail hôm nay đã hết.'
  };
}

function commercialProductionSchemaCheck_(ss) {
  const errors = [];
  Object.keys(COMMERCIAL_PRODUCTION_SCHEMA).forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) { errors.push('Thiếu sheet ' + name); return; }
    const headers = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String) : [];
    COMMERCIAL_PRODUCTION_SCHEMA[name].forEach(h => { if (!headers.includes(h)) errors.push(name + ' thiếu cột ' + h); });
  });
  const headerChecks = {
    CO_HOI: ['expected_cash_date','lost_reason'],
    CONG_VIEC: ['opp_id'],
    CAP_NHAT: ['opp_id']
  };
  Object.keys(headerChecks).forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) { errors.push('Thiếu sheet ' + name); return; }
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    headerChecks[name].forEach(h => { if (!headers.includes(h)) errors.push(name + ' thiếu cột ' + h); });
  });
  return {ok:errors.length===0, errors:errors};
}

/** Health check production sau khi deploy/push source. */
function productionHealthCheck() {
  const props = PropertiesService.getScriptProperties();
  const dbId = props.getProperty(APP.PROP_DB_ID);
  const rootId = props.getProperty(APP.PROP_ROOT_FOLDER_ID);
  const intelligenceToken = props.getProperty(APP.PROP_INTELLIGENCE_TOKEN);

  const checks = {
    dbProperty: dbId === PRODUCTION.DB_ID,
    rootFolderProperty: rootId === PRODUCTION.ROOT_FOLDER_ID,
    ownerEmail: props.getProperty('SUNBOT_OPS_OWNER_EMAIL') === PRODUCTION.OWNER_EMAIL,
    databaseAccessible: false,
    rootFolderAccessible: false,
    schemaComplete: false,
    commercialSchemaComplete: false,
    sessionSecretConfigured: !!props.getProperty(AUTH.SESSION_SECRET_PROP),
    mailQuotaAvailable: false,
    intelligenceTokenConfigured: !!intelligenceToken,
    weeklyTriggerInstalled: ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'triggerWeeklyDrafts')
  };

  let commercial = {ok:false,errors:['Database chưa được kiểm tra']};
  try {
    const ss = SpreadsheetApp.openById(PRODUCTION.DB_ID);
    checks.databaseAccessible = true;
    checks.schemaComplete = Object.keys(SCHEMA).every(name => !!ss.getSheetByName(name));
    commercial = commercialProductionSchemaCheck_(ss);
    checks.commercialSchemaComplete = commercial.ok;
  } catch (err) {}

  try {
    DriveApp.getFolderById(PRODUCTION.ROOT_FOLDER_ID).getName();
    checks.rootFolderAccessible = true;
  } catch (err) {}

  try {
    checks.mailQuotaAvailable = MailApp.getRemainingDailyQuota() > 0;
  } catch (err) {}

  return {
    ok: Object.values(checks).every(Boolean),
    authMode: 'SESSION',
    checks: checks,
    commercialSchema: commercial,
    version: APP.VERSION,
    checkedAt: now_()
  };
}
