// Quotation Legacy Artifact Recovery V10 — 2026-09-07.
// Compatibility layer for quotes created/approved before the Drive-artifact architecture.
// Old approved/pending quotes remain usable: if their index row has no PDF URL, materialize it on demand
// from the authoritative QUOTES + QUOTE_LINES data, then persist the link for subsequent instant opens.

function quotationArtifactCanView_(session, quote) {
  if (String(session.role || '').toUpperCase() === 'ADMIN') return true;
  const q = quote || {};
  const login = String(session.login_id || '');
  const display = String(session.display_name || '');
  return String(q.created_by || '') === login || String(q.deal_owner || '') === login || String(q.created_by || '') === display;
}

function quotationArtifactRecoverOne_(token, quoteId) {
  const session = quotationApprovalSession_(token);
  const id = String(quoteId || '').trim();
  if (!id) throw new Error('Thiếu mã báo giá.');

  const bundle = quotationApprovalQuoteBundle_(session, {quote_id:id}, false);
  const q = bundle && bundle.quote ? bundle.quote : null;
  if (!q) throw new Error('Không tìm thấy báo giá.');
  if (!quotationArtifactCanView_(session, q)) throw new Error('Bạn không được xem báo giá của người khác.');

  const status = String(q.status || '').toUpperCase();
  const stage = status === 'APPROVED' ? 'APPROVED' : 'PENDING';
  const artifact = quotationArtifactBuildDocument_(bundle, stage);
  quotationArtifactIndexUpsert_(q, stage === 'APPROVED'
    ? {approved_pdf_url:artifact.pdf_url}
    : {preview_pdf_url:artifact.pdf_url});

  const row = quotationArtifactIndexRows_().find(function(r){ return String(r.quote_id) === id; });
  return row ? Object.assign({}, row, {_row:undefined}) : {
    quote_id:id,
    version:Number(q.version || 1),
    client_name:String(q.client_name || ''),
    created_by:String(q.created_by || ''),
    deal_owner:String(q.deal_owner || ''),
    region:String(q.region || ''),
    final_amount:quotationApprovalNumber_(q.proposed_amount || q.final_amount),
    status:String(q.status || ''),
    preview_pdf_url:stage === 'PENDING' ? artifact.pdf_url : '',
    approved_pdf_url:stage === 'APPROVED' ? artifact.pdf_url : '',
    combo_code:String(q.combo_code || ''),
    quote_type:quotationCustomerMode_(q)
  };
}

// Override: getQuoteLinks is now self-healing for old rows.
function quotationArtifactLinks_(token, payload) {
  const session = quotationApprovalSession_(token);
  const id = String(payload && payload.quote_id || '').trim();
  if (!id) throw new Error('Thiếu mã báo giá.');

  quotationArtifactEnsureIndexBackfill_(session);
  let row = quotationArtifactIndexRows_().find(function(r){ return String(r.quote_id) === id; });

  if (row && String(session.role || '').toUpperCase() !== 'ADMIN' &&
      String(row.created_by || '') !== String(session.login_id || '') &&
      String(row.deal_owner || '') !== String(session.login_id || '') &&
      String(row.created_by || '') !== String(session.display_name || '')) {
    throw new Error('Bạn không được xem báo giá của người khác.');
  }

  const status = String(row && row.status || '').toUpperCase();
  const hasUsableUrl = row && (status === 'APPROVED'
    ? String(row.approved_pdf_url || row.preview_pdf_url || '').trim()
    : String(row.preview_pdf_url || '').trim());

  if (!row || !hasUsableUrl) {
    row = quotationArtifactRecoverOne_(token, id);
  }

  const out = Object.assign({}, row || {});
  delete out._row;
  return out;
}

// Optional batch repair action for Admin; deliberately bounded to avoid a long Apps Script run.
function quotationArtifactRecoverBatch_(token, payload) {
  const session = quotationApprovalSession_(token);
  if (String(session.role || '').toUpperCase() !== 'ADMIN') throw new Error('Chỉ Admin được khôi phục hàng loạt.');
  const limit = Math.max(1, Math.min(20, Number(payload && payload.limit || 10)));
  quotationArtifactEnsureIndexBackfill_(session);
  const rows = quotationArtifactIndexRows_().filter(function(r){
    const status = String(r.status || '').toUpperCase();
    return status === 'APPROVED' && !String(r.approved_pdf_url || r.preview_pdf_url || '').trim();
  }).slice(0, limit);
  const results = [];
  rows.forEach(function(r){
    try { results.push({quote_id:r.quote_id, ok:true, row:quotationArtifactRecoverOne_(token, r.quote_id)}); }
    catch(e) { results.push({quote_id:r.quote_id, ok:false, error:String(e && e.message || e)}); }
  });
  return {processed:results.length, results:results};
}

// Final router ownership. Preserve all newer routes and add recovery action.
function apiSessionQuotationShared(token, action, payload) {
  const a=String(action||''), request=payload||{};
  if(a==='bootstrapFast') return quotationPerformanceBootstrap_(token);
  if(a==='listQuotesLite') return quotationArtifactListLite_(token);
  if(a==='getQuoteLinks') return quotationArtifactLinks_(token,request);
  if(a==='recoverLegacyArtifacts') return quotationArtifactRecoverBatch_(token,request);
  if(a==='listPublishedQuotes') return quotationPublicationList_(token);
  if(a==='getPublishedQuote'||a==='getQuoteFast') return quotationPublicationGet_(token,request);
  if(a==='saveSnapshot') {
    const result=apiSessionQuotationApproval(token,a,request);
    try{const art=quotationArtifactMaterialize_(token,result.quote_id,'PENDING');result.preview_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
    return result;
  }
  if(a==='approveQuote') {
    const session=quotationApprovalSession_(token);
    const pre=quotationApprovalQuoteBundle_(session,{quote_id:String(request.quote_id||'')},false);
    if(quotationArtifactHasPendingPrice_(pre)) throw new Error('Báo giá còn hạng mục nội dung chương trình chưa có đơn giá. Cần xác nhận đơn giá trước khi duyệt.');
    const result=apiSessionQuotationApproval(token,a,request);
    const id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){
      try{quotationPublicationPublishById_(token,id);}catch(e){}
      try{const art=quotationArtifactMaterialize_(token,id,'APPROVED');result.approved_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
    }
    return result;
  }
  if(a==='adminReviseQuote') {
    const result=apiSessionQuotationApproval(token,a,request);
    const id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){
      if(request.approve_after){
        try{quotationPublicationPublishById_(token,id);}catch(e){}
        try{const art=quotationArtifactMaterialize_(token,id,'APPROVED');result.approved_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
      } else {
        try{const art=quotationArtifactMaterialize_(token,id,'PENDING');result.preview_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}
      }
    }
    return result;
  }
  if(a==='requestChanges'||a==='rejectQuote') {
    const result=apiSessionQuotationApproval(token,a,request);
    const id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){try{const session=quotationApprovalSession_(token);const bundle=quotationApprovalQuoteBundle_(session,{quote_id:id},false);quotationArtifactIndexUpsert_(bundle.quote,{});}catch(e){}}
    return result;
  }
  return apiSessionQuotationApproval(token,a,request);
}
