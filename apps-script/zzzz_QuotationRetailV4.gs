// Retail & Repair V4 extension.
// Allows Regional Manager to propose CUSTOM lines only inside RETAIL quotes.
// Such lines remain fully approval-gated and are marked is_custom for Admin review/audit.
function quotationApprovalBuildLines_(session,payload) {
  const catalog=quotationApprovalInternalCatalog_(), byId={};
  catalog.forEach(function(item){ byId[item.item_id]=item; });
  const requested=Array.isArray(payload.lines)?payload.lines:[];
  if (!requested.length) throw new Error('Báo giá chưa có hạng mục.');
  const reason=String(payload.exception_reason || payload.notes || '').trim();
  const retailMode=String(payload.quote_type || '').trim().toUpperCase()==='RETAIL' || String(payload.combo_code || '').trim().toUpperCase()==='RETAIL_REPAIR';

  return requested.map(function(line,index){
    const itemId=String(line.item_id || line.code || '').trim();
    const quantity=quotationApprovalNumber_(line.qty !== undefined ? line.qty : line.quantity);
    if (!itemId || quantity<=0) throw new Error('Dòng báo giá không hợp lệ tại vị trí '+(index+1)+'.');

    let item=byId[itemId], isCustom=false, requestedLine=line;
    if (!item) {
      const requestedCustom=quotationApprovalYes_(line.is_custom) || /^CUSTOM_RETAIL_/i.test(itemId);
      const canProposeRetailCustom=retailMode && requestedCustom && (session.role==='REGIONAL_MANAGER' || session.role==='ADMIN');
      if (!canProposeRetailCustom && (session.role !== 'ADMIN' || !reason)) {
        throw new Error('Hạng mục tùy chỉnh cần Admin và lý do duyệt đặc biệt.');
      }
      const standard=quotationApprovalNumber_(line.standard_unit_price || line.recommended_price || line.unit_price || line.price || line.proposed_unit_price);
      const customName=String(line.name || '').trim();
      const customUnit=String(line.unit || '').trim();
      if (!customName) throw new Error('Hạng mục tùy chỉnh cần tên rõ ràng.');
      if (!customUnit) throw new Error('Hạng mục tùy chỉnh cần đơn vị tính.');
      if (!(standard>0)) throw new Error('Hạng mục tùy chỉnh cần đơn giá lớn hơn 0.');
      item={
        item_id:itemId,
        name:customName,
        unit:customUnit,
        recommended_price:standard,
        floor_price:standard,
        commercial_group:'CUSTOM',
        price_version_id:'CUSTOM_RETAIL_V4'
      };
      isCustom=true;
    }

    if (itemId==='SELF_DELIVERY_SCALE_FEE') {
      if (String(payload.commercial_model || '').toUpperCase()!=='SCALE') throw new Error('Dòng phí theo quy mô chỉ được dùng với mô hình SCALE.');
      const expected=quotationApprovalScaleFee_(payload.learner_count,payload.scale_sessions_per_month,payload.scale_program,byId);
      const sent=quotationApprovalNumber_(line.proposed_unit_price !== undefined ? line.proposed_unit_price : (line.unit_price !== undefined ? line.unit_price : line.price));
      if (sent>0 && Math.abs(sent-expected)>1) throw new Error('Phí theo quy mô không khớp công thức Backend. Hãy tải lại app và tính lại báo giá.');
      requestedLine=Object.assign({},line,{proposed_unit_price:expected,unit_price:expected,price:expected});
    }

    const checked=quotationApprovalValidateLine_(session,requestedLine,item,quantity,reason);
    return {
      line_no:index+1,
      item_id:item.item_id,
      item_name_snapshot:item.name,
      unit_snapshot:item.unit,
      unit_price_snapshot:checked.price,
      qty:quantity,
      discount_rate:checked.discount,
      line_total:Math.round(checked.price*quantity),
      pricing_rule_version:String(QUOTATION_APPROVAL.VERSION || '')+'+RETAIL-V4',
      source_price_version:item.price_version_id,
      commercial_group:item.commercial_group,
      standard_unit_price:checked.standard,
      proposed_unit_price:checked.price,
      floor_price_snapshot:checked.floor,
      exception_reason:reason,
      is_custom:isCustom
    };
  });
}
