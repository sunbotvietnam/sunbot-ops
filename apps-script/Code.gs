const APP = Object.freeze({
  NAME: 'SUNBOT OPS',
  VERSION: '3.0-google',
  TZ: 'Asia/Ho_Chi_Minh',
  PROP_DB_ID: 'SUNBOT_OPS_DB_ID',
  PROP_ROOT_FOLDER_ID: 'SUNBOT_OPS_ROOT_FOLDER_ID',
  PROP_GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  PROP_INTELLIGENCE_TOKEN: 'INTELLIGENCE_TOKEN',
  SHEETS: {
    PEOPLE: 'NHAN_SU',
    ROLES: 'VAI_TRO',
    USER_ROLES: 'NHAN_SU_VAI_TRO',
    ROLE_PERMS: 'QUYEN_VAI_TRO',
    ACCOUNTS: 'TRUONG',
    OPPORTUNITIES: 'CO_HOI',
    TASKS: 'CONG_VIEC',
    UPDATES: 'CAP_NHAT',
    ISSUES: 'VAN_DE',
    RECEIVABLES: 'CONG_NO',
    WEEKLY: 'BAO_CAO_TUAN',
    AI_FEED: 'AI_FEED',
    AUDIT: 'AUDIT_LOG'
  }
});

const SCHEMA = Object.freeze({
  NHAN_SU: ['user_id','ho_ten','email','dia_ban','trang_thai','quan_ly_email','created_at','updated_at'],
  VAI_TRO: ['role_code','ten_vai_tro','mo_ta','trang_thai'],
  NHAN_SU_VAI_TRO: ['user_id','role_code','valid_from','valid_to'],
  QUYEN_VAI_TRO: ['role_code','permission_code','allowed'],
  TRUONG: ['account_id','ten_don_vi','loai_doi_tuong','tinh_thanh','quan_huyen','khoi_truong','owner_user_id','trang_thai','mo_hinh_hien_tai','mo_hinh_tiem_nang','nguoi_quyet_dinh','dien_thoai','viec_tiep_theo','han_viec_tiep_theo','cong_no_hien_tai','tai_san','updated_at'],
  CO_HOI: ['opp_id','account_id','owner_user_id','ten_co_hoi','san_pham','trang_thai','gia_tri_du_kien','xac_suat','nguon','viec_tiep_theo','han_viec_tiep_theo','updated_at'],
  CONG_VIEC: ['work_id','ten_cong_viec','owner_user_id','account_id','nhom_cong_viec','muc_uu_tien','trang_thai','han_hoan_thanh','hanh_dong_tiep','ngay_hanh_dong_tiep','can_ceo','noi_dung_can_ceo','ngay_hoan_thanh','created_at','updated_at'],
  CAP_NHAT: ['update_id','thoi_gian','user_id','account_id','work_id','loai_cap_nhat','trang_thai_truoc','trang_thai_moi','ket_qua','viec_tiep_theo','han','muc_do','can_ceo','noi_dung_can_ceo','bang_chung_url'],
  VAN_DE: ['issue_id','created_at','created_by_user_id','nhom_van_de','account_id','mo_ta','muc_do','can_ceo','de_nghi_ceo','owner_user_id','han_xu_ly','trang_thai','ket_qua_xu_ly','updated_at'],
  CONG_NO: ['receivable_id','account_id','owner_user_id','so_tien','han_thanh_toan','ngay_du_kien_ve','trang_thai','ho_so_con_thieu','ghi_chu','updated_at'],
  BAO_CAO_TUAN: ['report_id','user_id','tuan_tu','tuan_den','ket_qua_chinh','thay_doi_quan_trong','van_de_mo','uu_tien_tuan_toi','nhan_dinh','da_gui','submitted_at','created_at','updated_at'],
  AI_FEED: ['feed_id','timestamp','user_id','nhom_tin_hieu','doi_tuong','tin_hieu','muc_do','ceo_action','deadline','source_type','source_id'],
  AUDIT_LOG: ['audit_id','timestamp','user_id','action','entity_type','entity_id','detail_json']
});

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim();
  if (action === 'intelligence') return getIntelligenceHttp_(e);
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate().setTitle(APP.NAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getPublicConfig() {
  return {
    appName: APP.NAME,
    version: APP.VERSION,
    googleClientId: PropertiesService.getScriptProperties().getProperty(APP.PROP_GOOGLE_CLIENT_ID) || ''
  };
}

function api(idToken, action, payload) {
  const user = authenticate_(idToken);
  payload = payload || {};
  switch (action) {
    case 'bootstrap': return bootstrap_(user);
    case 'home': return home_(user);
    case 'accounts': return accounts_(user, payload);
    case 'tasks': return tasks_(user, payload);
    case 'quickUpdate': return quickUpdate_(user, payload);
    case 'weekly': return weekly_(user);
    case 'submitWeekly': return submitWeekly_(user, payload);
    case 'adminPeople': requirePermission_(user, 'admin.people'); return adminPeople_();
    case 'addPerson': requirePermission_(user, 'admin.people'); return addPerson_(user, payload);
    case 'setUserRoles': requirePermission_(user, 'admin.people'); return setUserRoles_(user, payload);
    default: throw new Error('Tác vụ không hợp lệ.');
  }
}

function authenticate_(idToken) {
  if (!idToken) throw new Error('Phiên đăng nhập không hợp lệ.');
  const clientId = PropertiesService.getScriptProperties().getProperty(APP.PROP_GOOGLE_CLIENT_ID);
  if (!clientId) throw new Error('Hệ thống chưa cấu hình Google Client ID.');

  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) throw new Error('Không xác minh được tài khoản Google.');
  const token = JSON.parse(res.getContentText());
  if (token.aud !== clientId || String(token.email_verified) !== 'true') throw new Error('Tài khoản Google không hợp lệ.');
  if (Number(token.exp || 0) * 1000 < Date.now()) throw new Error('Phiên đăng nhập đã hết hạn.');

  const row = findOne_(APP.SHEETS.PEOPLE, 'email', String(token.email).toLowerCase());
  if (!row || String(row.trang_thai).toUpperCase() !== 'ACTIVE') throw new Error('Tài khoản chưa được cấp quyền SUNBOT OPS.');
  const roles = activeRolesForUser_(row.user_id);
  const permissions = permissionsForRoles_(roles);
  return {user_id: row.user_id, ho_ten: row.ho_ten, email: row.email, dia_ban: row.dia_ban || '', roles, permissions};
}

function activeRolesForUser_(userId) {
  const today = new Date();
  return getAll_(APP.SHEETS.USER_ROLES).filter(r => {
    if (String(r.user_id) !== String(userId)) return false;
    const from = r.valid_from ? new Date(r.valid_from) : null;
    const to = r.valid_to ? new Date(r.valid_to) : null;
    return (!from || from <= today) && (!to || to >= today);
  }).map(r => String(r.role_code));
}

function permissionsForRoles_(roles) {
  const set = {};
  getAll_(APP.SHEETS.ROLE_PERMS).forEach(r => {
    if (roles.includes(String(r.role_code)) && String(r.allowed).toUpperCase() === 'TRUE') set[String(r.permission_code)] = true;
  });
  return set;
}

function requirePermission_(user, permission) {
  if (!user.permissions[permission]) throw new Error('Bạn không có quyền thực hiện thao tác này.');
}

function bootstrap_(user) {
  const roleNames = getAll_(APP.SHEETS.ROLES).filter(r => user.roles.includes(String(r.role_code))).map(r => r.ten_vai_tro);
  return {user: {...user, roleNames}, can: user.permissions};
}

function home_(user) {
  requirePermission_(user, 'dashboard.view');
  const today = startOfDay_(new Date());
  const seven = new Date(today); seven.setDate(seven.getDate() + 7);
  const rows = getAll_(APP.SHEETS.TASKS).filter(r => String(r.owner_user_id) === user.user_id && !['DONE','CANCELLED'].includes(String(r.trang_thai)));
  const overdue = rows.filter(r => { const d = parseDate_(r.han_hoan_thanh || r.ngay_hanh_dong_tiep); return d && d < today; });
  const due7 = rows.filter(r => { const d = parseDate_(r.han_hoan_thanh || r.ngay_hanh_dong_tiep); return d && d >= today && d <= seven; });
  const ceo = rows.filter(r => bool_(r.can_ceo));
  const priority = rows.sort(taskSort_).slice(0, 8).map(publicTask_);
  const receivables = getAll_(APP.SHEETS.RECEIVABLES).filter(r => String(r.owner_user_id) === user.user_id && String(r.trang_thai) !== 'PAID');
  const cash7 = receivables.reduce((sum, r) => { const d = parseDate_(r.ngay_du_kien_ve); return d && d >= today && d <= seven ? sum + Number(r.so_tien || 0) : sum; }, 0);
  return {summary:{open:rows.length, overdue:overdue.length, ceo:ceo.length, due7:due7.length, cash7}, priorityTasks:priority};
}

function accounts_(user, payload) {
  requirePermission_(user, 'account.view');
  const canAll = !!user.permissions['account.view_all'];
  let rows = getAll_(APP.SHEETS.ACCOUNTS);
  if (!canAll) rows = rows.filter(r => String(r.owner_user_id) === user.user_id);
  const q = String(payload.q || '').toLowerCase().trim();
  if (q) rows = rows.filter(r => [r.ten_don_vi,r.tinh_thanh,r.nguoi_quyet_dinh,r.trang_thai].join(' ').toLowerCase().includes(q));
  return rows.slice(0,200);
}

function tasks_(user, payload) {
  requirePermission_(user, 'task.view');
  let rows = getAll_(APP.SHEETS.TASKS).filter(r => user.permissions['task.view_all'] || String(r.owner_user_id) === user.user_id);
  const filter = String(payload.filter || 'DOING');
  const today = startOfDay_(new Date());
  if (filter === 'OVERDUE') rows = rows.filter(r => !['DONE','CANCELLED'].includes(String(r.trang_thai)) && parseDate_(r.han_hoan_thanh || r.ngay_hanh_dong_tiep) < today);
  else if (filter === 'WAITING') rows = rows.filter(r => String(r.trang_thai) === 'WAITING');
  else if (filter === 'DONE') rows = rows.filter(r => String(r.trang_thai) === 'DONE');
  else rows = rows.filter(r => ['OPEN','DOING'].includes(String(r.trang_thai)));
  return rows.sort(taskSort_).map(publicTask_);
}

function quickUpdate_(user, p) {
  requirePermission_(user, 'update.create');
  required_(p, ['loai_cap_nhat','ket_qua','viec_tiep_theo','han','muc_do']);
  const result = String(p.ket_qua).trim();
  if (result.length < 10 || ['đã gọi','dang follow','đang follow','đang theo dõi'].includes(result.toLowerCase())) throw new Error('Hãy ghi kết quả cụ thể, không ghi hoạt động hình thức.');
  const needCeo = String(p.muc_do) === 'CAN_CEO' || bool_(p.can_ceo);
  if (needCeo && !String(p.noi_dung_can_ceo || '').trim()) throw new Error('Hãy ghi rõ cần CEO quyết định/hỗ trợ việc gì.');

  const account = p.account_id ? findOne_(APP.SHEETS.ACCOUNTS,'account_id',p.account_id) : null;
  const updateId = id_('CN');
  append_(APP.SHEETS.UPDATES, {
    update_id:updateId, thoi_gian:now_(), user_id:user.user_id, account_id:p.account_id||'', work_id:p.work_id||'',
    loai_cap_nhat:p.loai_cap_nhat, trang_thai_truoc:account ? account.trang_thai : '', trang_thai_moi:p.trang_thai_moi||'',
    ket_qua:result, viec_tiep_theo:p.viec_tiep_theo, han:p.han, muc_do:p.muc_do, can_ceo:needCeo?'TRUE':'FALSE',
    noi_dung_can_ceo:p.noi_dung_can_ceo||'', bang_chung_url:p.bang_chung_url||''
  });

  if (account) updateById_(APP.SHEETS.ACCOUNTS,'account_id',account.account_id,{
    trang_thai:p.trang_thai_moi || account.trang_thai,
    viec_tiep_theo:p.viec_tiep_theo, han_viec_tiep_theo:p.han, updated_at:now_()
  });
  if (p.work_id) updateById_(APP.SHEETS.TASKS,'work_id',p.work_id,{hanh_dong_tiep:p.viec_tiep_theo,ngay_hanh_dong_tiep:p.han,can_ceo:needCeo?'TRUE':'FALSE',noi_dung_can_ceo:p.noi_dung_can_ceo||'',updated_at:now_()});
  if (needCeo) append_(APP.SHEETS.ISSUES,{issue_id:id_('VD'),created_at:now_(),created_by_user_id:user.user_id,nhom_van_de:p.loai_cap_nhat,account_id:p.account_id||'',mo_ta:result,muc_do:3,can_ceo:'TRUE',de_nghi_ceo:p.noi_dung_can_ceo||'',owner_user_id:user.user_id,han_xu_ly:p.han,trang_thai:'OPEN',ket_qua_xu_ly:'',updated_at:now_()});

  audit_(user,'CREATE','CAP_NHAT',updateId,p);
  rebuildAiFeedForUpdate_(user, updateId, p, account);
  return {ok:true,message:'Đã lưu cập nhật.'};
}

function weekly_(user) {
  requirePermission_(user, 'weekly.view');
  const s = startOfWeek_(new Date()), e = endOfWeek_(new Date());
  let row = getAll_(APP.SHEETS.WEEKLY).find(r => String(r.user_id) === user.user_id && date_(r.tuan_tu) === date_(s));
  if (!row) row = generateWeeklyForUser_(user.user_id, s, e);
  return row;
}

function submitWeekly_(user, p) {
  requirePermission_(user, 'weekly.submit');
  const row = findOne_(APP.SHEETS.WEEKLY,'report_id',p.report_id);
  if (!row || String(row.user_id) !== user.user_id) throw new Error('Không tìm thấy báo cáo hoặc không có quyền.');
  if (String(row.da_gui).toUpperCase() === 'TRUE') throw new Error('Báo cáo đã được gửi.');
  updateById_(APP.SHEETS.WEEKLY,'report_id',row.report_id,{uu_tien_tuan_toi:p.uu_tien_tuan_toi||row.uu_tien_tuan_toi,nhan_dinh:p.nhan_dinh||'',da_gui:'TRUE',submitted_at:now_(),updated_at:now_()});
  audit_(user,'SUBMIT','BAO_CAO_TUAN',row.report_id,{});
  return {ok:true,message:'Đã gửi báo cáo tuần.'};
}

function generateWeeklyForUser_(userId, s, e) {
  const updates = getAll_(APP.SHEETS.UPDATES).filter(r => String(r.user_id)===userId && between_(r.thoi_gian,s,e));
  const tasks = getAll_(APP.SHEETS.TASKS).filter(r => String(r.owner_user_id)===userId);
  const completed = tasks.filter(r => r.ngay_hoan_thanh && between_(r.ngay_hoan_thanh,s,e));
  const issues = getAll_(APP.SHEETS.ISSUES).filter(r => String(r.owner_user_id)===userId && String(r.trang_thai)!=='RESOLVED');
  const upcoming = tasks.filter(r => !['DONE','CANCELLED'].includes(String(r.trang_thai))).sort(taskSort_).slice(0,5);
  const row = {
    report_id:id_('BC'),user_id:userId,tuan_tu:date_(s),tuan_den:date_(e),
    ket_qua_chinh: completed.length ? completed.map(x=>'• '+x.ten_cong_viec).join('\n') : 'Chưa có công việc được ghi nhận hoàn thành.',
    thay_doi_quan_trong: updates.length ? updates.slice(-10).map(x=>'• '+x.ket_qua+(x.trang_thai_moi?' → '+x.trang_thai_moi:'')).join('\n') : 'Chưa có cập nhật đáng kể.',
    van_de_mo: issues.length ? issues.slice(0,8).map(x=>'• '+x.mo_ta).join('\n') : 'Không có vấn đề đang mở.',
    uu_tien_tuan_toi: upcoming.length ? upcoming.map(x=>'• '+(x.hanh_dong_tiep||x.ten_cong_viec)+(x.ngay_hanh_dong_tiep?' – '+date_(x.ngay_hanh_dong_tiep):'')).join('\n') : 'Chưa xác định.',
    nhan_dinh:'',da_gui:'FALSE',submitted_at:'',created_at:now_(),updated_at:now_()
  };
  append_(APP.SHEETS.WEEKLY,row); return row;
}

function triggerWeeklyDrafts() {
  const s=startOfWeek_(new Date()), e=endOfWeek_(new Date());
  getAll_(APP.SHEETS.PEOPLE).filter(r=>String(r.trang_thai).toUpperCase()==='ACTIVE').forEach(p=>{
    const exists=getAll_(APP.SHEETS.WEEKLY).some(r=>String(r.user_id)===String(p.user_id)&&date_(r.tuan_tu)===date_(s));
    if(!exists) generateWeeklyForUser_(String(p.user_id),s,e);
  });
}

function adminPeople_() {
  const roles = getAll_(APP.SHEETS.ROLES);
  return getAll_(APP.SHEETS.PEOPLE).map(p => ({...p, roles: activeRolesForUser_(String(p.user_id))}));
}

function addPerson_(actor,p) {
  required_(p,['ho_ten','email']);
  const email=String(p.email).toLowerCase().trim();
  if(findOne_(APP.SHEETS.PEOPLE,'email',email)) throw new Error('Email đã tồn tại.');
  const id=id_('NS');
  append_(APP.SHEETS.PEOPLE,{user_id:id,ho_ten:p.ho_ten,email,dia_ban:p.dia_ban||'',trang_thai:'ACTIVE',quan_ly_email:p.quan_ly_email||'',created_at:now_(),updated_at:now_()});
  (p.roles||['TEACHER']).forEach(role=>append_(APP.SHEETS.USER_ROLES,{user_id:id,role_code:role,valid_from:date_(new Date()),valid_to:''}));
  audit_(actor,'CREATE','NHAN_SU',id,p); return {ok:true,user_id:id};
}

function setUserRoles_(actor,p) {
  required_(p,['user_id']);
  const roles=Array.isArray(p.roles)?p.roles:[];
  const sh=getSheet_(APP.SHEETS.USER_ROLES), headers=headers_(sh), rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues():[];
  const keep=rows.filter(row=>String(row[headers.indexOf('user_id')])!==String(p.user_id));
  sh.getRange(2,1,Math.max(sh.getMaxRows()-1,1),headers.length).clearContent();
  if(keep.length) sh.getRange(2,1,keep.length,headers.length).setValues(keep);
  roles.forEach(role=>append_(APP.SHEETS.USER_ROLES,{user_id:p.user_id,role_code:role,valid_from:date_(new Date()),valid_to:''}));
  audit_(actor,'SET_ROLES','NHAN_SU',p.user_id,{roles}); return {ok:true};
}

function rebuildAiFeedForUpdate_(user, updateId, p, account) {
  const subject = account ? account.ten_don_vi : (p.loai_cap_nhat || 'Cập nhật nội bộ');
  const severity = String(p.muc_do)==='CAN_CEO'?'HIGH':String(p.muc_do)==='QUAN_TRONG'?'MEDIUM':'LOW';
  append_(APP.SHEETS.AI_FEED,{feed_id:id_('AI'),timestamp:now_(),user_id:user.user_id,nhom_tin_hieu:mapSignalType_(p.loai_cap_nhat),doi_tuong:subject,tin_hieu:p.ket_qua,muc_do:severity,ceo_action:p.noi_dung_can_ceo||'',deadline:p.han||'',source_type:'CAP_NHAT',source_id:updateId});
}

function getIntelligenceHttp_(e) {
  const expected=PropertiesService.getScriptProperties().getProperty(APP.PROP_INTELLIGENCE_TOKEN)||'';
  const token=String((e.parameter&&e.parameter.token)||'');
  if(!expected||token!==expected) return json_({ok:false,error:'Unauthorized'});
  const sinceHours=Math.max(1,Math.min(168,Number((e.parameter&&e.parameter.hours)||24)));
  const since=new Date(Date.now()-sinceHours*3600*1000);
  const rows=getAll_(APP.SHEETS.AI_FEED).filter(r=>{const d=parseDate_(r.timestamp);return d&&d>=since;});
  const out={generated_at:now_(),ceo_attention:[],market_changes:[],cash_signals:[],execution_risks:[],deadlines:[]};
  rows.forEach(r=>{
    const item={person:userName_(r.user_id),subject:r.doi_tuong,signal:r.tin_hieu,severity:r.muc_do,ceo_action:r.ceo_action,deadline:r.deadline,source_id:r.source_id};
    if(r.ceo_action||r.muc_do==='HIGH') out.ceo_attention.push(item);
    if(r.nhom_tin_hieu==='MARKET') out.market_changes.push(item);
    if(r.nhom_tin_hieu==='CASH') out.cash_signals.push(item);
    if(r.nhom_tin_hieu==='EXECUTION') out.execution_risks.push(item);
    if(r.deadline) out.deadlines.push(item);
  });
  return json_(out);
}

function setupSystem(ownerEmail) {
  ownerEmail=String(ownerEmail||'').toLowerCase().trim();
  if(!ownerEmail) throw new Error('Cần truyền email chủ hệ thống, ví dụ setupSystem("tuongvan1906@gmail.com").');
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty(APP.PROP_DB_ID)) throw new Error('Hệ thống đã được khởi tạo.');

  const root=DriveApp.createFolder('SUNBOT OPS');
  ['00_SYSTEM','01_TRUONG_DOI_TAC','02_HO_SO_THANH_TOAN','03_DE_XUAT_HOP_DONG','04_MINH_CHUNG','05_BAO_CAO','99_BACKUP'].forEach(n=>root.createFolder(n));
  const ss=SpreadsheetApp.create('SUNBOT_OPS_DATABASE');
  const f=DriveApp.getFileById(ss.getId()); root.getFoldersByName('00_SYSTEM').next().addFile(f); DriveApp.getRootFolder().removeFile(f);
  props.setProperty(APP.PROP_DB_ID,ss.getId()); props.setProperty(APP.PROP_ROOT_FOLDER_ID,root.getId());

  Object.keys(SCHEMA).forEach((name,i)=>createSheet_(ss,name,SCHEMA[name],i===0));
  seedRolesAndPermissions_();
  const uid=id_('NS');
  append_(APP.SHEETS.PEOPLE,{user_id:uid,ho_ten:'CEO / Quản trị',email:ownerEmail,dia_ban:'Hà Nội',trang_thai:'ACTIVE',quan_ly_email:'',created_at:now_(),updated_at:now_()});
  append_(APP.SHEETS.USER_ROLES,{user_id:uid,role_code:'CEO',valid_from:date_(new Date()),valid_to:''});
  append_(APP.SHEETS.USER_ROLES,{user_id:uid,role_code:'ADMIN',valid_from:date_(new Date()),valid_to:''});
  installTriggers_();
  return {databaseUrl:ss.getUrl(),rootFolderUrl:root.getUrl(),message:'Khởi tạo SUNBOT OPS thành công.'};
}

function configureSecrets(googleClientId, intelligenceToken) {
  if(!googleClientId) throw new Error('Thiếu Google Client ID.');
  const props=PropertiesService.getScriptProperties();
  props.setProperty(APP.PROP_GOOGLE_CLIENT_ID,String(googleClientId).trim());
  props.setProperty(APP.PROP_INTELLIGENCE_TOKEN,String(intelligenceToken||Utilities.getUuid()).trim());
  return true;
}

function seedRolesAndPermissions_() {
  const roles=[['TEACHER','Giáo viên','Giảng dạy và nhiệm vụ được giao'],['MARKET','Phát triển thị trường','Trường, cơ hội, đối tác'],['TRAINER','Trainer','Đào tạo/chuyển giao'],['SALE_OPS','Sale Operations','Thị trường, hồ sơ, công nợ'],['OPS_ADMIN','Vận hành – tài liệu','Đầu ra, tài liệu, vận hành'],['REGION_LEAD','Quản lý vùng','Quản lý địa bàn'],['CEO','CEO','Điều hành toàn hệ thống'],['ADMIN','Quản trị hệ thống','Quản lý người dùng và cấu hình']];
  roles.forEach(r=>append_(APP.SHEETS.ROLES,{role_code:r[0],ten_vai_tro:r[1],mo_ta:r[2],trang_thai:'ACTIVE'}));
  const base=['dashboard.view','update.create','task.view','account.view','weekly.view','weekly.submit'];
  ['TEACHER','MARKET','TRAINER','SALE_OPS','OPS_ADMIN','REGION_LEAD'].forEach(role=>base.forEach(p=>appendPerm_(role,p)));
  ['dashboard.view','update.create','task.view','task.view_all','account.view','account.view_all','weekly.view','weekly.submit','ceo.view'].forEach(p=>appendPerm_('CEO',p));
  ['dashboard.view','update.create','task.view','task.view_all','account.view','account.view_all','weekly.view','weekly.submit','ceo.view','admin.people'].forEach(p=>appendPerm_('ADMIN',p));
}

function appendPerm_(role,p){append_(APP.SHEETS.ROLE_PERMS,{role_code:role,permission_code:p,allowed:'TRUE'});}
function installTriggers_(){ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='triggerWeeklyDrafts')ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger('triggerWeeklyDrafts').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(8).create();}
function createSheet_(ss,name,headers,useFirst){let sh;if(useFirst){sh=ss.getSheets()[0];sh.setName(name);sh.clear();}else{sh=ss.insertSheet(name);}sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);sh.getRange(1,1,1,headers.length).setBackground('#17365D').setFontColor('#FFFFFF').setFontWeight('bold');sh.autoResizeColumns(1,headers.length);}
function getDb_(){const id=PropertiesService.getScriptProperties().getProperty(APP.PROP_DB_ID);if(!id)throw new Error('Chưa khởi tạo database.');return SpreadsheetApp.openById(id);}
function getSheet_(name){const sh=getDb_().getSheetByName(name);if(!sh)throw new Error('Thiếu sheet '+name);return sh;}
function headers_(sh){return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];}
function getAll_(name){const sh=getSheet_(name);if(sh.getLastRow()<2)return[];const h=headers_(sh);return sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues().map(row=>Object.fromEntries(h.map((k,i)=>[k,row[i]])));}
function append_(name,obj){const sh=getSheet_(name),h=headers_(sh);sh.appendRow(h.map(k=>obj[k]!==undefined?obj[k]:''));return obj;}
function findOne_(name,key,val){return getAll_(name).find(r=>String(r[key]).toLowerCase()===String(val).toLowerCase())||null;}
function updateById_(name,key,val,patch){const sh=getSheet_(name),h=headers_(sh),col=h.indexOf(key);if(col<0)throw new Error('Thiếu khóa '+key);if(sh.getLastRow()<2)return false;const ids=sh.getRange(2,col+1,sh.getLastRow()-1,1).getValues().flat();const idx=ids.findIndex(x=>String(x)===String(val));if(idx<0)return false;const rn=idx+2,row=sh.getRange(rn,1,1,h.length).getValues()[0];h.forEach((k,i)=>{if(Object.prototype.hasOwnProperty.call(patch,k))row[i]=patch[k];});sh.getRange(rn,1,1,h.length).setValues([row]);return true;}
function audit_(user,action,type,id,detail){append_(APP.SHEETS.AUDIT,{audit_id:id_('AU'),timestamp:now_(),user_id:user.user_id,action,entity_type:type,entity_id:id,detail_json:JSON.stringify(detail||{})});}
function required_(o,keys){const m=keys.filter(k=>o[k]===undefined||o[k]===null||String(o[k]).trim()==='');if(m.length)throw new Error('Thiếu thông tin bắt buộc: '+m.join(', '));}
function bool_(v){return v===true||String(v).toUpperCase()==='TRUE'||String(v).toLowerCase()==='có';}
function id_(p){return p+Utilities.formatDate(new Date(),APP.TZ,'yyyyMMddHHmmss')+Math.floor(Math.random()*900+100);}
function now_(){return Utilities.formatDate(new Date(),APP.TZ,'yyyy-MM-dd HH:mm:ss');}
function date_(d){if(!d)return'';const x=d instanceof Date?d:new Date(d);return Utilities.formatDate(x,APP.TZ,'yyyy-MM-dd');}
function parseDate_(v){if(!v)return null;const d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?null:d;}
function between_(v,s,e){const d=parseDate_(v);return !!(d&&d>=s&&d<=e);}
function startOfDay_(d){const x=new Date(d);x.setHours(0,0,0,0);return x;}
function startOfWeek_(d){const x=startOfDay_(d),day=x.getDay(),diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);return x;}
function endOfWeek_(d){const x=startOfWeek_(d);x.setDate(x.getDate()+5);x.setHours(23,59,59,999);return x;}
function taskSort_(a,b){const da=parseDate_(a.han_hoan_thanh||a.ngay_hanh_dong_tiep)||new Date('2999-12-31'),db=parseDate_(b.han_hoan_thanh||b.ngay_hanh_dong_tiep)||new Date('2999-12-31');return da-db;}
function publicTask_(t){return {work_id:t.work_id,ten_cong_viec:t.ten_cong_viec,account_id:t.account_id,nhom_cong_viec:t.nhom_cong_viec,muc_uu_tien:t.muc_uu_tien,trang_thai:t.trang_thai,han_hoan_thanh:date_(t.han_hoan_thanh),hanh_dong_tiep:t.hanh_dong_tiep,ngay_hanh_dong_tiep:date_(t.ngay_hanh_dong_tiep),can_ceo:bool_(t.can_ceo)};}
function mapSignalType_(type){if(type==='CONG_NO')return'CASH';if(type==='THI_TRUONG')return'MARKET';if(['VAN_HANH','TAI_LIEU','CHUONG_TRINH'].includes(type))return'EXECUTION';return'OTHER';}
function userName_(id){const r=findOne_(APP.SHEETS.PEOPLE,'user_id',id);return r?r.ho_ten:'';}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
