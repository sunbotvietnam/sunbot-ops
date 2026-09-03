// Quotation Approval V4 — configuration-first review workflow.
// Loaded after V5 core and hotfixes. Keeps existing data model compatible while adding
// structured change requests and Admin configuration revisions with a stored diff.

function quotationApprovalQuoteHeaders_() {
  return ['quote_id','version','created_at','created_by','client_name','client_type','combo_code','subtotal','discount_rate','discount_amount','final_amount','status','approval_required','approved_by','approved_at','notes','configuration_description','pricebook_version','customer_id','opportunity_id','region','creator_role','deal_owner','standard_amount','proposed_amount','exception_reason','commercial_fingerprint','updated_at','rejected_by','rejected_at','rejection_reason','exportable','deployment_sites','learner_count','commercial_model','recommended_model','policy_match','scale_program','scale_sessions_per_month','frequency_factor','point_comparison_amount','scale_comparison_amount','scale_4_amount','scale_8_amount','comparison_difference','cheaper_model','model_exception_reason','revised_by','revision_note','change_request','change_requested_by','change_requested_at','admin_diff_json','revision_type','parent_version'];
}

function quotationApprovalLinesForVersion_(quoteId, version) {
  return quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.LINES).filter(function(line){
    return String(line.quote_id) === String(quoteId) && Number(line.version || 1) === Number(version || 1);
  });
}

function quotationApprovalAdminDiff_(beforeQuote, beforeLines, afterQuote, afterLines) {
  const changes = [];
  function field(label, key) {
    const before = String(beforeQuote && beforeQuote[key] == null ? '' : beforeQuote[key]);
    const after = String(afterQuote && afterQuote[key] == null ? '' : afterQuote[key]);
    if (before !== after) changes.push({type:'FIELD',field:key,label:label,before:before,after:after});
  }
  field('Số điểm triển khai','deployment_sites');
  field('Số trẻ','learner_count');
  field('Mô hình thương mại','commercial_model');
  field('Chương trình','scale_program');
  field('Tần suất','scale_sessions_per_month');
  field('Thuyết minh cấu hình','configuration_description');

  const beforeMap = {}, afterMap = {};
  (beforeLines || []).forEach(function(line){ beforeMap[String(line.item_id || '')] = line; });
  (afterLines || []).forEach(function(line){ afterMap[String(line.item_id || '')] = line; });
  const ids = {};
  Object.keys(beforeMap).forEach(function(id){ ids[id] = true; });
  Object.keys(afterMap).forEach(function(id){ ids[id] = true; });
  Object.keys(ids).forEach(function(id){
    const b = beforeMap[id], a = afterMap[id];
    if (!b && a) {
      changes.push({type:'LINE_ADD',item_id:id,label:String(a.item_name_snapshot || id),before:'',after:'SL '+quotationApprovalNumber_(a.qty)});
      return;
    }
    if (b && !a) {
      changes.push({type:'LINE_REMOVE',item_id:id,label:String(b.item_name_snapshot || id),before:'SL '+quotationApprovalNumber_(b.qty),after:''});
      return;
    }
    const bQty = quotationApprovalNumber_(b.qty), aQty = quotationApprovalNumber_(a.qty);
    if (bQty !== aQty) changes.push({type:'QTY',item_id:id,label:String(a.item_name_snapshot || b.item_name_snapshot || id),before:bQty,after:aQty});
    const bPrice = quotationApprovalNumber_(b.proposed_unit_price || b.unit_price_snapshot), aPrice = quotationApprovalNumber_(a.proposed_unit_price || a.unit_price_snapshot);
    if (bPrice !== aPrice) changes.push({type:'PRICE',item_id:id,label:String(a.item_name_snapshot || b.item_name_snapshot || id),before:bPrice,after:aPrice});
  });
  return changes;
}

function quotationApprovalDecision_(session,payload,approved) {
  if (session.role !== 'ADMIN') throw new Error('Chỉ Admin được duyệt hoặc yêu cầu chỉnh sửa báo giá.');
  const quoteId = String(payload.quote_id || '').trim(), quote = quotationApprovalLatest_(quoteId);
  if (!quote) throw new Error('Không tìm thấy báo giá.');
  if (String(quote.status) !== 'NEEDS_APPROVAL') throw new Error('Báo giá không ở trạng thái chờ duyệt.');
  const existingReason = String(quote.exception_reason || quote.model_exception_reason || '').trim();
  const reason = String(payload.reason || payload.change_request || payload.exception_reason || existingReason).trim();
  if (!approved && !reason) throw new Error('Hãy nhập yêu cầu chỉnh sửa đầy đủ cho người lập báo giá.');
  const flags = quotationApprovalSpecialFlags_(quoteId,quote);
  if (approved && flags.length && !reason) throw new Error('Báo giá có ngoại lệ thương mại, cần ghi rõ lý do duyệt.');
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
  const headers = quotationApprovalHeaders_(sheet,quotationApprovalQuoteHeaders_(),QUOTATION_APPROVAL.HEADER_ROW), now = new Date();
  if (approved) {
    quotationApprovalSet_(sheet,quote._row,headers,{status:'APPROVED',approval_required:false,approved_by:session.login_id,approved_at:now,exception_reason:reason,updated_at:now,exportable:true,change_request:'',change_requested_by:'',change_requested_at:''});
  } else {
    quotationApprovalSet_(sheet,quote._row,headers,{status:'CHANGES_REQUESTED',approval_required:true,rejected_by:session.login_id,rejected_at:now,rejection_reason:reason,change_request:reason,change_requested_by:session.login_id,change_requested_at:now,updated_at:now,exportable:false});
  }
  quotationApprovalAudit_(session,approved?'QUOTE_APPROVE':'QUOTE_CHANGES_REQUESTED',quoteId,{version:Number(quote.version||1),reason:reason,special_flags:flags,status:approved?'APPROVED':'CHANGES_REQUESTED'});
  return {ok:true,quote_id:quoteId,version:Number(quote.version||1),status:approved?'APPROVED':'CHANGES_REQUESTED',exportable:approved,decided_by:session.login_id,decided_at:now.toISOString(),change_request:approved?'':reason};
}

function quotationApprovalAdminRevise_(session,payload) {
  if (session.role !== 'ADMIN') throw new Error('Chỉ Admin được hiệu chỉnh trực tiếp cấu hình.');
  const quoteId = String(payload.quote_id || '').trim();
  const before = quotationApprovalLatest_(quoteId);
  if (!before) throw new Error('Không tìm thấy báo giá cần hiệu chỉnh.');
  if (String(before.status) !== 'NEEDS_APPROVAL') throw new Error('Chỉ hiệu chỉnh trực tiếp báo giá đang Chờ duyệt.');
  const beforeLines = quotationApprovalLinesForVersion_(quoteId, before.version);
  const note = String(payload.revision_note || payload.reason || '').trim() || 'Admin hiệu chỉnh cấu hình trong quá trình rà soát.';
  const savePayload = Object.assign({}, payload, {quote_id:quoteId, revision_note:note, notes:String(payload.notes || payload.reason || ''), exception_reason:String(payload.exception_reason || payload.reason || '')});
  delete savePayload.approve_after;
  const saved = quotationApprovalSave_(session, savePayload);
  const after = quotationApprovalLatest_(quoteId);
  const afterLines = quotationApprovalLinesForVersion_(quoteId, after.version);
  const diff = quotationApprovalAdminDiff_(before,beforeLines,after,afterLines);
  const sheet = quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
  const headers = quotationApprovalHeaders_(sheet,quotationApprovalQuoteHeaders_(),QUOTATION_APPROVAL.HEADER_ROW);
  quotationApprovalSet_(sheet,after._row,headers,{admin_diff_json:JSON.stringify(diff),revision_type:'ADMIN_CONFIGURATION_REVISION',parent_version:Number(before.version||1),revision_note:note,revised_by:session.login_id});
  quotationApprovalAudit_(session,'QUOTE_ADMIN_CONFIGURATION_REVISION',quoteId,{from_version:Number(before.version||1),to_version:Number(after.version||1),changes:diff,revision_note:note});
  let decision = null;
  if (quotationApprovalYes_(payload.approve_after)) decision = quotationApprovalDecision_(session,{quote_id:quoteId,reason:String(payload.approval_reason || payload.reason || note)},true);
  return Object.assign({},saved,{admin_diff:diff,revision_note:note,approved:!!decision,status:decision?decision.status:saved.status});
}

function quotationApprovalList_(session) {
  const latest={};
  quotationApprovalRows_(QUOTATION_APPROVAL.SHEETS.QUOTES).forEach(function(row){
    const id=String(row.quote_id||''), current=latest[id];
    if (!current || Number(row.version||1)>Number(current.version||1)) latest[id]=row;
  });
  return Object.keys(latest).map(function(id){return latest[id];})
    .filter(function(row){ return session.role==='ADMIN' || String(row.created_by)===session.login_id; })
    .sort(function(a,b){ return new Date(b.updated_at || b.created_at || 0)-new Date(a.updated_at || a.created_at || 0); })
    .slice(0,200)
    .map(function(row){
      return {quote_id:String(row.quote_id),quote_code:quotationApprovalDisplayCode_(row.quote_id),version:Number(row.version||1),created_at:row.created_at,created_by:String(row.created_by||''),region:String(row.region||''),client_name:String(row.client_name||''),final_amount:quotationApprovalNumber_(row.proposed_amount||row.final_amount),status:String(row.status||''),exportable:String(row.status||'')==='APPROVED',deployment_sites:quotationApprovalNumber_(row.deployment_sites),learner_count:quotationApprovalNumber_(row.learner_count),commercial_model:String(row.commercial_model||''),recommended_model:String(row.recommended_model||''),policy_match:quotationApprovalYes_(row.policy_match),revised_by:String(row.revised_by||''),revision_note:String(row.revision_note||''),change_request:String(row.change_request||row.rejection_reason||''),change_requested_by:String(row.change_requested_by||row.rejected_by||''),change_requested_at:row.change_requested_at||row.rejected_at||'',admin_diff_json:String(row.admin_diff_json||''),revision_type:String(row.revision_type||''),parent_version:quotationApprovalNumber_(row.parent_version)};
    });
}

function apiSessionQuotationApproval(token,action,payload) {
  const session=quotationApprovalSession_(token), request=payload||{};
  switch(String(action||'')) {
    case 'bootstrap': return {login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region,session_expires_at:session.expires_at,backend_version:QUOTATION_APPROVAL.VERSION+'-v4',user:{login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region}};
    case 'catalog': return quotationApprovalCatalog_(session);
    case 'saveSnapshot': return quotationApprovalSave_(session,request);
    case 'getQuote': return quotationApprovalQuoteBundle_(session,request,false);
    case 'exportQuote': return quotationApprovalQuoteBundle_(session,request,true);
    case 'listQuotes': return quotationApprovalList_(session);
    case 'approveQuote': return quotationApprovalDecision_(session,request,true);
    case 'rejectQuote':
    case 'requestChanges': return quotationApprovalDecision_(session,request,false);
    case 'adminReviseQuote': return quotationApprovalAdminRevise_(session,request);
    default: throw new Error('Tác vụ Quotation không hợp lệ.');
  }
}
