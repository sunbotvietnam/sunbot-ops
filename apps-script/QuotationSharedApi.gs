const QUOTATION_SHARED_AUTH = Object.freeze({
  PRICEBOOK_ID: '1Er11CKeojfSKWfb9zYGTXSLDWocfYX7d-Gi5Sya2EDg',
  CONFIG_SHEET: '00_CONFIG',
  CACHE_PREFIX: 'QSHARED:',
  DEFAULT_SESSION_SECONDS: 21600
});

function quotationSharedConfig_() {
  const ss = SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID);
  const sh = ss.getSheetByName(QUOTATION_SHARED_AUTH.CONFIG_SHEET);
  if (!sh) throw new Error('Thiếu cấu hình backend Quotation.');
  const values = sh.getDataRange().getDisplayValues();
  const cfg = {};
  values.forEach(function(r){
    const key = String(r[0] || '').trim();
    if (key && key !== 'Khóa' && !key.startsWith('SUNBOT ')) cfg[key] = String(r[1] || '').trim();
  });
  return cfg;
}

function quotationSha256Hex_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(function(b){ const n = b < 0 ? b + 256 : b; return ('0' + n.toString(16)).slice(-2); }).join('');
}

function quotationSharedLogin_(password) {
  const cfg = quotationSharedConfig_();
  if (String(cfg.AUTH_MODE || '') !== 'SHARED_PASSWORD') throw new Error('Chế độ truy cập Quotation chưa được bật.');
  const expected = String(cfg.SHARED_PASSWORD_SHA256 || '').toLowerCase();
  const actual = quotationSha256Hex_(password).toLowerCase();
  if (!expected || actual !== expected) throw new Error('Mật khẩu không đúng.');
  const token = 'Q-' + Utilities.getUuid().replace(/-/g,'') + '-' + Date.now();
  const requestedHours = Number(cfg.SESSION_HOURS || 6);
  const seconds = Math.max(900, Math.min(21600, Math.round(requestedHours * 3600) || QUOTATION_SHARED_AUTH.DEFAULT_SESSION_SECONDS));
  CacheService.getScriptCache().put(QUOTATION_SHARED_AUTH.CACHE_PREFIX + token, JSON.stringify({kind:'quotation-shared',created_at:new Date().toISOString()}), seconds);
  return {ok:true, token:token, expires_in:seconds, access:'shared', integration:String(cfg.OPS_INTEGRATION || 'OPTIONAL_CONTEXT')};
}

function quotationSharedSession_(token) {
  const key = QUOTATION_SHARED_AUTH.CACHE_PREFIX + String(token || '').trim();
  const raw = CacheService.getScriptCache().get(key);
  if (!raw) throw new Error('Phiên truy cập đã hết hạn. Vui lòng nhập lại mật khẩu.');
  return {
    user_id:'QUOTATION-SHARED',
    ho_ten:'Nội bộ Sunbot',
    email:'',
    roles:['SALES'],
    permissions:{},
    shared_access:true
  };
}

function apiSessionQuotationShared(token, action, payload) {
  const user = quotationSharedSession_(token);
  payload = payload || {};
  switch (String(action || '')) {
    case 'bootstrap': return quotationBootstrap_(user);
    case 'catalog': return quotationCatalog_(user, payload);
    case 'preview': return quotationPreview_(user, payload);
    case 'save': return quotationSave_(user, payload);
    case 'history': return quotationHistory_(user, payload);
    default: throw new Error('Tác vụ Quotation nội bộ không hợp lệ.');
  }
}
