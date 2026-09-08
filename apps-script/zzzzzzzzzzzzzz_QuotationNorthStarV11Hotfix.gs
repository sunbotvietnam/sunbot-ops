// North Star V11 hotfix — Admin may correct the asset model from the Sale request before creating the quote.
function quotationNorthStarCreateQuote_(token, session, payload) {
  if (session.role !== 'ADMIN') throw new Error('Chỉ Admin được lập và phát hành báo giá.');
  const requestId = String(payload.request_id || '').trim();
  const rows = quotationNorthStarRows_(QUOTATION_NORTHSTAR_V11.REQUEST_SHEET);
  const req = rows.find(function(r){ return String(r.request_id || '') === requestId; });
  if (!req) throw new Error('Không tìm thấy yêu cầu báo giá.');

  const effectiveReq = Object.assign({}, req);
  if (String(payload.asset_option || '').trim()) effectiveReq.asset_option = String(payload.asset_option).trim();
  const pkg = quotationNorthStarPackageFor_(effectiveReq, String(payload.package_sku || ''));
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
  quotationNorthStarSetRequest_(req, {
    status:'QUOTE_CREATED', quote_id:result.quote_id, handled_by:session.login_id, handled_at:new Date(), updated_at:new Date(),
    asset_option:String(effectiveReq.asset_option || req.asset_option || '')
  });
  try { quotationArtifactMaterialize_(token, result.quote_id, 'PENDING'); } catch (e) {}
  quotationApprovalAudit_(session, 'NORTHSTAR_QUOTE_CREATE', result.quote_id, {
    request_id:requestId, package_sku:pkg.sku, asset_option:String(effectiveReq.asset_option || ''),
    discount_pct:discountPct, payment_terms:payment
  });
  return Object.assign({}, result, {
    request_id:requestId, package_sku:pkg.sku, payment_terms:payment,
    standard_package_price:pkg.price_12m, package_price:packagePrice
  });
}
