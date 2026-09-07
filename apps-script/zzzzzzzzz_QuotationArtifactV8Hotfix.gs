// V8 artifact compatibility hotfix: old quotes are materialized lazily on first open.
function quotationArtifactLinks_(token,payload){
  const session=quotationApprovalSession_(token), id=String(payload&&payload.quote_id||'').trim();
  if(!id)throw new Error('Thiếu mã báo giá.');
  quotationArtifactEnsureIndexBackfill_(session);
  let row=quotationArtifactIndexRows_().find(function(r){return String(r.quote_id)===id;});
  if(!row)throw new Error('Chưa có bản lưu của báo giá này.');
  if(String(session.role||'').toUpperCase()!=='ADMIN' && String(row.created_by)!==String(session.login_id) && String(row.deal_owner)!==String(session.login_id) && String(row.created_by)!==String(session.display_name)) throw new Error('Bạn không được xem báo giá của người khác.');
  const approved=String(row.status||'').toUpperCase()==='APPROVED';
  const desired=approved?String(row.approved_pdf_url||''):String(row.preview_pdf_url||'');
  if(!desired){
    try{
      const art=quotationArtifactMaterialize_(token,id,approved?'APPROVED':'PENDING');
      row=quotationArtifactIndexRows_().find(function(r){return String(r.quote_id)===id;})||row;
      if(approved)row.approved_pdf_url=art.pdf_url;else row.preview_pdf_url=art.pdf_url;
    }catch(e){
      throw new Error('Không tạo được bản xem nhanh: '+String(e&&e.message||e));
    }
  }
  return {quote_id:id,status:row.status,preview_pdf_url:row.preview_pdf_url||'',approved_pdf_url:row.approved_pdf_url||'',version:Number(row.version||1)};
}
