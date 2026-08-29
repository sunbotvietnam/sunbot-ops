const QUOTATION_APPROVAL = Object.freeze({
  VERSION: '2026.08.29-v5',
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
  return quotationApprovalRows_(QUOTATION_APPROVAL.AUTH_SHEET, 1).filter(function(user){ return quotationApprovalYes_(user.ENABLED); });
}

function quotationApprovalLogin_(loginId, password) {
  const normalized = quotationApprovalNormalizeLogin_(loginId);
  const passwordText = String(password || '');
  const user = quotationApprovalAuthUsers_().find(function(row){ return quotationApprovalNormalizeLogin_(row.LOGIN_ID) === normalized; });
  const actualHash = quotationSha256Hex_(passwordText).toLowerCase();
  const expectedHash = user ? String(user.PASSWORD_HASH_SHA256 || '').trim().toLowerCase() : quotationSha256Hex_('invalid-quotation-user').toLowerCase();
  if (!normalized || !passwordText || !user || !expectedHash || actualHash !== expectedHash) throw new Error('ID hoặc mật khẩu không đúng.');
  const role = String(user.ROLE || '').trim().toUpperCase();
  if (['ADMIN', 'REGIONAL_MANAGER'].indexOf(role) < 0) throw new Error('ID hoặc mật khẩu không đúng.');
  const token = 'QU-' + Utilities.getUuid().replace(/-/g, '') + '-' + Utilities.getUuid().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + QUOTATION_APPROVAL.SESSION_SECONDS * 1000).toISOString();
  const session = {login_id:String(user.LOGIN_ID || '').trim(),display_name:String(user.DISPLAY_NAME || user.LOGIN_ID || '').trim(),role:role,region:String(user.REGION || '').trim(),expires_at:expiresAt};
  CacheService.getScriptCache().put(QUOTATION_APPROVAL.SESSION_PREFIX + token, JSON.stringify(session), QUOTATION_APPROVAL.SESSION_SECONDS);
  return {ok:true,token:token,login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region,expires_at:expiresAt};
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
  const rows = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.COMMERCIAL, 1).filter(function(row){ return String(row.status || '').toUpperCase() === 'ACTIVE'; });
  const types = {}, overrides = {};
  rows.forEach(function(row){
    const target = String(row.match_type || '').toUpperCase() === 'ITEM_ID_OVERRIDE' ? overrides : types;
    target[String(row.match_value || '').trim().toUpperCase()] = {group:String(row.commercial_group || 'B').trim().toUpperCase(),user_max:quotationApprovalNumber_(row.customer_discount_user_max)};
  });
  return {types:types,overrides:overrides};
}

function quotationApprovalInternalCatalog_() {
  const at = new Date();
  const priceRows = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.PRICES).filter(function(row){ return quotationApprovalActive_(row, at); });
  const priceByItem = {};
  priceRows.sort(function(a,b){ return new Date(a.valid_from || 0) - new Date(b.valid_from || 0); }).forEach(function(row){ priceByItem[String(row.item_id || '').trim()] = row; });
  const commercial = quotationApprovalCommercialMap_();
  return quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.CATALOG).filter(function(row){
    return quotationApprovalActive_(row, at) && quotationApprovalYes_(row.sales_visible) && quotationApprovalYes_(row.quote_selectable);
  }).map(function(row){
    const id = String(row.item_id || '').trim(), price = priceByItem[id] || row;
    const override = commercial.overrides[id.toUpperCase()], byType = commercial.types[String(row.item_type || '').trim().toUpperCase()] || {group:'B',user_max:0};
    const classification = override || byType;
    return {item_id:id,item_type:String(row.item_type || '').trim(),category:String(row.category || '').trim(),name:String(row.name || '').trim(),description:String(row.description || '').trim(),unit:String(row.unit || '').trim(),list_price:quotationApprovalNumber_(price.list_price),recommended_price:quotationApprovalNumber_(price.recommended_price),floor_price:quotationApprovalNumber_(price.floor_price),price_version_id:String(price.price_version_id || '').trim(),commercial_group:String(classification.group || 'B').toUpperCase(),max_user_discount_pct:Number(classification.user_max || 0),customer_visible:quotationApprovalYes_(row.customer_visible)};
  });
}

function quotationApprovalCatalog_(session) {
  const admin = session.role === 'ADMIN';
  return {backend_version:QUOTATION_APPROVAL.VERSION,items:quotationApprovalInternalCatalog_().map(function(item){
    const output = {item_id:item.item_id,price_id:item.item_id,item_type:item.item_type,category:item.category,name:item.name,description:item.description,unit:item.unit,recommended_price:item.recommended_price,payment_price:item.recommended_price,price_before_tax:item.recommended_price,commercial_group:item.commercial_group,max_user_discount_pct:item.max_user_discount_pct,customer_visible:item.customer_visible,price_version_id:item.price_version_id};
    if (admin) { output.list_price=item.list_price; output.floor_price=item.floor_price; output.economics={spread_to_floor:item.recommended_price-item.floor_price}; }
    return output;
  }),generated_at:new Date().toISOString()};
}

function quotationApprovalHeaders_(sheet, required, headerRow) {
  const row = Number(headerRow || QUOTATION_APPROVAL.HEADER_ROW);
  const width = Math.max(sheet.getLastColumn(), required.length);
  if (width > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  const current = sheet.getRange(row,1,1,width).getDisplayValues()[0].map(String), headers=current.slice();
  while (headers.length && !String(headers[headers.length-1] || '').trim()) headers.pop();
  required.forEach(function(header){ if (headers.indexOf(header) < 0) headers.push(header); });
  if (headers.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length-sheet.getMaxColumns());
  sheet.getRange(row,1,1,headers.length).setValues([headers]);
  return headers;
}

function quotationApprovalAppendObject_(sheet, headers, record) { sheet.appendRow(headers.map(function(header){ return Object.prototype.hasOwnProperty.call(record,header) ? record[header] : ''; })); }
function quotationApprovalSet_(sheet,row,headers,values) { Object.keys(values).forEach(function(header){ const index=headers.indexOf(header); if (index>=0) sheet.getRange(row,index+1).setValue(values[header]); }); }

function quotationApprovalQuoteHeaders_() {
  return ['quote_id','version','created_at','created_by','client_name','client_type','combo_code','subtotal','discount_rate','discount_amount','final_amount','status','approval_required','approved_by','approved_at','notes','configuration_description','pricebook_version','customer_id','opportunity_id','region','creator_role','deal_owner','standard_amount','proposed_amount','exception_reason','commercial_fingerprint','updated_at','rejected_by','rejected_at','rejection_reason','exportable','deployment_sites','learner_count','commercial_model','recommended_model','policy_match','scale_program','scale_sessions_per_month','frequency_factor','point_comparison_amount','scale_comparison_amount','scale_4_amount','scale_8_amount','comparison_difference','cheaper_model','model_exception_reason','revised_by','revision_note'];
}
function quotationApprovalLineHeaders_() { return ['quote_id','line_no','item_id','item_name_snapshot','unit_snapshot','unit_price_snapshot','qty','discount_rate','line_total','pricing_rule_version','source_price_version','version','commercial_group','standard_unit_price','proposed_unit_price','floor_price_snapshot','exception_reason','is_custom']; }

function quotationApprovalAudit_(session, action, quoteId, detail) {
  const sheet=quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.AUDIT);
  if (!sheet) throw new Error('Backend thiếu bảng AUDIT_LOG.');
  const headers=quotationApprovalHeaders_(sheet,['audit_id','timestamp','user_id','action','entity_type','entity_id','detail_json'],QUOTATION_APPROVAL.HEADER_ROW);
  quotationApprovalAppendObject_(sheet,headers,{audit_id:'AUD-'+Utilities.getUuid(),timestamp:new Date(),user_id:session.login_id,action:action,entity_type:'QUOTE',entity_id:quoteId,detail_json:JSON.stringify(detail || {})});
}

function quotationApprovalScaleFactor_(sessions) { return Number(sessions) === 8 ? 1.5 : 1; }
function quotationApprovalScaleProgramFactor_(program) {
  const value=String(program || 'CORE').toUpperCase();
  if (value==='STEAM') return 0.7;
  if (value==='LT') return 1;
  if (value==='CORE') return 1.2;
  throw new Error('Chương trình tính phí theo quy mô không hợp lệ.');
}
function quotationApprovalScaleMinimum_(program) {
  const value=String(program || 'CORE').toUpperCase();
  if (value==='STEAM') return 18000000;
  if (value==='LT') return 24000000;
  if (value==='CORE') return 30000000;
  throw new Error('Chương trình tính phí theo quy mô không hợp lệ.');
}
function quotationApprovalScaleFee_(learners,sessions,program,catalogById) {
  const n=Math.max(0,quotationApprovalNumber_(learners));
  const s=Number(sessions);
  if (n<=0) throw new Error('Mô hình theo quy mô cần số trẻ lớn hơn 0.');
  if ([4,8].indexOf(s)<0) throw new Error('Tần suất theo quy mô chỉ nhận 4 hoặc 8 buổi/tháng.');
  const tiers=[['SELF_FEE_1P_T1',1,150],['SELF_FEE_1P_T2',151,300],['SELF_FEE_1P_T3',301,500],['SELF_FEE_1P_T4',501,800],['SELF_FEE_1P_T5',801,Infinity]];
  let progressive=0;
  tiers.forEach(function(t){
    if (n<t[1]) return;
    const item=catalogById[t[0]];
    if (!item || quotationApprovalNumber_(item.recommended_price)<=0) throw new Error('Backend thiếu bậc giá theo quy mô '+t[0]+'.');
    const count=Math.max(0,Math.min(n,t[2])-t[1]+1);
    progressive+=count*quotationApprovalNumber_(item.recommended_price);
  });
  const frequency=quotationApprovalScaleFactor_(s);
  const raw=progressive*36*frequency*quotationApprovalScaleProgramFactor_(program);
  const minimum=quotationApprovalScaleMinimum_(program)*frequency;
  return Math.round(Math.max(raw,minimum));
}

function quotationApprovalValidateLine_(session, requested, item, quantity, reason) {
  const proposed=quotationApprovalNumber_(requested.proposed_unit_price !== undefined ? requested.proposed_unit_price : (requested.unit_price !== undefined ? requested.unit_price : requested.price));
  let standard=item.recommended_price, floor=item.floor_price;
  if (item.item_id === 'SELF_DELIVERY_SCALE_FEE') { standard=proposed>0?proposed:standard; floor=standard; }
  const price=proposed>0?proposed:standard;
  const discount=standard>0?Math.max(0,(standard-price)/standard):0;
  const group=item.commercial_group;
  if (price < floor && session.role !== 'ADMIN') throw new Error('Giá đề xuất thấp hơn mức được phép.');
  if (session.role === 'REGIONAL_MANAGER') {
    if ((group === 'C' || group === 'MIXED_GROWTH') && discount > 0.0000001) throw new Error('Hạng mục này không được giảm giá ở quyền người lập báo giá.');
    if ((group === 'A' || group === 'B') && discount > 0.0300001) throw new Error('Mức giảm nhóm A/B vượt quá 3%.');
  } else if (session.role === 'ADMIN') {
    if (group === 'MIXED_GROWTH' && discount > 0.0000001) {
      if (standard * quantity < 50000000 || discount > 0.0500001 || price < floor) throw new Error('Camp/Event: Admin chỉ giảm tối đa 5% khi doanh thu hạng mục từ 50 triệu và không dưới giá sàn.');
    }
    if ((group === 'A' || group === 'B') && discount > 0.0700001 && !reason) throw new Error('Giảm nhóm A/B trên 7% là ngoại lệ, cần ghi lý do duyệt đặc biệt.');
    if (price < floor && !reason) throw new Error('Giá dưới sàn cần lý do duyệt đặc biệt.');
  }
  return {price:price,discount:discount,standard:standard,floor:floor};
}

function quotationApprovalBuildLines_(session,payload) {
  const catalog=quotationApprovalInternalCatalog_(), byId={}; catalog.forEach(function(item){ byId[item.item_id]=item; });
  const requested=Array.isArray(payload.lines)?payload.lines:[];
  if (!requested.length) throw new Error('Báo giá chưa có hạng mục.');
  const reason=String(payload.exception_reason || payload.notes || '').trim();
  return requested.map(function(line,index){
    const itemId=String(line.item_id || line.code || '').trim(), quantity=quotationApprovalNumber_(line.qty !== undefined ? line.qty : line.quantity);
    if (!itemId || quantity<=0) throw new Error('Dòng báo giá không hợp lệ tại vị trí '+(index+1)+'.');
    let item=byId[itemId], isCustom=false, requestedLine=line;
    if (!item) {
      if (session.role !== 'ADMIN' || !reason) throw new Error('Hạng mục tùy chỉnh cần Admin và lý do duyệt đặc biệt.');
      const standard=quotationApprovalNumber_(line.standard_unit_price || line.recommended_price || line.unit_price || line.price);
      item={item_id:itemId,name:String(line.name || 'Hạng mục tùy chỉnh').trim(),unit:String(line.unit || '').trim(),recommended_price:standard,floor_price:0,commercial_group:'CUSTOM',price_version_id:'CUSTOM'}; isCustom=true;
    }
    if (itemId==='SELF_DELIVERY_SCALE_FEE') {
      if (String(payload.commercial_model || '').toUpperCase()!=='SCALE') throw new Error('Dòng phí theo quy mô chỉ được dùng với mô hình SCALE.');
      const expected=quotationApprovalScaleFee_(payload.learner_count,payload.scale_sessions_per_month,payload.scale_program,byId);
      const sent=quotationApprovalNumber_(line.proposed_unit_price !== undefined ? line.proposed_unit_price : (line.unit_price !== undefined ? line.unit_price : line.price));
      if (sent>0 && Math.abs(sent-expected)>1) throw new Error('Phí theo quy mô không khớp công thức Backend. Hãy tải lại app và tính lại báo giá.');
      requestedLine=Object.assign({},line,{proposed_unit_price:expected,unit_price:expected,price:expected});
    }
    const checked=quotationApprovalValidateLine_(session,requestedLine,item,quantity,reason);
    return {line_no:index+1,item_id:item.item_id,item_name_snapshot:item.name,unit_snapshot:item.unit,unit_price_snapshot:checked.price,qty:quantity,discount_rate:checked.discount,line_total:Math.round(checked.price*quantity),pricing_rule_version:QUOTATION_APPROVAL.VERSION,source_price_version:item.price_version_id,commercial_group:item.commercial_group,standard_unit_price:checked.standard,proposed_unit_price:checked.price,floor_price_snapshot:checked.floor,exception_reason:reason,is_custom:isCustom};
  });
}

function quotationApprovalFingerprint_(lines) { return quotationSha256Hex_(JSON.stringify(lines.map(function(line){ return [line.item_id,line.qty,line.standard_unit_price,line.proposed_unit_price,line.commercial_group]; }))); }
function quotationApprovalLatest_(quoteId) { return quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.QUOTES).filter(function(row){ return String(row.quote_id)===String(quoteId); }).sort(function(a,b){ return Number(b.version||1)-Number(a.version||1); })[0] || null; }

function quotationApprovalPolicyFields_(payload,previous) {
  const src=payload || {}, prev=previous || {};
  return {
    deployment_sites:quotationApprovalNumber_(src.deployment_sites || prev.deployment_sites || 1),
    learner_count:quotationApprovalNumber_(src.learner_count || prev.learner_count || 0),
    commercial_model:String(src.commercial_model || prev.commercial_model || ''),
    recommended_model:String(src.recommended_model || prev.recommended_model || ''),
    policy_match:src.policy_match === undefined ? quotationApprovalYes_(prev.policy_match) : quotationApprovalYes_(src.policy_match),
    scale_program:String(src.scale_program || prev.scale_program || ''),
    scale_sessions_per_month:quotationApprovalNumber_(src.scale_sessions_per_month || prev.scale_sessions_per_month || 0),
    frequency_factor:quotationApprovalNumber_(src.frequency_factor || prev.frequency_factor || 0),
    point_comparison_amount:quotationApprovalNumber_(src.point_comparison_amount || prev.point_comparison_amount || 0),
    scale_comparison_amount:quotationApprovalNumber_(src.scale_comparison_amount || prev.scale_comparison_amount || 0),
    scale_4_amount:quotationApprovalNumber_(src.scale_4_amount || prev.scale_4_amount || 0),
    scale_8_amount:quotationApprovalNumber_(src.scale_8_amount || prev.scale_8_amount || 0),
    comparison_difference:quotationApprovalNumber_(src.comparison_difference || prev.comparison_difference || 0),
    cheaper_model:String(src.cheaper_model || prev.cheaper_model || ''),
    model_exception_reason:String(src.model_exception_reason || prev.model_exception_reason || '')
  };
}

function quotationApprovalSave_(session,payload) {
  const clientName=String(payload.customer_name || payload.client_name || '').trim(); if (!clientName) throw new Error('Hãy nhập tên khách hàng.');
  const configurationDescription=String(payload.configuration_description || '').trim(); if (!configurationDescription) throw new Error('Hãy kiểm tra phần diễn giải cấu hình trước khi gửi duyệt.');
  const requestedId=String(payload.quote_id || '').trim(), previous=requestedId?quotationApprovalLatest_(requestedId):null;
  if (requestedId && !previous) throw new Error('Không tìm thấy báo giá cần tạo phiên bản mới.');
  if (previous && session.role !== 'ADMIN' && String(previous.created_by)!==session.login_id) throw new Error('Bạn không được sửa báo giá của người khác.');
  const reason=String(payload.exception_reason || payload.notes || '').trim();
  const policy=quotationApprovalPolicyFields_(payload,previous);
  if (policy.commercial_model && policy.recommended_model && policy.commercial_model !== policy.recommended_model && !String(policy.model_exception_reason || reason).trim()) throw new Error('Mô hình thương mại khác quy chế phải có lý do ngoại lệ.');
  if (String(policy.commercial_model).toUpperCase()==='SCALE') {
    const catalogMap={}; quotationApprovalInternalCatalog_().forEach(function(item){ catalogMap[item.item_id]=item; });
    policy.scale_program=String(policy.scale_program || 'CORE').toUpperCase();
    policy.frequency_factor=quotationApprovalScaleFactor_(policy.scale_sessions_per_month);
    policy.scale_4_amount=quotationApprovalScaleFee_(policy.learner_count,4,policy.scale_program,catalogMap);
    policy.scale_8_amount=quotationApprovalScaleFee_(policy.learner_count,8,policy.scale_program,catalogMap);
    policy.scale_comparison_amount=Number(policy.scale_sessions_per_month)===8?policy.scale_8_amount:policy.scale_4_amount;
    policy.comparison_difference=Math.abs(quotationApprovalNumber_(policy.point_comparison_amount)-policy.scale_comparison_amount);
  }
  const normalizedPayload=Object.assign({},payload,policy);
  const lines=quotationApprovalBuildLines_(session,normalizedPayload);
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const spreadsheet=quotationApprovalSpreadsheet_(), quoteSheet=spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES), lineSheet=spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.LINES);
    if (!quoteSheet || !lineSheet) throw new Error('Backend thiếu bảng lưu báo giá.');
    const quoteHeaders=quotationApprovalHeaders_(quoteSheet,quotationApprovalQuoteHeaders_(),QUOTATION_APPROVAL.HEADER_ROW), lineHeaders=quotationApprovalHeaders_(lineSheet,quotationApprovalLineHeaders_(),QUOTATION_APPROVAL.HEADER_ROW);
    const generated=requestedId?{id:requestedId,display:quotationApprovalDisplayCode_(requestedId)}:quotationSharedQuoteId_(), version=previous?Number(previous.version||1)+1:1;
    const standard=lines.reduce(function(sum,line){ return sum+line.standard_unit_price*line.qty; },0), proposed=lines.reduce(function(sum,line){ return sum+line.line_total; },0), discountAmount=Math.max(0,standard-proposed), discountRate=standard?discountAmount/standard:0, now=new Date();
    const originalCreator=previous?String(previous.created_by || session.login_id):session.login_id;
    const originalRegion=previous?String(previous.region || session.region):session.region;
    const originalCreatorRole=previous?String(previous.creator_role || 'REGIONAL_MANAGER'):session.role;
    const originalDealOwner=previous?String(previous.deal_owner || originalCreator):session.login_id;
    const revisedBy=previous && session.role==='ADMIN' ? session.login_id : String(previous && previous.revised_by || '');
    const revisionNote=String(payload.revision_note || (previous && previous.revision_note) || '');
    quotationApprovalAppendObject_(quoteSheet,quoteHeaders,Object.assign({
      quote_id:generated.id,version:version,created_at:now,created_by:originalCreator,client_name:clientName,client_type:String(payload.client_type || (previous&&previous.client_type) || ''),combo_code:String(payload.combo_code || (previous&&previous.combo_code) || ''),subtotal:standard,discount_rate:discountRate,discount_amount:discountAmount,final_amount:proposed,status:'NEEDS_APPROVAL',approval_required:true,approved_by:'',approved_at:'',notes:String(payload.notes || ''),configuration_description:configurationDescription,pricebook_version:QUOTATION_APPROVAL.VERSION,customer_id:String(payload.customer_id || (previous&&previous.customer_id) || ''),opportunity_id:String(payload.opportunity_id || (previous&&previous.opportunity_id) || ''),region:originalRegion,creator_role:originalCreatorRole,deal_owner:originalDealOwner,standard_amount:standard,proposed_amount:proposed,exception_reason:reason || String(policy.model_exception_reason || ''),commercial_fingerprint:quotationApprovalFingerprint_(lines),updated_at:now,rejected_by:'',rejected_at:'',rejection_reason:'',exportable:false,revised_by:revisedBy,revision_note:revisionNote
    },policy));
    lines.forEach(function(line){ line.quote_id=generated.id; line.version=version; quotationApprovalAppendObject_(lineSheet,lineHeaders,line); });
    const action=previous && session.role==='ADMIN' ? 'QUOTE_ADMIN_REVISION' : (previous && String(previous.status)==='APPROVED' ? 'QUOTE_APPROVAL_INVALIDATED' : (version>1?'QUOTE_REVISION':'QUOTE_CREATE'));
    quotationApprovalAudit_(session,action,generated.id,{version:version,status:'NEEDS_APPROVAL',standard_amount:standard,proposed_amount:proposed,discount_rate:discountRate,previous_status:previous?String(previous.status||''):'',configuration_description:configurationDescription,revised_by:revisedBy,revision_note:revisionNote,commercial_model:policy.commercial_model,recommended_model:policy.recommended_model,policy_match:policy.policy_match,scale_program:policy.scale_program,scale_sessions_per_month:policy.scale_sessions_per_month,scale_4_amount:policy.scale_4_amount,scale_8_amount:policy.scale_8_amount});
    return {ok:true,quote_id:generated.id,quote_code:generated.display,version:version,status:'NEEDS_APPROVAL',exportable:false,created_by:originalCreator,display_name:session.display_name,region:originalRegion,standard_amount:standard,final_amount:proposed,configuration_description:configurationDescription,revised_by:revisedBy};
  } finally { lock.releaseLock(); }
}

function quotationApprovalDisplayCode_(quoteId) {
  const match=String(quoteId || '').match(/^BG-SUNBOT-(\d{4})-(\d{4})-(\d{3})$/);
  return match?'BG/SUNBOT/'+match[1]+'/'+match[2]+'-'+match[3]:String(quoteId || '');
}

function quotationApprovalQuoteBundle_(session,payload,requireApproved) {
  const quoteId=String(payload.quote_id || '').trim(), quote=quotationApprovalLatest_(quoteId); if (!quote) throw new Error('Không tìm thấy báo giá.');
  if (session.role!=='ADMIN' && String(quote.created_by)!==session.login_id) throw new Error('Bạn không có quyền xem báo giá này.');
  if (requireApproved && String(quote.status)!=='APPROVED') throw new Error('Chỉ báo giá đã duyệt mới được xuất.');
  let lines=quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.LINES).filter(function(line){ return String(line.quote_id)===quoteId && Number(line.version||1)===Number(quote.version||1); });
  if (session.role!=='ADMIN') lines=lines.map(function(line){ const safe=Object.assign({},line); delete safe.floor_price_snapshot; return safe; });
  const safeQuote=Object.assign({},quote); delete safeQuote._row; safeQuote.exportable=String(quote.status)==='APPROVED';
  return {quote:safeQuote,lines:lines.map(function(line){ const safe=Object.assign({},line); delete safe._row; return safe; })};
}

function quotationApprovalSpecialFlags_(quoteId,quote) {
  const lines=quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.LINES).filter(function(line){ return String(line.quote_id)===quoteId && Number(line.version||1)===Number(quote.version||1); });
  const flags=[];
  lines.forEach(function(line){
    const group=String(line.commercial_group || ''), discount=quotationApprovalNumber_(line.discount_rate), price=quotationApprovalNumber_(line.proposed_unit_price || line.unit_price_snapshot), floor=quotationApprovalNumber_(line.floor_price_snapshot);
    if ((group==='A'||group==='B') && discount>0.0700001) flags.push('AB_OVER_7');
    if (floor>0 && price<floor) flags.push('BELOW_FLOOR');
    if (quotationApprovalYes_(line.is_custom)) flags.push('CUSTOM');
  });
  if (String(quote.commercial_model || '') && String(quote.recommended_model || '') && String(quote.commercial_model)!==String(quote.recommended_model)) flags.push('MODEL_EXCEPTION');
  return flags;
}

function quotationApprovalDecision_(session,payload,approved) {
  if (session.role!=='ADMIN') throw new Error('Chỉ Admin được duyệt hoặc trả lại báo giá.');
  const quoteId=String(payload.quote_id || '').trim(), quote=quotationApprovalLatest_(quoteId); if (!quote) throw new Error('Không tìm thấy báo giá.');
  if (String(quote.status)!=='NEEDS_APPROVAL') throw new Error('Báo giá không ở trạng thái chờ duyệt.');
  const existingReason=String(quote.exception_reason || quote.model_exception_reason || '').trim();
  const reason=String(payload.reason || payload.exception_reason || existingReason).trim();
  if (!approved && !reason) throw new Error('Hãy nhập yêu cầu chỉnh sửa.');
  const flags=quotationApprovalSpecialFlags_(quoteId,quote);
  if (approved && flags.length && !reason) throw new Error('Báo giá có ngoại lệ thương mại, cần ghi rõ lý do duyệt.');
  const sheet=quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES), headers=quotationApprovalHeaders_(sheet,quotationApprovalQuoteHeaders_(),QUOTATION_APPROVAL.HEADER_ROW), now=new Date();
  quotationApprovalSet_(sheet,quote._row,headers,approved?{status:'APPROVED',approval_required:false,approved_by:session.login_id,approved_at:now,exception_reason:reason,updated_at:now,exportable:true}:{status:'REJECTED',approval_required:true,rejected_by:session.login_id,rejected_at:now,rejection_reason:reason,updated_at:now,exportable:false});
  quotationApprovalAudit_(session,approved?'QUOTE_APPROVE':'QUOTE_RETURN_FOR_CHANGES',quoteId,{version:Number(quote.version||1),approved_by:approved?session.login_id:'',approved_at:approved?now.toISOString():'',standard_amount:quotationApprovalNumber_(quote.standard_amount || quote.subtotal),proposed_amount:quotationApprovalNumber_(quote.proposed_amount || quote.final_amount),discount_rate:quotationApprovalNumber_(quote.discount_rate),exception_reason:reason,special_flags:flags,status:approved?'APPROVED':'REJECTED'});
  return {ok:true,quote_id:quoteId,version:Number(quote.version||1),status:approved?'APPROVED':'REJECTED',exportable:approved,decided_by:session.login_id,decided_at:now.toISOString()};
}

function quotationApprovalList_(session) {
  const latest={}; quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.QUOTES).forEach(function(row){ const id=String(row.quote_id||''),current=latest[id]; if (!current || Number(row.version||1)>Number(current.version||1)) latest[id]=row; });
  return Object.keys(latest).map(function(id){return latest[id];}).filter(function(row){ return session.role==='ADMIN' || String(row.created_by)===session.login_id; }).sort(function(a,b){ return new Date(b.created_at||0)-new Date(a.created_at||0); }).slice(0,200).map(function(row){
    return {quote_id:String(row.quote_id),quote_code:quotationApprovalDisplayCode_(row.quote_id),version:Number(row.version||1),created_at:row.created_at,created_by:String(row.created_by||''),region:String(row.region||''),client_name:String(row.client_name||''),final_amount:quotationApprovalNumber_(row.proposed_amount||row.final_amount),status:String(row.status||''),exportable:String(row.status||'')==='APPROVED',deployment_sites:quotationApprovalNumber_(row.deployment_sites),commercial_model:String(row.commercial_model||''),recommended_model:String(row.recommended_model||''),policy_match:quotationApprovalYes_(row.policy_match),revised_by:String(row.revised_by||'')};
  });
}

function apiSessionQuotationApproval(token,action,payload) {
  const session=quotationApprovalSession_(token),request=payload||{};
  switch(String(action||'')) {
    case 'bootstrap': return {login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region,session_expires_at:session.expires_at,backend_version:QUOTATION_APPROVAL.VERSION,user:{login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region}};
    case 'catalog': return quotationApprovalCatalog_(session);
    case 'saveSnapshot': return quotationApprovalSave_(session,request);
    case 'getQuote': return quotationApprovalQuoteBundle_(session,request,false);
    case 'exportQuote': return quotationApprovalQuoteBundle_(session,request,true);
    case 'listQuotes': return quotationApprovalList_(session);
    case 'approveQuote': return quotationApprovalDecision_(session,request,true);
    case 'rejectQuote': return quotationApprovalDecision_(session,request,false);
    default: throw new Error('Tác vụ Quotation không hợp lệ.');
  }
}
