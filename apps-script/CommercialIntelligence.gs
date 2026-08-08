const COMMERCIAL = Object.freeze({
  SIGNALS: 'THI_TRUONG_TIN_HIEU',
  COMPETITORS: 'DOI_THU',
  OFFERS: 'CHAO_BAN_THI_TRUONG',
  OPPORTUNITIES: 'CO_HOI',
  TASKS: 'CONG_VIEC',
  UPDATES: 'CAP_NHAT',
  ACCOUNTS: 'TRUONG',
  RECEIVABLES: 'CONG_NO',
  AI_FEED: 'AI_FEED',
  AUDIT: 'AUDIT_LOG'
});

function apiSessionCommercial(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  ensureCommercialRuntimeSchema_();
  payload = payload || {};
  switch (action) {
    case 'opportunities': return commercialOpportunities_(user, payload);
    case 'createOpportunity': return commercialCreateOpportunity_(user, payload);
    case 'updateOpportunityStage': return commercialUpdateOpportunityStage_(user, payload);
    case 'marketSignals': return commercialMarketSignals_(user, payload);
    case 'createMarketSignal': return commercialCreateMarketSignal_(user, payload);
    case 'reviewMarketSignal': return commercialReviewMarketSignal_(user, payload);
    case 'marketOverview': return commercialMarketOverview_(user, payload);
    case 'kpi': return commercialKpi_(user, payload);
    default: throw new Error('Tác vụ Commercial Intelligence không hợp lệ.');
  }
}

function ensureCommercialRuntimeSchema_() {
  const ss = getDb_();
  const checks = {CO_HOI:['expected_cash_date','lost_reason'],CONG_VIEC:['opp_id'],CAP_NHAT:['opp_id']};
  Object.keys(checks).forEach(name=>{
    const sh=ss.getSheetByName(name); if(!sh) throw new Error('Database thiếu sheet '+name);
    const hs=headers_(sh).map(String); const missing=checks[name].filter(h=>!hs.includes(h));
    if(missing.length) throw new Error(name+' thiếu cột Commercial Intelligence: '+missing.join(', '));
  });
  [COMMERCIAL.SIGNALS,COMMERCIAL.COMPETITORS,COMMERCIAL.OFFERS].forEach(name=>{if(!ss.getSheetByName(name))throw new Error('Database thiếu sheet Commercial Intelligence: '+name);});
}

function commercialOpportunities_(user, p) {
  requirePermission_(user, 'account.view');
  let rows = getAll_(COMMERCIAL.OPPORTUNITIES);
  const canAll = !!user.permissions['account.view_all'] || !!user.permissions['task.view_all'] || !!user.permissions['ceo.view'];
  if (!canAll) rows = rows.filter(r => String(r.owner_user_id) === String(user.user_id));
  if (p.account_id) rows = rows.filter(r => String(r.account_id) === String(p.account_id));
  if (p.stage) rows = rows.filter(r => String(r.trang_thai) === String(p.stage));
  return rows.slice(0, 300);
}

function commercialCreateOpportunity_(user, p) {
  requirePermission_(user, 'update.create');
  required_(p, ['account_id','ten_co_hoi','san_pham']);
  const account = findOne_(COMMERCIAL.ACCOUNTS, 'account_id', p.account_id);
  if (!account) throw new Error('Không tìm thấy trường/đơn vị.');
  const canAll = !!user.permissions['account.view_all'] || !!user.permissions['ceo.view'];
  if (!canAll && String(account.owner_user_id) !== String(user.user_id)) throw new Error('Bạn không phụ trách trường/đơn vị này.');
  const oppId = id_('OPP');
  const stage = String(p.trang_thai || 'TARGET').toUpperCase();
  const allowed = ['TARGET','CONTACTED','DISCOVERY','PROPOSAL','NEGOTIATION','WON','LOST','HOLD'];
  if (!allowed.includes(stage)) throw new Error('Stage cơ hội không hợp lệ.');
  const row = {opp_id:oppId,account_id:p.account_id,owner_user_id:p.owner_user_id||user.user_id,ten_co_hoi:String(p.ten_co_hoi).trim(),san_pham:String(p.san_pham).trim(),trang_thai:stage,gia_tri_du_kien:Number(p.gia_tri_du_kien||0),xac_suat:p.xac_suat===undefined||p.xac_suat===''?defaultProbabilityForStage_(stage):Number(p.xac_suat),nguon:p.nguon||'',viec_tiep_theo:p.viec_tiep_theo||'',han_viec_tiep_theo:p.han_viec_tiep_theo||'',expected_cash_date:p.expected_cash_date||'',lost_reason:'',updated_at:now_()};
  append_(COMMERCIAL.OPPORTUNITIES,row);
  if(p.viec_tiep_theo&&p.han_viec_tiep_theo) append_(COMMERCIAL.TASKS,{work_id:id_('WORK'),ten_cong_viec:p.viec_tiep_theo,owner_user_id:row.owner_user_id,account_id:row.account_id,opp_id:oppId,nhom_cong_viec:'KINH_DOANH',muc_uu_tien:p.muc_uu_tien||'2',trang_thai:'OPEN',han_hoan_thanh:p.han_viec_tiep_theo,hanh_dong_tiep:p.viec_tiep_theo,ngay_hanh_dong_tiep:p.han_viec_tiep_theo,can_ceo:'FALSE',noi_dung_can_ceo:'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()});
  audit_(user,'CREATE','CO_HOI',oppId,row); return {ok:true,opp_id:oppId,message:'Đã tạo cơ hội.'};
}

function commercialUpdateOpportunityStage_(user,p){
  requirePermission_(user,'update.create'); required_(p,['opp_id','trang_thai','ket_qua','viec_tiep_theo','han']);
  const opp=findOne_(COMMERCIAL.OPPORTUNITIES,'opp_id',p.opp_id); if(!opp)throw new Error('Không tìm thấy cơ hội.');
  const canAll=!!user.permissions['account.view_all']||!!user.permissions['task.view_all']||!!user.permissions['ceo.view']; if(!canAll&&String(opp.owner_user_id)!==String(user.user_id))throw new Error('Bạn không phụ trách cơ hội này.');
  const next=String(p.trang_thai).toUpperCase(), allowed=['TARGET','CONTACTED','DISCOVERY','PROPOSAL','NEGOTIATION','WON','LOST','HOLD']; if(!allowed.includes(next))throw new Error('Stage cơ hội không hợp lệ.'); if(next==='LOST'&&!String(p.lost_reason||'').trim())throw new Error('Cơ hội LOST phải có lý do.');
  updateById_(COMMERCIAL.OPPORTUNITIES,'opp_id',opp.opp_id,{trang_thai:next,xac_suat:p.xac_suat===undefined||p.xac_suat===''?defaultProbabilityForStage_(next):Number(p.xac_suat),viec_tiep_theo:p.viec_tiep_theo,han_viec_tiep_theo:p.han,expected_cash_date:p.expected_cash_date||opp.expected_cash_date||'',lost_reason:next==='LOST'?String(p.lost_reason||'').trim():'',updated_at:now_()});
  const updateId=id_('CN');
  append_(COMMERCIAL.UPDATES,{update_id:updateId,thoi_gian:now_(),user_id:user.user_id,account_id:opp.account_id||'',work_id:p.work_id||'',loai_cap_nhat:'CO_HOI',trang_thai_truoc:opp.trang_thai||'',trang_thai_moi:next,ket_qua:String(p.ket_qua).trim(),viec_tiep_theo:p.viec_tiep_theo,han:p.han,muc_do:p.muc_do||'BINH_THUONG',can_ceo:bool_(p.can_ceo)?'TRUE':'FALSE',noi_dung_can_ceo:p.noi_dung_can_ceo||'',bang_chung_url:p.bang_chung_url||'',opp_id:opp.opp_id});
  append_(COMMERCIAL.TASKS,{work_id:id_('WORK'),ten_cong_viec:p.viec_tiep_theo,owner_user_id:opp.owner_user_id||user.user_id,account_id:opp.account_id||'',opp_id:opp.opp_id,nhom_cong_viec:'KINH_DOANH',muc_uu_tien:p.muc_uu_tien||'2',trang_thai:'OPEN',han_hoan_thanh:p.han,hanh_dong_tiep:p.viec_tiep_theo,ngay_hanh_dong_tiep:p.han,can_ceo:bool_(p.can_ceo)?'TRUE':'FALSE',noi_dung_can_ceo:p.noi_dung_can_ceo||'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()});
  audit_(user,'STAGE_CHANGE','CO_HOI',opp.opp_id,{from:opp.trang_thai,to:next,update_id:updateId}); return {ok:true,message:'Đã cập nhật stage và việc tiếp theo.'};
}

function commercialCreateMarketSignal_(user,p){
  requirePermission_(user,'update.create'); required_(p,['raw_signal','source_type']);
  const sourceType=String(p.source_type).toUpperCase(), allowed=['TAN_MAT_THAY','NGUOI_TRONG_TRUONG_NOI','THAY_TREN_MANG','TAI_LIEU_ANH_DUOC_GUI','NGHE_KE','KHAC']; if(!allowed.includes(sourceType))throw new Error('Loại nguồn tín hiệu không hợp lệ.');
  const signalId=id_('SIG'); const row={signal_id:signalId,captured_at:now_(),user_id:user.user_id,account_id:p.account_id||'',competitor_id:p.competitor_id||'',offer_id:p.offer_id||'',raw_signal:String(p.raw_signal).trim(),source_type:sourceType,source_person:p.source_person||'',evidence_url:p.evidence_url||'',needs_verification:p.needs_verification===false?'FALSE':'TRUE',review_status:'CHUA_REVIEW',verified_fact:'',confidence:'',reviewed_by_user_id:'',reviewed_at:'',created_at:now_(),updated_at:now_()};
  append_(COMMERCIAL.SIGNALS,row); audit_(user,'CREATE','THI_TRUONG_TIN_HIEU',signalId,{source_type:sourceType,account_id:row.account_id,competitor_id:row.competitor_id}); return {ok:true,signal_id:signalId,message:'Đã ghi nhận tín hiệu thị trường. Tín hiệu chưa được coi là fact cho tới khi review.'};
}

function commercialMarketSignals_(user,p){requirePermission_(user,'dashboard.view');let rows=getAll_(COMMERCIAL.SIGNALS);const canAll=!!user.permissions['account.view_all']||!!user.permissions['ceo.view']||!!user.permissions['admin.people'];if(!canAll)rows=rows.filter(r=>String(r.user_id)===String(user.user_id));if(p.review_status)rows=rows.filter(r=>String(r.review_status)===String(p.review_status));return rows.slice(-300).reverse();}

function commercialReviewMarketSignal_(user,p){
  if(!(user.permissions['ceo.view']||user.permissions['account.view_all']||user.permissions['admin.people']))throw new Error('Bạn không có quyền review intelligence.'); required_(p,['signal_id','review_status']);
  const signal=findOne_(COMMERCIAL.SIGNALS,'signal_id',p.signal_id);if(!signal)throw new Error('Không tìm thấy tín hiệu.');const status=String(p.review_status).toUpperCase(),allowed=['CHUA_REVIEW','DU_CAN_CU','CAN_XAC_MINH_THEM','KHONG_DUNG'];if(!allowed.includes(status))throw new Error('Trạng thái review không hợp lệ.');if(status==='DU_CAN_CU')required_(p,['verified_fact','confidence']);
  updateById_(COMMERCIAL.SIGNALS,'signal_id',signal.signal_id,{review_status:status,verified_fact:p.verified_fact||'',confidence:p.confidence||'',reviewed_by_user_id:user.user_id,reviewed_at:now_(),updated_at:now_()});
  if(status==='DU_CAN_CU'&&p.verified_fact){const subject=competitorName_(signal.competitor_id)||accountName_(signal.account_id)||'Thị trường';append_(COMMERCIAL.AI_FEED,{feed_id:id_('AI'),timestamp:now_(),user_id:user.user_id,nhom_tin_hieu:'MARKET',doi_tuong:subject,tin_hieu:String(p.verified_fact).trim(),muc_do:p.severity||'MEDIUM',ceo_action:p.ceo_action||'',deadline:p.deadline||'',source_type:'THI_TRUONG_TIN_HIEU',source_id:signal.signal_id});}
  audit_(user,'REVIEW','THI_TRUONG_TIN_HIEU',signal.signal_id,{review_status:status,confidence:p.confidence||''});return {ok:true,message:'Đã review tín hiệu.'};
}

function commercialMarketOverview_(user,p){requirePermission_(user,'dashboard.view');const competitors=getAll_(COMMERCIAL.COMPETITORS),offers=getAll_(COMMERCIAL.OFFERS),signals=getAll_(COMMERCIAL.SIGNALS);const canAll=!!user.permissions['account.view_all']||!!user.permissions['ceo.view']||!!user.permissions['admin.people'];const visibleSignals=canAll?signals:signals.filter(r=>String(r.user_id)===String(user.user_id));return {summary:{competitors:competitors.length,offers:offers.length,signals:visibleSignals.length,pendingReview:visibleSignals.filter(r=>String(r.review_status)==='CHUA_REVIEW').length},competitors:competitors.slice(0,100),offers:offers.slice(0,100),signals:visibleSignals.slice(-50).reverse()};}

function commercialKpi_(user,p){
  requirePermission_(user,'dashboard.view');const canAll=!!user.permissions['task.view_all']||!!user.permissions['account.view_all']||!!user.permissions['ceo.view'];const targetUser=p.user_id&&canAll?String(p.user_id):String(user.user_id);const days=Math.max(7,Math.min(90,Number(p.days||7)));const end=new Date(),start=new Date();start.setDate(start.getDate()-days+1);start.setHours(0,0,0,0);
  const accounts=getAll_(COMMERCIAL.ACCOUNTS).filter(r=>String(r.owner_user_id)===targetUser),updates=getAll_(COMMERCIAL.UPDATES).filter(r=>String(r.user_id)===targetUser&&between_(r.thoi_gian,start,end)),validUpdates=updates.filter(r=>String(r.ket_qua||'').trim()&&String(r.viec_tiep_theo||'').trim()&&String(r.han||'').trim()),touched={};validUpdates.forEach(r=>{if(r.account_id)touched[String(r.account_id)]=true;});
  const tasks=getAll_(COMMERCIAL.TASKS).filter(r=>String(r.owner_user_id)===targetUser&&!['DONE','CANCELLED'].includes(String(r.trang_thai))),today=startOfDay_(new Date()),overdue=tasks.filter(r=>{const d=parseDate_(r.han_hoan_thanh||r.ngay_hanh_dong_tiep);return d&&d<today;}),opportunities=getAll_(COMMERCIAL.OPPORTUNITIES).filter(r=>String(r.owner_user_id)===targetUser),proposals=opportunities.filter(r=>String(r.trang_thai)==='PROPOSAL').length,wins=opportunities.filter(r=>String(r.trang_thai)==='WON').length,expectedCash=opportunities.filter(r=>!['LOST','HOLD'].includes(String(r.trang_thai))).reduce((s,r)=>s+Number(r.gia_tri_du_kien||0)*(Number(r.xac_suat||0)/100),0),signals=getAll_(COMMERCIAL.SIGNALS).filter(r=>String(r.user_id)===targetUser&&between_(r.captured_at,start,end)),acceptedSignals=signals.filter(r=>String(r.review_status)==='DU_CAN_CU').length;
  return {period:{days,from:date_(start),to:date_(end)},schoolCoverage:{owned:accounts.length,touched:Object.keys(touched).length,rate:accounts.length?Math.round(Object.keys(touched).length*100/accounts.length):0},workEvidence:{updates:updates.length,valid:validUpdates.length,validRate:updates.length?Math.round(validUpdates.length*100/updates.length):100},followup:{open:tasks.length,overdue:overdue.length,onTimeRate:tasks.length?Math.round((tasks.length-overdue.length)*100/tasks.length):100},pipeline:{total:opportunities.length,proposals,wins,expectedCash:Math.round(expectedCash)},intelligence:{signals:signals.length,accepted:acceptedSignals}};
}

function defaultProbabilityForStage_(stage){return ({TARGET:10,CONTACTED:20,DISCOVERY:35,PROPOSAL:55,NEGOTIATION:75,WON:100,LOST:0,HOLD:10})[String(stage)]||0;}
function competitorName_(id){if(!id)return'';const r=findOne_(COMMERCIAL.COMPETITORS,'competitor_id',id);return r?r.ten_don_vi:'';}
function accountName_(id){if(!id)return'';const r=findOne_(COMMERCIAL.ACCOUNTS,'account_id',id);return r?r.ten_don_vi:'';}
