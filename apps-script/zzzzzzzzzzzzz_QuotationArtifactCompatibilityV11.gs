// Artifact compatibility V11 — 2026-09-08.
// Historical PDFs created by older renderers are refreshed once into the current customer format.

function quotationArtifactFileIdFromUrlV11_(url){
  const m=String(url||'').match(/\/d\/([A-Za-z0-9_-]+)/); return m?m[1]:'';
}
function quotationArtifactIsCurrentV11_(url){
  const id=quotationArtifactFileIdFromUrlV11_(url); if(!id)return false;
  try{
    const name=String(DriveApp.getFileById(id).getName()||'').toUpperCase();
    return name.indexOf('CHINH THUC')>=0||name.indexOf('BAN DU THAO')>=0;
  }catch(e){return false;}
}

function quotationArtifactLinks_(token,payload){
  const session=quotationApprovalSession_(token), id=String(payload&&payload.quote_id||'').trim();
  if(!id)throw new Error('Thiếu mã báo giá.');
  quotationArtifactEnsureIndexBackfill_(session);
  let row=quotationArtifactIndexRows_().find(function(r){return String(r.quote_id)===id;});
  if(!row)throw new Error('Chưa có bản lưu của báo giá này.');
  if(String(session.role||'').toUpperCase()!=='ADMIN'&&String(row.created_by)!==String(session.login_id)&&String(row.deal_owner)!==String(session.login_id)&&String(row.created_by)!==String(session.display_name))throw new Error('Bạn không được xem báo giá của người khác.');

  const approved=String(row.status||'').toUpperCase()==='APPROVED';
  const currentUrl=approved?String(row.approved_pdf_url||''):String(row.preview_pdf_url||'');
  if(!quotationArtifactIsCurrentV11_(currentUrl)){
    try{
      const art=quotationArtifactMaterialize_(token,id,approved?'APPROVED':'PENDING');
      row=quotationArtifactIndexRows_().find(function(r){return String(r.quote_id)===id;})||row;
      if(approved)row.approved_pdf_url=art.pdf_url; else row.preview_pdf_url=art.pdf_url;
    }catch(e){
      // Viewing must still work from transactional data even if PDF regeneration fails.
    }
  }
  const out=Object.assign({},row); delete out._row; return out;
}
