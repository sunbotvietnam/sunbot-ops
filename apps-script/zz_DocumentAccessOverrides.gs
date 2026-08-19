function docCanSee_(user,r){
  if(roleClass_(user)==='ADMIN')return true;
  if(String(r.owner_user_id)===String(user.user_id)||String(r.created_by_user_id)===String(user.user_id))return true;
  if(roleClass_(user)==='LEADER'&&r.outreach_id){const row=findOne_(OUTREACH.SHEET,'outreach_id',r.outreach_id);if(row&&salesCanAccessRow_(user,row))return true;}
  return false;
}

function docIdFromUrl_(url){const m=String(url||'').match(/\/d\/([A-Za-z0-9_-]+)/);return m?m[1]:'';}
function finalizeApprovedProposal_(r,user){
  if(String(r.document_type)!=='PROPOSAL'||!r.doc_url)return String(r.pdf_url||'');
  try{
    const docId=docIdFromUrl_(r.doc_url);if(!docId)return String(r.pdf_url||'');
    const doc=DocumentApp.openById(docId),body=doc.getBody();
    body.replaceText('TÀI LIỆU DỰ THẢO – CHỈ GỬI RA NGOÀI SAU KHI ĐƯỢC DUYỆT','ĐÃ ĐƯỢC DUYỆT NỘI BỘ SUNBOT');
    body.appendHorizontalRule();
    body.appendParagraph('Phê duyệt nội bộ').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendTable([['Người duyệt',String(user.ho_ten||user.user_id)],['Thời điểm',Utilities.formatDate(new Date(),APP.TZ,'dd/MM/yyyy HH:mm')],['Trạng thái','APPROVED']]).setBorderWidth(0.5);
    doc.saveAndClose();
    const folder=documentFolder_(),file=DriveApp.getFileById(docId),pdf=folder.createFile(file.getAs(MimeType.PDF).setName(String(r.reference||r.document_id)+'-APPROVED.pdf'));
    return pdf.getUrl();
  }catch(e){audit_(user,'FINAL_PDF_WARNING',DOC_ENGINE.SHEET,r.document_id,{error:String(e.message||e)});return String(r.pdf_url||'');}
}

function documentApprove_(user,p){
  required_(p,['document_id']);const r=findOne_(DOC_ENGINE.SHEET,'document_id',p.document_id);if(!r)throw new Error('Không tìm thấy tài liệu.');const actor=roleClass_(user);if(actor!=='ADMIN'&&actor!=='LEADER')throw new Error('Bạn không có quyền duyệt proposal.');
  if(actor==='LEADER'){const creatorClass=roleClass_(String(r.created_by_user_id));if(creatorClass!=='STAFF')throw new Error('Leader chỉ duyệt proposal do Staff tạo.');const row=r.outreach_id?findOne_(OUTREACH.SHEET,'outreach_id',r.outreach_id):null;if(!row||!salesCanAccessRow_(user,row))throw new Error('Proposal này không thuộc nhóm trường do bạn quản lý.');}
  const finalPdf=finalizeApprovedProposal_(r,user);
  updateById_(DOC_ENGINE.SHEET,'document_id',r.document_id,{status:'APPROVED',approval_note:String(p.note||''),approved_by_user_id:user.user_id,approved_at:now_(),pdf_url:finalPdf||r.pdf_url,updated_at:now_()});
  audit_(user,'APPROVE_DOCUMENT',DOC_ENGINE.SHEET,r.document_id,{type:r.document_type,final_pdf:finalPdf});return{ok:true,pdf_url:finalPdf,message:'Đã duyệt và tạo bản PDF chính thức.'};
}

function documentReject_(user,p){
  required_(p,['document_id']);const r=findOne_(DOC_ENGINE.SHEET,'document_id',p.document_id);if(!r)throw new Error('Không tìm thấy tài liệu.');const actor=roleClass_(user);if(actor==='LEADER'){const row=r.outreach_id?findOne_(OUTREACH.SHEET,'outreach_id',r.outreach_id):null;if(!row||!salesCanAccessRow_(user,row))throw new Error('Proposal này không thuộc nhóm trường do bạn quản lý.');}else if(actor!=='ADMIN')throw new Error('Bạn không có quyền trả lại tài liệu.');updateById_(DOC_ENGINE.SHEET,'document_id',r.document_id,{status:'NEEDS_REVISION',approval_note:String(p.note||'Cần chỉnh sửa'),approved_by_user_id:user.user_id,approved_at:now_(),updated_at:now_()});audit_(user,'REJECT_DOCUMENT',DOC_ENGINE.SHEET,r.document_id,{note:p.note||''});return{ok:true,message:'Đã trả lại để chỉnh sửa.'};
}
