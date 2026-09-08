// Quotation North Star V11 — 2026-09-08.
// Mô hình mới: Sale gửi yêu cầu; Admin lập và phát hành báo giá.
// Không dùng giá sàn trong vận hành mới. Giá sàn lịch sử chỉ được giữ trong dữ liệu cũ để đối chiếu.

const QUOTATION_NORTHSTAR_V11 = Object.freeze({
  VERSION: '2026.09.08-northstar-v1',
  PRICING_SHEET: 'NORTHSTAR_PRICING',
  REQUEST_SHEET: 'QUOTE_REQUESTS',
  ADMIN_DISCOUNT_MAX: 0.07,
  ADDON_IDS: Object.freeze(['ROBOT','MAP','OBSTACLE','CARDS','BOX','TRAIN_1','RETRAIN_1','CERT_1'])
});

function quotationNorthStarRows_(sheetName) {
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Thiếu bảng dữ liệu: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map(function(v){ return String(v || '').trim(); });
  return values.slice(1).filter(function(row){
    return row.some(function(v){ return String(v == null ? '' : v).trim() !== ''; });
  }).map(function(row, offset){
    const obj = {_row: offset + 2};
    headers.forEach(function(h, i){ if (h) obj[h] = row[i] === undefined ? '' : row[i]; });
    return obj;
  });
}

function quotationNorthStarPricing_() {
  return quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.PRICING_SHEET)
    .filter(function(r){ return String(r.status || '').toUpperCase() === 'ACTIVE'; })
    .map(function(r){
      return {
        sku:String(r.sku || ''), name:String(r.name || ''), model:String(r.model || ''),
        min_students:Number(r.min_students || 0), max_students:Number(r.max_students || 0),
        price_12m:Number(r.price_12m || 0), commitment_months:Number(r.commitment_months || 12),
        payment_default:String(r.payment_default || ''), sales_commission_new_pct:Number(r.sales_commission_new_pct || 0),
        admin_discount_max_pct:Number(r.admin_discount_max_pct || QUOTATION_NORTHSTAR_V11.ADMIN_DISCOUNT_MAX),
        note:String(r.note || '')
      };
    });
}

function quotationNorthStarRequestId_() {
  const tz = 'Asia/Ho_Chi_Minh', now = new Date();
  const date = Utilities.formatDate(now, tz, 'yyyyMMdd');
  const prefix = 'YCBG-' + date + '-';
  let max = 0;
  quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET).forEach(function(r){
    const id = String(r.request_id || '');
    if (id.indexOf(prefix) === 0) {
      const n = Number(id.slice(prefix.length));
      if (isFinite(n) && n > max) max = n;
    }
  });
  return prefix + ('000' + (max + 1)).slice(-3);
}

function quotationNorthStarRequestSheet_() {
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET);
  if (!sheet) throw new Error('Thiếu bảng Yêu cầu báo giá.');
  return sheet;
}

function quotationNorthStarSubmitRequest_(session, payload) {
  const school = String(payload.school_name || '').trim();
  const learners = Number(payload.learner_count || 0);
  if (!school) throw new Error('Hãy nhập tên trường.');
  if (!isFinite(learners) || learners <= 0) throw new Error('Hãy nhập số trẻ triển khai.');
  const id = quotationNorthStarRequestId_(), now = new Date();
  quotationNorthStarRequestSheet_().appendRow([
    id, now, session.login_id, session.region, school, String(payload.school_type || ''), learners,
    String(payload.existing_sunbot || ''), String(payload.asset_option || ''), String(payload.teacher_status || ''),
    String(payload.expected_start || ''), String(payload.decision_maker || ''), String(payload.budget_note || ''),
    String(payload.sales_proposal || ''), String(payload.notes || ''), 'NEW', '', '', '', now
  ]);
  quotationApprovalAudit_(session, 'QUOTE_REQUEST_CREATE', id, {school_name:school, learner_count:learners, asset_option:String(payload.asset_option || '')});
  return {ok:true, request_id:id, status:'NEW', school_name:school, learner_count:learners, created_at:now.toISOString()};
}

function quotationNorthStarListRequests_(session) {
  return quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET)
    .filter(function(r){ return session.role === 'ADMIN' || String(r.created_by || '') === String(session.login_id || ''); })
    .sort(function(a,b){ return new Date(b.created_at || 0) - new Date(a.created_at || 0); })
    .slice(0,300)
    .map(function(r){ const o=Object.assign({},r); delete o._row; return o; });
}

function quotationNorthStarFindRequest_(session, payload) {
  const requestId = String(payload.request_id || '').trim(), quoteId = String(payload.quote_id || '').trim();
  const row = quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET).find(function(r){
    return requestId ? String(r.request_id || '') === requestId : (quoteId && String(r.quote_id || '') === quoteId);
  });
  if (!row) throw new Error('Không tìm thấy yêu cầu báo giá.');
  if (session.role !== 'ADMIN' && String(row.created_by || '') !== String(session.login_id || '')) throw new Error('Bạn không có quyền xem yêu cầu này.');
  const out = Object.assign({}, row); delete out._row; return out;
}

function quotationNorthStarSetRequest_(row, values) {
  const sheet = quotationNorthStarRequestSheet_();
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(String);
  Object.keys(values).forEach(function(key){
    const i = headers.indexOf(key); if (i >= 0) sheet.getRange(row._row, i + 1).setValue(values[key]);
  });
}

function quotationNorthStarPackageFor_(request, requestedSku) {
  const learners = Number(request.learner_count || 0);
  const assetOption = String(request.asset_option || '').toUpperCase();
  const model = assetOption.indexOf('SUNBOT') >= 0 && assetOption.indexOf('CUNG') >= 0 ? 'SUNBOT_CUNG_CAP_THIET_BI' : 'TRUONG_CO_THIET_BI';
  const rows = quotationNorthStarPricing_();
  let selected = requestedSku ? rows.find(function(r){ return r.sku === requestedSku; }) : null;
  if (!selected) selected = rows.find(function(r){ return r.model === model && learners >= r.min_students && learners <= r.max_students; });
  if (!selected) throw new Error('Quy mô trên 800 trẻ hoặc cấu hình ngoài chuẩn cần CEO duyệt và báo giá riêng.');
  if (selected.model !== model || learners < selected.min_students || learners > selected.max_students) throw new Error('Gói đã chọn không khớp quy mô hoặc phương án thiết bị.');
  return selected;
}

// V11: loại bỏ giá sàn khỏi lớp kiểm soát vận hành. Chỉ còn giá chuẩn và quyền giảm của Admin.
function quotationApprovalValidateLine_(session, requested, item, quantity, reason) {
  const proposed = quotationApprovalNumber_(requested.proposed_unit_price !== undefined ? requested.proposed_unit_price : (requested.unit_price !== undefined ? requested.unit_price : requested.price));
  const standard = quotationApprovalNumber_(item.recommended_price);
  const price = proposed > 0 ? proposed : standard;
  const discount = standard > 0 ? Math.max(0, (standard - price) / standard) : 0;
  if (session.role === 'REGIONAL_MANAGER' && Math.abs(price - standard) > 0.5) throw new Error('Sale không tự điều chỉnh giá. Hãy gửi yêu cầu để Admin lập báo giá.');
  if (session.role === 'ADMIN' && discount > QUOTATION_NORTHSTAR_V11.ADMIN_DISCOUNT_MAX + 0.0000001 && !String(reason || '').trim()) {
    throw new Error('Mức giảm trên 7% cần ghi nhận phê duyệt ngoại lệ của CEO.');
  }
  return {price:price, discount:discount, standard:standard, floor:0};
}

// V11: không trả giá sàn ra giao diện, kể cả Admin. Dữ liệu lịch sử vẫn được giữ trong sheet cũ.
function quotationApprovalCatalog_(session) {
  return {
    backend_version: QUOTATION_NORTHSTAR_V11.VERSION,
    items: quotationApprovalInternalCatalog_().map(function(item){
      return {
        item_id:item.item_id, price_id:item.item_id, item_type:item.item_type, category:item.category,
        name:item.name, description:item.description, unit:item.unit,
        recommended_price:item.recommended_price, payment_price:item.recommended_price, price_before_tax:item.recommended_price,
        commercial_group:item.commercial_group, max_user_discount_pct:0, customer_visible:item.customer_visible,
        price_version_id:item.price_version_id
      };
    }),
    generated_at:new Date().toISOString()
  };
}

function quotationNorthStarCreateQuote_(token, session, payload) {
  if (session.role !== 'ADMIN') throw new Error('Chỉ Admin được lập và phát hành báo giá.');
  const requestId = String(payload.request_id || '').trim();
  const rows = quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET);
  const req = rows.find(function(r){ return String(r.request_id || '') === requestId; });
  if (!req) throw new Error('Không tìm thấy yêu cầu báo giá.');
  const pkg = quotationNorthStarPackageFor_(req, String(payload.package_sku || ''));
  const discountPct = Math.max(0, Number(payload.discount_pct || 0));
  const ceoNote = String(payload.ceo_approval_note || '').trim();
  if (discountPct > QUOTATION_NORTHSTAR_V11.ADMIN_DISCOUNT_MAX + 0.0000001 && !ceoNote) throw new Error('Giảm trên 7% cần ghi nội dung phê duyệt ngoại lệ của CEO.');
  if (discountPct >= 1) throw new Error('Mức giảm giá không hợp lệ.');
  const packagePrice = Math.round(pkg.price_12m * (1 - discountPct));
  const lines = [{item_id:pkg.sku, qty:1, proposed_unit_price:packagePrice, exception_reason:ceoNote}];
  const allowed = {};
  QUOTATION_NORTHSTAR_V11.ADDON_IDS.forEach(function(id){ allowed[id] = true; });
  (Array.isArray(payload.addons) ? payload.addons : []).forEach(function(a){
    const id = String(a.item_id || '').trim();
    const qty = Math.max(0, Number(a.qty || 0));
    if (qty > 0) {
      if (!allowed[id]) throw new Error('Hạng mục bổ sung chưa được phép trong luồng chuẩn: ' + id);
      lines.push({item_id:id, qty:qty});
    }
  });
  const payment = String(payload.payment_terms || pkg.payment_default || '');
  const noteParts = ['Yêu cầu ' + requestId];
  if (payment) noteParts.push('Thanh toán: ' + payment);
  if (String(payload.notes || '').trim()) noteParts.push(String(payload.notes).trim());
  const savePayload = {
    customer_name:String(req.school_name || ''), client_type:String(req.school_type || ''), combo_code:'NORTHSTAR',
    learner_count:Number(req.learner_count || 0), deployment_sites:1, lines:lines,
    notes:noteParts.join(' | '), configuration_description:'', exception_reason:ceoNote,
    customer_id:String(payload.customer_id || ''), opportunity_id:String(payload.opportunity_id || '')
  };
  const result = quotationApprovalSave_(session, savePayload);
  const quote = quotationApprovalLatest_(result.quote_id);
  if (!quote) throw new Error('Không thể đọc lại báo giá vừa tạo.');
  const quoteSheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
  const headers = quotationApprovalHeaders_(quoteSheet, quotationApprovalQuoteHeaders_(), QUOTATION_APPROVAL.HEADER_ROW);
  quotationApprovalSet_(quoteSheet, quote._row, headers, {
    created_by:String(req.created_by || session.login_id), region:String(req.region || ''), creator_role:'REGIONAL_MANAGER',
    deal_owner:String(req.created_by || session.login_id), combo_code:'NORTHSTAR', configuration_description:'',
    learner_count:Number(req.learner_count || 0), updated_at:new Date()
  });
  quotationNorthStarSetRequest_(req, {status:'QUOTE_CREATED', quote_id:result.quote_id, handled_by:session.login_id, handled_at:new Date(), updated_at:new Date()});
  try { quotationArtifactMaterialize_(token, result.quote_id, 'PENDING'); } catch (e) {}
  quotationApprovalAudit_(session, 'NORTHSTAR_QUOTE_CREATE', result.quote_id, {request_id:requestId,package_sku:pkg.sku,discount_pct:discountPct,payment_terms:payment});
  return Object.assign({}, result, {request_id:requestId, package_sku:pkg.sku, payment_terms:payment, standard_package_price:pkg.price_12m, package_price:packagePrice});
}

function quotationNorthStarMarkIssued_(quoteId, session) {
  const rows = quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET);
  const req = rows.find(function(r){ return String(r.quote_id || '') === String(quoteId || ''); });
  if (req) quotationNorthStarSetRequest_(req, {status:'QUOTED', handled_by:session.login_id, handled_at:new Date(), updated_at:new Date()});
}

// Final shared router V11. Bảo toàn các tuyến V10 và bổ sung luồng North Star.
function apiSessionQuotationShared(token, action, payload) {
  const a = String(action || ''), request = payload || {}, session = quotationApprovalSession_(token);
  if (a === 'northstarPricing') return {items:quotationNorthStarPricing_(), version:QUOTATION_NORTHSTAR_V11.VERSION};
  if (a === 'submitQuoteRequest') return quotationNorthStarSubmitRequest_(session, request);
  if (a === 'listQuoteRequests') return {items:quotationNorthStarListRequests_(session), version:QUOTATION_NORTHSTAR_V11.VERSION};
  if (a === 'getQuoteRequest') return quotationNorthStarFindRequest_(session, request);
  if (a === 'createNorthStarQuote') return quotationNorthStarCreateQuote_(token, session, request);

  if (a === 'bootstrapFast') return quotationPerformanceBootstrap_(token);
  if (a === 'listQuotesLite') return quotationArtifactListLite_(token);
  if (a === 'getQuoteLinks') return quotationArtifactLinks_(token,request);
  if (a === 'recoverLegacyArtifacts') return quotationArtifactRecoverBatch_(token,request);
  if (a === 'listPublishedQuotes') return quotationPublicationList_(token);
  if (a === 'getPublishedQuote' || a === 'getQuoteFast') return quotationPublicationGet_(token,request);
  if (a === 'saveSnapshot') {
    const result=apiSessionQuotationApproval(token,a,request);
    try{const art=quotationArtifactMaterialize_(token,result.quote_id,'PENDING');result.preview_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
    return result;
  }
  if (a === 'approveQuote') {
    const pre=quotationApprovalQuoteBundle_(session,{quote_id:String(request.quote_id||'')},false);
    if(quotationArtifactHasPendingPrice_(pre)) throw new Error('Báo giá còn hạng mục chưa có đơn giá. Cần xác nhận đơn giá trước khi phát hành.');
    const result=apiSessionQuotationApproval(token,a,request);
    const id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){
      try{quotationPublicationPublishById_(token,id);}catch(e){}
      try{const art=quotationArtifactMaterialize_(token,id,'APPROVED');result.approved_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
      quotationNorthStarMarkIssued_(id,session);
    }
    return result;
  }
  if (a === 'adminReviseQuote') {
    const result=apiSessionQuotationApproval(token,a,request), id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){
      if(request.approve_after){
        try{quotationPublicationPublishById_(token,id);}catch(e){}
        try{const art=quotationArtifactMaterialize_(token,id,'APPROVED');result.approved_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
        quotationNorthStarMarkIssued_(id,session);
      } else { try{const art=quotationArtifactMaterialize_(token,id,'PENDING');result.preview_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);} }
    }
    return result;
  }
  if (a === 'requestChanges' || a === 'rejectQuote') {
    const result=apiSessionQuotationApproval(token,a,request), id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){try{const bundle=quotationApprovalQuoteBundle_(session,{quote_id:id},false);quotationArtifactIndexUpsert_(bundle.quote,{});}catch(e){}}
    return result;
  }
  return apiSessionQuotationApproval(token,a,request);
}
