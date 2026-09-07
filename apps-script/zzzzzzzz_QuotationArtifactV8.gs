// Quotation Artifact V8 — lightweight quote index + Drive document snapshots + legacy-school support.
// Architecture: transactional data stays in Sheets; submitted/approved versions are materialized once
// as Drive PDFs. The frontend opens those artifacts instead of rebuilding A4 documents on every view.

const QUOTATION_ARTIFACT_V8 = Object.freeze({
  VERSION: '2026.09.07-artifact-v1',
  ROOT_FOLDER_ID: '1qT4qEGHWON2enzeZE6zvgHkciI7dP0XU',
  INDEX_SHEET: 'QUOTE_INDEX',
  INDEX_HEADERS: ['quote_id','version','client_name','created_by','deal_owner','region','final_amount','status','updated_at','preview_pdf_url','approved_pdf_url','combo_code','quote_type','change_request','revision_note']
});

function quotationArtifactLegacyMode_(payload) {
  const p = payload || {};
  const qt = String(p.quote_type || '').toUpperCase();
  const combo = String(p.combo_code || '').toUpperCase();
  return qt === 'LEGACY' || combo === 'LEGACY_REBUILD' || combo.indexOf('LEGACY_') === 0;
}

// Final line builder. Standard catalog rules are preserved; legacy quotes additionally allow
// content-extension lines that do not yet have an approved unit price. They remain price-pending
// and cannot be approved until Admin enters a price in a revision.
function quotationApprovalBuildLines_(session,payload) {
  const catalog=quotationApprovalInternalCatalog_(), byId={}; catalog.forEach(function(item){ byId[item.item_id]=item; });
  const requested=Array.isArray(payload.lines)?payload.lines:[];
  if (!requested.length) throw new Error('Báo giá chưa có hạng mục.');
  const reason=String(payload.exception_reason || payload.notes || '').trim();
  const legacyMode=quotationArtifactLegacyMode_(payload);
  return requested.map(function(line,index){
    const itemId=String(line.item_id || line.code || '').trim();
    const quantity=quotationApprovalNumber_(line.qty !== undefined ? line.qty : line.quantity);
    if (!itemId || quantity<=0) throw new Error('Dòng báo giá không hợp lệ tại vị trí '+(index+1)+'.');
    let item=byId[itemId], isCustom=false, requestedLine=line;

    if (!item) {
      const legacyCustom = legacyMode && (String(line.legacy_custom || '').toUpperCase()==='TRUE' || line.legacy_custom===true || itemId.indexOf('LEGACY_CONTENT_')===0);
      if (!legacyCustom && (session.role !== 'ADMIN' || !reason)) throw new Error('Hạng mục tùy chỉnh cần Admin và lý do duyệt đặc biệt.');
      const proposed=quotationApprovalNumber_(line.proposed_unit_price !== undefined ? line.proposed_unit_price : (line.unit_price !== undefined ? line.unit_price : line.price));
      const standard=quotationApprovalNumber_(line.standard_unit_price || line.recommended_price || proposed);
      // Legacy content can be saved at 0 while waiting for Admin to establish the price.
      if (!legacyCustom && proposed<=0 && standard<=0) throw new Error('Hạng mục tùy chỉnh cần có đơn giá.');
      item={
        item_id:itemId,
        name:String(line.name || 'Hạng mục bổ sung').trim(),
        unit:String(line.unit || 'gói').trim(),
        recommended_price:standard,
        floor_price:0,
        commercial_group:'CUSTOM',
        price_version_id:legacyCustom?'LEGACY-PENDING':'CUSTOM'
      };
      isCustom=true;
      const price = proposed>0 ? proposed : standard;
      return {
        line_no:index+1,item_id:item.item_id,item_name_snapshot:item.name,unit_snapshot:item.unit,
        unit_price_snapshot:price,qty:quantity,discount_rate:0,line_total:Math.round(price*quantity),
        pricing_rule_version:QUOTATION_APPROVAL.VERSION,source_price_version:item.price_version_id,
        commercial_group:item.commercial_group,standard_unit_price:standard,proposed_unit_price:price,
        floor_price_snapshot:0,exception_reason:reason,is_custom:true
      };
    }

    if (itemId==='SELF_DELIVERY_SCALE_FEE') {
      if (String(payload.commercial_model || '').toUpperCase()!=='SCALE') throw new Error('Dòng phí theo quy mô chỉ được dùng với mô hình SCALE.');
      const expected=quotationApprovalScaleFee_(payload.learner_count,payload.scale_sessions_per_month,payload.scale_program,byId);
      const sent=quotationApprovalNumber_(line.proposed_unit_price !== undefined ? line.proposed_unit_price : (line.unit_price !== undefined ? line.unit_price : line.price));
      if (sent>0 && Math.abs(sent-expected)>1) throw new Error('Phí theo quy mô không khớp công thức Backend. Hãy tải lại app và tính lại báo giá.');
      requestedLine=Object.assign({},line,{proposed_unit_price:expected,unit_price:expected,price:expected});
    }
    const checked=quotationApprovalValidateLine_(session,requestedLine,item,quantity,reason);
    return {line_no:index+1,item_id:item.item_id,item_name_snapshot:item.name,unit_snapshot:item.unit,unit_price_snapshot:checked.price,qty:quantity,discount_rate:checked.discount,line_total:Math.round(checked.price*quantity),pricing_rule_version:QUOTATION_APPROVAL.VERSION,source_price_version:item.price_version_id,commercial_group:item.commercial_group,standard_unit_price:checked.standard,proposed_unit_price:checked.price,floor_price_snapshot:checked.floor,exception_reason:reason,is_custom:isCustom};
  });
}

function quotationArtifactIndexSheet_() {
  const ss=quotationApprovalSpreadsheet_();
  let sheet=ss.getSheetByName(QUOTATION_ARTIFACT_V8.INDEX_SHEET);
  if (!sheet) sheet=ss.insertSheet(QUOTATION_ARTIFACT_V8.INDEX_SHEET);
  const headers=QUOTATION_ARTIFACT_V8.INDEX_HEADERS;
  if (sheet.getLastRow()<1 || String(sheet.getRange(1,1).getValue()||'')!=='quote_id') sheet.getRange(1,1,1,headers.length).setValues([headers]);
  return sheet;
}

function quotationArtifactIndexRows_() {
  const sheet=quotationArtifactIndexSheet_();
  const values=sheet.getDataRange().getValues();
  if (values.length<2) return [];
  const headers=values[0].map(function(x){return String(x||'').trim();});
  return values.slice(1).filter(function(r){return r.some(function(v){return String(v==null?'':v).trim()!=='';});}).map(function(row,i){
    const o={_row:i+2}; headers.forEach(function(h,j){if(h)o[h]=row[j]===undefined?'':row[j];}); return o;
  });
}

function quotationArtifactIndexUpsert_(quote, urls) {
  const q=quote||{}, u=urls||{};
  const sheet=quotationArtifactIndexSheet_();
  const headers=QUOTATION_ARTIFACT_V8.INDEX_HEADERS;
  const rows=quotationArtifactIndexRows_();
  const id=String(q.quote_id||'').trim();
  if(!id)return;
  const existing=rows.find(function(r){return String(r.quote_id)===id;});
  const record={
    quote_id:id,version:Number(q.version||1),client_name:String(q.client_name||''),created_by:String(q.created_by||''),deal_owner:String(q.deal_owner||''),region:String(q.region||''),
    final_amount:quotationApprovalNumber_(q.proposed_amount||q.final_amount),status:String(q.status||''),updated_at:q.updated_at||new Date(),
    preview_pdf_url:String(u.preview_pdf_url || (existing&&existing.preview_pdf_url) || ''),
    approved_pdf_url:String(u.approved_pdf_url || (existing&&existing.approved_pdf_url) || ''),
    combo_code:String(q.combo_code||''),quote_type:(String(q.combo_code||'').toUpperCase()==='LEGACY_REBUILD'?'LEGACY':(String(q.combo_code||'').toUpperCase()==='RETAIL_REPAIR'?'RETAIL':'SOLUTION')),
    change_request:String(q.change_request||''),revision_note:String(q.revision_note||'')
  };
  const values=headers.map(function(h){return record[h]===undefined?'':record[h];});
  if(existing) sheet.getRange(existing._row,1,1,headers.length).setValues([values]);
  else sheet.appendRow(values);
}

function quotationArtifactEnsureIndexBackfill_(session) {
  const rows=quotationArtifactIndexRows_();
  if(rows.length)return;
  const listed=quotationApprovalList_(session);
  const quotes=Array.isArray(listed)?listed:(listed&&(listed.quotes||listed.items||listed.data)||[]);
  quotes.forEach(function(q){try{quotationArtifactIndexUpsert_(q,{});}catch(e){}});
}

function quotationArtifactSafeName_(text){return String(text||'').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim();}
function quotationArtifactFolderChild_(parent,name){
  const it=parent.getFoldersByName(name); if(it.hasNext())return it.next(); return parent.createFolder(name);
}
function quotationArtifactFolder_(quoteId,date){
  const root=DriveApp.getFolderById(QUOTATION_ARTIFACT_V8.ROOT_FOLDER_ID);
  const d=date instanceof Date?date:new Date();
  const year=quotationArtifactFolderChild_(root,String(d.getFullYear()));
  const month=quotationArtifactFolderChild_(year,String(d.getMonth()+1).padStart(2,'0'));
  return quotationArtifactFolderChild_(month,quotationArtifactSafeName_(quoteId));
}

function quotationArtifactCustomerName_(name){
  return String(name||'').replace(/Flashcard\s*Level\s*(\d+)/gi,'Bộ thẻ học liệu – Cấp độ $1').replace(/Bản đồ giấy\s*Level\s*(\d+)/gi,'Bản đồ học liệu – Cấp độ $1').replace(/Level\s*(\d+)/gi,'Cấp độ $1');
}

function quotationArtifactStatusLabel_(status){
  const s=String(status||'').toUpperCase();
  if(s==='APPROVED')return 'ĐÃ DUYỆT';
  if(s==='CHANGES_REQUESTED'||s==='REJECTED')return 'CẦN CHỈNH SỬA';
  return 'CHỜ DUYỆT';
}

function quotationArtifactBuildDocument_(bundle, stage) {
  const q=bundle.quote||{}, lines=bundle.lines||[];
  const approved=String(stage||'').toUpperCase()==='APPROVED';
  const display=quotationApprovalDisplayCode_(q.quote_id||'');
  const filename=quotationArtifactSafeName_(display+' - v'+Number(q.version||1)+' - '+(approved?'DA DUYET':'CHO DUYET'));
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
  p=body.appendParagraph(String(q.combo_code||'').toUpperCase()==='LEGACY_REBUILD'?'BÁO GIÁ TÁI KHỞI ĐỘNG VÀ NÂNG CẤP SUNBOT':'BÁO GIÁ GIẢI PHÁP SUNBOT');
  p.setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor('#0f766e').setBold(true);
  body.appendParagraph('Kính gửi: '+String(q.client_name||'Quý Nhà trường / Quý Đơn vị')).setBold(true);
  body.appendParagraph('Mã báo giá: '+display+' · Phiên bản '+Number(q.version||1)+' · '+quotationArtifactStatusLabel_(q.status)).setFontSize(9).setForegroundColor('#64748b');

  const narrative=String(q.configuration_description||'').trim();
  if(narrative){
    body.appendParagraph('THUYẾT MINH CẤU HÌNH').setBold(true).setForegroundColor('#c45a13').setSpacingBefore(12);
    narrative.split(/\n\s*\n/).filter(Boolean).forEach(function(block){
      const t=String(block||'').replace(/^##\s*/,'').trim();
      if(/^\d+\./.test(t)) body.appendParagraph(t).setBold(true).setForegroundColor('#0f766e');
      else body.appendParagraph(t).setFontSize(9);
    });
  }

  const table=body.appendTable();
  const header=table.appendTableRow();
  ['STT','Hạng mục','SL','Đơn giá','Thành tiền'].forEach(function(t){const c=header.appendTableCell(t);c.setBackgroundColor('#0f766e');c.getChild(0).asParagraph().setForegroundColor('#ffffff').setBold(true).setFontSize(8);});
  let total=0, pending=false;
  lines.forEach(function(line,i){
    const price=quotationApprovalNumber_(line.proposed_unit_price||line.unit_price_snapshot), qty=quotationApprovalNumber_(line.qty), lineTotal=quotationApprovalNumber_(line.line_total||price*qty);
    total+=lineTotal; const pricePending=String(line.is_custom).toUpperCase()==='TRUE' && price<=0; if(pricePending)pending=true;
    const row=table.appendTableRow();
    [String(i+1),quotationArtifactCustomerName_(line.item_name_snapshot||line.item_id||''),String(qty),pricePending?'Chờ xác nhận':Utilities.formatString('%,.0f đ',price),pricePending?'Chờ xác nhận':Utilities.formatString('%,.0f đ',lineTotal)].forEach(function(t){row.appendTableCell(t).getChild(0).asParagraph().setFontSize(8);});
  });
  p=body.appendParagraph('TỔNG GIÁ TRỊ ĐỀ XUẤT: '+Utilities.formatString('%,.0f đ',total));
  p.setBold(true).setForegroundColor('#0f766e').setFontSize(12).setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingBefore(10);
  if(pending) body.appendParagraph('Lưu ý: Báo giá có hạng mục nội dung chương trình đang chờ Admin xác nhận đơn giá; chưa được duyệt để gửi khách hàng.').setForegroundColor('#b45309').setFontSize(8);
  body.appendParagraph('Trạng thái: '+quotationArtifactStatusLabel_(q.status)+(q.approved_by?' · Duyệt bởi '+q.approved_by:'')).setBold(true).setSpacingBefore(12);
  body.appendParagraph('Sunbot · Giải pháp công nghệ giáo dục mầm non của Kiro Việt Nam').setFontSize(8).setForegroundColor('#64748b');
  doc.saveAndClose();
  const docFile=DriveApp.getFileById(doc.getId());
  docFile.moveTo(folder);
  const pdfName=filename+'.pdf';
  const old=folder.getFilesByName(pdfName); while(old.hasNext())try{old.next().setTrashed(true);}catch(e){}
  const pdf=folder.createFile(docFile.getBlob().getAs(MimeType.PDF).setName(pdfName));
  try{pdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  return {doc_url:doc.getUrl(),pdf_url:'https://drive.google.com/file/d/'+pdf.getId()+'/view',pdf_id:pdf.getId()};
}

function quotationArtifactMaterialize_(token, quoteId, stage) {
  const session=quotationApprovalSession_(token);
  const bundle=quotationApprovalQuoteBundle_(session,{quote_id:quoteId},false);
  const artifact=quotationArtifactBuildDocument_(bundle,stage);
  const q=bundle.quote||{};
  const sheet=quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
  const headers=quotationApprovalHeaders_(sheet,quotationApprovalQuoteHeaders_().concat(['preview_pdf_url','approved_pdf_url','artifact_version']),QUOTATION_APPROVAL.HEADER_ROW);
  const values={artifact_version:QUOTATION_ARTIFACT_V8.VERSION};
  if(String(stage||'').toUpperCase()==='APPROVED') values.approved_pdf_url=artifact.pdf_url; else values.preview_pdf_url=artifact.pdf_url;
  quotationApprovalSet_(sheet,q._row,headers,values);
  q.preview_pdf_url=values.preview_pdf_url||q.preview_pdf_url||''; q.approved_pdf_url=values.approved_pdf_url||q.approved_pdf_url||'';
  quotationArtifactIndexUpsert_(q,{preview_pdf_url:q.preview_pdf_url,approved_pdf_url:q.approved_pdf_url});
  try{quotationApprovalAudit_(session,'QUOTE_ARTIFACT',quoteId,{version:Number(q.version||1),stage:String(stage||''),pdf_url:artifact.pdf_url});}catch(e){}
  return artifact;
}

function quotationArtifactHasPendingPrice_(bundle){
  return (bundle.lines||[]).some(function(l){return String(l.is_custom).toUpperCase()==='TRUE' && quotationApprovalNumber_(l.proposed_unit_price||l.unit_price_snapshot)<=0;});
}

function quotationArtifactListLite_(token){
  const session=quotationApprovalSession_(token);
  quotationArtifactEnsureIndexBackfill_(session);
  let rows=quotationArtifactIndexRows_();
  if(String(session.role||'').toUpperCase()!=='ADMIN') rows=rows.filter(function(r){return String(r.created_by||'')===String(session.login_id||'') || String(r.deal_owner||'')===String(session.login_id||'') || String(r.created_by||'')===String(session.display_name||'');});
  rows.sort(function(a,b){return new Date(b.updated_at||0)-new Date(a.updated_at||0);});
  return rows.map(function(r){const o=Object.assign({},r);delete o._row;return o;});
}

function quotationArtifactLinks_(token,payload){
  const session=quotationApprovalSession_(token), id=String(payload&&payload.quote_id||'').trim();
  quotationArtifactEnsureIndexBackfill_(session);
  const row=quotationArtifactIndexRows_().find(function(r){return String(r.quote_id)===id;});
  if(!row)throw new Error('Chưa có bản lưu của báo giá này.');
  if(String(session.role||'').toUpperCase()!=='ADMIN' && String(row.created_by)!==String(session.login_id) && String(row.deal_owner)!==String(session.login_id) && String(row.created_by)!==String(session.display_name)) throw new Error('Bạn không được xem báo giá của người khác.');
  return {quote_id:id,status:row.status,preview_pdf_url:row.preview_pdf_url||'',approved_pdf_url:row.approved_pdf_url||'',version:Number(row.version||1)};
}

// Final shared router. Save/approve remain transactional, but each submitted/approved version
// receives a Drive PDF artifact and an index entry for fast frontend access.
function apiSessionQuotationShared(token, action, payload) {
  const a=String(action||''), request=payload||{};
  if(a==='bootstrapFast') return quotationPerformanceBootstrap_(token);
  if(a==='listQuotesLite') return quotationArtifactListLite_(token);
  if(a==='getQuoteLinks') return quotationArtifactLinks_(token,request);
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
    if(quotationArtifactHasPendingPrice_(pre)) throw new Error('Báo giá còn hạng mục nội dung chương trình chưa có đơn giá. Admin cần nhập giá và lưu phiên bản mới trước khi duyệt.');
    const result=apiSessionQuotationApproval(token,a,request);
    const id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){try{quotationPublicationPublishById_(token,id);}catch(e){};try{const art=quotationArtifactMaterialize_(token,id,'APPROVED');result.approved_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}}
    return result;
  }
  if(a==='requestChanges'||a==='rejectQuote'||a==='adminReviseQuote') {
    const result=apiSessionQuotationApproval(token,a,request);
    const id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){try{const session=quotationApprovalSession_(token);const bundle=quotationApprovalQuoteBundle_(session,{quote_id:id},false);quotationArtifactIndexUpsert_(bundle.quote,{});}catch(e){}}
    return result;
  }
  return apiSessionQuotationApproval(token,a,request);
}
