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

function quotationSharedQuoteId_() {
  const tz = 'Asia/Ho_Chi_Minh';
  const now = new Date();
  const y = Utilities.formatDate(now, tz, 'yyyy');
  const md = Utilities.formatDate(now, tz, 'MMdd');
  const prefix = 'BG-SUNBOT-' + y + '-' + md + '-';
  const ss = SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID);
  const sh = ss.getSheetByName('QUOTES');
  const values = sh ? sh.getDataRange().getDisplayValues() : [];
  let max = 0;
  values.forEach(function(r){
    const id = String(r[0] || '');
    if (id.indexOf(prefix) === 0) {
      const n = Number(id.slice(prefix.length));
      if (isFinite(n) && n > max) max = n;
    }
  });
  const seq = ('000' + (max + 1)).slice(-3);
  return {
    id: prefix + seq,
    display: 'BG/SUNBOT/' + y + '/' + md + '-' + seq
  };
}

function quotationSharedSaveSnapshot_(payload) {
  const clientName = String(payload.customer_name || payload.client_name || '').trim();
  if (!clientName) throw new Error('Thiếu tên khách hàng.');
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!lines.length) throw new Error('Báo giá chưa có hạng mục.');
  const createdBy = String(payload.created_by || '').trim();
  const customerId = String(payload.customer_id || '').trim();
  const opportunityId = String(payload.opportunity_id || '').trim();
  const comboCode = String(payload.combo_code || '').trim();
  const subtotal = Number(payload.subtotal || payload.final_amount || 0);
  if (!isFinite(subtotal) || subtotal < 0) throw new Error('Tổng giá trị báo giá không hợp lệ.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID);
    const quoteSheet = ss.getSheetByName('QUOTES');
    const lineSheet = ss.getSheetByName('QUOTE_LINES');
    if (!quoteSheet || !lineSheet) throw new Error('Backend thiếu bảng lưu snapshot báo giá.');
    const qid = quotationSharedQuoteId_();
    const cfg = quotationSharedConfig_();
    const now = new Date();
    quoteSheet.appendRow([
      qid.id, 1, now, createdBy, clientName, String(payload.client_type || ''), comboCode,
      subtotal, 0, 0, subtotal, 'DRAFT', false, '', '', String(payload.notes || ''),
      String(cfg.BACKEND_VERSION || ''), customerId, opportunityId
    ]);
    lines.forEach(function(line, idx){
      const qty = Number(line.qty || 0);
      const unitPrice = Number(line.unit_price || line.price || 0);
      const lineTotal = Number(line.line_total || (qty * unitPrice));
      lineSheet.appendRow([
        qid.id, idx + 1, String(line.item_id || line.code || ''), String(line.name || ''),
        String(line.unit || ''), unitPrice, qty, 0, lineTotal,
        String(payload.pricing_rule_version || ''), String(payload.pricebook_version || cfg.BACKEND_VERSION || '')
      ]);
    });
    return {
      ok:true,
      quote_id:qid.id,
      quote_code:qid.display,
      status:'DRAFT',
      customer_name:clientName,
      customer_id:customerId,
      opportunity_id:opportunityId,
      created_by:createdBy,
      created_at:now.toISOString(),
      final_amount:subtotal
    };
  } finally {
    lock.releaseLock();
  }
}

function quotationSharedHistory_() {
  const ss = SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID);
  const sh = ss.getSheetByName('QUOTES');
  if (!sh) return [];
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 4) return [];
  const headers = values[2].map(String);
  return values.slice(3).filter(function(r){ return String(r[0] || '').trim(); }).map(function(r){
    const o={}; headers.forEach(function(h,i){ if(h) o[h]=r[i]||''; }); return o;
  }).slice(-200).reverse();
}

function apiSessionQuotationShared(token, action, payload) {
  const user = quotationSharedSession_(token);
  payload = payload || {};
  switch (String(action || '')) {
    case 'bootstrap': return quotationBootstrap_(user);
    case 'catalog': return quotationCatalog_(user, payload);
    case 'preview': return quotationPreview_(user, payload);
    case 'saveSnapshot': return quotationSharedSaveSnapshot_(payload);
    case 'historySnapshot': return quotationSharedHistory_();
    default: throw new Error('Tác vụ Quotation nội bộ không hợp lệ.');
  }
}
