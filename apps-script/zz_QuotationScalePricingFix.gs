// Hotfix: SCALE pricing tiers are internal formula rows and intentionally not quote-selectable.
// The V5 authoritative calculator must therefore read active pricing rows directly instead
// of quotationApprovalInternalCatalog_(), which filters quote_selectable = TRUE.
function quotationApprovalScalePricingMap_() {
  const at = new Date();
  const catalogRows = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.CATALOG).filter(function(row){
    return quotationApprovalActive_(row, at);
  });
  const priceRows = quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.PRICES).filter(function(row){
    return quotationApprovalActive_(row, at);
  });
  const priceByItem = {};
  priceRows
    .sort(function(a,b){ return new Date(a.valid_from || 0) - new Date(b.valid_from || 0); })
    .forEach(function(row){ priceByItem[String(row.item_id || '').trim()] = row; });

  const map = {};
  catalogRows.forEach(function(row){
    const id = String(row.item_id || '').trim();
    if (!id) return;
    const price = priceByItem[id] || row;
    map[id] = {
      item_id: id,
      recommended_price: quotationApprovalNumber_(price.recommended_price),
      list_price: quotationApprovalNumber_(price.list_price),
      floor_price: quotationApprovalNumber_(price.floor_price),
      price_version_id: String(price.price_version_id || '').trim()
    };
  });
  return map;
}

// Override V5 calculator. The public function signature is kept unchanged so existing
// save/approval code does not need to change.
function quotationApprovalScaleFee_(learners, sessions, program, ignoredCatalogById) {
  const n = Math.max(0, quotationApprovalNumber_(learners));
  const s = Number(sessions);
  if (n <= 0) throw new Error('Mô hình theo quy mô cần số trẻ lớn hơn 0.');
  if ([4,8].indexOf(s) < 0) throw new Error('Tần suất theo quy mô chỉ nhận 4 hoặc 8 buổi/tháng.');

  const pricing = quotationApprovalScalePricingMap_();
  const tiers = [
    ['SELF_FEE_1P_T1',1,150],
    ['SELF_FEE_1P_T2',151,300],
    ['SELF_FEE_1P_T3',301,500],
    ['SELF_FEE_1P_T4',501,800],
    ['SELF_FEE_1P_T5',801,Infinity]
  ];
  let progressive = 0;
  tiers.forEach(function(t){
    if (n < t[1]) return;
    const item = pricing[t[0]];
    const rate = item ? quotationApprovalNumber_(item.recommended_price) : 0;
    if (rate <= 0) throw new Error('Thiếu cấu hình giá theo quy mô ' + t[0] + '.');
    const count = Math.max(0, Math.min(n, t[2]) - t[1] + 1);
    progressive += count * rate;
  });

  const frequency = quotationApprovalScaleFactor_(s);
  const raw = progressive * 36 * frequency * quotationApprovalScaleProgramFactor_(program);
  const minimum = quotationApprovalScaleMinimum_(program) * frequency;
  return Math.round(Math.max(raw, minimum));
}
