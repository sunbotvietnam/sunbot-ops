// Customer-facing quotation document V9 — 2026-09-07.
// Removes internal approval language from customer PDFs, keeps retail/repair concise,
// and keeps legacy-school explanation inside the same quotation document.

function quotationCustomerRepresentative_(quote) {
  const q=quote||{};
  const explicit=String(q.representative_name||q.quote_representative||'').trim();
  if(explicit)return explicit;
  const raw=String(q.created_by||q.deal_owner||'').trim();
  const map={
    Nhung:'Hoàng Nhung',
    Thu:'Minh Thu',
    Dung:'Lê Dung',
    thaovu:'Vũ Phương Thảo',
    admin:'Kiro Việt Nam',
    Admin:'Kiro Việt Nam'
  };
  return map[raw]||raw||'Kiro Việt Nam';
}

function quotationCustomerMode_(quote) {
  const combo=String((quote||{}).combo_code||'').toUpperCase();
  if(combo==='RETAIL_REPAIR')return 'RETAIL';
  if(combo==='LEGACY_REBUILD'||combo.indexOf('LEGACY_')===0)return 'LEGACY';
  return 'SOLUTION';
}

function quotationCustomerTitle_(mode) {
  if(mode==='RETAIL')return 'BÁO GIÁ THIẾT BỊ / DỊCH VỤ SUNBOT';
  if(mode==='LEGACY')return 'BÁO GIÁ TÁI KHỞI ĐỘNG VÀ NÂNG CẤP SUNBOT';
  return 'BÁO GIÁ GIẢI PHÁP SUNBOT';
}

function quotationArtifactBuildDocument_(bundle, stage) {
  const q=bundle.quote||{}, lines=bundle.lines||[];
  const approved=String(stage||'').toUpperCase()==='APPROVED';
  const mode=quotationCustomerMode_(q);
  const display=quotationApprovalDisplayCode_(q.quote_id||'');
  const filename=quotationArtifactSafeName_(display+' - v'+Number(q.version||1)+' - '+(approved?'CHINH THUC':'BAN DU THAO'));
  const folder=quotationArtifactFolder_(q.quote_id,q.updated_at||q.created_at||new Date());
  const doc=DocumentApp.create(filename);
  const body=doc.getBody();
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(42).setMarginRight(42);

  try{
    const logo=UrlFetchApp.fetch('https://sunbotvietnam.github.io/quotation/assets/img/logo-sunbot.png',{muteHttpExceptions:true}).getBlob();
    body.appendImage(logo).setWidth(95);
  }catch(e){}

  let p=body.appendParagraph('CÔNG TY CỔ PHẦN CÔNG NGHỆ GIÁO DỤC KIRO VIỆT NAM');
  p.setBold(true).setForegroundColor('#0f766e').setFontSize(10);
  body.appendParagraph('SUNBOT · CÔNG NGHỆ GIÁO DỤC MẦM NON').setForegroundColor('#64748b').setFontSize(8);
  body.appendHorizontalRule();

  p=body.appendParagraph(quotationCustomerTitle_(mode));
  p.setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor('#0f766e').setBold(true);
  body.appendParagraph('Kính gửi: '+String(q.client_name||'Quý Nhà trường / Quý Đơn vị')).setBold(true);
  body.appendParagraph('Mã báo giá: '+display+' · Phiên bản '+Number(q.version||1)).setFontSize(9).setForegroundColor('#64748b');

  // Customer-facing rule:
  // - Retail/repair: no narrative.
  // - Legacy: narrative is useful but remains inside this same quotation file; no separate explainer file.
  // - Standard solution: keep configuration narrative when present.
  const narrative=(mode==='RETAIL')?'':String(q.configuration_description||'').trim();
  if(narrative){
    body.appendParagraph(mode==='LEGACY'?'PHƯƠNG ÁN TÁI KHỞI ĐỘNG':'THUYẾT MINH CẤU HÌNH').setBold(true).setForegroundColor('#c45a13').setSpacingBefore(12);
    narrative.split(/\n\s*\n/).filter(Boolean).forEach(function(block){
      const raw=String(block||'').trim();
      const text=raw.replace(/^##\s*/,'').replace(/\bAdmin\b/gi,'Kiro Việt Nam');
      if(/^##\s*/.test(raw)||/^\d+\./.test(text)) body.appendParagraph(text).setBold(true).setForegroundColor('#0f766e');
      else body.appendParagraph(text).setFontSize(9);
    });
  }

  const table=body.appendTable();
  const header=table.appendTableRow();
  ['STT','Hạng mục','SL','Đơn giá','Thành tiền'].forEach(function(t){
    const c=header.appendTableCell(t);
    c.setBackgroundColor('#0f766e');
    c.getChild(0).asParagraph().setForegroundColor('#ffffff').setBold(true).setFontSize(8);
  });

  let total=0, pending=false;
  lines.forEach(function(line,i){
    const price=quotationApprovalNumber_(line.proposed_unit_price||line.unit_price_snapshot);
    const qty=quotationApprovalNumber_(line.qty);
    const lineTotal=quotationApprovalNumber_(line.line_total||price*qty);
    total+=lineTotal;
    const pricePending=String(line.is_custom).toUpperCase()==='TRUE' && price<=0;
    if(pricePending)pending=true;
    const row=table.appendTableRow();
    [
      String(i+1),
      quotationArtifactCustomerName_(line.item_name_snapshot||line.item_id||''),
      String(qty),
      pricePending?'Chờ xác nhận':Utilities.formatString('%,.0f đ',price),
      pricePending?'Chờ xác nhận':Utilities.formatString('%,.0f đ',lineTotal)
    ].forEach(function(t){row.appendTableCell(t).getChild(0).asParagraph().setFontSize(8);});
  });

  p=body.appendParagraph('TỔNG GIÁ TRỊ ĐỀ XUẤT: '+Utilities.formatString('%,.0f đ',total));
  p.setBold(true).setForegroundColor('#0f766e').setFontSize(12).setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingBefore(10);

  if(!approved && pending){
    body.appendParagraph('Bản dự thảo này còn hạng mục chưa xác định đơn giá chính thức.').setForegroundColor('#b45309').setFontSize(8);
  }

  // Never expose internal workflow language (approved/admin/status) to the customer-facing final PDF.
  body.appendParagraph('ĐẠI DIỆN BÁO GIÁ').setBold(true).setSpacingBefore(16);
  body.appendParagraph(quotationCustomerRepresentative_(q)).setBold(true).setFontSize(10);
  body.appendParagraph('Công ty Cổ phần Công nghệ Giáo dục Kiro Việt Nam').setFontSize(8).setForegroundColor('#64748b');
  body.appendParagraph('Sunbot · Giải pháp công nghệ giáo dục mầm non của Kiro Việt Nam').setFontSize(8).setForegroundColor('#64748b').setSpacingBefore(10);

  doc.saveAndClose();
  const docFile=DriveApp.getFileById(doc.getId());
  docFile.moveTo(folder);
  const pdfName=filename+'.pdf';
  const old=folder.getFilesByName(pdfName);
  while(old.hasNext())try{old.next().setTrashed(true);}catch(e){}
  const pdf=folder.createFile(docFile.getBlob().getAs(MimeType.PDF).setName(pdfName));
  try{pdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  return {doc_url:doc.getUrl(),pdf_url:'https://drive.google.com/file/d/'+pdf.getId()+'/view',pdf_id:pdf.getId()};
}
