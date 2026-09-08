// Quotation Document Bridge V1 — feature branch only.
// Purpose: expose a clean, deterministic quotation snapshot for the Sunbot
// commercial-document editor and register the resulting Google Doc link.
// Production deployment is intentionally deferred until pilot acceptance.

const QDOC = Object.freeze({
  SS_ID: '1Er11CKeojfSKWfb9zYGTXSLDWocfYX7d-Gi5Sya2EDg',
  OUTPUT_ROOT_FOLDER_ID: '1I-gjcxE57vQE4kW6Lhojs5Gp5078EqPl',
  TEMPLATE_FOLDER_ID: '1aaB1OOyd3LDt9uOVZf9lWbA371HFIeeW',
  SHEETS: {
    QUOTES: { name: 'QUOTES', headerRow: 3 },
    LINES: { name: 'QUOTE_LINES', headerRow: 3 },
    REQUESTS: { name: 'QUOTE_REQUESTS', headerRow: 1 },
    TEMPLATES: { name: 'DOCUMENT_TEMPLATES', headerRow: 1 },
    LOG: { name: 'DOCUMENT_LOG', headerRow: 1 }
  }
});

function apiQuotationDocumentBridge(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  payload = payload || {};
  if (String(action) === 'context') return quotationDocumentContext_(user, payload);
  if (String(action) === 'register') return quotationDocumentRegister_(user, payload);
  if (String(action) === 'list') return quotationDocumentList_(user, payload);
  if (String(action) === 'templates') return quotationDocumentTemplates_(user, payload);
  throw new Error('Tác vụ tài liệu báo giá không hợp lệ.');
}

function qdocSs_() {
  return SpreadsheetApp.openById(QDOC.SS_ID);
}

function qdocRows_(key) {
  const cfg = QDOC.SHEETS[key];
  const sh = qdocSs_().getSheetByName(cfg.name);
  if (!sh) throw new Error('Thiếu sheet ' + cfg.name);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < cfg.headerRow || lastCol < 1) return [];
  const values = sh.getRange(cfg.headerRow, 1, lastRow - cfg.headerRow + 1, lastCol).getDisplayValues();
  const headers = values.shift().map(function(x){ return String(x || '').trim(); });
  return values.filter(function(r){ return r.some(function(x){ return String(x || '').trim() !== ''; }); })
    .map(function(r){
      const o = {};
      headers.forEach(function(h, i){ if (h) o[h] = r[i]; });
      return o;
    });
}

function qdocNumber_(v) {
  const n = Number(String(v == null ? '' : v).replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}

function qdocQuote_(quoteId, version) {
  const rows = qdocRows_('QUOTES').filter(function(r){ return String(r.quote_id) === String(quoteId); });
  if (!rows.length) throw new Error('Không tìm thấy báo giá ' + quoteId);
  if (version != null && String(version) !== '') {
    const hit = rows.find(function(r){ return String(r.version) === String(version); });
    if (!hit) throw new Error('Không tìm thấy phiên bản ' + version + ' của ' + quoteId);
    return hit;
  }
  return rows.sort(function(a,b){ return qdocNumber_(b.version) - qdocNumber_(a.version); })[0];
}

function qdocLines_(quoteId, version) {
  return qdocRows_('LINES')
    .filter(function(r){
      return String(r.quote_id) === String(quoteId) &&
        (!version || !r.version || String(r.version) === String(version));
    })
    .sort(function(a,b){ return qdocNumber_(a.line_no) - qdocNumber_(b.line_no); })
    .map(function(r){
      return {
        line_no: r.line_no,
        item_id: r.item_id,
        item_name: r.item_name_snapshot,
        unit: r.unit_snapshot,
        unit_price: qdocNumber_(r.proposed_unit_price || r.unit_price_snapshot),
        qty: qdocNumber_(r.qty),
        discount_rate: qdocNumber_(r.discount_rate),
        line_total: qdocNumber_(r.line_total),
        commercial_group: r.commercial_group || '',
        is_custom: String(r.is_custom || '').toUpperCase() === 'TRUE',
        exception_reason: r.exception_reason || ''
      };
    });
}

function qdocRequest_(quoteId) {
  return qdocRows_('REQUESTS').filter(function(r){ return String(r.quote_id) === String(quoteId); })[0] || {};
}

function qdocSafeQuote_(q) {
  // Only customer/commercial fields. Deliberately excludes internal economics,
  // floor-price concepts and approval diagnostics from the AI document input.
  return {
    quote_id: q.quote_id,
    version: q.version,
    created_at: q.created_at,
    created_by: q.created_by,
    client_name: q.client_name,
    client_type: q.client_type,
    region: q.region,
    deal_owner: q.deal_owner,
    learner_count: q.learner_count,
    deployment_sites: q.deployment_sites,
    commercial_model: q.commercial_model,
    final_amount: qdocNumber_(q.final_amount),
    subtotal: qdocNumber_(q.subtotal),
    discount_rate: qdocNumber_(q.discount_rate),
    discount_amount: qdocNumber_(q.discount_amount),
    status: q.status,
    notes: q.notes || '',
    configuration_description: q.configuration_description || ''
  };
}

function qdocSafeRequest_(r) {
  return {
    request_id: r.request_id || '',
    created_by: r.created_by || '',
    region: r.region || '',
    school_name: r.school_name || '',
    school_type: r.school_type || '',
    learner_count: r.learner_count || '',
    existing_sunbot: r.existing_sunbot || '',
    asset_option: r.asset_option || '',
    teacher_status: r.teacher_status || '',
    expected_start: r.expected_start || '',
    decision_maker: r.decision_maker || '',
    budget_note: r.budget_note || '',
    sales_proposal: r.sales_proposal || '',
    notes: r.notes || '',
    status: r.status || ''
  };
}

function quotationDocumentContext_(user, p) {
  if (!p.quote_id) throw new Error('Thiếu quote_id.');
  const q = qdocQuote_(p.quote_id, p.version);
  const lines = qdocLines_(q.quote_id, q.version);
  const req = qdocRequest_(q.quote_id);
  const templates = qdocRows_('TEMPLATES').filter(function(r){ return String(r.status).toUpperCase() === 'ACTIVE'; });
  return {
    ok: true,
    generated_at: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    quote: qdocSafeQuote_(q),
    request: qdocSafeRequest_(req),
    lines: lines,
    templates: templates.map(function(t){ return {
      template_id: t.template_id,
      document_type: t.document_type,
      template_name: t.template_name,
      template_doc_id: t.template_doc_id,
      template_url: t.template_url,
      use_for: t.use_for,
      version: t.version
    }; }),
    rules: {
      source_of_truth: 'Backend snapshot',
      google_docs_is_master: true,
      create_pdf: false,
      ai_may_change_prices: false,
      ai_may_change_discount: false,
      ai_may_propose_document_title: true,
      standalone_or_repair_has_narrative: false,
      deployment_may_have_proposal: true
    }
  };
}

function quotationDocumentTemplates_(user, p) {
  return qdocRows_('TEMPLATES').filter(function(r){
    if (String(r.status).toUpperCase() !== 'ACTIVE') return false;
    if (!p.document_type) return true;
    return String(r.document_type).toUpperCase() === String(p.document_type).toUpperCase();
  });
}

function quotationDocumentList_(user, p) {
  let rows = qdocRows_('LOG');
  if (p.quote_id) rows = rows.filter(function(r){ return String(r.quote_id) === String(p.quote_id); });
  if (p.school_name) rows = rows.filter(function(r){ return String(r.school_name) === String(p.school_name); });
  return rows.sort(function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); }).slice(0,200);
}

function quotationDocumentRegister_(user, p) {
  if (roleClass_(user) !== 'ADMIN') throw new Error('Chỉ Admin được đăng ký tài liệu khách hàng.');
  ['quote_id','quote_version','school_name','document_type','document_title','google_doc_id','google_doc_url'].forEach(function(k){
    if (!p[k]) throw new Error('Thiếu ' + k);
  });
  const sh = qdocSs_().getSheetByName(QDOC.SHEETS.LOG.name);
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  const now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  const documentId = p.document_id || ('DOC-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0,4).toUpperCase());
  const obj = {
    document_id: documentId,
    quote_id: p.quote_id,
    quote_version: String(p.quote_version),
    request_id: p.request_id || '',
    school_name: p.school_name,
    document_type: p.document_type,
    template_id: p.template_id || '',
    document_title: p.document_title,
    google_doc_id: p.google_doc_id,
    google_doc_url: p.google_doc_url,
    status: p.status || 'DRAFT',
    created_at: now,
    created_by: user.name || user.username || user.user_id || 'admin',
    approved_by: p.approved_by || '',
    sent_to_sale_at: p.sent_to_sale_at || '',
    sent_to_customer_at: p.sent_to_customer_at || '',
    supersedes_document_id: p.supersedes_document_id || '',
    notes: p.notes || ''
  };
  sh.appendRow(headers.map(function(h){ return obj[h] == null ? '' : obj[h]; }));
  return { ok:true, document_id:documentId, google_doc_url:p.google_doc_url };
}
