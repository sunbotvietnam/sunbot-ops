function apiSessionOutreachWorkspaceSafe(sessionToken, action, payload) {
  const user=authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchemaSafe_();
  payload=payload||{};
  switch(String(action||'')){
    case 'detail': return outreachWorkspaceDetail_(user,payload);
    case 'save': return outreachWorkspaceSaveCanonical_(user,payload);
    case 'reassign': return outreachWorkspaceReassign_(user,payload);
    case 'scheduleFollowup': return outreachWorkspaceScheduleFollowup_(user,payload);
    case 'completeTask': return outreachWorkspaceCompleteTask_(user,payload);
    case 'people': return outreachWorkspacePeople_(user);
    default: throw new Error('Tác vụ hồ sơ trường không hợp lệ.');
  }
}

function outreachWorkspaceSaveCanonical_(user,p){
  required_(p,['outreach_id']);
  const row=findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  const patch={updated_at:now_()};
  if(p.email_truong!==undefined){const email=String(p.email_truong||'').trim().toLowerCase();if(email&&!isPlainEmail_(email))throw new Error('Email trường không hợp lệ.');patch.email_truong=email;}
  if(p.dien_thoai_dau_moi!==undefined)patch.dien_thoai_dau_moi=String(p.dien_thoai_dau_moi||'').trim();
  if(p.dia_chi_thu_tin!==undefined)patch.dia_chi_thu_tin=String(p.dia_chi_thu_tin||'').trim();
  if(p.hanh_dong_de_xuat!==undefined)patch.hanh_dong_de_xuat=String(p.hanh_dong_de_xuat||'').trim();
  if(p.thong_diep_de_xuat!==undefined)patch.thong_diep_de_xuat=String(p.thong_diep_de_xuat||'').trim();
  if(p.ket_qua_phan_hoi!==undefined)patch.ket_qua_phan_hoi=String(p.ket_qua_phan_hoi||'').trim();
  if(p.ngay_theo_doi_lai!==undefined)patch.ngay_theo_doi_lai=String(p.ngay_theo_doi_lai||'').trim();

  if(patch.email_truong&&['CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU'].includes(String(row.trang_thai_thuc_hien||''))){
    if(row.work_id){try{updateById_('CONG_VIEC','work_id',row.work_id,{trang_thai:'DONE',ngay_hoan_thanh:dateOutreach_(new Date()),updated_at:now_()});}catch(ignored){}}
    const due=dateOutreach_(addBusinessDaysOutreach_(new Date(),2));
    const newWorkId=id_('WORK');
    append_('CONG_VIEC',{work_id:newWorkId,ten_cong_viec:'Soạn và gửi hồ sơ tới '+row.ten_truong,owner_user_id:row.owner_user_id||user.user_id,account_id:row.account_id||'',opp_id:'',nhom_cong_viec:'TIEP_CAN_TRUONG',muc_uu_tien:priorityCode_(row.uu_tien),trang_thai:'OPEN',han_hoan_thanh:due,hanh_dong_tiep:'Soạn lời kết nối phù hợp và gửi hồ sơ số.',ngay_hanh_dong_tiep:due,can_ceo:'FALSE',noi_dung_can_ceo:'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()});
    patch.trang_thai_thuc_hien='CAN_GUI';patch.work_id=newWorkId;patch.hanh_dong_de_xuat='Soạn lời kết nối phù hợp và gửi hồ sơ số.';patch.ngay_theo_doi_lai=due;
  }

  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,patch);
  if(row.account_id){
    const accountPatch={updated_at:now_()};
    if(patch.dien_thoai_dau_moi!==undefined)accountPatch.dien_thoai=patch.dien_thoai_dau_moi;
    if(patch.hanh_dong_de_xuat!==undefined)accountPatch.viec_tiep_theo=patch.hanh_dong_de_xuat;
    if(patch.ngay_theo_doi_lai!==undefined)accountPatch.han_viec_tiep_theo=patch.ngay_theo_doi_lai;
    try{updateById_('TRUONG','account_id',row.account_id,accountPatch);}catch(ignored){}
  }
  audit_(user,'WORKSPACE_SAVE',OUTREACH.SHEET,row.outreach_id,Object.assign({},patch,{source_writeback:false}));
  try{CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX+String(user.user_id));}catch(ignored){}
  const advanced=patch.trang_thai_thuc_hien==='CAN_GUI'&&patch.trang_thai_thuc_hien!==row.trang_thai_thuc_hien;
  return {ok:true,message:advanced?'Đã xác minh contact và tạo việc gửi hồ sơ.':'Đã lưu thông tin trường.'};
}
