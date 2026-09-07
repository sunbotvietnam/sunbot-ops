// Quotation Artifact V9 — finalize approved-artifact handoff.
// Ensures BOTH approval paths (approve unchanged and Admin revise+approve)
// materialize the approved PDF and return its Drive URL to the frontend.

function apiSessionQuotationShared(token, action, payload) {
  const a = String(action || ''), request = payload || {};

  if (a === 'bootstrapFast') return quotationPerformanceBootstrap_(token);
  if (a === 'listQuotesLite') return quotationArtifactListLite_(token);
  if (a === 'getQuoteLinks') return quotationArtifactLinks_(token, request);
  if (a === 'listPublishedQuotes') return quotationPublicationList_(token);
  if (a === 'getPublishedQuote' || a === 'getQuoteFast') return quotationPublicationGet_(token, request);

  if (a === 'saveSnapshot') {
    const result = apiSessionQuotationApproval(token, a, request);
    try {
      const art = quotationArtifactMaterialize_(token, result.quote_id, 'PENDING');
      result.preview_pdf_url = art.pdf_url;
      result.preview_doc_url = art.doc_url;
    } catch (e) {
      result.artifact_warning = String(e && e.message || e);
    }
    return result;
  }

  if (a === 'approveQuote') {
    const session = quotationApprovalSession_(token);
    const pre = quotationApprovalQuoteBundle_(session, {quote_id:String(request.quote_id || '')}, false);
    if (quotationArtifactHasPendingPrice_(pre)) {
      throw new Error('Báo giá còn hạng mục nội dung chương trình chưa có đơn giá. Admin cần nhập giá và lưu phiên bản mới trước khi duyệt.');
    }
    const result = apiSessionQuotationApproval(token, a, request);
    const id = String(request.quote_id || (result && result.quote_id) || '').trim();
    if (id) {
      try { quotationPublicationPublishById_(token, id); } catch (e) {}
      try {
        const art = quotationArtifactMaterialize_(token, id, 'APPROVED');
        result.approved_pdf_url = art.pdf_url;
        result.approved_doc_url = art.doc_url;
      } catch (e) {
        result.artifact_warning = String(e && e.message || e);
      }
    }
    return result;
  }

  if (a === 'adminReviseQuote') {
    const result = apiSessionQuotationApproval(token, a, request);
    const id = String(request.quote_id || (result && result.quote_id) || '').trim();
    const approved = String(result && result.status || '').toUpperCase() === 'APPROVED' || request.approve_after === true;
    if (id && approved) {
      try { quotationPublicationPublishById_(token, id); } catch (e) {}
      try {
        const art = quotationArtifactMaterialize_(token, id, 'APPROVED');
        result.approved_pdf_url = art.pdf_url;
        result.approved_doc_url = art.doc_url;
      } catch (e) {
        result.artifact_warning = String(e && e.message || e);
      }
    } else if (id) {
      try {
        const session = quotationApprovalSession_(token);
        const bundle = quotationApprovalQuoteBundle_(session, {quote_id:id}, false);
        quotationArtifactIndexUpsert_(bundle.quote, {});
      } catch (e) {}
    }
    return result;
  }

  if (a === 'requestChanges' || a === 'rejectQuote') {
    const result = apiSessionQuotationApproval(token, a, request);
    const id = String(request.quote_id || (result && result.quote_id) || '').trim();
    if (id) {
      try {
        const session = quotationApprovalSession_(token);
        const bundle = quotationApprovalQuoteBundle_(session, {quote_id:id}, false);
        quotationArtifactIndexUpsert_(bundle.quote, {});
      } catch (e) {}
    }
    return result;
  }

  return apiSessionQuotationApproval(token, a, request);
}
