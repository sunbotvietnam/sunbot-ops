const ENGAGEMENT = Object.freeze({
  DISCOVERY_SHEET:'KHAM_PHA_NHU_CAU',
  DISCOVERY_HEADERS:[
    'discovery_id','account_id','outreach_id','user_id','started_at','completed_at',
    'nguoi_trao_doi','vai_tro','loai_hinh','quan_he','muc_tieu','cau_hinh_quan_tam',
    'mo_hinh_giao_vien','quy_mo_bat_dau','thoi_diem','nguoi_quyet_dinh','need_statement',
    'need_confirmed','outcome_code','fit_level','buoc_tiep_theo','han_buoc_tiep_theo',
    'reentry_date','intelligence_value','market_intelligence_json','answers_json','ghi_chu','updated_at'
  ]
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
  if(!sh){
    sh=ss.insertSheet(ENGAGEMENT.DISCOVERY_SHEET);
    sh.getRange(1,1,1,ENGAGEMENT.DISCOVERY_HEADERS.length).setValues([ENGAGEMENT.DISCOVERY_HEADERS]);
    sh.setFrozenRows(1);
  }
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
  const privateSchool=/tư|private|hệ thống/i.test(String(row.loai_hinh||''));
  const profile=privateSchool ? SALES_JOURNEY.ASSETS.PROFILE_PRIVATE.url : SALES_JOURNEY.ASSETS.PROFILE_PUBLIC.url;
  const audience=privateSchool?'private':'public';
  const catalogue='https://sunbotvietnam.github.io/portal/catalogue/?audience='+audience+'&guided=1&from=sunbot_ops&school='+encodeURIComponent(String(row.ten_truong||''));
  return {
    outreach_id:row.outreach_id,
    school_name:String(row.ten_truong||''),
    title:'Trao đổi nhu cầu & phương án Sunbot – ' + row.ten_truong,
    duration_minutes:40,
    timezone:'Asia/Ho_Chi_Minh',
    attendee_email:String(row.email_truong||''),
    profile_url:profile,
    catalogue_url:catalogue,
    description:[
      'Mục tiêu buổi trao đổi 30–40 phút:',
      '1. Hiểu ngắn bối cảnh và ưu tiên hiện tại của Nhà trường.',
      '2. Dùng E-profile để tạo ngôn ngữ chung về Sunbot (không trình bày toàn bộ).',
      '3. Dùng Catalogue để giúp Nhà trường hình dung các lựa chọn triển khai.',
      '4. Khám phá nhu cầu có hướng dẫn và phản chiếu lại Need Statement để xác nhận.',
      '5. Thống nhất một bước tiếp theo rõ ràng, có người phụ trách và thời điểm.',
      '',
      'E-profile: '+profile,
      'Catalogue: '+catalogue,
      '',
      'Buổi trao đổi ban đầu nhằm xác định mức độ phù hợp hai chiều, không tạo cam kết tài chính hoặc nghĩa vụ triển khai.'
    ].join('\n')
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
    work_id:workId,ten_cong_viec:'Trao đổi nhu cầu 40 phút – '+row.ten_truong,
    owner_user_id:row.owner_user_id||user.user_id,account_id:row.account_id||'',opp_id:'',
    nhom_cong_viec:'TIEP_CAN_TRUONG',muc_uu_tien:priorityCode_(row.uu_tien),trang_thai:'OPEN',
    han_hoan_thanh:date,hanh_dong_tiep:'Thực hiện Meeting Mode: E-profile → Catalogue → Discovery → xác nhận nhu cầu → bước tiếp theo.',
    ngay_hanh_dong_tiep:date,can_ceo:'FALSE',noi_dung_can_ceo:'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()
  });
  append_('CAP_NHAT',{
    update_id:id_('CN'),thoi_gian:now_(),user_id:user.user_id,account_id:row.account_id||'',opp_id:'',work_id:workId,
    loai_cap_nhat:'DAT_LICH_TRAO_DOI',trang_thai_truoc:String(row.trang_thai_thuc_hien||''),trang_thai_moi:'DA_HEN_TRAO_DOI',
    ket_qua:'Đã đặt lịch trao đổi online 40 phút lúc '+start.replace('T',' '),
    viec_tiep_theo:'Thực hiện Meeting Mode và hoàn thành khám phá nhu cầu',han:date,muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:''
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{trang_thai_thuc_hien:'DA_HEN_TRAO_DOI',ngay_theo_doi_lai:date,work_id:workId,updated_at:now_()});
  audit_(user,'BOOK_40_MIN_MEETING',OUTREACH.SHEET,row.outreach_id,{start_local:start,work_id:workId});
  invalidateEngagementCache_(user);
  return {ok:true,message:'Đã ghi nhận lịch trao đổi 40 phút.',work_id:workId};
}

function engagementSaveDiscovery_(user,p){
  const row=engagementRow_(user,p);
  const a=p.answers||{};
  const respondent=String(a.nguoi_trao_doi||'').trim();
  if(!respondent)throw new Error('Hãy ghi người đang trao đổi với Sunbot.');
  const goals=toDiscoveryText_(a.muc_tieu);
  const next=String(a.buoc_tiep_theo||'').trim();
  if(!goals)throw new Error('Hãy chọn ít nhất một mục tiêu của Nhà trường.');
  if(!next)throw new Error('Hãy chọn bước tiếp theo sau buổi trao đổi.');

  const due=String(a.han_buoc_tiep_theo||a.reentry_date||dateOutreach_(addBusinessDaysOutreach_(new Date(),2)));
  const need=String(a.need_statement||'').trim() || buildNeedStatement_(row,a,goals);
  const outcome=String(a.outcome_code||'MORE_DISCOVERY').trim();
  const fit=String(a.fit_level||'CHUA_XAC_DINH').trim();
  const intelligence=normalizeMarketIntelligence_(a.market_intelligence||{});
  const intelligenceValue=hasIntelligence_(intelligence)?'CO_GIA_TRI':'CHUA_GHI_NHAN';
  const discoveryId=id_('DISC');

  append_(ENGAGEMENT.DISCOVERY_SHEET,{
    discovery_id:discoveryId,account_id:row.account_id||'',outreach_id:row.outreach_id,user_id:user.user_id,
    started_at:String(p.started_at||now_()),completed_at:now_(),nguoi_trao_doi:respondent,vai_tro:String(a.vai_tro||''),
    loai_hinh:String(a.loai_hinh||row.loai_hinh||''),quan_he:String(a.quan_he||journeyScenario_(row)),muc_tieu:goals,
    cau_hinh_quan_tam:String(a.cau_hinh_quan_tam||''),mo_hinh_giao_vien:String(a.mo_hinh_giao_vien||''),
    quy_mo_bat_dau:String(a.quy_mo_bat_dau||''),thoi_diem:String(a.thoi_diem||''),nguoi_quyet_dinh:toDiscoveryText_(a.nguoi_quyet_dinh),
    need_statement:need,need_confirmed:bool_(a.need_confirmed)?'TRUE':'FALSE',outcome_code:outcome,fit_level:fit,
    buoc_tiep_theo:next,han_buoc_tiep_theo:due,reentry_date:String(a.reentry_date||''),intelligence_value:intelligenceValue,
    market_intelligence_json:JSON.stringify(intelligence),answers_json:JSON.stringify(a),ghi_chu:String(a.ghi_chu||''),updated_at:now_()
  });

  completePriorMeetingTask_(row);
  const nextWorkId=createDiscoveryNextTask_(user,row,next,due,outcome);
  const newStatus=outreachStatusAfterDiscovery_(outcome);

  append_('CAP_NHAT',{
    update_id:id_('CN'),thoi_gian:now_(),user_id:user.user_id,account_id:row.account_id||'',opp_id:'',work_id:nextWorkId,
    loai_cap_nhat:'HOAN_THANH_DISCOVERY',trang_thai_truoc:String(row.trang_thai_thuc_hien||''),trang_thai_moi:newStatus,
    ket_qua:'Đã hoàn thành trao đổi nhu cầu. Need Statement: '+need,
    viec_tiep_theo:next,han:due,muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:''
  });

  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{
    trang_thai_thuc_hien:newStatus,ket_qua_phan_hoi:'Discovery: '+need,hanh_dong_de_xuat:next,ngay_theo_doi_lai:due,work_id:nextWorkId,updated_at:now_()
  });
  if(row.account_id){
    try{updateById_('TRUONG','account_id',row.account_id,{viec_tiep_theo:next,han_viec_tiep_theo:due,updated_at:now_()});}catch(ignored){}
  }

  const signalId=appendDiscoveryMarketSignal_(user,row,respondent,a,intelligence,need,outcome);
  audit_(user,'COMPLETE_DISCOVERY',ENGAGEMENT.DISCOVERY_SHEET,discoveryId,{
    outreach_id:row.outreach_id,outcome_code:outcome,fit_level:fit,next:next,due:due,next_work_id:nextWorkId,market_signal_id:signalId||''
  });
  invalidateEngagementCache_(user);
  return {
    ok:true,
    message:'Đã lưu nhu cầu, intelligence và tạo việc tiếp theo trong Sunbot Ops.',
    discovery_id:discoveryId,
    work_id:nextWorkId,
    need_statement:need,
    outcome_code:outcome,
    market_signal_id:signalId||''
  };
}

function engagementLatestDiscovery_(user,p){
  const row=engagementRow_(user,p);
  const rows=getAll_(ENGAGEMENT.DISCOVERY_SHEET).filter(function(r){return String(r.outreach_id)===String(row.outreach_id);});
  rows.sort(function(a,b){return String(b.completed_at||'').localeCompare(String(a.completed_at||''));});
  return rows[0]||null;
}

function buildNeedStatement_(row,a,goals){
  const parts=[];
  parts.push('Nhà trường ưu tiên '+goals.replace(/ \| /g,', ').toLowerCase());
  if(String(a.quy_mo_bat_dau||'').trim()&&!/^Chưa/i.test(String(a.quy_mo_bat_dau)))parts.push('dự kiến bắt đầu ở '+String(a.quy_mo_bat_dau).toLowerCase());
  if(String(a.mo_hinh_giao_vien||'').trim()&&!/^Chưa/i.test(String(a.mo_hinh_giao_vien)))parts.push('mô hình giáo viên: '+String(a.mo_hinh_giao_vien).toLowerCase());
  if(String(a.cau_hinh_quan_tam||'').trim()&&!/^Chưa/i.test(String(a.cau_hinh_quan_tam)))parts.push('hướng chuyên môn: '+String(a.cau_hinh_quan_tam));
  if(String(a.thoi_diem||'').trim()&&!/^Chưa/i.test(String(a.thoi_diem)))parts.push('thời điểm: '+String(a.thoi_diem).toLowerCase());
  return parts.join('; ')+'.';
}

function createDiscoveryNextTask_(user,row,next,due,outcome){
  const workId=id_('WORK');
  append_('CONG_VIEC',{
    work_id:workId,ten_cong_viec:next+' – '+row.ten_truong,owner_user_id:row.owner_user_id||user.user_id,
    account_id:row.account_id||'',opp_id:'',nhom_cong_viec:'TIEP_CAN_TRUONG',muc_uu_tien:priorityCode_(row.uu_tien),
    trang_thai:'OPEN',han_hoan_thanh:due,hanh_dong_tiep:next,ngay_hanh_dong_tiep:due,can_ceo:'FALSE',noi_dung_can_ceo:'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()
  });
  return workId;
}

function completePriorMeetingTask_(row){
  const oldId=String(row.work_id||'').trim();
  if(!oldId)return;
  try{
    const old=findOne_('CONG_VIEC','work_id',oldId);
    if(old&&!['DONE','CANCELLED'].includes(String(old.trang_thai||''))){
      updateById_('CONG_VIEC','work_id',oldId,{trang_thai:'DONE',ngay_hoan_thanh:date_(new Date()),updated_at:now_()});
    }
  }catch(ignored){}
}

function outreachStatusAfterDiscovery_(outcome){
  const code=String(outcome||'');
  if(['NURTURE','COMPETITOR_IN_PLACE','BLOCKED'].includes(code))return 'THEO_DOI';
  if(code==='NOT_FIT')return 'TAM_DUNG';
  return 'DA_PHAN_HOI';
}

function normalizeMarketIntelligence_(m){
  m=m||{};
  return {
    current_vendor:String(m.current_vendor||'').trim(),
    current_solution:String(m.current_solution||'').trim(),
    price_or_fee:String(m.price_or_fee||'').trim(),
    main_barrier:String(m.main_barrier||'').trim(),
    reason_not_now:String(m.reason_not_now||'').trim(),
    market_signal:String(m.market_signal||'').trim(),
    reentry_trigger:String(m.reentry_trigger||'').trim()
  };
}

function hasIntelligence_(m){
  return Object.keys(m||{}).some(function(k){return String(m[k]||'').trim();});
}

function appendDiscoveryMarketSignal_(user,row,respondent,a,intelligence,need,outcome){
  if(!hasIntelligence_(intelligence))return '';
  try{
    const sh=getDb_().getSheetByName('THI_TRUONG_TIN_HIEU');
    if(!sh)return '';
    const signalId=id_('SIG');
    const pieces=[];
    if(intelligence.current_vendor)pieces.push('Nhà cung cấp/đối thủ hiện tại: '+intelligence.current_vendor);
    if(intelligence.current_solution)pieces.push('Giải pháp đang dùng: '+intelligence.current_solution);
    if(intelligence.price_or_fee)pieces.push('Mức phí/cách thu được chia sẻ: '+intelligence.price_or_fee);
    if(intelligence.main_barrier)pieces.push('Rào cản chính: '+intelligence.main_barrier);
    if(intelligence.reason_not_now)pieces.push('Lý do chưa triển khai: '+intelligence.reason_not_now);
    if(intelligence.market_signal)pieces.push('Tín hiệu thực địa: '+intelligence.market_signal);
    if(intelligence.reentry_trigger)pieces.push('Điều kiện quay lại: '+intelligence.reentry_trigger);
    append_('THI_TRUONG_TIN_HIEU',{
      signal_id:signalId,captured_at:now_(),user_id:user.user_id,account_id:row.account_id||'',competitor_id:'',offer_id:'',
      raw_signal:'Trao đổi với '+respondent+' tại '+row.ten_truong+'. '+pieces.join('. '),source_type:'NGUOI_TRONG_TRUONG_NOI',source_person:respondent,
      evidence_url:'',needs_verification:'TRUE',review_status:'CHUA_REVIEW',verified_fact:'',confidence:'',reviewed_by_user_id:'',reviewed_at:'',created_at:now_(),updated_at:now_()
    });
    return signalId;
  }catch(ignored){return '';}
}

function invalidateEngagementCache_(user){
  try{CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX+String(user.user_id));}catch(ignored){}
}

function toDiscoveryText_(v){return Array.isArray(v)?v.filter(Boolean).join(' | '):String(v||'').trim();}
