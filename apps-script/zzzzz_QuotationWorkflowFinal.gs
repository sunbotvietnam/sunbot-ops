// Final quotation workflow overrides — 2026-09-07.
// Goals:
// 1) Retail/repair quotes do NOT require or persist solution narrative.
// 2) Normal solution quotes still require a configuration narrative.
// 3) Approved quote export is audit-logged.
// Loaded after V4/retail extensions so this is the final production behavior.

function quotationApprovalSave_(session,payload) {
  const clientName=String(payload.customer_name || payload.client_name || '').trim();
  if (!clientName) throw new Error('Hãy nhập tên khách hàng.');

  const requestedId=String(payload.quote_id || '').trim();
  const previous=requestedId?quotationApprovalLatest_(requestedId):null;
  if (requestedId && !previous) throw new Error('Không tìm thấy báo giá cần tạo phiên bản mới.');
  if (previous && session.role !== 'ADMIN' && String(previous.created_by)!==session.login_id) throw new Error('Bạn không được sửa báo giá của người khác.');

  const comboCode=String(payload.combo_code || (previous&&previous.combo_code) || '').trim();
  const quoteType=String(payload.quote_type || '').trim().toUpperCase();
  const retailMode=quoteType==='RETAIL' || comboCode.toUpperCase()==='RETAIL_REPAIR';
  const configurationDescription=retailMode ? '' : String(payload.configuration_description || '').trim();
  if (!retailMode && !configurationDescription) throw new Error('Hãy kiểm tra phần diễn giải cấu hình trước khi gửi duyệt.');

  const reason=String(payload.exception_reason || payload.notes || '').trim();
  const policy=quotationApprovalPolicyFields_(payload,previous);
  if (policy.commercial_model && policy.recommended_model && policy.commercial_model !== policy.recommended_model && !String(policy.model_exception_reason || reason).trim()) throw new Error('Mô hình thương mại khác quy chế phải có lý do ngoại lệ.');
  if (String(policy.commercial_model).toUpperCase()==='SCALE') {
    const catalogMap={}; quotationApprovalInternalCatalog_().forEach(function(item){ catalogMap[item.item_id]=item; });
    policy.scale_program=String(policy.scale_program || 'CORE').toUpperCase();
    policy.frequency_factor=quotationApprovalScaleFactor_(policy.scale_sessions_per_month);
    policy.scale_4_amount=quotationApprovalScaleFee_(policy.learner_count,4,policy.scale_program,catalogMap);
    policy.scale_8_amount=quotationApprovalScaleFee_(policy.learner_count,8,policy.scale_program,catalogMap);
    policy.scale_comparison_amount=Number(policy.scale_sessions_per_month)===8?policy.scale_8_amount:policy.scale_4_amount;
    policy.comparison_difference=Math.abs(quotationApprovalNumber_(policy.point_comparison_amount)-policy.scale_comparison_amount);
  }

  const normalizedPayload=Object.assign({},payload,policy,{combo_code:comboCode,configuration_description:configurationDescription});
  const lines=quotationApprovalBuildLines_(session,normalizedPayload);
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const spreadsheet=quotationApprovalSpreadsheet_();
    const quoteSheet=spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
    const lineSheet=spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.LINES);
    if (!quoteSheet || !lineSheet) throw new Error('Backend thiếu bảng lưu báo giá.');
    const quoteHeaders=quotationApprovalHeaders_(quoteSheet,quotationApprovalQuoteHeaders_(),QUOTATION_APPROVAL.HEADER_ROW);
    const lineHeaders=quotationApprovalHeaders_(lineSheet,quotationApprovalLineHeaders_(),QUOTATION_APPROVAL.HEADER_ROW);
    const generated=requestedId?{id:requestedId,display:quotationApprovalDisplayCode_(requestedId)}:quotationSharedQuoteId_();
    const version=previous?Number(previous.version||1)+1:1;
    const standard=lines.reduce(function(sum,line){ return sum+line.standard_unit_price*line.qty; },0);
    const proposed=lines.reduce(function(sum,line){ return sum+line.line_total; },0);
    const discountAmount=Math.max(0,standard-proposed);
    const discountRate=standard?discountAmount/standard:0;
    const now=new Date();
    const originalCreator=previous?String(previous.created_by || session.login_id):session.login_id;
    const originalRegion=previous?String(previous.region || session.region):session.region;
    const originalCreatorRole=previous?String(previous.creator_role || 'REGIONAL_MANAGER'):session.role;
    const originalDealOwner=previous?String(previous.deal_owner || originalCreator):session.login_id;
    const revisedBy=previous && session.role==='ADMIN' ? session.login_id : String(previous && previous.revised_by || '');
    const revisionNote=String(payload.revision_note || (previous && previous.revision_note) || '');

    quotationApprovalAppendObject_(quoteSheet,quoteHeaders,Object.assign({
      quote_id:generated.id,
      version:version,
      created_at:now,
      created_by:originalCreator,
      client_name:clientName,
      client_type:String(payload.client_type || (previous&&previous.client_type) || ''),
      combo_code:comboCode,
      subtotal:standard,
      discount_rate:discountRate,
      discount_amount:discountAmount,
      final_amount:proposed,
      status:'NEEDS_APPROVAL',
      approval_required:true,
      approved_by:'',
      approved_at:'',
      notes:String(payload.notes || ''),
      configuration_description:configurationDescription,
      pricebook_version:QUOTATION_APPROVAL.VERSION,
      customer_id:String(payload.customer_id || (previous&&previous.customer_id) || ''),
      opportunity_id:String(payload.opportunity_id || (previous&&previous.opportunity_id) || ''),
      region:originalRegion,
      creator_role:originalCreatorRole,
      deal_owner:originalDealOwner,
      standard_amount:standard,
      proposed_amount:proposed,
      exception_reason:reason || String(policy.model_exception_reason || ''),
      commercial_fingerprint:quotationApprovalFingerprint_(lines),
      updated_at:now,
      rejected_by:'',
      rejected_at:'',
      rejection_reason:'',
      exportable:false,
      revised_by:revisedBy,
      revision_note:revisionNote,
      change_request:'',
      change_requested_by:'',
      change_requested_at:''
    },policy));

    lines.forEach(function(line){
      line.quote_id=generated.id;
      line.version=version;
      quotationApprovalAppendObject_(lineSheet,lineHeaders,line);
    });

    const action=previous && session.role==='ADMIN' ? 'QUOTE_ADMIN_REVISION' : (previous && String(previous.status)==='APPROVED' ? 'QUOTE_APPROVAL_INVALIDATED' : (version>1?'QUOTE_REVISION':'QUOTE_CREATE'));
    quotationApprovalAudit_(session,action,generated.id,{
      version:version,
      status:'NEEDS_APPROVAL',
      standard_amount:standard,
      proposed_amount:proposed,
      discount_rate:discountRate,
      previous_status:previous?String(previous.status||''):'',
      quote_type:retailMode?'RETAIL':'SOLUTION',
      configuration_description:retailMode?'':configurationDescription,
      revised_by:revisedBy,
      revision_note:revisionNote,
      commercial_model:policy.commercial_model,
      recommended_model:policy.recommended_model,
      policy_match:policy.policy_match,
      scale_program:policy.scale_program,
      scale_sessions_per_month:policy.scale_sessions_per_month,
      scale_4_amount:policy.scale_4_amount,
      scale_8_amount:policy.scale_8_amount
    });

    return {
      ok:true,
      quote_id:generated.id,
      quote_code:generated.display,
      version:version,
      status:'NEEDS_APPROVAL',
      exportable:false,
      created_by:originalCreator,
      display_name:session.display_name,
      region:originalRegion,
      standard_amount:standard,
      final_amount:proposed,
      configuration_description:configurationDescription,
      revised_by:revisedBy
    };
  } finally {
    lock.releaseLock();
  }
}

function quotationApprovalExportLogged_(session,request) {
  const bundle=quotationApprovalQuoteBundle_(session,request,true);
  const quote=bundle.quote || {};
  quotationApprovalAudit_(session,'QUOTE_EXPORT',String(quote.quote_id || request.quote_id || ''),{
    version:Number(quote.version||1),
    status:String(quote.status||''),
    client_name:String(quote.client_name||''),
    final_amount:quotationApprovalNumber_(quote.proposed_amount||quote.final_amount),
    exported_by:session.login_id,
    exported_at:new Date().toISOString()
  });
  return bundle;
}

function apiSessionQuotationApproval(token,action,payload) {
  const session=quotationApprovalSession_(token), request=payload||{};
  switch(String(action||'')) {
    case 'bootstrap': return {login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region,session_expires_at:session.expires_at,backend_version:QUOTATION_APPROVAL.VERSION+'-final',user:{login_id:session.login_id,display_name:session.display_name,role:session.role,region:session.region}};
    case 'catalog': return quotationApprovalCatalog_(session);
    case 'saveSnapshot': return quotationApprovalSave_(session,request);
    case 'getQuote': return quotationApprovalQuoteBundle_(session,request,false);
    case 'exportQuote': return quotationApprovalExportLogged_(session,request);
    case 'listQuotes': return quotationApprovalList_(session);
    case 'approveQuote': return quotationApprovalDecision_(session,request,true);
    case 'rejectQuote':
    case 'requestChanges': return quotationApprovalDecision_(session,request,false);
    case 'adminReviseQuote': return quotationApprovalAdminRevise_(session,request);
    default: throw new Error('Tác vụ Quotation không hợp lệ.');
  }
}
