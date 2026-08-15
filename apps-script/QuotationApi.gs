const QUOTATION_V2 = Object.freeze({
  PRICEBOOK_ID: '13mF0F0U3bgTfhDFQ296QTirXfxdQCp7DGAeB3nDFAho',
  SHEETS: {
    PRODUCTS: 'V2_SAN_PHAM',
    ITEMS: 'V2_HANG_MUC_GIA',
    PACKAGES: 'V2_GOI_GIA',
    SOURCES: 'V2_NGUON_GIA',
    RIGHTS: 'V2_QUYEN_GIA',
    LOG: 'V2_NHAT_KY_BAO_GIA',
    CONFIG: 'V2_CAU_HINH_APP'
  }
});

function apiSessionQuotation(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  payload = payload || {};
  switch (String(action || '')) {
    case 'bootstrap': return quotationBootstrap_(user);
    case 'catalog': return quotationCatalog_(user, payload);
    case 'preview': return quotationPreview_(user, payload);
    case 'save': return quotationSave_(user, payload);
    case 'history': return quotationHistory_(user, payload);
    case 'approve': return quotationApprove_(user, payload);
    default: throw new Error('Tác vụ báo giá không hợp lệ.');
  }
}

function quotationSpreadsheet_() {
  return SpreadsheetApp.openById(QUOTATION_V2.PRICEBOOK_ID);
}

function quotationRows_(sheetName) {
  const sh = quotationSpreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error('Thiếu bảng dữ liệu báo giá: ' + sheetName);
  const values = sh.getDataRange().getDisplayValues();
  if (!values.length) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(function(r){ return r.some(function(v){ return String(v || '').trim() !== ''; }); }).map(function(r){
    const o = {};
    headers.forEach(function(h, i){ o[h] = r[i] !== undefined ? r[i] : ''; });
    return o;
  });
}

function quotationConfig_() {
  const cfg = {};
  quotationRows_(QUOTATION_V2.SHEETS.CONFIG).forEach(function(r){
    cfg[String(r['Khóa'] || '').trim()] = String(r['Giá trị'] || '').trim();
  });
  return cfg;
}

function quotationRoleKey_(user) {
  const roles = (user.roles || []).map(function(x){ return String(x || '').toUpperCase(); });
  const perms = user.permissions || {};
  if (perms['ceo.view'] || perms['admin.people'] || roles.some(function(r){ return /CEO|ADMIN|BOARD/.test(r); })) return 'CEO/Admin';
  if (perms['account.view_all'] || perms['task.view_all'] || roles.some(function(r){ return /LEADER|MANAGER|TRUONG|TRƯỞNG/.test(r); })) return 'Leader';
  if (roles.some(function(r){ return /PARTNER|CTV|REFERRAL/.test(r); })) return 'Partner';
  return 'Sales';
}

function quotationRights_(user) {
  const roleKey = quotationRoleKey_(user);
  const row = quotationRows_(QUOTATION_V2.SHEETS.RIGHTS).find(function(r){ return String(r['Vai trò']) === roleKey; }) || {};
  function yes(v){ return String(v || '').toUpperCase() === 'TRUE'; }
  function pct(v){
    const raw = String(v || '').replace('%','').replace(',','.').trim();
    const n = Number(raw);
    if (!isFinite(n)) return 0;
    return n > 1 ? n / 100 : n;
  }
  return {
    role: roleKey,
    canView: yes(row['Xem bảng giá bán']),
    canViewFloor: yes(row['Xem giá sàn']),
    canViewCost: yes(row['Xem giá vốn']),
    canCreateQuote: yes(row['Tạo báo giá']),
    canEditUnitPrice: yes(row['Sửa đơn giá']),
    maxDiscountRate: pct(row['Chiết khấu tối đa']),
    canApprove: yes(row['Duyệt vượt ngưỡng']),
    canTender: yes(row['Chế độ nhà thầu'])
  };
}

function quotationBootstrap_(user) {
  const rights = quotationRights_(user);
  if (!rights.canView) throw new Error('Tài khoản chưa được cấp quyền xem bảng giá.');
  return {
    user: {user_id:user.user_id, ho_ten:user.ho_ten, email:user.email, roles:user.roles || []},
    rights: rights,
    config: quotationConfig_(),
    generated_at: now_()
  };
}

function quotationCatalog_(user, payload) {
  const rights = quotationRights_(user);
  if (!rights.canView) throw new Error('Tài khoản chưa được cấp quyền xem bảng giá.');
  const products = quotationRows_(QUOTATION_V2.SHEETS.PRODUCTS).filter(function(r){ return String(r['Trạng thái'] || '') !== 'INACTIVE'; });
  const allPackages = quotationRows_(QUOTATION_V2.SHEETS.PACKAGES);
  const allItems = quotationRows_(QUOTATION_V2.SHEETS.ITEMS);
  const approved = function(r){ return String(r['Quyết định CEO'] || '').trim().toUpperCase() === 'DUYỆT DÙNG'; };
  const pendingAllowed = rights.role === 'CEO/Admin';
  const packages = allPackages.filter(function(r){ return approved(r) || pendingAllowed; }).map(function(r){ return quotationPublicPackage_(r, approved(r)); });
  const items = allItems.filter(function(r){ return approved(r) || pendingAllowed; }).map(function(r){ return quotationPublicItem_(r, approved(r)); });
  return {
    products: products,
    packages: packages,
    items: items,
    approved_count: packages.filter(function(x){ return x.approved; }).length,
    pending_count: packages.filter(function(x){ return !x.approved; }).length,
    mode: quotationConfig_().APP_MODE || 'AUDITED_ONLY',
    generated_at: now_()
  };
}

function quotationPublicPackage_(r, approved) {
  return {
    package_id: r['Mã gói'] || '',
    product_id: r['Mã sản phẩm'] || '',
    name: r['Tên gói'] || '',
    duration: r['Năm / thời hạn'] || '',
    price_before_tax: money_(r['Giá chưa VAT']),
    tax_note: r['Thuế / VAT'] || '',
    payment_price: money_(r['Giá thanh toán']),
    audience: r['Đối tượng'] || '',
    scope: r['Phạm vi chính'] || '',
    source_id: r['Nguồn chính'] || '',
    confidence: r['Mức tin cậy'] || '',
    price_status: r['Trạng thái giá'] || '',
    approved: !!approved,
    note: r['Ghi chú'] || ''
  };
}

function quotationPublicItem_(r, approved) {
  return {
    price_id: r['Mã giá'] || '',
    product_id: r['Mã sản phẩm'] || '',
    name: r['Tên hạng mục'] || '',
    item_type: r['Loại hạng mục'] || '',
    unit: r['Đơn vị'] || '',
    price_before_tax: money_(r['Giá chưa VAT']),
    tax_note: r['VAT'] || '',
    payment_price: money_(r['Giá thanh toán']),
    scope: r['Đối tượng / phạm vi'] || '',
    source_id: r['Nguồn chính'] || '',
    confidence: r['Mức tin cậy'] || '',
    price_status: r['Trạng thái giá'] || '',
    approved: !!approved,
    standalone: r['Có thể bán riêng'] || '',
    note: r['Mâu thuẫn / lưu ý'] || ''
  };
}

function quotationPreview_(user, payload) {
  const rights = quotationRights_(user);
  if (!rights.canCreateQuote) throw new Error('Tài khoản chưa được cấp quyền tạo báo giá.');
  const packageId = String(payload.package_id || '').trim();
  if (!packageId) throw new Error('Hãy chọn một gói giá.');
  const row = quotationRows_(QUOTATION_V2.SHEETS.PACKAGES).find(function(r){ return String(r['Mã gói']) === packageId; });
  if (!row) throw new Error('Không tìm thấy gói giá đã chọn.');
  const isApproved = String(row['Quyết định CEO'] || '').trim().toUpperCase() === 'DUYỆT DÙNG';
  if (!isApproved && rights.role !== 'CEO/Admin') throw new Error('Gói giá này chưa được CEO duyệt để sử dụng.');
  const base = money_(row['Giá chưa VAT']) || money_(row['Giá thanh toán']);
  const requestedDiscount = Number(payload.discount_rate || 0);
  if (!isFinite(requestedDiscount) || requestedDiscount < 0) throw new Error('Chiết khấu không hợp lệ.');
  if (requestedDiscount > rights.maxDiscountRate && !rights.canApprove) throw new Error('Mức chiết khấu vượt quyền của bạn.');
  const discountAmount = Math.round(base * requestedDiscount);
  const final = base - discountAmount;
  return {
    package_id: packageId,
    name: row['Tên gói'] || '',
    subtotal: base,
    discount_rate: requestedDiscount,
    discount_amount: discountAmount,
    final_amount: final,
    approval_required: requestedDiscount > rights.maxDiscountRate || !isApproved,
    approved_price: isApproved,
    tax_note: row['Thuế / VAT'] || '',
    source_id: row['Nguồn chính'] || ''
  };
}

function quotationSave_(user, payload) {
  const rights = quotationRights_(user);
  if (!rights.canCreateQuote) throw new Error('Tài khoản chưa được cấp quyền tạo báo giá.');
  const preview = quotationPreview_(user, payload);
  const clientName = String(payload.client_name || '').trim();
  if (!clientName) throw new Error('Hãy nhập tên khách hàng.');
  const quoteId = String(payload.quote_id || ('BG-' + Utilities.formatDate(new Date(), APP.TZ, 'yyyyMMdd-HHmmss'))).replace(/[^A-Za-z0-9_-]/g,'');
  const sh = quotationSpreadsheet_().getSheetByName(QUOTATION_V2.SHEETS.LOG);
  if (!sh) throw new Error('Thiếu nhật ký báo giá V2.');
  const status = preview.approval_required ? 'CHỜ DUYỆT' : 'DỰ THẢO';
  const validDays = Number(quotationConfig_().DEFAULT_QUOTE_VALID_DAYS || 30);
  const expiry = new Date(); expiry.setDate(expiry.getDate() + validDays);
  sh.appendRow([
    quoteId,
    Number(payload.version || 1),
    now_(),
    user.ho_ten || user.user_id,
    user.email || '',
    payload.account_id || payload.opportunity_id || '',
    clientName,
    payload.client_type || '',
    preview.package_id,
    JSON.stringify(payload.config || {}),
    preview.subtotal,
    preview.discount_rate,
    preview.final_amount,
    status,
    '',
    '',
    Utilities.formatDate(expiry, APP.TZ, 'yyyy-MM-dd'),
    '',
    payload.notes || '',
    preview.source_id
  ]);
  return {ok:true, quote_id:quoteId, status:status, preview:preview};
}

function quotationHistory_(user, payload) {
  const rights = quotationRights_(user);
  if (!rights.canCreateQuote && rights.role !== 'CEO/Admin' && rights.role !== 'Leader') throw new Error('Bạn không có quyền xem lịch sử báo giá.');
  let rows = quotationRows_(QUOTATION_V2.SHEETS.LOG);
  if (rights.role === 'Sales') rows = rows.filter(function(r){ return String(r['Email người tạo'] || '').toLowerCase() === String(user.email || '').toLowerCase(); });
  return rows.slice(-200).reverse();
}

function quotationApprove_(user, payload) {
  const rights = quotationRights_(user);
  if (!rights.canApprove) throw new Error('Bạn không có quyền duyệt báo giá.');
  const quoteId = String(payload.quote_id || '').trim();
  if (!quoteId) throw new Error('Thiếu mã báo giá.');
  const sh = quotationSpreadsheet_().getSheetByName(QUOTATION_V2.SHEETS.LOG);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const idxId = headers.indexOf('Mã báo giá');
  const idxStatus = headers.indexOf('Trạng thái');
  const idxApprover = headers.indexOf('Người duyệt');
  const idxApprovedAt = headers.indexOf('Ngày duyệt');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idxId]) === quoteId) {
      sh.getRange(i+1, idxStatus+1).setValue('ĐÃ DUYỆT');
      sh.getRange(i+1, idxApprover+1).setValue(user.ho_ten || user.user_id);
      sh.getRange(i+1, idxApprovedAt+1).setValue(now_());
      return {ok:true, quote_id:quoteId, status:'ĐÃ DUYỆT'};
    }
  }
  throw new Error('Không tìm thấy báo giá cần duyệt.');
}

function money_(value) {
  const s = String(value === null || value === undefined ? '' : value).trim();
  if (!s) return 0;
  const cleaned = s.replace(/\./g,'').replace(/,/g,'').replace(/[^0-9-]/g,'');
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}
