const ENGAGEMENT = Object.freeze({
  DISCOVERY_SHEET:'KHAM_PHA_NHU_CAU',
  DISCOVERY_HEADERS:['discovery_id','account_id','outreach_id','user_id','started_at','completed_at','nguoi_trao_doi','vai_tro','loai_hinh','quan_he','muc_tieu','cau_hinh_quan_tam','mo_hinh_giao_vien','quy_mo_bat_dau','thoi_diem','nguoi_quyet_dinh','buoc_tiep_theo','answers_json','ghi_chu','updated_at']
});

function apiSessionEngagement(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchema_();
  ensureDiscoverySheet_();
  payload = payload || {};
  switch(String(action||'')){
    case 'prepareMeeting': return engagementPrepareMeeting_(user,payload);
    case 'logMeeting': return engagementLogMeeting_(user,payload);
    case 'saveDiscovery': return engagementSaveDiscovery_(user,payload);
    case 'latestDiscovery': return engagementLatestDiscovery_(user,payload);
    default: throw new Error('Tác vụ trao đổi nhu cầu không hợp lệ.');
  }
}

function ensureDiscoverySheet_(){
  const ss=getDb_();
  let sh=ss.getSheetByName(ENGAGEMENT.DISCOVERY_SHEET);
  if(!sh){sh=ss.insertSheet(ENGAGEMENT.DISCOVERY_SHEET);sh.getRange(1,1,1,ENGAGEMENT.DISCOVERY_HEADERS.length).setValues([ENGAGEMENT.DISCOVERY_HEADERS]);sh.setFrozenRows(1);}
  const headers=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String):[];
  ENGAGEMENT.DISCOVERY_HEADERS.forEach(function(h){if(!headers.includes(h)){sh.getRange(1,sh.getLastColumn()+1).setValue(h);}});
  return sh;
}

function engagementRow_(user,p){
  required_(p,['outreach_id']);
  const row=findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  return row;
}

function engagementPrepareMeeting_(user,p){
  const row=engagementRow_(user,p);
  const profile=/tư|private|hệ thống/i.test(String(row.loai_hinh||'')) ? SALES_JOURNEY.ASSETS.PROFILE_PRIVATE.url : SALES_JOURNEY.ASSETS.PROFILE_PUBLIC.url;
  return {
    outreach_id:row.outreach_id,
    title:'Trao đổi phương án Sunbot – ' + row.ten_truong,
    duration_minutes:40,
    timezone:'Asia/Ho_Chi_Minh',
    attendee_email:String(row.email_truong||''),
    description:'Mục tiêu buổi trao đổi:\n1. Sunbot giới thiệu ngắn 5–7 phút về cách triển khai hiện nay.\n2. Tìm hiểu nhu cầu, điều kiện và mục tiêu của nhà trường.\n3. Xác định 1–2 hướng phù hợp và bước tiếp theo.\n\nHồ sơ số: '+profile+'\n\nViệc trao đổi ban đầu không tạo ra cam kết tài chính hoặc nghĩa vụ triển khai.'
  };
}

function engagementLogMeeting_(user,p){
  const row=engagementRow_(user,p);
  required_(p,['start_local']);
  const start=String(p.start_local||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start))throw new Error('Hãy chọn ngày và giờ trao đổi.');
  const date=start.slice(0,10);
  const workId=id_('WORK');
  append_('CONG_VIEC',{
    work_id:workId,ten_cong_viec:'Trao đổi nhu cầu 40 phút – '+row.ten_truong,owner_user_id:row.owner_user_id||user.user_id,account_id:row.account_id||'',opp_id:'',nhom_cong_viec:'TIEP_CAN_TRUONG',muc_uu_tien:priorityCode_(row.uu_tien),trang_thai:'OPEN',han_hoan_thanh:date,hanh_dong_tiep:'Thực hiện buổi trao đổi 40 phút và hoàn thành Phiếu khám phá nhu cầu.',ngay_hanh_dong_tiep:date,can_ceo:'FALSE',noi_dung_can_ceo:'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()
  });
  const updateId=id_('CN');
  append_('CAP_NHAT',{
    update_id:updateId,thoi_gian:now_(),user_id:user.user_id,account_id:row.account_id||'',opp_id:'',work_id:workId,loai_cap_nhat:'DAT_LICH_TRAO_DOI',trang_thai_truoc:String(row.trang_thai_thuc_hien||''),trang_thai_moi:'DA_HEN_TRAO_DOI',ket_qua:'Đã đặt lịch trao đổi online 40 phút lúc '+start.replace('T',' ') ,viec_tiep_theo:'Thực hiện Discovery theo Phiếu khám phá nhu cầu',han:date,muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:''
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{trang_thai_thuc_hien:'DA_HEN_TRAO_DOI',ngay_theo_doi_lai:date,work_id:workId,updated_at:now_()});
  audit_(user,'BOOK_40_MIN_MEETING',OUTREACH.SHEET,row.outreach_id,{start_local:start,work_id:workId});
  try{CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX+String(user.user_id));}catch(ignored){}
  return {ok:true,message:'Đã ghi nhận lịch trao đổi 40 phút.',work_id:workId};
}

function engagementSaveDiscovery_(user,p){
  const row=engagementRow_(user,p);
  const a=p.answers||{};
  const respondent=String(a.nguoi_trao_doi||'').trim();
  if(!respondent)throw new Error('Hãy ghi người đang trao đổi với Sunbot.');
  const goals=toDiscoveryText_(a.muc_tieu);
  const next=String(a.buoc_tiep_theo||'').trim();
  if(!goals)throw new Error('Hãy chọn ít nhất một mục tiêu của nhà trường.');
  if(!next)throw new Error('Hãy chọn bước tiếp theo sau buổi trao đổi.');
  const discoveryId=id_('DISC');
  append_(ENGAGEMENT.DISCOVERY_SHEET,{
    discovery_id:discoveryId,account_id:row.account_id||'',outreach_id:row.outreach_id,user_id:user.user_id,started_at:String(p.started_at||now_()),completed_at:now_(),nguoi_trao_doi:respondent,vai_tro:String(a.vai_tro||''),loai_hinh:String(a.loai_hinh||row.loai_hinh||''),quan_he:String(a.quan_he||journeyScenario_(row)),muc_tieu:goals,cau_hinh_quan_tam:String(a.cau_hinh_quan_tam||''),mo_hinh_giao_vien:String(a.mo_hinh_giao_vien||''),quy_mo_bat_dau:String(a.quy_mo_bat_dau||''),thoi_diem:String(a.thoi_diem||''),nguoi_quyet_dinh:toDiscoveryText_(a.nguoi_quyet_dinh),buoc_tiep_theo:next,answers_json:JSON.stringify(a),ghi_chu:String(a.ghi_chu||''),updated_at:now_()
  });
  const updateId=id_('CN');
  append_('CAP_NHAT',{
    update_id:updateId,thoi_gian:now_(),user_id:user.user_id,account_id:row.account_id||'',opp_id:'',work_id:row.work_id||'',loai_cap_nhat:'HOAN_THANH_DISCOVERY',trang_thai_truoc:String(row.trang_thai_thuc_hien||''),trang_thai_moi:'DA_PHAN_HOI',ket_qua:'Đã hoàn thành trao đổi nhu cầu. Mục tiêu: '+goals+'. Cấu hình quan tâm: '+String(a.cau_hinh_quan_tam||'Chưa xác định')+'.',viec_tiep_theo:next,han:String(a.han_buoc_tiep_theo||dateOutreach_(addBusinessDaysOutreach_(new Date(),2))),muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:''
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{trang_thai_thuc_hien:'DA_PHAN_HOI',ket_qua_phan_hoi:'Đã hoàn thành Discovery: '+goals,hanh_dong_de_xuat:next,ngay_theo_doi_lai:String(a.han_buoc_tiep_theo||dateOutreach_(addBusinessDaysOutreach_(new Date(),2))),updated_at:now_()});
  if(row.account_id){try{updateById_('TRUONG','account_id',row.account_id,{viec_tiep_theo:next,han_viec_tiep_theo:String(a.han_buoc_tiep_theo||dateOutreach_(addBusinessDaysOutreach_(new Date(),2))),updated_at:now_()});}catch(ignored){}}
  audit_(user,'COMPLETE_DISCOVERY',ENGAGEMENT.DISCOVERY_SHEET,discoveryId,{outreach_id:row.outreach_id,next:next});
  try{CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX+String(user.user_id));}catch(ignored){}
  return {ok:true,message:'Đã lưu Phiếu khám phá nhu cầu và bước tiếp theo.',discovery_id:discoveryId};
}

function engagementLatestDiscovery_(user,p){
  const row=engagementRow_(user,p);
  const rows=getAll_(ENGAGEMENT.DISCOVERY_SHEET).filter(function(r){return String(r.outreach_id)===String(row.outreach_id);});
  rows.sort(function(a,b){return String(b.completed_at||'').localeCompare(String(a.completed_at||''));});
  return rows[0]||null;
}

function toDiscoveryText_(v){return Array.isArray(v)?v.filter(Boolean).join(' | '):String(v||'').trim();}
