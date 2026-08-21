const FAST_SHELL=Object.freeze({CACHE_SECONDS:60,KEY_PREFIX:'FAST_SHELL:'});

function apiSessionFastShell(sessionToken,action,payload){
  const user=authenticateSession_(sessionToken);payload=payload||{};
  if(String(action||'')!=='load')throw new Error('Tác vụ tải shell không hợp lệ.');
  const key=FAST_SHELL.KEY_PREFIX+String(user.user_id);
  const cache=CacheService.getScriptCache();
  if(!payload.force){const hit=cache.get(key);if(hit){try{return JSON.parse(hit);}catch(ignored){}}}
  const rows=outreachList_(user,{}).map(function(r){return {
    outreach_id:r.outreach_id||'',account_id:r.account_id||'',owner_user_id:r.owner_user_id||'',tinh_thanh:r.tinh_thanh||'',uu_tien:r.uu_tien||'',ten_truong:r.ten_truong||'',loai_hinh:r.loai_hinh||'',quan_he_sunbot:r.quan_he_sunbot||'',email_truong:r.email_truong||'',dien_thoai_dau_moi:r.dien_thoai_dau_moi||'',trang_thai_thuc_hien:r.trang_thai_thuc_hien||'',ngay_gui:r.ngay_gui||'',ngay_theo_doi_lai:r.ngay_theo_doi_lai||'',work_id:r.work_id||'',next_action:'',next_action_date:'',owner_name:''
  };});
  const summary=fastShellSummary_(rows);
  const result={rows:rows,summary:summary,dashboard:{},generated_at:now_(),needs_seed:rows.length===0,shell_only:true};
  try{cache.put(key,JSON.stringify(result),FAST_SHELL.CACHE_SECONDS);}catch(ignored){}
  return result;
}

function fastShellSummary_(rows){
  const counts={};(rows||[]).forEach(function(r){const s=String(r.trang_thai_thuc_hien||'');counts[s]=(counts[s]||0)+1;});
  const waiting=counts.DANG_CHO_PHAN_HOI||0;
  const todo=(counts.CAN_GUI||0)+(counts.CAN_XAC_MINH||0)+(counts.CAN_XAC_MINH_DU_LIEU||0)+(counts.TIEP_CAN_CHIEN_LUOC||0)+(counts.DANG_SOAN||0);
  return {total:(rows||[]).length,can_lam_hom_nay:todo,can_gui:counts.CAN_GUI||0,dang_cho_phan_hoi:waiting,da_phan_hoi:(counts.DA_PHAN_HOI||0)+(counts.DA_HEN_TRAO_DOI||0),overdue:0,missing_next_action:0,missing_next_date:0,pipeline:{todo:todo,waiting:waiting,responded:counts.DA_PHAN_HOI||0,meeting:counts.DA_HEN_TRAO_DOI||0,opportunity:counts.DA_TAO_CO_HOI||0,customer:counts.CHAM_SOC_ACCOUNT||0},by_owner:[],counts:counts};
}
