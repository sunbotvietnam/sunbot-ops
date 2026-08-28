const QUOTATION_APPROVAL = Object.freeze({
  VERSION: '2026.08.28-v2',
  AUTH_SHEET: 'AUTH_USERS',
  HEADER_ROW: 3,
  SESSION_PREFIX: 'QUSER:',
  SESSION_SECONDS: 21600,
  SHEETS: Object.freeze({
    CATALOG: 'CATALOG_ITEMS',
    PRICES: 'PRICE_VERSIONS',
    COMMERCIAL: 'COMMERCIAL_CLASS',
    QUOTES: 'QUOTES',
    LINES: 'QUOTE_LINES',
    AUDIT: 'AUDIT_LOG'
  })
});

function quotationApprovalSpreadsheet_() {
  return SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID);
}

function quotationApprovalNormalizeLogin_(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('vi-VN');
}

function quotationApprovalYes_(value) {
  return value === true || String(value || '').trim().toUpperCase() === 'TRUE' || Number(value) === 1;
}

function quotationApprovalNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const normalized = String(value == null ? '' : value).replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return isFinite(number) ? number : 0;
}

function quotationApprovalRows_(sheetName, headerRow) {
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Thiếu bảng dữ liệu Quotation: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  const rowNumber = Number(headerRow || QUOTATION_APPROVAL.HEADER_ROW);
  if (values.length < rowNumber) return [];
  const headers = values[rowNumber - 1].map(function(value){ return String(value || '').trim(); });
  return values.slice(rowNumber).filter(function(row){
    return row.some(function(value){ return String(value == null ? '' : value).trim() !== ''; });
  }).map(function(row, offset){
    const record = {_row:rowNumber + offset + 1};
    headers.forEach(function(header, index){ if (header) record[header] = row[index] === undefined ? '' : row[index]; });
    return record;
  });
}

function quotationApprovalAuthUsers_() {
  return quotationApprovalRows_(QUOTATION_APPROVAL.AUTH_SHEET, 1).filter(function(user){
    return quotationApprovalYes_(user.ENABLED);
  });
}

function quotationApprovalLogin_(loginId, password) {
  const normalized = quotationApprovalNormalizeLogin_(loginId);
  const passwordText = String(password || '');
  const user = quotationApprovalAuthUsers_().find(function(row){
    return quotationApprovalNormalizeLogin_(row.LOGIN_ID) === normalized;
  });
  const actualHash = quotationSha256Hex_(passwordText).toLowerCase();
  const expectedHash = user ? String(user.PASSWORD_HASH_SHA256 || '').trim().toLowerCase() : quotationSha256Hex_('invalid-quotation-user').toLowerCase();
  if (!normalized || !passwordText || !user || !expectedHash || actualHash !== expectedHash) {
    throw new Error('ID hoặc mật khẩu không đúng.');
  }
  const role = String(user.ROLE || '').trim().toUpperCase();
  if (['ADMIN', 'REGIONAL_MANAGER'].indexOf(role) < 0) throw new Error('ID hoặc mật khẩu không đúng.');
  const token = 'QU-' + Utilities.getUuid().replace(/-/g, '') + '-' + Utilities.getUuid().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + QUOTATION_APPROVAL.SESSION_SECONDS * 1000).toISOString();
  const session = {
    login_id:String(user.LOGIN_ID || '').trim(),
    display_name:String(user.DISPLAY_NAME || user.LOGIN_ID || '').trim(),
    role:role,
    region:String(user.REGION || '').trim(),
    expires_at:expiresAt
  };
  CacheService.getScriptCache().put(QUOTATION_APPROVAL.SESSION_PREFIX + token, JSON.stringify(session), QUOTATION_APPROVAL.SESSION_SECONDS);
  return {ok:true, token:token, login_id:session.login_id, display_name:session.display_name, role:session.role, region:session.region, expires_at:expiresAt};
}

function quotationApprovalSession_(token) {
  const raw = CacheService.getScriptCache().get(QUOTATION_APPROVAL.SESSION_PREFIX + String(token || '').trim());
  if (!raw) throw new Error('Phiên truy cập đã hết hạn. Vui lòng đăng nhập lại.');
  let session;
  try { session = JSON.parse(raw); } catch (error) { throw new Error('Phiên truy cập đã hết hạn. Vui lòng đăng nhập lại.'); }
  if (!session.expires_at || new Date(session.expires_at).getTime() <= Date.now()) throw new Error('Phiên truy cập đã hết hạn. Vui lòng đăng nhập lại.');
  return session;
}

function quotationApprovalActive_(row, at) {
  const now = at || new Date();
  const status = String(row.status || 'ACTIVE').trim().toUpperCase();
  const from = row.valid_from ? new Date(row.valid_from) : null;
  const to = row.valid_to ? new Date(row.valid_to) : null;
  return status === 'ACTIVE' && (!from || isNaN(from.getTime()) || from <= now) && (!to || isNaN(to.getTime()) || to >= now);
}

function quotationApprovalCommercialMap_() {
  const rows = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.COMMERCIAL, 1).filter(function(row){
    return String(row.status || '').toUpperCase() === 'ACTIVE';
  });
  const types = {}, overrides = {};
  rows.forEach(function(row){
    const target = String(row.match_type || '').toUpperCase() === 'ITEM_ID_OVERRIDE' ? overrides : types;
    target[String(row.match_value || '').trim().toUpperCase()] = {
      group:String(row.commercial_group || 'B').trim().toUpperCase(),
      user_max:quotationApprovalNumber_(row.customer_discount_user_max)
    };
  });
  return {types:types, overrides:overrides};
}

function quotationApprovalInternalCatalog_() {
  const at = new Date();
  const priceRows = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.PRICES).filter(function(row){ return quotationApprovalActive_(row, at); });
  const priceByItem = {};
  priceRows.sort(function(a, b){ return new Date(a.valid_from || 0) - new Date(b.valid_from || 0); }).forEach(function(row){ priceByItem[String(row.item_id || '').trim()] = row; });
  const commercial = quotationApprovalCommercialMap_();
  return quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.CATALOG).filter(function(row){
    return quotationApprovalActive_(row, at) && quotationApprovalYes_(row.sales_visible) && quotationApprovalYes_(row.quote_selectable);
  }).map(function(row){
    const id = String(row.item_id || '').trim(), price = priceByItem[id] || row;
    const override = commercial.overrides[id.toUpperCase()], byType = commercial.types[String(row.item_type || '').trim().toUpperCase()] || {group:'B', user_max:0};
    const classification = override || byType;
    return {
      item_id:id,
      item_type:String(row.item_type || '').trim(),
      category:String(row.category || '').trim(),
      name:String(row.name || '').trim(),
      description:String(row.description || '').trim(),
      unit:String(row.unit || '').trim(),
      list_price:quotationApprovalNumber_(price.list_price),
      recommended_price:quotationApprovalNumber_(price.recommended_price),
      floor_price:quotationApprovalNumber_(price.floor_price),
      price_version_id:String(price.price_version_id || '').trim(),
      commercial_group:String(classification.group || 'B').toUpperCase(),
      max_user_discount_pct:Number(classification.user_max || 0),
      customer_visible:quotationApprovalYes_(row.customer_visible)
    };
  });
}

function quotationApprovalCatalog_(session) {
  const admin = session.role === 'ADMIN';
  return {
    backend_version:QUOTATION_APPROVAL.VERSION,
    items:quotationApprovalInternalCatalog_().map(function(item){
      const output = {
        item_id:item.item_id, price_id:item.item_id, item_type:item.item_type, category:item.category,
        name:item.name, description:item.description, unit:item.unit,
        recommended_price:item.recommended_price, payment_price:item.recommended_price, price_before_tax:item.recommended_price,
        commercial_group:item.commercial_group, max_user_discount_pct:item.max_user_discount_pct,
        customer_visible:item.customer_visible, price_version_id:item.price_version_id
      };
      if (admin) {
        output.list_price = item.list_price;
        output.floor_price = item.floor_price;
        output.economics = {spread_to_floor:item.recommended_price - item.floor_price};
      }
      return output;
    }),
    generated_at:new Date().toISOString()
  };
}

function quotationApprovalHeaders_(sheet, required, headerRow) {
  const row = Number(headerRow || QUOTATION_APPROVAL.HEADER_ROW);
  const width = Math.max(sheet.getLastColumn(), required.length);
  if (width > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  const current = sheet.getRange(row, 1, 1, width).getDisplayValues()[0].map(String);
  const headers = current.slice();
  while (headers.length && !String(headers[headers.length - 1] || '').trim()) headers.pop();
  required.forEach(function(header){ if (headers.indexOf(header) < 0) headers.push(header); });
  if (headers.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  sheet.getRange(row, 1, 1, headers.length).setValues([headers]);
  return headers;
}

function quotationApprovalAppendObject_(sheet, headers, record) {
  sheet.appendRow(headers.map(function(header){ return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ''; }));
}

function quotationApprovalSet_(sheet, row, headers, values) {
  Object.keys(values).forEach(function(header){
    const index = headers.indexOf(header);
    if (index >= 0) sheet.getRange(row, index + 1).setValue(values[header]);
  });
}

function quotationApprovalQuoteHeaders_() {
  return ['quote_id','version','created_at','created_by','client_name','client_type','combo_code','subtotal','discount_rate','discount_amount','final_amount','status','approval_required','approved_by','approved_at','notes','pricebook_version','customer_id','opportunity_id','region','creator_role','deal_owner','standard_amount','proposed_amount','exception_reason','commercial_fingerprint','updated_at','rejected_by','rejected_at','rejection_reason','exportable'];
}

function quotationApprovalLineHeaders_() {
  return ['quote_id','line_no','item_id','item_name_snapshot','unit_snapshot','unit_price_snapshot','qty','discount_rate','line_total','pricing_rule_version','source_price_version','version','commercial_group','standard_unit_price','proposed_unit_price','floor_price_snapshot','exception_reason','is_custom'];
}

function quotationApprovalAudit_(session, action, quoteId, detail) {
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.AUDIT);
  if (!sheet) throw new Error('Backend thiếu bảng AUDIT_LOG.');
  const headers = quotationApprovalHeaders_(sheet, ['audit_id','timestamp','user_id','action','entity_type','entity_id','detail_json'], QUOTATION_APPROVAL.HEADER_ROW);
  quotationApprovalAppendObject_(sheet, headers, {
    audit_id:'AUD-' + Utilities.getUuid(), timestamp:new Date(), user_id:session.login_id,
    action:action, entity_type:'QUOTE', entity_id:quoteId, detail_json:JSON.stringify(detail || {})
  });
}

function quotationApprovalValidateLine_(session, requested, item, quantity, reason) {
  const proposed = quotationApprovalNumber_(requested.proposed_unit_price !== undefined ? requested.proposed_unit_price : (requested.unit_price !== undefined ? requested.unit_price : requested.price));
  const price = proposed > 0 ? proposed : item.recommended_price;
  const discount = item.recommended_price > 0 ? Math.max(0, (item.recommended_price - price) / item.recommended_price) : 0;
  const group = item.commercial_group;
  if (price < item.floor_price && session.role !== 'ADMIN') throw new Error('Giá đề xuất thấp hơn mức được phép.');
  if (session.role === 'REGIONAL_MANAGER') {
    if ((group === 'C' || group === 'MIXED_GROWTH') && discount > 0.0000001) throw new Error('Hạng mục này không được giảm giá ở quyền Trưởng vùng.');
    if ((group === 'A' || group === 'B') && discount > 0.0300001) throw new Error('Mức giảm nhóm A/B vượt quá 3%.');
  } else if (group === 'MIXED_GROWTH' && discount > 0.0000001) {
    if (item.recommended_price * quantity < 50000000 || discount > 0.0500001 || price < item.floor_price) throw new Error('Camp/Event chỉ được Admin giảm tối đa 5% khi doanh thu hạng mục từ 50 triệu và không dưới giá sàn.');
  }
  if (session.role === 'ADMIN' && price < item.floor_price && !reason) throw new Error('Giá dưới sàn cần lý do duyệt đặc biệt.');
  return {price:price, discount:discount};
}

function quotationApprovalBuildLines_(session, payload) {
  const catalog = quotationApprovalInternalCatalog_(), byId = {};
  catalog.forEach(function(item){ byId[item.item_id] = item; });
  const requested = Array.isArray(payload.lines) ? payload.lines : [];
  if (!requested.length) throw new Error('Báo giá chưa có hạng mục.');
  const reason = String(payload.exception_reason || payload.notes || '').trim();
  return requested.map(function(line, index){
    const itemId = String(line.item_id || line.code || '').trim();
    const quantity = quotationApprovalNumber_(line.qty !== undefined ? line.qty : line.quantity);
    if (!itemId || quantity <= 0) throw new Error('Dòng báo giá không hợp lệ tại vị trí ' + (index + 1) + '.');
    let item = byId[itemId], isCustom = false;
    if (!item) {
      if (session.role !== 'ADMIN' || !reason) throw new Error('Hạng mục tùy chỉnh cần Admin và lý do duyệt đặc biệt.');
      const standard = quotationApprovalNumber_(line.standard_unit_price || line.recommended_price || line.unit_price || line.price);
      item = {item_id:itemId, name:String(line.name || 'Hạng mục tùy chỉnh').trim(), unit:String(line.unit || '').trim(), recommended_price:standard, floor_price:0, commercial_group:'CUSTOM', price_version_id:'CUSTOM'};
      isCustom = true;
    }
    const checked = quotationApprovalValidateLine_(session, line, item, quantity, reason);
    return {
      line_no:index + 1, item_id:item.item_id, item_name_snapshot:item.name, unit_snapshot:item.unit,
      unit_price_snapshot:checked.price, qty:quantity, discount_rate:checked.discount,
      line_total:Math.round(checked.price * quantity), pricing_rule_version:QUOTATION_APPROVAL.VERSION,
      source_price_version:item.price_version_id, commercial_group:item.commercial_group,
      standard_unit_price:item.recommended_price, proposed_unit_price:checked.price,
      floor_price_snapshot:item.floor_price, exception_reason:reason, is_custom:isCustom
    };
  });
}

function quotationApprovalFingerprint_(lines) {
  return quotationSha256Hex_(JSON.stringify(lines.map(function(line){
    return [line.item_id,line.qty,line.standard_unit_price,line.proposed_unit_price,line.commercial_group];
  })));
}

function quotationApprovalLatest_(quoteId) {
  return quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.QUOTES).filter(function(row){ return String(row.quote_id) === String(quoteId); }).sort(function(a,b){ return Number(b.version || 1) - Number(a.version || 1); })[0] || null;
}

function quotationApprovalSave_(session, payload) {
  const clientName = String(payload.customer_name || payload.client_name || '').trim();
  if (!clientName) throw new Error('Hãy nhập tên khách hàng.');
  const lines = quotationApprovalBuildLines_(session, payload);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const spreadsheet = quotationApprovalSpreadsheet_();
    const quoteSheet = spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES), lineSheet = spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.LINES);
    if (!quoteSheet || !lineSheet) throw new Error('Backend thiếu bảng lưu báo giá.');
    const quoteHeaders = quotationApprovalHeaders_(quoteSheet, quotationApprovalQuoteHeaders_(), QUOTATION_APPROVAL.HEADER_ROW);
    const lineHeaders = quotationApprovalHeaders_(lineSheet, quotationApprovalLineHeaders_(), QUOTATION_APPROVAL.HEADER_ROW);
    const requestedId = String(payload.quote_id || '').trim(), previous = requestedId ? quotationApprovalLatest_(requestedId) : null;
    if (requestedId && !previous) throw new Error('Không tìm thấy báo giá cần tạo phiên bản mới.');
    if (previous && session.role !== 'ADMIN' && String(previous.created_by) !== session.login_id) throw new Error('Bạn không được sửa báo giá của Trưởng vùng khác.');
    const generated = requestedId ? {id:requestedId, display:quotationApprovalDisplayCode_(requestedId)} : quotationSharedQuoteId_();
    const version = previous ? Number(previous.version || 1) + 1 : 1;
    const standard = lines.reduce(function(sum,line){ return sum + line.standard_unit_price * line.qty; }, 0);
    const proposed = lines.reduce(function(sum,line){ return sum + line.line_total; }, 0);
    const discountAmount = Math.max(0, standard - proposed), discountRate = standard ? discountAmount / standard : 0;
    const now = new Date(), reason = String(payload.exception_reason || payload.notes || '').trim();
    quotationApprovalAppendObject_(quoteSheet, quoteHeaders, {
      quote_id:generated.id, version:version, created_at:now, created_by:session.login_id,
      client_name:clientName, client_type:String(payload.client_type || ''), combo_code:String(payload.combo_code || ''),
      subtotal:standard, discount_rate:discountRate, discount_amount:discountAmount, final_amount:proposed,
      status:'NEEDS_APPROVAL', approval_required:true, approved_by:'', approved_at:'', notes:String(payload.notes || ''),
      pricebook_version:QUOTATION_APPROVAL.VERSION, customer_id:String(payload.customer_id || ''), opportunity_id:String(payload.opportunity_id || ''),
      region:session.region, creator_role:session.role, deal_owner:session.login_id,
      standard_amount:standard, proposed_amount:proposed, exception_reason:reason,
      commercial_fingerprint:quotationApprovalFingerprint_(lines), updated_at:now,
      rejected_by:'', rejected_at:'', rejection_reason:'', exportable:false
    });
    lines.forEach(function(line){ line.quote_id = generated.id; line.version = version; quotationApprovalAppendObject_(lineSheet, lineHeaders, line); });
    quotationApprovalAudit_(session, previous && String(previous.status) === 'APPROVED' ? 'QUOTE_APPROVAL_INVALIDATED' : (version > 1 ? 'QUOTE_REVISION' : 'QUOTE_CREATE'), generated.id, {version:version,status:'NEEDS_APPROVAL',standard_amount:standard,proposed_amount:proposed,discount_rate:discountRate,previous_status:previous ? String(previous.status || '') : ''});
    return {ok:true,quote_id:generated.id,quote_code:generated.display,version:version,status:'NEEDS_APPROVAL',exportable:false,created_by:session.login_id,display_name:session.display_name,region:session.region,standard_amount:standard,final_amount:proposed};
  } finally { lock.releaseLock(); }
}

function quotationApprovalDisplayCode_(quoteId) {
  const match = String(quoteId || '').match(/^BG-SUNBOT-(\d{4})-(\d{4})-(\d{3})$/);
  return match ? 'BG/SUNBOT/' + match[1] + '/' + match[2] + '-' + match[3] : String(quoteId || '');
}

function quotationApprovalQuoteBundle_(session, payload, requireApproved) {
  const quoteId = String(payload.quote_id || '').trim(), quote = quotationApprovalLatest_(quoteId);
  if (!quote) throw new Error('Không tìm thấy báo giá.');
  if (session.role !== 'ADMIN' && String(quote.created_by) !== session.login_id) throw new Error('Bạn không có quyền xem báo giá này.');
  if (requireApproved && String(quote.status) !== 'APPROVED') throw new Error('Chỉ báo giá đã duyệt mới được xuất.');
  let lines = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.LINES).filter(function(line){ return String(line.quote_id) === quoteId && Number(line.version || 1) === Number(quote.version || 1); });
  if (session.role !== 'ADMIN') lines = lines.map(function(line){ const safe=Object.assign({},line); delete safe.floor_price_snapshot; return safe; });
  const safeQuote = Object.assign({}, quote); delete safeQuote._row;
  safeQuote.exportable = String(quote.status) === 'APPROVED';
  return {quote:safeQuote,lines:lines.map(function(line){ const safe=Object.assign({},line); delete safe._row; return safe; })};
}

function quotationApprovalDecision_(session, payload, approved) {
  if (session.role !== 'ADMIN') throw new Error('Chỉ Admin được duyệt hoặc từ chối báo giá.');
  const quoteId = String(payload.quote_id || '').trim(), quote = quotationApprovalLatest_(quoteId);
  if (!quote) throw new Error('Không tìm thấy báo giá.');
  if (String(quote.status) !== 'NEEDS_APPROVAL') throw new Error('Báo giá không ở trạng thái chờ duyệt.');
  const reason = String(payload.reason || payload.exception_reason || '').trim();
  if (!approved && !reason) throw new Error('Hãy nhập lý do từ chối.');
  const special = quotationApprovalNumber_(quote.proposed_amount || quote.final_amount) < quotationApprovalNumber_(quote.standard_amount || quote.subtotal) && quotationApprovalNumber_(quote.discount_rate) > 0.07;
  if (approved && special && !reason) throw new Error('Ngoại lệ thương mại cần ghi rõ lý do duyệt.');
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
  const headers = quotationApprovalHeaders_(sheet, quotationApprovalQuoteHeaders_(), QUOTATION_APPROVAL.HEADER_ROW), now = new Date();
  quotationApprovalSet_(sheet, quote._row, headers, approved ? {
    status:'APPROVED', approval_required:false, approved_by:session.login_id, approved_at:now,
    exception_reason:reason || String(quote.exception_reason || ''), updated_at:now, exportable:true
  } : {
    status:'REJECTED', approval_required:true, rejected_by:session.login_id, rejected_at:now,
    rejection_reason:reason, updated_at:now, exportable:false
  });
  quotationApprovalAudit_(session, approved ? 'QUOTE_APPROVE' : 'QUOTE_REJECT', quoteId, {
    version:Number(quote.version || 1), approved_by:approved ? session.login_id : '', approved_at:approved ? now.toISOString() : '',
    standard_amount:quotationApprovalNumber_(quote.standard_amount || quote.subtotal), proposed_amount:quotationApprovalNumber_(quote.proposed_amount || quote.final_amount),
    discount_rate:quotationApprovalNumber_(quote.discount_rate), exception_reason:reason, status:approved ? 'APPROVED' : 'REJECTED'
  });
  return {ok:true,quote_id:quoteId,version:Number(quote.version || 1),status:approved ? 'APPROVED' : 'REJECTED',exportable:approved,decided_by:session.login_id,decided_at:now.toISOString()};
}

function quotationApprovalList_(session) {
  const latest = {};
  quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.QUOTES).forEach(function(row){
    const id=String(row.quote_id || ''), current=latest[id];
    if (!current || Number(row.version || 1) > Number(current.version || 1)) latest[id]=row;
  });
  return Object.keys(latest).map(function(id){ return latest[id]; }).filter(function(row){ return session.role === 'ADMIN' || String(row.created_by) === session.login_id; }).sort(function(a,b){ return new Date(b.created_at || 0)-new Date(a.created_at || 0); }).slice(0,200).map(function(row){
    return {quote_id:String(row.quote_id),quote_code:quotationApprovalDisplayCode_(row.quote_id),version:Number(row.version || 1),created_at:row.created_at,created_by:String(row.created_by || ''),region:String(row.region || ''),client_name:String(row.client_name || ''),final_amount:quotationApprovalNumber_(row.proposed_amount || row.final_amount),status:String(row.status || ''),exportable:String(row.status || '') === 'APPROVED'};
  });
}

function apiSessionQuotationApproval(token, action, payload) {
  const session = quotationApprovalSession_(token), request = payload || {};
  switch (String(action || '')) {
    case 'bootstrap': return {login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region,session_expires_at:session.expires_at,backend_version:QUOTATION_APPROVAL.VERSION,user:{login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region}};
    case 'catalog': return quotationApprovalCatalog_(session);
    case 'saveSnapshot': return quotationApprovalSave_(session, request);
    case 'getQuote': return quotationApprovalQuoteBundle_(session, request, false);
    case 'exportQuote': return quotationApprovalQuoteBundle_(session, request, true);
    case 'listQuotes': return quotationApprovalList_(session);
    case 'approveQuote': return quotationApprovalDecision_(session, request, true);
    case 'rejectQuote': return quotationApprovalDecision_(session, request, false);
    default: throw new Error('Tác vụ Quotation không hợp lệ.');
  }
}
