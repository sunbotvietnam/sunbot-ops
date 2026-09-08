// Quotation Commercial Workflow V14 — 2026-09-08
// Bán lẻ/sửa chữa linh hoạt, điều kiện thanh toán có thể ẩn, tải PDF trực tiếp.

const QUOTATION_COMMERCIAL_V14 = Object.freeze({VERSION:'2026.09.08-commercial-v14'});

function quotationCommercialMetaString_(payload, requestId) {
  const p=payload||{};
  const payment=String(p.payment_terms||'').trim();
  const paymentVisible=String(p.payment_visible||'YES').toUpperCase()==='NO'?'NO':'YES';
  const vat=String(p.vat_note||'Giá chưa bao gồm VAT. VAT áp dụng theo quy định tại thời điểm xuất hóa đơn.').trim();
  const validity=String(p.validity||'15 ngày kể từ ngày phát hành').trim();
  const note=String(p.notes||'').trim();
  const subtype=String(p.retail_subtype||'').toUpperCase();
  return [
    requestId?'[[REQUEST='+requestId+']]':'',
    payment?'[[PAYMENT='+payment.replace(/\]\]/g,'')+']]':'',
    '[[PAYMENT_VISIBLE='+paymentVisible+']]',
    subtype?'[[RETAIL_SUBTYPE='+subtype.replace(/\]\]/g,'')+']]':'',
    vat?'[[VAT='+vat.replace(/\]\]/g,'')+']]':'',
    validity?'[[VALIDITY='+validity.replace(/\]\]/g,'')+']]':'',
    note?'[[CUSTOMER_NOTE='+note.replace(/\]\]/g,'')+']]':''
  ].filter(Boolean).join(' ');
}

function quotationCommercialMetaParse_(quote) {
  const text=String((quote||{}).notes||'');
  function pick(key,fallback){const m=text.match(new RegExp('\\[\\['+key+'=([^\\]]*)\\]\\]'));return m?String(m[1]||'').trim():fallback;}
  return {
    payment:pick('PAYMENT',''), payment_visible:pick('PAYMENT_VISIBLE','YES'), retail_subtype:pick('RETAIL_SUBTYPE',''),
    vat:pick('VAT','Giá chưa bao gồm VAT. VAT áp dụng theo quy định tại thời điểm xuất hóa đơn.'),
    validity:pick('VALIDITY','15 ngày kể từ ngày phát hành.'), customer_note:pick('CUSTOMER_NOTE',''), request_id:pick('REQUEST','')
  };
}

// Cho phép Admin thêm hạng mục tự do ở báo giá bán lẻ/sửa chữa mà không cần biến nó thành SKU chính thức.
function quotationApprovalBuildLines_(session,payload) {
  const catalog=quotationApprovalInternalCatalog_(),byId={};catalog.forEach(function(item){byId[item.item_id]=item;});
  const requested=Array.isArray(payload.lines)?payload.lines:[];
  if(!requested.length)throw new Error('Báo giá chưa có hạng mục.');
  const reason=String(payload.exception_reason||payload.notes||'').trim();
  const legacyMode=(typeof quotationArtifactLegacyMode_==='function')?quotationArtifactLegacyMode_(payload):false;
  const retailMode=String(payload.combo_code||payload.quote_type||'').toUpperCase().indexOf('RETAIL')>=0 || String(payload.combo_code||'').toUpperCase()==='RETAIL_REPAIR';
  return requested.map(function(line,index){
    const itemId=String(line.item_id||line.code||'').trim();
    const quantity=quotationApprovalNumber_(line.qty!==undefined?line.qty:line.quantity);
    if(!itemId||quantity<=0)throw new Error('Dòng báo giá không hợp lệ tại vị trí '+(index+1)+'.');
    const packageItem=quotationCommercialPackageBySku_(itemId);
    if(packageItem){
      const standard=Number(packageItem.price_12m||0),proposed=quotationApprovalNumber_(line.proposed_unit_price!==undefined?line.proposed_unit_price:standard),price=proposed>0?proposed:standard;
      const discount=standard>0?Math.max(0,(standard-price)/standard):0;
      if(session.role!=='ADMIN'&&Math.abs(price-standard)>0.5)throw new Error('Sale không tự điều chỉnh giá. Hãy gửi yêu cầu để Admin lập báo giá.');
      if(session.role==='ADMIN'&&discount>QUOTATION_COMMERCIAL_V12.ADMIN_DISCOUNT_MAX+0.0000001&&!String(line.exception_reason||reason||'').trim())throw new Error('Mức giảm trên 7% cần ghi nhận phê duyệt ngoại lệ của CEO.');
      return {line_no:index+1,item_id:itemId,item_name_snapshot:packageItem.name,unit_snapshot:'gói/12 tháng',unit_price_snapshot:price,qty:quantity,discount_rate:discount,line_total:Math.round(price*quantity),pricing_rule_version:QUOTATION_COMMERCIAL_V14.VERSION,source_price_version:'COMMERCIAL-SCALE-2026',commercial_group:'PROGRAM',standard_unit_price:standard,proposed_unit_price:price,floor_price_snapshot:0,exception_reason:String(line.exception_reason||reason||''),is_custom:false};
    }
    let item=byId[itemId],requestedLine=line;
    if(!item){
      const legacyCustom=legacyMode&&(String(line.legacy_custom||'').toUpperCase()==='TRUE'||line.legacy_custom===true||itemId.indexOf('LEGACY_CONTENT_')===0);
      if(!legacyCustom&&!retailMode&&(session.role!=='ADMIN'||!reason))throw new Error('Hạng mục tùy chỉnh cần Admin và lý do duyệt đặc biệt.');
      if(session.role!=='ADMIN'&&!legacyCustom)throw new Error('Chỉ Admin được thêm hạng mục ngoài danh mục.');
      const proposed=quotationApprovalNumber_(line.proposed_unit_price!==undefined?line.proposed_unit_price:(line.unit_price!==undefined?line.unit_price:line.price));
      const standard=quotationApprovalNumber_(line.standard_unit_price||line.recommended_price||proposed);
      if(!legacyCustom&&proposed<=0&&standard<=0)throw new Error('Hạng mục tùy chỉnh cần có đơn giá.');
      const price=proposed>0?proposed:standard;
      return {line_no:index+1,item_id:itemId,item_name_snapshot:String(line.name||'Hạng mục bổ sung').trim(),unit_snapshot:String(line.unit||'gói').trim(),unit_price_snapshot:price,qty:quantity,discount_rate:0,line_total:Math.round(price*quantity),pricing_rule_version:QUOTATION_COMMERCIAL_V14.VERSION,source_price_version:legacyCustom?'LEGACY-PENDING':'CUSTOM',commercial_group:'CUSTOM',standard_unit_price:standard,proposed_unit_price:price,floor_price_snapshot:0,exception_reason:reason,is_custom:true};
    }
    if(itemId==='SELF_DELIVERY_SCALE_FEE'){
      if(String(payload.commercial_model||'').toUpperCase()!=='SCALE')throw new Error('Dòng phí theo quy mô chỉ được dùng với mô hình SCALE.');
      const expected=quotationApprovalScaleFee_(payload.learner_count,payload.scale_sessions_per_month,payload.scale_program,byId);
      requestedLine=Object.assign({},line,{proposed_unit_price:expected,unit_price:expected,price:expected});
    }
    const checked=quotationApprovalValidateLine_(session,requestedLine,item,quantity,reason);
    return {line_no:index+1,item_id:item.item_id,item_name_snapshot:item.name,unit_snapshot:item.unit,unit_price_snapshot:checked.price,qty:quantity,discount_rate:checked.discount,line_total:Math.round(checked.price*quantity),pricing_rule_version:QUOTATION_COMMERCIAL_V14.VERSION,source_price_version:item.price_version_id,commercial_group:item.commercial_group,standard_unit_price:checked.standard,proposed_unit_price:checked.price,floor_price_snapshot:0,exception_reason:reason,is_custom:false};
  });
}

function quotationArtifactBuildDocument_(bundle,stage){
  const q=bundle.quote||{},lines=bundle.lines||[],approved=String(stage||'').toUpperCase()==='APPROVED';
  const mode=quotationCustomerMode_(q),display=quotationApprovalDisplayCode_(q.quote_id||''),meta=quotationCommercialMetaParse_(q),customer=String(q.client_name||'Quý Nhà trường / Quý Đơn vị');
  const subtype=String(meta.retail_subtype||'').toUpperCase();
  const repair=mode==='RETAIL'&&(subtype==='REPAIR'||subtype==='MIXED');
  const base='Bao-gia-Sunbot_'+quotationCommercialSlug_(customer)+'_'+quotationCommercialSlug_(display)+(approved?'':'_DU-THAO');
  const folder=quotationCommercialDocFolder_(q),doc=DocumentApp.create(base),body=doc.getBody();body.setMarginTop(30).setMarginBottom(34).setMarginLeft(40).setMarginRight(40);
  quotationCommercialHeader_(body);
  let title='BÁO GIÁ GIẢI PHÁP SUNBOT';
  if(mode==='LEGACY')title='BÁO GIÁ GIẢI PHÁP SUNBOT';
  if(mode==='RETAIL'&&subtype==='REPAIR')title='DỰ TOÁN CHI PHÍ SỬA CHỮA & THAY THẾ ROBOT SUNBOT';
  else if(mode==='RETAIL'&&subtype==='MIXED')title='BÁO GIÁ DỰ KIẾN THIẾT BỊ / SỬA CHỮA SUNBOT';
  else if(mode==='RETAIL')title='BÁO GIÁ THIẾT BỊ / PHỤ KIỆN SUNBOT';
  let p=body.appendParagraph(title);p.setHeading(DocumentApp.ParagraphHeading.HEADING1).setBold(true).setForegroundColor('#F47B20').setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(10).setSpacingAfter(8);
  body.appendParagraph('Kính gửi: '+customer).setBold(true).setFontSize(10);
  body.appendParagraph(repair?'Kiro Việt Nam trân trọng gửi Quý Nhà trường/Quý Khách hàng dự toán chi phí trên cơ sở tình trạng thiết bị và thông tin kiểm tra tại thời điểm lập.':'Kiro Việt Nam trân trọng gửi Quý Nhà trường/Quý Đơn vị báo giá Sunbot trên cơ sở nhu cầu và phạm vi đã trao đổi.').setFontSize(9).setSpacingAfter(8);
  body.appendParagraph('Mã báo giá: '+display+' · Phiên bản '+Number(q.version||1)).setFontSize(8).setForegroundColor('#737373');
  const table=body.appendTable(),hr=table.appendTableRow();['STT','Hạng mục','SL','Đơn giá','Thành tiền'].forEach(function(t){const c=hr.appendTableCell(t);c.setBackgroundColor('#0F766E');c.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true).setFontSize(8);});
  let total=0;lines.forEach(function(line,i){const price=quotationApprovalNumber_(line.proposed_unit_price||line.unit_price_snapshot),qty=quotationApprovalNumber_(line.qty),sum=quotationApprovalNumber_(line.line_total||price*qty);total+=sum;const r=table.appendTableRow();[String(i+1),quotationArtifactCustomerName_(line.item_name_snapshot||line.item_id||''),String(qty),quotationCommercialMoney_(price),quotationCommercialMoney_(sum)].forEach(function(t,j){r.appendTableCell(t).getChild(0).asParagraph().setFontSize(j===1?8:7.5);});});
  p=body.appendParagraph('TỔNG GIÁ TRỊ '+(repair?'DỰ KIẾN':'ĐỀ XUẤT')+': '+quotationCommercialMoney_(total));p.setBold(true).setForegroundColor('#0F766E').setFontSize(12).setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingBefore(10);
  if(repair)body.appendParagraph('Lưu ý về chi phí sửa chữa: Chi phí sửa chữa và linh kiện thay thế trong tài liệu này được xác định theo tình trạng ghi nhận/kiểm tra ban đầu. Mức thanh toán thực tế có thể thay đổi nếu sau khi tháo kiểm tra phát hiện hư hỏng khác. Sunbot sẽ thông báo và chỉ thực hiện phần phát sinh sau khi Nhà trường/Khách hàng xác nhận.').setFontSize(8.5).setForegroundColor('#9A4B12').setSpacingBefore(8);
  body.appendParagraph('LƯU Ý THƯƠNG MẠI').setBold(true).setForegroundColor('#F47B20').setFontSize(9).setSpacingBefore(12);
  if(meta.vat)body.appendListItem(meta.vat).setFontSize(8.5);
  if(String(meta.payment_visible||'YES').toUpperCase()!=='NO'&&meta.payment)body.appendListItem('Điều kiện thanh toán: '+meta.payment).setFontSize(8.5);
  if(meta.validity)body.appendListItem('Hiệu lực báo giá: '+meta.validity).setFontSize(8.5);
  body.appendListItem('Các hạng mục ngoài phạm vi báo giá chỉ thực hiện sau khi hai bên thống nhất.').setFontSize(8.5);
  if(meta.customer_note)body.appendListItem(meta.customer_note).setFontSize(8.5);
  body.appendParagraph('ĐẠI DIỆN BÁO GIÁ').setBold(true).setSpacingBefore(18).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph(quotationCustomerRepresentative_(q)).setBold(true).setFontSize(10).setForegroundColor('#0F766E').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('Công ty Cổ phần Công nghệ Giáo dục Kiro Việt Nam').setFontSize(8).setForegroundColor('#737373').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  const out=quotationCommercialCreatePdfFromDoc_(doc,folder,base+'.pdf');
  return {doc_url:out.doc_url,pdf_url:out.pdf_url,pdf_id:String(out.pdf_url).match(/\/d\/([^/]+)/)?.[1]||''};
}

function quotationCommercialPdfData_(token,payload){
  const p=payload||{},id=String(p.quote_id||'').trim(),type=String(p.type||'quote').toLowerCase();
  if(!id)throw new Error('Thiếu mã báo giá.');
  const links=quotationCommercialDocumentLinks_(token,{quote_id:id});
  const key=type==='narrative'?'narrative_pdf_url':type==='proposal'?'proposal_pdf_url':'quote_pdf_url';
  const url=String(links[key]||'');if(!url)throw new Error('Tài liệu PDF chưa được tạo.');
  const m=url.match(/\/d\/([^/]+)/)||url.match(/[?&]id=([^&]+)/);if(!m)throw new Error('Không xác định được tệp PDF trên Drive.');
  const file=DriveApp.getFileById(m[1]),blob=file.getBlob();
  if(blob.getBytes().length>5*1024*1024)throw new Error('Tệp PDF quá lớn để tải trực tiếp. Hãy mở bản trên Drive.');
  return {filename:file.getName(),mime_type:'application/pdf',base64:Utilities.base64Encode(blob.getBytes())};
}

function apiSessionQuotationShared(token,action,payload){
  const a=String(action||''),request=payload||{},session=quotationApprovalSession_(token);
  if(a==='pricingPolicy'||a==='northstarPricing')return {items:quotationCommercialPricing_(),version:QUOTATION_COMMERCIAL_V14.VERSION};
  if(a==='submitQuoteRequest')return quotationNorthStarSubmitRequest_(session,request);
  if(a==='listQuoteRequests')return {items:quotationNorthStarListRequests_(session),version:QUOTATION_COMMERCIAL_V14.VERSION};
  if(a==='getQuoteRequest')return quotationNorthStarFindRequest_(session,request);
  if(a==='createCommercialQuote'||a==='createNorthStarQuote')return quotationCommercialCreateQuote_(token,session,request);
  if(a==='getCommercialDocumentLinks')return quotationCommercialDocumentLinks_(token,request);
  if(a==='downloadCommercialPdf')return quotationCommercialPdfData_(token,request);
  if(a==='regenerateCommercialDocuments'){if(String(session.role||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được tạo lại tài liệu.');return quotationCommercialEnsureDocuments_(token,String(request.quote_id||''),true);}
  if(a==='bootstrapFast')return quotationPerformanceBootstrap_(token);
  if(a==='listQuotesLite')return quotationArtifactListLite_(token);
  if(a==='getQuoteLinks')return quotationArtifactLinks_(token,request);
  if(a==='recoverLegacyArtifacts')return quotationArtifactRecoverBatch_(token,request);
  if(a==='listPublishedQuotes')return quotationPublicationList_(token);
  if(a==='getPublishedQuote'||a==='getQuoteFast')return quotationPublicationGet_(token,request);
  if(a==='saveSnapshot'){const result=apiSessionQuotationApproval(token,a,request);try{const art=quotationArtifactMaterialize_(token,result.quote_id,'PENDING');result.preview_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}return result;}
  if(a==='approveQuote'){
    const pre=quotationApprovalQuoteBundle_(session,{quote_id:String(request.quote_id||'')},false);
    if(typeof quotationArtifactHasPendingPrice_==='function'&&quotationArtifactHasPendingPrice_(pre))throw new Error('Báo giá còn hạng mục chưa có đơn giá.');
    const result=apiSessionQuotationApproval(token,a,request),id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id){try{quotationPublicationPublishById_(token,id);}catch(e){}try{const docs=quotationCommercialEnsureDocuments_(token,id,true);result.approved_pdf_url=docs.quote_pdf_url;result.document_links=docs;}catch(e){result.artifact_warning=String(e&&e.message||e);}try{quotationNorthStarMarkIssued_(id,session);}catch(e){}}
    return result;
  }
  if(a==='adminReviseQuote'){
    const result=apiSessionQuotationApproval(token,a,request),id=String(request.quote_id||(result&&result.quote_id)||'').trim();
    if(id&&request.approve_after){try{quotationPublicationPublishById_(token,id);}catch(e){}try{result.document_links=quotationCommercialEnsureDocuments_(token,id,true);}catch(e){result.artifact_warning=String(e&&e.message||e);}try{quotationNorthStarMarkIssued_(id,session);}catch(e){}}
    return result;
  }
  if(a==='requestChanges'||a==='rejectQuote')return apiSessionQuotationApproval(token,a,request);
  return apiSessionQuotationApproval(token,a,request);
}
