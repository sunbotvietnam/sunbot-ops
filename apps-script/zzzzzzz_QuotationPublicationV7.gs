// Quotation Publication V7 — immutable approved snapshots.
// Approved quotes are materialized once, then employees can read a published snapshot
// without rescanning QUOTES + QUOTE_LINES on every click.

const QUOTATION_PUBLICATION_V7 = Object.freeze({
  VERSION: '2026.09.07-publication-v1',
  SHEET: 'QUOTE_PUBLICATIONS',
  CACHE_PREFIX: 'QPUB:',
  CACHE_SECONDS: 21600
});

function quotationPublicationHeaders_() {
  return ['publication_id','quote_id','version','published_at','approved_by','approved_at','created_by','deal_owner','client_name','final_amount','snapshot_json'];
}

function quotationPublicationSheet_() {
  const ss = quotationApprovalSpreadsheet_();
  let sheet = ss.getSheetByName(QUOTATION_PUBLICATION_V7.SHEET);
  if (!sheet) sheet = ss.insertSheet(QUOTATION_PUBLICATION_V7.SHEET);
  quotationApprovalHeaders_(sheet, quotationPublicationHeaders_(), QUOTATION_APPROVAL.HEADER_ROW);
  return sheet;
}

function quotationPublicationKey_(quoteId, version) {
  return String(quoteId || '').trim() + ':v' + Number(version || 1);
}

function quotationPublicationCacheKey_(quoteId, version) {
  return QUOTATION_PUBLICATION_V7.CACHE_PREFIX + quotationPublicationKey_(quoteId, version);
}

function quotationPublicationCanRead_(session, bundle) {
  if (String(session.role || '').toUpperCase() === 'ADMIN') return true;
  const q = bundle && bundle.quote || {};
  return quotationEmployeeFastCanRead_(session, q);
}

function quotationPublicationSnapshot_(bundle) {
  const q = Object.assign({}, bundle && bundle.quote || {});
  q.status = 'APPROVED';
  q.approval_required = false;
  q.exportable = true;
  return {
    quote: q,
    lines: (bundle && bundle.lines || []).map(function(line){ return Object.assign({}, line); }),
    publication: {
      version: QUOTATION_PUBLICATION_V7.VERSION,
      published_at: new Date().toISOString(),
      immutable: true
    }
  };
}

function quotationPublicationRows_() {
  const sheet = quotationPublicationSheet_();
  const values = sheet.getDataRange().getValues();
  const headerRow = QUOTATION_APPROVAL.HEADER_ROW;
  if (values.length < headerRow) return [];
  const headers = values[headerRow - 1].map(function(v){ return String(v || '').trim(); });
  return values.slice(headerRow).filter(function(row){
    return row.some(function(v){ return String(v == null ? '' : v).trim() !== ''; });
  }).map(function(row, offset){
    return quotationEmployeeFastObject_(headers, row, headerRow + offset + 1);
  });
}

function quotationPublicationFind_(quoteId, version) {
  const key = quotationPublicationKey_(quoteId, version);
  const rows = quotationPublicationRows_();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (quotationPublicationKey_(rows[i].quote_id, rows[i].version) === key) return rows[i];
  }
  return null;
}

function quotationPublicationPersist_(session, bundle) {
  const q = bundle && bundle.quote || {};
  const quoteId = String(q.quote_id || '').trim();
  const version = Number(q.version || 1);
  if (!quoteId || String(q.status || '').toUpperCase() !== 'APPROVED') return null;

  const existing = quotationPublicationFind_(quoteId, version);
  if (existing) {
    try {
      const parsed = JSON.parse(String(existing.snapshot_json || '{}'));
      CacheService.getScriptCache().put(quotationPublicationCacheKey_(quoteId, version), JSON.stringify(parsed), QUOTATION_PUBLICATION_V7.CACHE_SECONDS);
      return parsed;
    } catch (error) {}
  }

  const snapshot = quotationPublicationSnapshot_(bundle);
  const json = JSON.stringify(snapshot);
  const sheet = quotationPublicationSheet_();
  const headers = quotationApprovalHeaders_(sheet, quotationPublicationHeaders_(), QUOTATION_APPROVAL.HEADER_ROW);
  quotationApprovalAppendObject_(sheet, headers, {
    publication_id: 'PUB-' + Utilities.getUuid(),
    quote_id: quoteId,
    version: version,
    published_at: new Date(),
    approved_by: String(q.approved_by || session.login_id || ''),
    approved_at: q.approved_at || new Date(),
    created_by: String(q.created_by || ''),
    deal_owner: String(q.deal_owner || ''),
    client_name: String(q.client_name || ''),
    final_amount: quotationApprovalNumber_(q.proposed_amount || q.final_amount),
    snapshot_json: json
  });
  try { CacheService.getScriptCache().put(quotationPublicationCacheKey_(quoteId, version), json, QUOTATION_PUBLICATION_V7.CACHE_SECONDS); } catch (error) {}
  try { quotationApprovalAudit_(session, 'QUOTE_PUBLISH', quoteId, {version:version,published_at:snapshot.publication.published_at}); } catch (error) {}
  return snapshot;
}

function quotationPublicationPublishById_(token, quoteId) {
  const session = quotationApprovalSession_(token);
  const bundle = quotationEmployeeFastGet_(token, {quote_id: quoteId});
  if (!bundle || String(bundle.quote && bundle.quote.status || '').toUpperCase() !== 'APPROVED') return null;
  return quotationPublicationPersist_(session, bundle);
}

function quotationPublicationGet_(token, payload) {
  const session = quotationApprovalSession_(token);
  const quoteId = String(payload && payload.quote_id || '').trim();
  const requestedVersion = Number(payload && payload.version || 0);
  if (!quoteId) throw new Error('Thiếu mã báo giá.');

  let version = requestedVersion;
  if (!version) {
    const latest = quotationEmployeeFastLatestQuote_(quotationApprovalSpreadsheet_(), quoteId);
    if (!latest) throw new Error('Không tìm thấy báo giá.');
    version = Number(latest.version || 1);
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = quotationPublicationCacheKey_(quoteId, version);
  const cached = cache.get(cacheKey);
  if (cached) {
    const snapshot = JSON.parse(cached);
    if (!quotationPublicationCanRead_(session, snapshot)) throw new Error('Bạn không được xem báo giá của người khác.');
    return snapshot;
  }

  const row = quotationPublicationFind_(quoteId, version);
  if (row) {
    const snapshot = JSON.parse(String(row.snapshot_json || '{}'));
    if (!quotationPublicationCanRead_(session, snapshot)) throw new Error('Bạn không được xem báo giá của người khác.');
    try { cache.put(cacheKey, JSON.stringify(snapshot), QUOTATION_PUBLICATION_V7.CACHE_SECONDS); } catch (error) {}
    return snapshot;
  }

  // Compatibility path for approved quotes created before Publication V7.
  const bundle = quotationEmployeeFastGet_(token, {quote_id: quoteId});
  if (String(bundle.quote && bundle.quote.status || '').toUpperCase() !== 'APPROVED') return bundle;
  return quotationPublicationPersist_(session, bundle);
}

function quotationPublicationList_(token) {
  const session = quotationApprovalSession_(token);
  const rows = quotationPublicationRows_();
  const out = [];
  rows.forEach(function(row){
    try {
      const snapshot = JSON.parse(String(row.snapshot_json || '{}'));
      if (quotationPublicationCanRead_(session, snapshot)) out.push(snapshot);
    } catch (error) {}
  });

  // One-time compatibility backfill for older approved quotes. Do not block normal reads once publications exist.
  if (!out.length && String(session.role || '').toUpperCase() !== 'ADMIN') {
    const listed = quotationApprovalList_(session);
    const quotes = Array.isArray(listed) ? listed : (listed && (listed.quotes || listed.items || listed.data) || []);
    quotes.filter(function(q){ return String(q.status || '').toUpperCase() === 'APPROVED'; }).slice(0, 12).forEach(function(q){
      try {
        const snap = quotationPublicationGet_(token, {quote_id:String(q.quote_id || '')});
        if (snap && snap.quote) out.push(snap);
      } catch (error) {}
    });
  }

  const latest = {};
  out.forEach(function(snapshot){
    const q = snapshot.quote || {};
    const id = String(q.quote_id || '');
    if (!id) return;
    if (!latest[id] || Number(q.version || 1) > Number(latest[id].quote.version || 1)) latest[id] = snapshot;
  });
  return {items:Object.keys(latest).map(function(id){ return latest[id]; }), publication_version:QUOTATION_PUBLICATION_V7.VERSION};
}

// Final shared router: approval now means APPROVE + PUBLISH.
function apiSessionQuotationShared(token, action, payload) {
  const a = String(action || '');
  const request = payload || {};
  if (a === 'bootstrapFast') return quotationPerformanceBootstrap_(token);
  if (a === 'listPublishedQuotes') return quotationPublicationList_(token);
  if (a === 'getPublishedQuote') return quotationPublicationGet_(token, request);
  if (a === 'getQuoteFast') return quotationPublicationGet_(token, request);
  if (a === 'approveQuote') {
    const result = apiSessionQuotationApproval(token, a, request);
    const quoteId = String(request.quote_id || (result && result.quote_id) || '').trim();
    if (quoteId) {
      try { quotationPublicationPublishById_(token, quoteId); } catch (error) {}
    }
    return result;
  }
  return apiSessionQuotationApproval(token, a, request);
}
