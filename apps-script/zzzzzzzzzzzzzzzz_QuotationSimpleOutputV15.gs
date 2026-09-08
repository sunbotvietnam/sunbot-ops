// Quotation Simple Output V15 — 2026-09-08
// Báo giá/thuyết minh/đề xuất được dựng lại từ snapshot backend và in/lưu PDF trên trình duyệt,
// tương tự Billing app. Không tạo thêm PDF/Google Doc trên Drive trong luồng vận hành mới.

function quotationCommercialEnsureDocuments_(token,quoteId,force){
  const session=quotationApprovalSession_(token);
  const bundle=quotationApprovalQuoteBundle_(session,{quote_id:String(quoteId||'')},false);
  const q=bundle.quote||{};
  if(String(q.status||'').toUpperCase()!=='APPROVED') throw new Error('Chỉ xuất tài liệu chính thức sau khi báo giá đã phát hành.');
  return {
    quote_id:String(q.quote_id||quoteId||''),
    version:Number(q.version||1),
    quote_pdf_url:'',quote_doc_url:'',
    narrative_pdf_url:'',narrative_doc_url:'',
    proposal_pdf_url:'',proposal_doc_url:'',
    output_mode:'BROWSER_A4_FROM_BACKEND_SNAPSHOT'
  };
}

function quotationCommercialDocumentLinks_(token,payload){
  const session=quotationApprovalSession_(token),id=String(payload&&payload.quote_id||'').trim();
  if(!id) throw new Error('Thiếu mã báo giá.');
  const bundle=quotationApprovalQuoteBundle_(session,{quote_id:id},false),q=bundle.quote||{};
  if(typeof quotationArtifactCanView_==='function'&&!quotationArtifactCanView_(session,q)) throw new Error('Bạn không được xem báo giá của người khác.');
  return {
    quote_id:id,status:String(q.status||''),version:Number(q.version||1),
    quote_pdf_url:'',quote_doc_url:'',narrative_pdf_url:'',narrative_doc_url:'',proposal_pdf_url:'',proposal_doc_url:'',
    output_mode:'BROWSER_A4_FROM_BACKEND_SNAPSHOT'
  };
}
