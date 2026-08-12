function apiSessionTimeline(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchema_();
  payload = payload || {};
  switch(String(action||'')){
    case 'get': return schoolTimeline_(user,payload);
    case 'opportunityFromDiscovery': return opportunityFromDiscovery_(user,payload);
    default: throw new Error('Tác vụ lịch sử trường không hợp lệ.');
  }
}

function timelineRow_(user,p){
  required_(p,['outreach_id']);
  const row=findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  return row;
}

function schoolTimeline_(user,p){
  const row=timelineRow_(user,p);
  const accountId=String(row.account_id||'');
  const history=[];
  getAll_('CAP_NHAT').filter(function(x){return accountId && String(x.account_id||'')===accountId;}).forEach(function(x){
    history.push({time:String(x.thoi_gian||''),type:String(x.loai_cap_nhat||'CAP_NHAT'),title:timelineTitle_(x.loai_cap_nhat),detail:String(x.ket_qua||''),next:String(x.viec_tiep_theo||''),due:String(x.han||''),evidence:String(x.bang_chung_url||'')});
  });
  const sh=getDb_().getSheetByName(ENGAGEMENT.DISCOVERY_SHEET);
  let discoveries=[];
  if(sh){discoveries=getAll_(ENGAGEMENT.DISCOVERY_SHEET).filter(function(x){return String(x.outreach_id||'')===String(row.outreach_id);});discoveries.forEach(function(x){history.push({time:String(x.completed_at||x.updated_at||''),type:'DISCOVERY',title:'Hoàn thành khám phá nhu cầu',detail:'Người trao đổi: '+String(x.nguoi_trao_doi||'')+'. Mục tiêu: '+String(x.muc_tieu||'')+'. Cấu hình quan tâm: '+String(x.cau_hinh_quan_tam||'')+'.',next:String(x.buoc_tiep_theo||''),due:'',evidence:''});});}
  history.sort(function(a,b){return String(b.time).localeCompare(String(a.time));});
  const upcoming=getAll_('CONG_VIEC').filter(function(t){return accountId && String(t.account_id||'')===accountId && !['DONE','CANCELLED'].includes(String(t.trang_thai||''));}).sort(function(a,b){return String(a.han_hoan_thanh||a.ngay_hanh_dong_tiep||'').localeCompare(String(b.han_hoan_thanh||b.ngay_hanh_dong_tiep||''));}).slice(0,10).map(function(t){return {work_id:t.work_id,title:t.ten_cong_viec,due:t.han_hoan_thanh||t.ngay_hanh_dong_tiep,status:t.trang_thai,next:t.hanh_dong_tiep||''};});
  const opportunities=getAll_('CO_HOI').filter(function(o){return accountId && String(o.account_id||'')===accountId && String(o.trang_thai||'')!=='LOST';});
  discoveries.sort(function(a,b){return String(b.completed_at||'').localeCompare(String(a.completed_at||''));});
  const latest=discoveries[0]||null;
  return {outreach:row,history:history.slice(0,60),upcoming:upcoming,opportunities:opportunities,latest_discovery:latest,funnel_stage:timelineStage_(row,latest,opportunities)};
}

function timelineTitle_(type){
  const t=String(type||'');
  return ({GUI_LOI_KET_NOI:'Đã gửi lời kết nối',DAT_LICH_TRAO_DOI:'Đã đặt lịch trao đổi',HOAN_THANH_DISCOVERY:'Đã hoàn thành Discovery',TIEP_CAN_TRUONG:'Cập nhật tiếp cận trường',GUI_TAI_LIEU:'Đã gửi tài liệu'})[t]||'Cập nhật';
}

function timelineStage_(row,discovery,opps){
  if(opps&&opps.length){const o=opps[0];return {code:String(o.trang_thai||'DISCOVERY'),label:timelineOpportunityStageLabel_(o.trang_thai)};}
  if(discovery)return {code:'DISCOVERY_DONE',label:'Đã xác định nhu cầu'};
  const s=String(row.trang_thai_thuc_hien||'');
  const map={CAN_GUI:'Chưa tiếp cận',CAN_XAC_MINH:'Đang chuẩn bị',CAN_XAC_MINH_DU_LIEU:'Đang chuẩn bị',TIEP_CAN_CHIEN_LUOC:'Đang chuẩn bị tiếp cận',DANG_SOAN:'Đang soạn lời kết nối',DANG_CHO_PHAN_HOI:'Đã gửi lời kết nối',DA_PHAN_HOI:'Đã có trao đổi sơ bộ',DA_HEN_TRAO_DOI:'Đã đặt lịch',DA_TAO_CO_HOI:'Đã tạo cơ hội',THEO_DOI:'Theo dõi',TAM_DUNG:'Tạm dừng',CHAM_SOC_ACCOUNT:'Đang hợp tác'};
  return {code:s,label:map[s]||s||'Chưa xác định'};
}
function timelineOpportunityStageLabel_(s){return ({TARGET:'Mục tiêu',CONTACTED:'Đã tiếp cận',DISCOVERY:'Đang làm rõ nhu cầu',PROPOSAL:'Đã gửi đề xuất',NEGOTIATION:'Đàm phán',WON:'Đã chốt',HOLD:'Theo dõi'})[String(s||'')]||String(s||'Cơ hội');}

function opportunityFromDiscovery_(user,p){
  const row=timelineRow_(user,p);
  const accountId=String(row.account_id||'');
  const existing=getAll_('CO_HOI').find(function(o){return accountId&&String(o.account_id||'')===accountId&&!['LOST','WON'].includes(String(o.trang_thai||''));});
  if(existing)return {ok:true,existing:true,opp_id:existing.opp_id,message:'Trường đã có cơ hội đang mở; hệ thống không tạo trùng.'};
  const sh=getDb_().getSheetByName(ENGAGEMENT.DISCOVERY_SHEET);
  if(!sh)throw new Error('Chưa có dữ liệu Discovery cho trường này.');
  const rows=getAll_(ENGAGEMENT.DISCOVERY_SHEET).filter(function(x){return String(x.outreach_id||'')===String(row.outreach_id);});
  rows.sort(function(a,b){return String(b.completed_at||'').localeCompare(String(a.completed_at||''));});
  const d=rows[0];if(!d)throw new Error('Hãy hoàn thành buổi khám phá nhu cầu trước khi tạo cơ hội.');
  let product=String(d.cau_hinh_quan_tam||'').trim();
  if(!product||/chưa xác định/i.test(product))product='Sunbot – cần chốt cấu hình';
  const next=String(d.buoc_tiep_theo||'Chuẩn bị phương án phù hợp theo kết quả Discovery.');
  const due=String(row.ngay_theo_doi_lai||dateOutreach_(addBusinessDaysOutreach_(new Date(),2)));
  const result=outreachCreateOpportunity_(user,{outreach_id:row.outreach_id,ten_co_hoi:'Phương án Sunbot – '+row.ten_truong,san_pham:product,gia_tri_du_kien:0,viec_tiep_theo:next,han_viec_tiep_theo:due});
  append_('CAP_NHAT',{update_id:id_('CN'),thoi_gian:now_(),user_id:user.user_id,account_id:accountId,opp_id:result.opp_id||'',work_id:row.work_id||'',loai_cap_nhat:'TAO_CO_HOI_TU_DISCOVERY',trang_thai_truoc:'DA_PHAN_HOI',trang_thai_moi:'DA_TAO_CO_HOI',ket_qua:'Đã chuyển kết quả Discovery thành cơ hội: '+product+'.',viec_tiep_theo:next,han:due,muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:''});
  audit_(user,'OPPORTUNITY_FROM_DISCOVERY','CO_HOI',result.opp_id||'',{outreach_id:row.outreach_id,discovery_id:d.discovery_id||''});
  return {ok:true,existing:false,opp_id:result.opp_id,message:'Đã tạo cơ hội từ kết quả Discovery mà không cần nhập lại.'};
}
