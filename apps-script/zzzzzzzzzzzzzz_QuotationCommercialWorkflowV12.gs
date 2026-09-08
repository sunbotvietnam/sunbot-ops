// Quotation Commercial Workflow V12 — 2026-09-08
// Sale gửi yêu cầu; Admin cấu hình, phát hành và tạo tài liệu Drive.
// Tên “North Star” chỉ là khái niệm nội bộ trước đây, không xuất hiện trong giao diện/tài liệu khách hàng.

const QUOTATION_COMMERCIAL_V12 = Object.freeze({
  VERSION: '2026.09.08-commercial-v12',
  PRICING_SHEET: 'NORTHSTAR_PRICING', // giữ tên sheet kỹ thuật để không phá dữ liệu hiện có
  REQUEST_SHEET: 'QUOTE_REQUESTS',
  DOC_LINK_SHEET: 'QUOTE_DOCUMENT_LINKS',
  ADMIN_DISCOUNT_MAX: 0.07,
  ROOT_FOLDER_ID: '1qT4qEGHWON2enzeZE6zvgHkciI7dP0XU'
});

function quotationCommercialRows_(sheetName) {
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Thiếu bảng dữ liệu: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map(function(v){ return String(v || '').trim(); });
  return values.slice(1).filter(function(row){
    return row.some(function(v){ return String(v == null ? '' : v).trim() !== ''; });
  }).map(function(row, offset){
    const obj = {_row: offset + 2};
    headers.forEach(function(h, i){ if (h) obj[h] = row[i] === undefined ? '' : row[i]; });
    return obj;
  });
}

function quotationCommercialPricing_() {
  return quotationCommercialRows_(QUOTATION_COMMERCIAL_V12.PRICING_SHEET)
    .filter(function(r){ return String(r.status || '').toUpperCase() === 'ACTIVE'; })
    .map(function(r){
      return {
        sku:String(r.sku || ''), name:String(r.name || ''), model:String(r.model || ''),
        min_students:Number(r.min_students || 0), max_students:Number(r.max_students || 0),
        price_12m:Number(r.price_12m || 0), commitment_months:Number(r.commitment_months || 12),
        payment_default:String(r.payment_default || ''), sales_commission_new_pct:Number(r.sales_commission_new_pct || 0),
        admin_discount_max_pct:Number(r.admin_discount_max_pct || QUOTATION_COMMERCIAL_V12.ADMIN_DISCOUNT_MAX),
        note:String(r.note || '')
      };
    });
}

function quotationCommercialPackageBySku_(sku) {
  return quotationCommercialPricing_().find(function(r){ return String(r.sku) === String(sku || ''); }) || null;
}

function quotationCommercialPackageFor_(learners, assetOption, requestedSku) {
  const n = Number(learners || 0);
  const option = String(assetOption || '').toUpperCase();
  const model = option === 'SUNBOT_CUNG_CAP_THIET_BI' ? 'SUNBOT_CUNG_CAP_THIET_BI' : 'TRUONG_CO_THIET_BI';
  const rows = quotationCommercialPricing_();
  let selected = requestedSku ? rows.find(function(r){ return r.sku === requestedSku; }) : null;
  if (!selected) selected = rows.find(function(r){ return r.model === model && n >= r.min_students && n <= r.max_students; });
  if (!selected) throw new Error('Quy mô trên 800 trẻ hoặc cấu hình ngoài chuẩn cần CEO duyệt và báo giá riêng.');
  if (selected.model !== model || n < selected.min_students || n > selected.max_students) throw new Error('Gói mẫu không khớp quy mô hoặc phương án thiết bị.');
  return selected;
}

// Override builder: giữ toàn bộ catalog cũ, đồng thời cho phép các gói theo quy mô là dòng giá hợp lệ.
function quotationApprovalBuildLines_(session,payload) {
  const catalog = quotationApprovalInternalCatalog_(), byId = {};
  catalog.forEach(function(item){ byId[item.item_id] = item; });
  const requested = Array.isArray(payload.lines) ? payload.lines : [];
  if (!requested.length) throw new Error('Báo giá chưa có hạng mục.');
  const reason = String(payload.exception_reason || payload.notes || '').trim();
  const legacyMode = (typeof quotationArtifactLegacyMode_ === 'function') ? quotationArtifactLegacyMode_(payload) : false;

  return requested.map(function(line,index){
    const itemId = String(line.item_id || line.code || '').trim();
    const quantity = quotationApprovalNumber_(line.qty !== undefined ? line.qty : line.quantity);
    if (!itemId || quantity <= 0) throw new Error('Dòng báo giá không hợp lệ tại vị trí ' + (index + 1) + '.');

    const packageItem = quotationCommercialPackageBySku_(itemId);
    if (packageItem) {
      const standard = Number(packageItem.price_12m || 0);
      const proposed = quotationApprovalNumber_(line.proposed_unit_price !== undefined ? line.proposed_unit_price : standard);
      const price = proposed > 0 ? proposed : standard;
      const discount = standard > 0 ? Math.max(0, (standard - price) / standard) : 0;
      if (session.role !== 'ADMIN' && Math.abs(price - standard) > 0.5) throw new Error('Sale không tự điều chỉnh giá. Hãy gửi yêu cầu để Admin lập báo giá.');
      if (session.role === 'ADMIN' && discount > QUOTATION_COMMERCIAL_V12.ADMIN_DISCOUNT_MAX + 0.0000001 && !String(line.exception_reason || reason || '').trim()) {
        throw new Error('Mức giảm trên 7% cần ghi nhận phê duyệt ngoại lệ của CEO.');
      }
      return {
        line_no:index+1,item_id:itemId,item_name_snapshot:packageItem.name,unit_snapshot:'gói/12 tháng',
        unit_price_snapshot:price,qty:quantity,discount_rate:discount,line_total:Math.round(price*quantity),
        pricing_rule_version:QUOTATION_COMMERCIAL_V12.VERSION,source_price_version:'COMMERCIAL-SCALE-2026',
        commercial_group:'PROGRAM',standard_unit_price:standard,proposed_unit_price:price,floor_price_snapshot:0,
        exception_reason:String(line.exception_reason || reason || ''),is_custom:false
      };
    }

    let item = byId[itemId], requestedLine = line;
    if (!item) {
      const legacyCustom = legacyMode && (String(line.legacy_custom || '').toUpperCase() === 'TRUE' || line.legacy_custom === true || itemId.indexOf('LEGACY_CONTENT_') === 0);
      if (!legacyCustom && (session.role !== 'ADMIN' || !reason)) throw new Error('Hạng mục tùy chỉnh cần Admin và lý do duyệt đặc biệt.');
      const proposed = quotationApprovalNumber_(line.proposed_unit_price !== undefined ? line.proposed_unit_price : (line.unit_price !== undefined ? line.unit_price : line.price));
      const standard = quotationApprovalNumber_(line.standard_unit_price || line.recommended_price || proposed);
      if (!legacyCustom && proposed <= 0 && standard <= 0) throw new Error('Hạng mục tùy chỉnh cần có đơn giá.');
      const price = proposed > 0 ? proposed : standard;
      return {
        line_no:index+1,item_id:itemId,item_name_snapshot:String(line.name || 'Hạng mục bổ sung').trim(),unit_snapshot:String(line.unit || 'gói').trim(),
        unit_price_snapshot:price,qty:quantity,discount_rate:0,line_total:Math.round(price*quantity),
        pricing_rule_version:QUOTATION_COMMERCIAL_V12.VERSION,source_price_version:legacyCustom?'LEGACY-PENDING':'CUSTOM',
        commercial_group:'CUSTOM',standard_unit_price:standard,proposed_unit_price:price,floor_price_snapshot:0,
        exception_reason:reason,is_custom:true
      };
    }

    if (itemId === 'SELF_DELIVERY_SCALE_FEE') {
      if (String(payload.commercial_model || '').toUpperCase() !== 'SCALE') throw new Error('Dòng phí theo quy mô chỉ được dùng với mô hình SCALE.');
      const expected = quotationApprovalScaleFee_(payload.learner_count,payload.scale_sessions_per_month,payload.scale_program,byId);
      requestedLine = Object.assign({},line,{proposed_unit_price:expected,unit_price:expected,price:expected});
    }
    const checked = quotationApprovalValidateLine_(session,requestedLine,item,quantity,reason);
    return {
      line_no:index+1,item_id:item.item_id,item_name_snapshot:item.name,unit_snapshot:item.unit,
      unit_price_snapshot:checked.price,qty:quantity,discount_rate:checked.discount,line_total:Math.round(checked.price*quantity),
      pricing_rule_version:QUOTATION_COMMERCIAL_V12.VERSION,source_price_version:item.price_version_id,
      commercial_group:item.commercial_group,standard_unit_price:checked.standard,proposed_unit_price:checked.price,
      floor_price_snapshot:0,exception_reason:reason,is_custom:false
    };
  });
}

// Không dùng giá sàn trong vận hành hiện hành.
function quotationApprovalValidateLine_(session, requested, item, quantity, reason) {
  const proposed = quotationApprovalNumber_(requested.proposed_unit_price !== undefined ? requested.proposed_unit_price : (requested.unit_price !== undefined ? requested.unit_price : requested.price));
  const standard = quotationApprovalNumber_(item.recommended_price);
  const price = proposed > 0 ? proposed : standard;
  const discount = standard > 0 ? Math.max(0, (standard - price) / standard) : 0;
  if (session.role === 'REGIONAL_MANAGER' && Math.abs(price - standard) > 0.5) throw new Error('Sale không tự điều chỉnh giá. Hãy gửi yêu cầu để Admin lập báo giá.');
  if (session.role === 'ADMIN' && discount > QUOTATION_COMMERCIAL_V12.ADMIN_DISCOUNT_MAX + 0.0000001 && !String(reason || '').trim()) {
    throw new Error('Mức giảm trên 7% cần ghi nhận phê duyệt ngoại lệ của CEO.');
  }
  return {price:price, discount:discount, standard:standard, floor:0};
}

function quotationApprovalCatalog_(session) {
  return {
    backend_version: QUOTATION_COMMERCIAL_V12.VERSION,
    items: quotationApprovalInternalCatalog_().map(function(item){
      return {
        item_id:item.item_id,price_id:item.item_id,item_type:item.item_type,category:item.category,
        name:item.name,description:item.description,unit:item.unit,recommended_price:item.recommended_price,
        payment_price:item.recommended_price,price_before_tax:item.recommended_price,
        commercial_group:item.commercial_group,max_user_discount_pct:0,customer_visible:item.customer_visible,
        price_version_id:item.price_version_id
      };
    }),
    generated_at:new Date().toISOString()
  };
}

function quotationCommercialMetaString_(payload, requestId) {
  const payment = String(payload.payment_terms || '').trim();
  const vat = String(payload.vat_note || 'Giá chưa bao gồm VAT. VAT áp dụng theo quy định tại thời điểm xuất hóa đơn.').trim();
  const validity = String(payload.validity || '15 ngày kể từ ngày phát hành').trim();
  const note = String(payload.notes || '').trim();
  return [
    requestId ? '[[REQUEST=' + requestId + ']]' : '',
    payment ? '[[PAYMENT=' + payment.replace(/\]\]/g,'') + ']]' : '',
    vat ? '[[VAT=' + vat.replace(/\]\]/g,'') + ']]' : '',
    validity ? '[[VALIDITY=' + validity.replace(/\]\]/g,'') + ']]' : '',
    note ? '[[CUSTOMER_NOTE=' + note.replace(/\]\]/g,'') + ']]' : ''
  ].filter(Boolean).join(' ');
}

function quotationCommercialMetaParse_(quote) {
  const text = String((quote || {}).notes || '');
  function pick(key, fallback){ const m=text.match(new RegExp('\\[\\['+key+'=([^\\]]*)\\]\\]')); return m ? String(m[1]||'').trim() : fallback; }
  return {
    payment:pick('PAYMENT','Theo thỏa thuận/hợp đồng giữa hai bên.'),
    vat:pick('VAT','Giá chưa bao gồm VAT. VAT áp dụng theo quy định tại thời điểm xuất hóa đơn.'),
    validity:pick('VALIDITY','15 ngày kể từ ngày phát hành.'),
    customer_note:pick('CUSTOMER_NOTE',''),
    request_id:pick('REQUEST','')
  };
}

function quotationCommercialCreateQuote_(token, session, payload) {
  if (String(session.role || '').toUpperCase() !== 'ADMIN') throw new Error('Chỉ Admin được lập và phát hành báo giá.');
  const kind = String(payload.quote_kind || 'SOLUTION').toUpperCase();
  const requestId = String(payload.request_id || '').trim();
  let req = null;
  if (requestId) {
    req = quotationCommercialRows_(QUOTATION_COMMERCIAL_V12.REQUEST_SHEET).find(function(r){ return String(r.request_id || '') === requestId; });
    if (!req) throw new Error('Không tìm thấy yêu cầu báo giá.');
  }
  const customer = String(payload.customer_name || (req && req.school_name) || '').trim();
  if (!customer) throw new Error('Hãy nhập tên trường/khách hàng.');
  const learners = Number(payload.learner_count || (req && req.learner_count) || 0);
  const assetOption = String(payload.asset_option || (req && req.asset_option) || 'TRUONG_CO_THIET_BI');
  const discountPct = Math.max(0, Number(payload.discount_pct || 0));
  const ceoNote = String(payload.ceo_approval_note || '').trim();
  if (discountPct > QUOTATION_COMMERCIAL_V12.ADMIN_DISCOUNT_MAX + 0.0000001 && !ceoNote) throw new Error('Giảm trên 7% cần ghi nội dung phê duyệt ngoại lệ của CEO.');
  if (discountPct >= 1) throw new Error('Mức giảm giá không hợp lệ.');

  const lines = [];
  if (kind === 'SOLUTION' && String(payload.package_sku || '').trim()) {
    const pkg = quotationCommercialPackageFor_(learners, assetOption, String(payload.package_sku || ''));
    lines.push({item_id:pkg.sku, qty:1, proposed_unit_price:Math.round(pkg.price_12m * (1-discountPct)), exception_reason:ceoNote});
  }
  (Array.isArray(payload.lines) ? payload.lines : []).forEach(function(line){
    const id = String(line.item_id || '').trim(), qty = Number(line.qty || 0);
    if (!id || qty <= 0) return;
    const obj = {item_id:id,qty:qty};
    if (Number(line.proposed_unit_price || 0) > 0) obj.proposed_unit_price = Number(line.proposed_unit_price);
    if (String(line.name || '').trim()) obj.name = String(line.name).trim();
    if (String(line.unit || '').trim()) obj.unit = String(line.unit).trim();
    lines.push(obj);
  });
  if (!lines.length) throw new Error('Báo giá chưa có hạng mục.');

  const owner = String((req && req.created_by) || payload.deal_owner || session.login_id || '').trim();
  const combo = kind === 'RETAIL_REPAIR' ? 'RETAIL_REPAIR' : 'COMMERCIAL_2026';
  const savePayload = {
    customer_name:customer,client_type:String(payload.client_type || (req && req.school_type) || ''),combo_code:combo,
    learner_count:learners || 0,deployment_sites:Number(payload.deployment_sites || 1),lines:lines,
    notes:quotationCommercialMetaString_(payload,requestId),configuration_description:kind === 'RETAIL_REPAIR' ? '' : String(payload.configuration_description || ''),
    exception_reason:ceoNote,customer_id:String(payload.customer_id || ''),opportunity_id:String(payload.opportunity_id || '')
  };
  const result = quotationApprovalSave_(session, savePayload);
  const quote = quotationApprovalLatest_(result.quote_id);
  if (quote) {
    const sheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
    const headers = quotationApprovalHeaders_(sheet, quotationApprovalQuoteHeaders_(), QUOTATION_APPROVAL.HEADER_ROW);
    quotationApprovalSet_(sheet, quote._row, headers, {
      created_by:owner,deal_owner:owner,region:String((req && req.region) || payload.region || ''),
      creator_role:owner === String(session.login_id || '') ? 'ADMIN' : 'REGIONAL_MANAGER',combo_code:combo,
      configuration_description:kind === 'RETAIL_REPAIR' ? '' : String(payload.configuration_description || ''),
      learner_count:learners || 0,updated_at:new Date()
    });
  }
  if (req) quotationNorthStarSetRequest_(req,{status:'QUOTE_CREATED',quote_id:result.quote_id,handled_by:session.login_id,handled_at:new Date(),updated_at:new Date()});
  try { quotationArtifactMaterialize_(token,result.quote_id,'PENDING'); } catch(e) {}
  quotationApprovalAudit_(session,'COMMERCIAL_QUOTE_CREATE',result.quote_id,{request_id:requestId,quote_kind:kind,asset_option:assetOption,discount_pct:discountPct});
  return Object.assign({},result,{request_id:requestId,quote_kind:kind});
}

function quotationCommercialSafeName_(text){ return String(text||'').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim(); }
function quotationCommercialSlug_(text){ return quotationCommercialSafeName_(text).replace(/\s+/g,'-').replace(/[^0-9A-Za-zÀ-ỹ._-]/g,'').replace(/-+/g,'-'); }
function quotationCommercialDocFolder_(q){ return quotationArtifactFolder_(q.quote_id,q.updated_at||q.created_at||new Date()); }

function quotationCommercialDocSheet_(){
  const ss=quotationApprovalSpreadsheet_(); let sh=ss.getSheetByName(QUOTATION_COMMERCIAL_V12.DOC_LINK_SHEET);
  const headers=['quote_id','version','quote_pdf_url','quote_doc_url','narrative_pdf_url','narrative_doc_url','proposal_pdf_url','proposal_doc_url','updated_at'];
  if(!sh){sh=ss.insertSheet(QUOTATION_COMMERCIAL_V12.DOC_LINK_SHEET);sh.getRange(1,1,1,headers.length).setValues([headers]);}
  return sh;
}
function quotationCommercialDocRows_(){
  const sh=quotationCommercialDocSheet_(),v=sh.getDataRange().getValues(); if(v.length<2)return[];
  const h=v[0].map(String); return v.slice(1).map(function(r,i){const o={_row:i+2};h.forEach(function(k,j){o[k]=r[j]===undefined?'':r[j];});return o;});
}
function quotationCommercialDocUpsert_(quote,links){
  const sh=quotationCommercialDocSheet_(),rows=quotationCommercialDocRows_(),id=String(quote.quote_id||''),ver=Number(quote.version||1);
  const existing=rows.find(function(r){return String(r.quote_id)===id&&Number(r.version||1)===ver;});
  const rec=[id,ver,String(links.quote_pdf_url||''),String(links.quote_doc_url||''),String(links.narrative_pdf_url||''),String(links.narrative_doc_url||''),String(links.proposal_pdf_url||''),String(links.proposal_doc_url||''),new Date()];
  if(existing)sh.getRange(existing._row,1,1,rec.length).setValues([rec]); else sh.appendRow(rec);
}

function quotationCommercialLogoBlob_(){
  try{return UrlFetchApp.fetch('https://sunbotvietnam.github.io/quotation/assets/img/logo-sunbot.png',{muteHttpExceptions:true}).getBlob();}catch(e){return null;}
}
function quotationCommercialHeader_(body){
  const logo=quotationCommercialLogoBlob_(); if(logo)body.appendImage(logo).setWidth(118);
  let p=body.appendParagraph('CÔNG TY CỔ PHẦN CÔNG NGHỆ GIÁO DỤC KIRO VIỆT NAM');p.setBold(true).setFontSize(9).setForegroundColor('#383838');
  body.appendParagraph('SUNBOT · GIẢI PHÁP CÔNG NGHỆ GIÁO DỤC MẦM NON').setFontSize(7).setForegroundColor('#777777');
  body.appendHorizontalRule();
}
function quotationCommercialMoney_(n){return Utilities.formatString('%,.0f đ',Number(n||0));}
function quotationCommercialCreatePdfFromDoc_(doc,folder,pdfName){
  doc.saveAndClose();const file=DriveApp.getFileById(doc.getId());file.moveTo(folder);
  const old=folder.getFilesByName(pdfName);while(old.hasNext())try{old.next().setTrashed(true);}catch(e){}
  const pdf=folder.createFile(file.getBlob().getAs(MimeType.PDF).setName(pdfName));try{pdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  return {doc_url:doc.getUrl(),pdf_url:'https://drive.google.com/file/d/'+pdf.getId()+'/view'};
}

// Customer PDF: kế thừa tinh hoa bản cũ — logo chuẩn, kính gửi, lời dẫn, VAT, thanh toán, hiệu lực và đại diện.
function quotationArtifactBuildDocument_(bundle,stage){
  const q=bundle.quote||{},lines=bundle.lines||[],approved=String(stage||'').toUpperCase()==='APPROVED';
  const mode=quotationCustomerMode_(q),display=quotationApprovalDisplayCode_(q.quote_id||''),meta=quotationCommercialMetaParse_(q);
  const customer=String(q.client_name||'Quý Nhà trường / Quý Đơn vị');
  const base='Bao-gia-Sunbot_'+quotationCommercialSlug_(customer)+'_'+quotationCommercialSlug_(display)+(approved?'':'_DU-THAO');
  const folder=quotationCommercialDocFolder_(q),doc=DocumentApp.create(base),body=doc.getBody();
  body.setMarginTop(30).setMarginBottom(34).setMarginLeft(40).setMarginRight(40);
  quotationCommercialHeader_(body);
  let title=mode==='RETAIL'?'BÁO GIÁ THIẾT BỊ / DỊCH VỤ SUNBOT':mode==='LEGACY'?'BÁO GIÁ TÁI KHỞI ĐỘNG VÀ NÂNG CẤP SUNBOT':'BÁO GIÁ GIẢI PHÁP SUNBOT';
  let p=body.appendParagraph(title);p.setHeading(DocumentApp.ParagraphHeading.HEADING1).setBold(true).setForegroundColor('#F47B20').setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(10).setSpacingAfter(8);
  body.appendParagraph('Kính gửi: '+customer).setBold(true).setFontSize(10);
  body.appendParagraph('Kiro Việt Nam trân trọng gửi Quý Nhà trường/Quý Đơn vị báo giá Sunbot trên cơ sở nhu cầu và phạm vi triển khai đã trao đổi.').setFontSize(9).setSpacingAfter(8);
  body.appendParagraph('Mã báo giá: '+display+' · Phiên bản '+Number(q.version||1)).setFontSize(8).setForegroundColor('#737373');
  const table=body.appendTable();const hr=table.appendTableRow();
  ['STT','Hạng mục','SL','Đơn giá','Thành tiền'].forEach(function(t){const c=hr.appendTableCell(t);c.setBackgroundColor('#F47B20');c.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true).setFontSize(8);});
  let total=0;lines.forEach(function(line,i){const price=quotationApprovalNumber_(line.proposed_unit_price||line.unit_price_snapshot),qty=quotationApprovalNumber_(line.qty),sum=quotationApprovalNumber_(line.line_total||price*qty);total+=sum;const r=table.appendTableRow();[String(i+1),quotationArtifactCustomerName_(line.item_name_snapshot||line.item_id||''),String(qty),quotationCommercialMoney_(price),quotationCommercialMoney_(sum)].forEach(function(t,j){const c=r.appendTableCell(t);c.getChild(0).asParagraph().setFontSize(j===1?8:7.5);});});
  p=body.appendParagraph('TỔNG GIÁ TRỊ ĐỀ XUẤT: '+quotationCommercialMoney_(total));p.setBold(true).setForegroundColor('#F47B20').setFontSize(12).setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingBefore(10);
  body.appendParagraph('LƯU Ý THƯƠNG MẠI').setBold(true).setForegroundColor('#F47B20').setFontSize(9).setSpacingBefore(12);
  body.appendListItem(meta.vat).setFontSize(8.5);
  body.appendListItem('Điều kiện thanh toán: '+meta.payment).setFontSize(8.5);
  body.appendListItem('Hiệu lực báo giá: '+meta.validity).setFontSize(8.5);
  body.appendListItem('Các hạng mục ngoài phạm vi báo giá chỉ thực hiện sau khi hai bên thống nhất.').setFontSize(8.5);
  if(meta.customer_note)body.appendListItem(meta.customer_note).setFontSize(8.5);
  body.appendParagraph('ĐẠI DIỆN BÁO GIÁ').setBold(true).setSpacingBefore(18).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph(quotationCustomerRepresentative_(q)).setBold(true).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('Công ty Cổ phần Công nghệ Giáo dục Kiro Việt Nam').setFontSize(8).setForegroundColor('#737373').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  const out=quotationCommercialCreatePdfFromDoc_(doc,folder,base+'.pdf');
  return {doc_url:out.doc_url,pdf_url:out.pdf_url,pdf_id:String(out.pdf_url).match(/\/d\/([^/]+)/)?.[1]||''};
}

function quotationCommercialNarrativeDoc_(bundle,includePrice){
  const q=bundle.quote||{},text=String(q.configuration_description||'').trim(); if(!text)return null;
  const display=quotationApprovalDisplayCode_(q.quote_id||''),customer=String(q.client_name||'Quý Nhà trường / Quý Đơn vị');
  const base=(includePrice?'De-xuat-Sunbot_':'Thuyet-minh-Sunbot_')+quotationCommercialSlug_(customer)+'_'+quotationCommercialSlug_(display);
  const folder=quotationCommercialDocFolder_(q),doc=DocumentApp.create(base),body=doc.getBody();body.setMarginTop(30).setMarginBottom(34).setMarginLeft(40).setMarginRight(40);
  quotationCommercialHeader_(body);
  let p=body.appendParagraph(includePrice?'ĐỀ XUẤT GIẢI PHÁP SUNBOT':'THUYẾT MINH GIẢI PHÁP SUNBOT');p.setHeading(DocumentApp.ParagraphHeading.HEADING1).setBold(true).setForegroundColor('#F47B20').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('Kính gửi: '+customer).setBold(true).setFontSize(10);body.appendParagraph('Mã tham chiếu: '+display).setFontSize(8).setForegroundColor('#737373');
  text.split(/\n\s*\n/).filter(Boolean).forEach(function(block){const raw=String(block||'').trim(),clean=raw.replace(/^##\s*/,'').replace(/\bAdmin\b/gi,'Kiro Việt Nam').replace(/\blab\b/gi,'phòng công nghệ');if(/^##\s*/.test(raw)||/^\d+[.)]/.test(clean)){body.appendParagraph(clean).setBold(true).setForegroundColor('#F47B20').setFontSize(10).setSpacingBefore(10);}else body.appendParagraph(clean).setFontSize(9).setLineSpacing(1.2);});
  if(includePrice){
    body.appendParagraph('TÓM TẮT THƯƠNG MẠI').setBold(true).setForegroundColor('#F47B20').setSpacingBefore(12);
    const t=body.appendTable();const hr=t.appendTableRow();['Hạng mục','SL','Thành tiền'].forEach(function(x){const c=hr.appendTableCell(x);c.setBackgroundColor('#F47B20');c.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true).setFontSize(8);});
    let total=0;(bundle.lines||[]).forEach(function(line){const sum=quotationApprovalNumber_(line.line_total||quotationApprovalNumber_(line.proposed_unit_price||line.unit_price_snapshot)*quotationApprovalNumber_(line.qty));total+=sum;const r=t.appendTableRow();[quotationArtifactCustomerName_(line.item_name_snapshot||line.item_id||''),String(line.qty||0),quotationCommercialMoney_(sum)].forEach(function(x){r.appendTableCell(x).getChild(0).asParagraph().setFontSize(8);});});
    body.appendParagraph('Tổng giá trị đề xuất: '+quotationCommercialMoney_(total)).setBold(true).setForegroundColor('#F47B20').setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingBefore(8);
  }
  return quotationCommercialCreatePdfFromDoc_(doc,folder,base+'.pdf');
}

function quotationCommercialEnsureDocuments_(token,quoteId,force){
  const session=quotationApprovalSession_(token),bundle=quotationApprovalQuoteBundle_(session,{quote_id:String(quoteId||'')},false),q=bundle.quote||{};
  if(String(q.status||'').toUpperCase()!=='APPROVED')throw new Error('Chỉ tạo bộ tài liệu chính thức sau khi báo giá đã phát hành.');
  const rows=quotationCommercialDocRows_(),existing=rows.find(function(r){return String(r.quote_id)===String(q.quote_id)&&Number(r.version||1)===Number(q.version||1);});
  if(existing&&!force){const o=Object.assign({},existing);delete o._row;return o;}
  const quoteArt=quotationArtifactBuildDocument_(bundle,'APPROVED');
  const narrative=quotationCommercialNarrativeDoc_(bundle,false),proposal=quotationCommercialNarrativeDoc_(bundle,true);
  const links={quote_pdf_url:quoteArt.pdf_url,quote_doc_url:quoteArt.doc_url,narrative_pdf_url:narrative?narrative.pdf_url:'',narrative_doc_url:narrative?narrative.doc_url:'',proposal_pdf_url:proposal?proposal.pdf_url:'',proposal_doc_url:proposal?proposal.doc_url:''};
  quotationCommercialDocUpsert_(q,links);quotationArtifactIndexUpsert_(q,{approved_pdf_url:quoteArt.pdf_url});
  return Object.assign({quote_id:q.quote_id,version:Number(q.version||1)},links);
}

function quotationCommercialDocumentLinks_(token,payload){
  const session=quotationApprovalSession_(token),id=String(payload&&payload.quote_id||'').trim();if(!id)throw new Error('Thiếu mã báo giá.');
  const bundle=quotationApprovalQuoteBundle_(session,{quote_id:id},false),q=bundle.quote||{};
  if(typeof quotationArtifactCanView_==='function'&&!quotationArtifactCanView_(session,q))throw new Error('Bạn không được xem báo giá của người khác.');
  if(String(q.status||'').toUpperCase()!=='APPROVED')return {quote_id:id,status:String(q.status||''),quote_pdf_url:'',quote_doc_url:'',narrative_pdf_url:'',narrative_doc_url:'',proposal_pdf_url:'',proposal_doc_url:''};
  return quotationCommercialEnsureDocuments_(token,id,false);
}

function apiSessionQuotationShared(token,action,payload){
  const a=String(action||''),request=payload||{},session=quotationApprovalSession_(token);
  if(a==='pricingPolicy'||a==='northstarPricing')return {items:quotationCommercialPricing_(),version:QUOTATION_COMMERCIAL_V12.VERSION};
  if(a==='submitQuoteRequest')return quotationNorthStarSubmitRequest_(session,request);
  if(a==='listQuoteRequests')return {items:quotationNorthStarListRequests_(session),version:QUOTATION_COMMERCIAL_V12.VERSION};
  if(a==='getQuoteRequest')return quotationNorthStarFindRequest_(session,request);
  if(a==='createCommercialQuote'||a==='createNorthStarQuote')return quotationCommercialCreateQuote_(token,session,request);
  if(a==='getCommercialDocumentLinks')return quotationCommercialDocumentLinks_(token,request);
  if(a==='regenerateCommercialDocuments'){if(String(session.role||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được tạo lại tài liệu.');return quotationCommercialEnsureDocuments_(token,String(request.quote_id||''),true);}
  if(a==='bootstrapFast')return quotationPerformanceBootstrap_(token);
  if(a==='listQuotesLite')return quotationArtifactListLite_(token);
  if(a==='getQuoteLinks')return quotationArtifactLinks_(token,request);
  if(a==='recoverLegacyArtifacts')return quotationArtifactRecoverBatch_(token,request);
  if(a==='listPublishedQuotes')return quotationPublicationList_(token);
  if(a==='getPublishedQuote'||a==='getQuoteFast')return quotationPublicationGet_(token,request);
  if(a==='saveSnapshot'){
    const result=apiSessionQuotationApproval(token,a,request);try{const art=quotationArtifactMaterialize_(token,result.quote_id,'PENDING');result.preview_pdf_url=art.pdf_url;}catch(e){result.artifact_warning=String(e&&e.message||e);}return result;
  }
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
