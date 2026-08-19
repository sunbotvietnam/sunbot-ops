function apiSessionProposalQuotation(sessionToken, action, payload){
  const user=authenticateSession_(sessionToken);payload=payload||{};
  switch(String(action||'')){
    case 'bootstrap': return proposalQuotationBootstrap_(user,payload);
    case 'preview': return proposalQuotationPreview_(user,payload);
    case 'create': return proposalQuotationCreate_(user,payload);
    default: throw new Error('Tác vụ Proposal/Báo giá không hợp lệ.');
  }
}
function proposalQuotationBootstrap_(user,p){
  const rights=quotationRights_(user);if(!rights.canView||!rights.canCreateQuote)throw new Error('Tài khoản chưa được cấp quyền lập báo giá.');
  const cat=quotationCatalog_(user,p||{});return{rights:rights,products:cat.products||[],packages:cat.packages||[],items:cat.items||[],generated_at:now_()};
}
function proposalQuotationPreview_(user,p){return quotationPreview_(user,p);}
function ensureProposalQuotationColumn_(){
  const sh=ensureDocumentSheet_();const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);if(!h.includes('quotation_id'))sh.getRange(1,sh.getLastColumn()+1).setValue('quotation_id');
}
function proposalQuotationCreate_(user,p){
  required_(p,['outreach_id','package_id']);
  ensureProposalQuotationColumn_();
  const ctx=documentContext_(user,p),preview=quotationPreview_(user,p);
  const saved=quotationSave_(user,{account_id:ctx.row.account_id||'',opportunity_id:p.opportunity_id||'',client_name:ctx.row.ten_truong,client_type:ctx.row.loai_hinh||'',package_id:p.package_id,discount_rate:Number(p.discount_rate||0),config:p.config||{},notes:p.notes||''});
  const ref=documentRef_('PROPOSAL'),x=docBase_(ctx,'ĐỀ XUẤT HỢP TÁC SUNBOT',ref),a=ctx.answers,d=ctx.discovery;
  addSection_(x.body,'1. Bối cảnh và nhu cầu Nhà trường',a.need_statement||d.need_statement||'Nhu cầu sẽ được hoàn thiện theo kết quả trao đổi với Nhà trường.');
  addSection_(x.body,'2. Hướng triển khai được khuyến nghị',String(p.recommended_model||a.cau_hinh_quan_tam||d.cau_hinh_quan_tam||'Sunbot sẽ cấu hình theo nhu cầu đã xác nhận.'));
  addSection_(x.body,'3. Cấu phần đề xuất','Chương trình: Lập trình tư duy cùng Sunbot và/hoặc STEAM Sáng tạo cùng Sunbot theo phạm vi phù hợp.\nMô hình giáo viên: '+String(d.mo_hinh_giao_vien||'Sẽ thống nhất')+'\nQuy mô khởi đầu: '+String(d.quy_mo_bat_dau||'Sẽ thống nhất')+'\nThời điểm: '+String(d.thoi_diem||'Sẽ thống nhất'));
  addSection_(x.body,'4. Phân định trách nhiệm','Sunbot chịu trách nhiệm về chương trình, học liệu, đào tạo/hỗ trợ và các cấu phần đã được nêu trong phương án. Nhà trường bố trí đầu mối, lịch, không gian, giáo viên/trẻ và các thủ tục nội bộ theo mô hình lựa chọn. Các nội dung ngoài phạm vi phải được hai bên xác nhận trước khi thực hiện.');
  addSection_(x.body,'5. Cơ sở thương mại','Mã báo giá: '+saved.quote_id+'\nGói: '+String(preview.name||p.package_id)+'\nGiá trước chiết khấu: '+formatMoneyDoc_(preview.subtotal)+'\nChiết khấu: '+Math.round(Number(preview.discount_rate||0)*10000)/100+'%\nGiá sau chiết khấu: '+formatMoneyDoc_(preview.final_amount)+'\n'+String(preview.tax_note||''));
  addSection_(x.body,'6. Bước tiếp theo',String(p.next_step||'Sunbot và Nhà trường xác nhận phạm vi đề xuất, sau đó hoàn thiện các thủ tục hợp tác nếu phù hợp.'));
  x.body.appendParagraph('TÀI LIỆU DỰ THẢO – CHỈ GỬI RA NGOÀI SAU KHI ĐƯỢC DUYỆT').setBold(true);
  const urls=saveDocPdf_(x.doc,ref),id=appendDocRecord_(user,ctx,'PROPOSAL',ref,'PENDING_APPROVAL',urls);
  try{updateById_(DOC_ENGINE.SHEET,'document_id',id,{quotation_id:saved.quote_id,updated_at:now_()});}catch(ignored){}
  audit_(user,'CREATE_PROPOSAL_FROM_QUOTATION',DOC_ENGINE.SHEET,id,{quotation_id:saved.quote_id,package_id:p.package_id,final_amount:preview.final_amount});
  return{ok:true,document_id:id,reference:ref,quotation_id:saved.quote_id,quotation_status:saved.status,status:'PENDING_APPROVAL',doc_url:urls.doc_url,pdf_url:urls.pdf_url,preview:preview,message:'Đã tạo Proposal từ bảng giá và chuyển chờ duyệt.'};
}
function formatMoneyDoc_(n){return Number(n||0).toLocaleString('vi-VN')+' đ';}
