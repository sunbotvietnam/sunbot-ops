// Quotation Controlled Output V16 — 2026-09-09
// Backend/snapshot remains the source of truth, but every APPROVED quote has a controlled Drive output folder.
// Google Docs/PDF are materialized only for released documents so Admin can audit, share and retrieve them later.

function quotationCommercialOutputFolderUrl_(q){
  try {
    const folder=quotationCommercialDocFolder_(q||{});
    return folder&&folder.getUrl?folder.getUrl():'';
  } catch(e){ return ''; }
}

function quotationCommercialEnsureDocuments_(token,quoteId,force){
  const session=quotationApprovalSession_(token);
  const bundle=quotationApprovalQuoteBundle_(session,{quote_id:String(quoteId||'')},false);
  const q=bundle.quote||{};
  if(String(q.status||'').toUpperCase()!=='APPROVED') throw new Error('Chỉ tạo bộ tài liệu chính thức sau khi báo giá đã phát hành.');

  const rows=quotationCommercialDocRows_();
  const existing=rows.find(function(r){return String(r.quote_id)===String(q.quote_id)&&Number(r.version||1)===Number(q.version||1);});
  if(existing&&!force){
    const out=Object.assign({},existing); delete out._row;
    out.output_folder_url=quotationCommercialOutputFolderUrl_(q);
    out.output_mode='DRIVE_CONTROLLED_OUTPUT';
    return out;
  }

  const quoteArt=quotationArtifactBuildDocument_(bundle,'APPROVED');
  const narrative=quotationCommercialNarrativeDoc_(bundle,false);
  const proposal=quotationCommercialNarrativeDoc_(bundle,true);
  const links={
    quote_pdf_url:quoteArt&&quoteArt.pdf_url||'', quote_doc_url:quoteArt&&quoteArt.doc_url||'',
    narrative_pdf_url:narrative&&narrative.pdf_url||'', narrative_doc_url:narrative&&narrative.doc_url||'',
    proposal_pdf_url:proposal&&proposal.pdf_url||'', proposal_doc_url:proposal&&proposal.doc_url||''
  };
  quotationCommercialDocUpsert_(q,links);
  quotationArtifactIndexUpsert_(q,{approved_pdf_url:links.quote_pdf_url});
  return Object.assign({
    quote_id:String(q.quote_id||quoteId||''),version:Number(q.version||1),
    output_folder_url:quotationCommercialOutputFolderUrl_(q),output_mode:'DRIVE_CONTROLLED_OUTPUT'
  },links);
}

function quotationCommercialDocumentLinks_(token,payload){
  const session=quotationApprovalSession_(token),id=String(payload&&payload.quote_id||'').trim();
  if(!id) throw new Error('Thiếu mã báo giá.');
  const bundle=quotationApprovalQuoteBundle_(session,{quote_id:id},false),q=bundle.quote||{};
  if(typeof quotationArtifactCanView_==='function'&&!quotationArtifactCanView_(session,q)) throw new Error('Bạn không được xem báo giá của người khác.');
  if(String(q.status||'').toUpperCase()!=='APPROVED') return {
    quote_id:id,status:String(q.status||''),version:Number(q.version||1),
    quote_pdf_url:'',quote_doc_url:'',narrative_pdf_url:'',narrative_doc_url:'',proposal_pdf_url:'',proposal_doc_url:'',
    output_folder_url:quotationCommercialOutputFolderUrl_(q),output_mode:'DRIVE_CONTROLLED_OUTPUT'
  };
  return quotationCommercialEnsureDocuments_(token,id,false);
}