const QUOTATION_V3 = Object.freeze({
  SHEETS:Object.freeze({CATALOG:'CATALOG_ITEMS',PRICES:'PRICE_VERSIONS',COMBOS:'COMBOS',COMPONENTS:'COMBO_COMPONENTS',RULES:'PRICING_RULES',MATERIALS:'MATERIALS',QUOTES:'QUOTES',LINES:'QUOTE_LINES',AUDIT:'AUDIT_LOG'}),
  HEADER_ROW:3,
  CUSTOM_PREFIX:'CUSTOM-'
});

function quotationV3Rows_(sheetName) {
  const sh=SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID).getSheetByName(sheetName);
  if(!sh)throw new Error('Thiếu bảng dữ liệu Quotation: '+sheetName);
  const values=sh.getDataRange().getValues();
  if(values.length<QUOTATION_V3.HEADER_ROW)return [];
  const headers=values[QUOTATION_V3.HEADER_ROW-1].map(String);
  return values.slice(QUOTATION_V3.HEADER_ROW).filter(function(row){return row.some(function(v){return String(v||'').trim()!=='';});}).map(function(row){const out={};headers.forEach(function(h,i){if(h)out[h]=row[i]!==undefined?row[i]:'';});return out;});
}

function quotationV3Yes_(value){return value===true||String(value||'').toUpperCase()==='TRUE'||Number(value)===1;}
function quotationV3Number_(value){const n=Number(String(value==null?'':value).replace(/[^0-9.-]/g,''));return isFinite(n)?n:0;}
function quotationV3DateActive_(row,at){const now=at||new Date(),from=row.valid_from?new Date(row.valid_from):null,to=row.valid_to?new Date(row.valid_to):null;return (!from||isNaN(from)||from<=now)&&(!to||isNaN(to)||to>=now)&&String(row.status||'ACTIVE').toUpperCase()==='ACTIVE';}

function quotationV3ActivePrice_(itemId,at){
  return quotationV3Rows_(QUOTATION_V3.SHEETS.PRICES).filter(function(p){return String(p.item_id)===String(itemId)&&quotationV3DateActive_(p,at);}).sort(function(a,b){return new Date(b.valid_from||0)-new Date(a.valid_from||0);})[0]||null;
}

function quotationV3PublicItem_(row,at){
  const price=quotationV3ActivePrice_(row.item_id,at);
  if(!price)return null;
  return {item_id:String(row.item_id||''),item_type:String(row.item_type||''),category:String(row.category||''),name:String(row.name||''),description:String(row.description||''),unit:String(row.unit||''),recommended_price:quotationV3Number_(price.recommended_price),list_price:quotationV3Number_(price.list_price),price_mode:String(row.price_mode||'FIXED'),pricing_rule_id:String(row.pricing_rule_id||''),price_version_id:String(price.price_version_id||''),customer_visible:quotationV3Yes_(row.customer_visible),quote_selectable:quotationV3Yes_(row.quote_selectable),sort_order:Number(row.sort_order||0),tags:String(row.tags||'').split(',').map(function(x){return x.trim();}).filter(Boolean)};
}

function quotationV3Catalog_(){
  const at=new Date();
  const source=quotationV3Rows_(QUOTATION_V3.SHEETS.CATALOG).filter(function(row){return String(row.status||'').toUpperCase()==='ACTIVE'&&quotationV3Yes_(row.sales_visible)&&quotationV3Yes_(row.quote_selectable)&&quotationV3DateActive_(row,at);});
  const items=source.map(function(row){return quotationV3PublicItem_(row,at);}).filter(Boolean).sort(function(a,b){return a.sort_order-b.sort_order;});
  const allowed={};items.forEach(function(item){allowed[item.item_id]=true;});
  const combos=quotationV3Rows_(QUOTATION_V3.SHEETS.COMBOS).filter(function(row){return String(row.status||'').toUpperCase()==='ACTIVE';}).sort(function(a,b){return Number(a.sort_order||0)-Number(b.sort_order||0);}).map(function(row){return{combo_code:String(row.combo_code||''),name:String(row.combo_name||''),description:String(row.description||''),program_scope:String(row.program_scope||''),years:Number(row.years||0),recommended:quotationV3Yes_(row.recommended),sort_order:Number(row.sort_order||0)};});
  const components=quotationV3Rows_(QUOTATION_V3.SHEETS.COMPONENTS).filter(function(row){return allowed[String(row.item_id||'')];}).map(function(row){return{combo_code:String(row.combo_code||''),line_order:Number(row.line_order||0),item_id:String(row.item_id||''),quantity:Number(row.qty||0),required:quotationV3Yes_(row.required),can_edit:quotationV3Yes_(row.can_edit),note:String(row.note||'')};});
  const rules=quotationV3Rows_(QUOTATION_V3.SHEETS.RULES).filter(function(row){return String(row.status||'').toUpperCase()==='ACTIVE';}).map(function(row){return{rule_id:String(row.rule_id||''),rule_type:String(row.rule_type||''),inputs:String(row.inputs||'').split(',').map(function(x){return x.trim();}).filter(Boolean),version:String(row.version||row.rule_id||'')};});
  const cfg=quotationSharedConfig_();
  return{pricebook_version:String(cfg.BACKEND_VERSION||''),currency:String(cfg.DEFAULT_CURRENCY||'VND'),items:items,combos:combos,components:components,rules:rules,generated_at:new Date().toISOString()};
}

function quotationV3Materials_(){
  const items=quotationV3Rows_(QUOTATION_V3.SHEETS.MATERIALS).filter(function(row){return String(row.status||'').toUpperCase()==='ACTIVE'&&quotationV3Yes_(row.sales_visible)&&quotationV3Yes_(row.quote_selectable);}).map(function(row){return{item_id:String(row.item_id||''),item_type:String(row.item_type||''),category:String(row.category||''),name:String(row.name||''),description:String(row.description||''),unit:String(row.unit||''),recommended_price:quotationV3Number_(row.recommended_price),list_price:quotationV3Number_(row.list_price),customer_visible:quotationV3Yes_(row.customer_visible),quote_selectable:true,note:String(row.note||'')};});
  return{items:items,generated_at:new Date().toISOString()};
}

function quotationV3SupportItem_(items,students,ruleId){
  const candidates=items.filter(function(item){return item.pricing_rule_id===ruleId;}).sort(function(a,b){return a.sort_order-b.sort_order;});
  if(!candidates.length)throw new Error('Không có cấu hình đồng hành hợp lệ hiện hành.');
  const count=Number(students||0),index=count<=150?0:(count<=300?1:(count<=500?2:3));
  return candidates[Math.min(index,candidates.length-1)];
}

function quotationV3FindLineItem_(mode,line,catalog,materials,context){
  if(String(line.item_id||'').indexOf(QUOTATION_V3.CUSTOM_PREFIX)===0){
    if(mode!=='RETAIL')throw new Error('Hạng mục tùy chỉnh chỉ dùng cho báo giá vật liệu và sửa chữa.');
    const name=String(line.custom_name||line.name||'').trim(),unit=String(line.custom_unit||line.unit||'').trim(),price=quotationV3Number_(line.custom_unit_price||line.unit_price);
    if(!name||!unit||price<=0)throw new Error('Hạng mục tùy chỉnh chưa đủ tên, đơn vị hoặc đơn giá.');
    return{item_id:String(line.item_id),name:name,description:'Hạng mục ngoài danh mục chuẩn cần xác nhận đơn giá trước khi gửi khách hàng.',unit:unit,recommended_price:price,price_version_id:'CUSTOM',pricing_rule_id:'',customer_visible:true,is_custom:true};
  }
  const source=mode==='RETAIL'?materials:catalog;
  let item=source.find(function(x){return String(x.item_id)===String(line.item_id);});
  if(!item)throw new Error('Hạng mục không còn hiệu lực hoặc không được phép báo giá: '+String(line.item_id||''));
  if(mode==='SOLUTION'&&item.pricing_rule_id&&String(item.price_mode).toUpperCase()==='TIERED')item=quotationV3SupportItem_(catalog,context.students,item.pricing_rule_id);
  return item;
}

function quotationV3Preview_(payload){
  payload=payload||{};const mode=String(payload.mode||'SOLUTION').toUpperCase();
  if(['SOLUTION','RETAIL'].indexOf(mode)<0)throw new Error('Loại báo giá không hợp lệ.');
  const catalogResult=quotationV3Catalog_(),catalog=catalogResult.items,materials=quotationV3Materials_().items,context=payload.context||{},seen={};
  const requested=Array.isArray(payload.lines)?payload.lines:[];if(!requested.length)throw new Error('Báo giá chưa có hạng mục.');
  const lines=requested.map(function(line,index){
    const item=quotationV3FindLineItem_(mode,line,catalog,materials,context),key=String(item.item_id),qty=Number(line.quantity||line.qty||0);
    if(!isFinite(qty)||qty<=0)throw new Error('Số lượng không hợp lệ tại dòng '+(index+1)+'.');
    if(!item.is_custom&&seen[key])throw new Error('Hạng mục bị lặp: '+item.name);seen[key]=true;
    const unitPrice=quotationV3Number_(item.recommended_price),total=Math.round(unitPrice*qty);
    return{line_no:index+1,item_id:key,item_name_snapshot:item.name,description_snapshot:item.description||'',unit_snapshot:item.unit,unit_price_snapshot:unitPrice,quantity:qty,line_total:total,pricing_rule_version:item.pricing_rule_id||'',source_price_version:item.price_version_id||'',customer_visible:item.customer_visible!==false,note_snapshot:String(line.note||''),is_custom:!!item.is_custom};
  });
  const subtotal=lines.reduce(function(sum,line){return sum+line.line_total;},0);
  return{mode:mode,combo_code:String(payload.combo_code||''),lines:lines,subtotal:subtotal,final_amount:subtotal,pricebook_version:catalogResult.pricebook_version,pricing_rule_version:catalogResult.rules.map(function(r){return r.version;}).filter(Boolean).join(','),approval_required:false,custom_price_warning:lines.some(function(line){return line.is_custom;})};
}

function quotationV3EnsureLineSchema_(sheet){
  const headerRow=QUOTATION_V3.HEADER_ROW,required=['quote_id','line_no','item_id','item_name_snapshot','unit_snapshot','unit_price_snapshot','qty','discount_rate','line_total','pricing_rule_version','source_price_version','version','note_snapshot','is_custom'];
  const current=sheet.getRange(headerRow,1,1,Math.max(sheet.getLastColumn(),required.length)).getDisplayValues()[0];
  required.forEach(function(header,index){if(!current[index])sheet.getRange(headerRow,index+1).setValue(header);else if(current[index]!==header)throw new Error('Schema QUOTE_LINES không tương thích tại cột '+(index+1)+'.');});
}

function quotationV3DisplayCode_(quoteId){const m=String(quoteId||'').match(/^BG-SUNBOT-(\d{4})-(\d{4})-(\d{3})$/);return m?'BG/SUNBOT/'+m[1]+'/'+m[2]+'-'+m[3]:String(quoteId||'');}
function quotationV3LatestVersion_(quoteId){return quotationV3Rows_(QUOTATION_V3.SHEETS.QUOTES).filter(function(q){return String(q.quote_id)===String(quoteId);}).reduce(function(max,q){return Math.max(max,Number(q.version||1));},0);}

function quotationV3Save_(payload){
  payload=payload||{};const customerName=String(payload.customer_name||'').trim(),createdBy=String(payload.created_by||'').trim();
  if(!customerName)throw new Error('Hãy nhập tên khách hàng.');if(!createdBy)throw new Error('Hãy nhập người lập báo giá.');
  const preview=quotationV3Preview_(payload),lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const ss=SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID),quoteSheet=ss.getSheetByName(QUOTATION_V3.SHEETS.QUOTES),lineSheet=ss.getSheetByName(QUOTATION_V3.SHEETS.LINES);
    if(!quoteSheet||!lineSheet)throw new Error('Backend thiếu bảng lưu báo giá.');quotationV3EnsureLineSchema_(lineSheet);
    const existingId=String(payload.quote_id||'').trim(),qid=existingId?{id:existingId,display:quotationV3DisplayCode_(existingId)}:quotationSharedQuoteId_(),version=existingId?quotationV3LatestVersion_(existingId)+1:1,now=new Date();
    quoteSheet.appendRow([qid.id,version,now,createdBy,customerName,String(payload.client_type||''),preview.combo_code,preview.subtotal,0,0,preview.final_amount,'SAVED',false,'','',String(payload.notes||''),preview.pricebook_version,String(payload.customer_id||''),String(payload.opportunity_id||'')]);
    preview.lines.forEach(function(line){lineSheet.appendRow([qid.id,line.line_no,line.item_id,line.item_name_snapshot,line.unit_snapshot,line.unit_price_snapshot,line.quantity,0,line.line_total,line.pricing_rule_version,line.source_price_version,version,line.note_snapshot,line.is_custom]);});
    const audit=ss.getSheetByName(QUOTATION_V3.SHEETS.AUDIT);if(audit)audit.appendRow(['AUD-'+Utilities.getUuid(),now,createdBy,version===1?'QUOTE_CREATE':'QUOTE_REVISION','QUOTE',qid.id,JSON.stringify({version:version,mode:preview.mode,final_amount:preview.final_amount,customer_id:String(payload.customer_id||''),opportunity_id:String(payload.opportunity_id||'')})]);
    return{ok:true,quote_id:qid.id,quote_code:qid.display,version:version,status:'SAVED',customer_name:customerName,customer_id:String(payload.customer_id||''),opportunity_id:String(payload.opportunity_id||''),created_by:createdBy,created_at:now.toISOString(),subtotal:preview.subtotal,final_amount:preview.final_amount,pricebook_version:preview.pricebook_version,lines:preview.lines,custom_price_warning:preview.custom_price_warning};
  }finally{lock.releaseLock();}
}

function apiSessionQuotationV3(token,action,payload){
  quotationSharedSession_(token);payload=payload||{};
  switch(String(action||'')){
    case 'bootstrap':{const cfg=quotationSharedConfig_();return{access:'shared',pricebook_version:String(cfg.BACKEND_VERSION||''),currency:String(cfg.DEFAULT_CURRENCY||'VND'),features:{solution:true,retail:true,crm_context:true,quote_revision:true}};}
    case 'catalog':return quotationV3Catalog_();
    case 'materials':return quotationV3Materials_();
    case 'preview':return quotationV3Preview_(payload);
    case 'save':return quotationV3Save_(payload);
    case 'history':return quotationSharedHistory_();
    default:throw new Error('Tác vụ báo giá nội bộ không hợp lệ.');
  }
}
