const QUOTATION_DOC_V1 = Object.freeze({
  PRICEBOOK_ID: '1Er11CKeojfSKWfb9zYGTXSLDWocfYX7d-Gi5Sya2EDg',
  TEMPLATE_SHEET: 'DOCUMENT_TEMPLATES',
  LOG_SHEET: 'DOCUMENT_LOG',
  OUTPUT_FOLDER_ID: '1I-gjcxE57vQE4kW6Lhojs5Gp5078EqPl'
});

/**
 * Read-only payload for the ChatGPT quotation document engine.
 * This function does not create a document and never recalculates commercial values.
 */
function quotationDocumentPayloadV1_(quoteId, quoteVersion) {
  if (!quoteId) throw new Error('Thiếu quote_id.');
  const ss = SpreadsheetApp.openById(QUOTATION_DOC_V1.PRICEBOOK_ID);
  const quotes = sheetObjectsV1_(ss.getSheetByName('QUOTES'));
  const versions = quotes.filter(function(r){ return String(r.quote_id) === String(quoteId); });
  if (!versions.length) throw new Error('Không tìm thấy báo giá: ' + quoteId);
  let q;
  if (quoteVersion !== undefined && quoteVersion !== null && quoteVersion !== '') {
    q = versions.find(function(r){ return Number(r.version) === Number(quoteVersion); });
    if (!q) throw new Error('Không tìm thấy phiên bản ' + quoteVersion + ' của ' + quoteId);
  } else {
    q = versions.sort(function(a,b){ return Number(b.version||0)-Number(a.version||0); })[0];
  }

  const lines = sheetObjectsV1_(ss.getSheetByName('QUOTE_LINES'))
    .filter(function(r){
      if (String(r.quote_id) !== String(quoteId)) return false;
      if (r.version === '' || r.version === null || r.version === undefined) return true;
      return Number(r.version) === Number(q.version);
    })
    .sort(function(a,b){ return Number(a.line_no||0)-Number(b.line_no||0); });

  const requestRows = sheetObjectsV1_(ss.getSheetByName('QUOTE_REQUESTS'));
  const req = requestRows.find(function(r){ return String(r.quote_id||'') === String(quoteId); }) || {};

  const safeLines = lines.map(function(r){
    return {
      line_no: Number(r.line_no||0),
      item_id: String(r.item_id||''),
      name: String(r.item_name_snapshot||''),
      unit: String(r.unit_snapshot||''),
      quantity: Number(r.qty||0),
      unit_price: Number(r.proposed_unit_price || r.unit_price_snapshot || 0),
      line_total: Number(r.line_total||0),
      commercial_group: String(r.commercial_group||''),
      is_custom: String(r.is_custom||'').toUpperCase() === 'TRUE' || r.is_custom === true,
      role: 'CORE'
    };
  });

  const suggestion = suggestDocumentTypeV1_(q, req, safeLines);
  return {
    quote_id: String(q.quote_id),
    quote_version: Number(q.version||1),
    request_id: String(req.request_id||''),
    suggested_document_type: suggestion,
    school: {
      name: String(q.client_name || req.school_name || ''),
      school_type: String(req.school_type||q.client_type||''),
      learner_count: Number(req.learner_count || q.learner_count || 0),
      legacy_school: String(req.existing_sunbot||'').toUpperCase() === 'YES',
      decision_maker: String(req.decision_maker||'')
    },
    context: {
      region: String(req.region||q.region||''),
      asset_option: String(req.asset_option||''),
      teacher_status: String(req.teacher_status||''),
      expected_start: req.expected_start || '',
      sale_proposal: String(req.sales_proposal||''),
      sale_notes: String(req.notes||''),
      admin_notes: String(q.notes||''),
      configuration_description: String(q.configuration_description||'')
    },
    commercial: {
      currency: 'VND',
      subtotal: Number(q.subtotal||0),
      discount_percent: Number(q.discount_rate||0),
      discount_amount: Number(q.discount_amount||0),
      total: Number(q.final_amount||q.proposed_amount||0),
      lines: safeLines
    },
    status: String(q.status||''),
    created_by: String(q.created_by||''),
    deal_owner: String(q.deal_owner||''),
    template_registry: quotationDocumentTemplatesV1_(),
    output_folder_id: QUOTATION_DOC_V1.OUTPUT_FOLDER_ID
  };
}

function quotationDocumentTemplatesV1_() {
  const ss = SpreadsheetApp.openById(QUOTATION_DOC_V1.PRICEBOOK_ID);
  const sh = ss.getSheetByName(QUOTATION_DOC_V1.TEMPLATE_SHEET);
  if (!sh) return [];
  return sheetObjectsV1_(sh).filter(function(r){ return String(r.status||'').toUpperCase() === 'ACTIVE'; }).map(function(r){
    return {
      template_key: String(r.template_key||''),
      document_type: String(r.document_type||''),
      template_name: String(r.template_name||''),
      google_doc_id: String(r.google_doc_id||''),
      google_doc_url: String(r.google_doc_url||''),
      version: String(r.version||'')
    };
  });
}

/**
 * Log only after a Google Doc has actually been created by the document engine.
 */
function quotationDocumentLogV1_(entry) {
  entry = entry || {};
  ['quote_id','quote_version','document_type','document_title','google_doc_id','google_doc_url','template_key'].forEach(function(k){
    if (entry[k] === undefined || entry[k] === null || entry[k] === '') throw new Error('Thiếu ' + k);
  });
  const ss = SpreadsheetApp.openById(QUOTATION_DOC_V1.PRICEBOOK_ID);
  const sh = ss.getSheetByName(QUOTATION_DOC_V1.LOG_SHEET);
  if (!sh) throw new Error('Thiếu sheet ' + QUOTATION_DOC_V1.LOG_SHEET);
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const row = {
    document_id: entry.document_id || ('DOC-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0,6).toUpperCase()),
    quote_id: String(entry.quote_id),
    quote_version: Number(entry.quote_version),
    request_id: String(entry.request_id||''),
    school_name: String(entry.school_name||''),
    document_type: String(entry.document_type),
    document_title: String(entry.document_title),
    google_doc_id: String(entry.google_doc_id),
    google_doc_url: String(entry.google_doc_url),
    template_key: String(entry.template_key),
    created_at: new Date(),
    created_by: String(entry.created_by||''),
    status: String(entry.status||'DRAFT'),
    sent_at: entry.sent_at || '',
    sent_by: String(entry.sent_by||''),
    notes: String(entry.notes||'')
  };
  sh.appendRow(headers.map(function(h){ return row[h] === undefined ? '' : row[h]; }));
  return row;
}

function suggestDocumentTypeV1_(q, req, lines) {
  const asset = String(req.asset_option||'').toUpperCase();
  const text = [req.sales_proposal, req.notes].concat((lines||[]).map(function(x){return x.name;})).join(' ').toLowerCase();
  if (asset === 'RETAIL_REPAIR') {
    if (/sửa|sua|pin|mạch|mach|động cơ|dong co|linh kiện|linh kien|hỏng|hong/.test(text)) return 'REPAIR_ESTIMATE';
    if (/đào tạo|dao tao|tái đào tạo|tai dao tao|sát hạch|sat hach|chứng nhận|chung nhan/.test(text)) return 'STANDALONE_QUOTE';
    return 'STANDALONE_QUOTE';
  }
  return 'SOLUTION_QUOTE';
}

function sheetObjectsV1_(sh) {
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];
  let headerRow = -1;
  for (let i=0;i<Math.min(values.length,10);i++) {
    if ((values[i]||[]).filter(function(x){return String(x||'').trim();}).length >= 2) {
      const first = String((values[i]||[])[0]||'').trim();
      if (/(_id$|quote_id|request_id|template_key|document_id)/i.test(first)) { headerRow=i; break; }
    }
  }
  if (headerRow < 0) headerRow = 0;
  const headers = values[headerRow].map(function(x){return String(x||'').trim();});
  return values.slice(headerRow+1).filter(function(row){return row.some(function(v){return v!=='' && v!==null;});}).map(function(row){
    const out={}; headers.forEach(function(h,idx){if(h)out[h]=row[idx];}); return out;
  });
}
