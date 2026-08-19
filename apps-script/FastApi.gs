const FAST_API = Object.freeze({ CACHE_SECONDS: 90, KEY_PREFIX: 'FAST_BOOT:' });

function apiSessionFast(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  payload = payload || {};
  switch (String(action || '')) {
    case 'load': return fastLoad_(user, payload);
    case 'outreach': return fastOutreach_(user, payload);
    case 'tasks': return fastTasks_(user, payload);
    case 'invalidate': return fastInvalidate_(user);
    default: throw new Error('Tác vụ tải nhanh không hợp lệ.');
  }
}

function fastLoad_(user, payload) {
  // Render from a compact cached payload. Secondary modules stay lazy-loaded.
  const force = !!payload.force;
  const key = FAST_API.KEY_PREFIX + String(user.user_id);
  const cache = CacheService.getScriptCache();
  if (!force) {
    const cached = cache.get(key);
    if (cached) {
      try { return JSON.parse(cached); } catch (ignored) {}
    }
  }
  const boot = bootstrapSession_(user);
  let rows = enrichOutreachOwners_(outreachList_(user, {}));
  rows = enrichOutreachNextActions_(user, rows);
  const summary = outreachSummaryFromRows_(rows);
  const dashboard = roleDashboardFromRows_(user, summary, rows);
  const result = {boot:boot, rows:rows, summary:summary, dashboard:dashboard, cached:false, generated_at:now_(), needs_seed:rows.length===0};
  try { cache.put(key, JSON.stringify(result), FAST_API.CACHE_SECONDS); } catch (ignored) {}
  return result;
}

function fastOutreach_(user, payload) {
  let rows = enrichOutreachOwners_(outreachList_(user, payload || {}));
  rows = enrichOutreachNextActions_(user, rows);
  const summary = outreachSummaryFromRows_(rows);
  return {rows:rows, summary:summary, dashboard:roleDashboardFromRows_(user, summary, rows), generated_at:now_(), needs_seed:rows.length===0};
}

function fastTasks_(user, payload) {
  payload = payload || {};
  return tasksSession_(user, payload);
}

function fastInvalidate_(user) {
  CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX + String(user.user_id));
  return {ok:true};
}

function bootstrapSession_(user) {
  const roleNames = getAll_(APP.SHEETS.ROLES)
    .filter(function(r){ return user.roles.includes(String(r.role_code)); })
    .map(function(r){ return r.ten_vai_tro; });
  return {user:Object.assign({}, user, {roleNames:roleNames}), can:user.permissions};
}

function enrichOutreachOwners_(rows) {
  const people = {};
  try {
    getAll_(APP.SHEETS.PEOPLE).forEach(function(p){
      people[String(p.user_id||'')] = String(p.ho_ten || p.email || p.user_id || '');
    });
  } catch (ignored) {}
  return (rows || []).map(function(r){
    const copy = Object.assign({}, r);
    copy.owner_name = people[String(r.owner_user_id||'')] || String(r.owner_user_id||'');
    return copy;
  });
}

/**
 * CONG_VIEC is canonical for future action/deadline. Outreach research guidance is
 * kept on the record but must not masquerade as the operational commitment.
 */
function enrichOutreachNextActions_(user, rows) {
  let tasks = [];
  try {
    tasks = getAll_(APP.SHEETS.TASKS).filter(function(t){
      const status = String(t.trang_thai || '').toUpperCase();
      if (['DONE','CANCELLED'].includes(status)) return false;
      return !!(user.permissions['task.view_all'] || String(t.owner_user_id) === String(user.user_id));
    });
  } catch (ignored) {}
  tasks.sort(taskSort_);
  const byId = {};
  const byAccount = {};
  tasks.forEach(function(t){
    const workId = String(t.work_id || '');
    const accountId = String(t.account_id || '');
    if (workId) byId[workId] = t;
    if (accountId && !byAccount[accountId]) byAccount[accountId] = t;
  });
  return (rows || []).map(function(r){
    const copy = Object.assign({}, r);
    const task = byId[String(r.work_id||'')] || byAccount[String(r.account_id||'')] || null;
    copy.next_action = task ? String(task.hanh_dong_tiep || task.ten_cong_viec || '').trim() : '';
    copy.next_action_date = task ? String(task.ngay_hanh_dong_tiep || task.han_hoan_thanh || '').trim() : '';
    copy.next_action_work_id = task ? String(task.work_id || '') : '';
    copy.next_action_source = task ? 'CONG_VIEC' : '';
    return copy;
  });
}

function outreachSummaryFromRows_(rows) {
  const counts = {};
  const byOwner = {};
  const today = startOfDay_(new Date());
  let overdue = 0;
  let missingNextAction = 0;
  let missingNextDate = 0;
  (rows || []).forEach(function(r){
    const s = String(r.trang_thai_thuc_hien || '');
    counts[s] = (counts[s] || 0) + 1;
    const ownerId = String(r.owner_user_id || '');
    if (!byOwner[ownerId]) byOwner[ownerId] = {user_id:ownerId,name:String(r.owner_name||ownerId||'Chưa giao'),total:0,todo:0,waiting:0,progress:0,customer:0,overdue:0,missing_next:0};
    const o = byOwner[ownerId];
    o.total++;
    if (['CAN_GUI','CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU','TIEP_CAN_CHIEN_LUOC','DANG_SOAN'].includes(s)) o.todo++;
    if (s === 'DANG_CHO_PHAN_HOI') o.waiting++;
    if (['DA_PHAN_HOI','DA_HEN_TRAO_DOI','DA_TAO_CO_HOI'].includes(s)) o.progress++;
    if (s === 'CHAM_SOC_ACCOUNT') o.customer++;
    const due = parseDate_(r.next_action_date);
    if (due && due < today && !['TAM_DUNG','THEO_DOI'].includes(s)) { overdue++; o.overdue++; }
    const active = !['TAM_DUNG','THEO_DOI'].includes(s);
    const hasNext = String(r.next_action || '').trim();
    const hasDate = String(r.next_action_date || '').trim();
    if (active && !hasNext) { missingNextAction++; o.missing_next++; }
    if (active && hasNext && !hasDate) missingNextDate++;
  });
  const total = (rows || []).length;
  const todo = (counts.CAN_GUI||0)+(counts.CAN_XAC_MINH||0)+(counts.CAN_XAC_MINH_DU_LIEU||0)+(counts.TIEP_CAN_CHIEN_LUOC||0)+(counts.DANG_SOAN||0);
  const waiting = counts.DANG_CHO_PHAN_HOI||0;
  const responded = counts.DA_PHAN_HOI||0;
  const meeting = counts.DA_HEN_TRAO_DOI||0;
  const opportunity = counts.DA_TAO_CO_HOI||0;
  const customer = counts.CHAM_SOC_ACCOUNT||0;
  return {
    total:total,
    can_lam_hom_nay:todo,
    can_gui:counts.CAN_GUI||0,
    dang_cho_phan_hoi:waiting,
    da_phan_hoi:responded+meeting,
    da_gui:(rows || []).filter(function(r){return String(r.ngay_gui||'').trim();}).length,
    theo_doi:counts.THEO_DOI||0,
    overdue:overdue,
    missing_next_action:missingNextAction,
    missing_next_date:missingNextDate,
    pipeline:{todo:todo,waiting:waiting,responded:responded,meeting:meeting,opportunity:opportunity,customer:customer},
    by_owner:Object.keys(byOwner).map(function(k){return byOwner[k];}).sort(function(a,b){return b.total-a.total;}),
    counts:counts
  };
}

function roleDashboardFromRows_(user, summary, rows) {
  const roles = (user.roles || []).map(function(x){ return String(x || '').toUpperCase(); });
  const canManage = !!(user.permissions && (user.permissions['ceo.view'] || user.permissions['admin.people'] || user.permissions['account.view_all']));
  let roleType = canManage ? 'CEO_ADMIN' : 'MARKET_SALES';
  const joined = roles.join(' ');
  if (!canManage && /(TECH|KY_THUAT|KỸ_THUẬT)/.test(joined)) roleType = 'TECHNICAL';
  else if (!canManage && /(TEACH|GIAO_VIEN|GIÁO_VIÊN)/.test(joined)) roleType = 'TEACHER';
  else if (!canManage && /(OPS|VAN_HANH|VẬN_HÀNH|SCHOOL_OPS)/.test(joined)) roleType = 'SCHOOL_OPS';

  const guides = {
    CEO_ADMIN: {
      title:'Điều hành hôm nay',
      intro:'Ưu tiên ngoại lệ và quyết định. Không cần đọc toàn bộ danh sách nếu các cam kết đang đúng hạn.',
      bullets:['Xử lý trường/quy trình quá hạn trước.','Mọi trường đang theo phải có người phụ trách và bước tiếp theo rõ.','Theo movement và chất lượng follow-up, không đánh giá đội ngũ chỉ bằng số lần gửi/gọi.']
    },
    MARKET_SALES: {
      title:'Việc của tôi hôm nay',
      intro:'Mỗi trường đang theo phải kết thúc bằng một kết quả thực tế và một cam kết tiếp theo.',
      bullets:['Gửi hồ sơ không phải là kết quả cuối; mục tiêu là tạo đối thoại hoặc học được thông tin có giá trị.','Sau mỗi trao đổi: ghi kết quả + việc tiếp theo + ngày thực hiện.','Nếu trường chưa phù hợp, ghi rõ lý do và thời điểm/nội dung nên quay lại.']
    },
    SCHOOL_OPS: {
      title:'Điều phối trường hôm nay',
      intro:'Ưu tiên trường có mốc triển khai, dữ liệu thiếu hoặc đầu việc phối hợp sắp đến hạn.',
      bullets:['Mỗi việc phối hợp phải có owner và ngày xử lý.','Ghi sự kiện thực tế vào Timeline; không dùng Audit Log như nhật ký công việc.','Đưa ngoại lệ cần quyết định lên CEO thay vì để nằm trong ghi chú.']
    },
    TEACHER: {
      title:'Công việc giảng dạy hôm nay',
      intro:'Chỉ tập trung lớp/việc được giao, bằng chứng cần nộp và ngoại lệ cần báo.',
      bullets:['Không nhập trường CRM/thương mại không liên quan.','Báo issue bằng sự kiện, bằng chứng và bước xử lý tiếp theo.','Hoàn thành phải có kết quả, không chỉ ghi “đã làm”.']
    },
    TECHNICAL: {
      title:'Hỗ trợ kỹ thuật hôm nay',
      intro:'Mỗi case mở cần người giữ hiện tại, bằng chứng, trạng thái và bước tiếp theo có ngày.',
      bullets:['Không đóng case khi chưa có resolution/return state rõ.','Yêu cầu ảnh/video trước khi nhận robot nếu cần chẩn đoán từ xa.','Thay đổi holder/trạng thái phải có audit trail.']
    }
  };
  return {
    role_type:roleType,
    guide:guides[roleType],
    exceptions:{
      overdue:Number(summary.overdue||0),
      missing_next_action:Number(summary.missing_next_action||0),
      missing_next_date:Number(summary.missing_next_date||0),
      waiting:Number(summary.dang_cho_phan_hoi||0),
      active_rows:(rows||[]).filter(function(r){return !['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||''));}).length
    }
  };
}

function tasksSession_(user, payload) {
  requirePermission_(user, 'task.view');
  let rows = getAll_(APP.SHEETS.TASKS).filter(function(r){
    return user.permissions['task.view_all'] || String(r.owner_user_id) === String(user.user_id);
  });
  const filter = String(payload.filter || 'DOING');
  const today = startOfDay_(new Date());
  if (filter === 'OVERDUE') rows = rows.filter(function(r){
    const d = parseDate_(r.han_hoan_thanh || r.ngay_hanh_dong_tiep);
    return !['DONE','CANCELLED'].includes(String(r.trang_thai)) && d && d < today;
  });
  else if (filter === 'WAITING') rows = rows.filter(function(r){ return String(r.trang_thai) === 'WAITING'; });
  else if (filter === 'DONE') rows = rows.filter(function(r){ return String(r.trang_thai) === 'DONE'; });
  else rows = rows.filter(function(r){ return ['OPEN','DOING'].includes(String(r.trang_thai)); });
  return rows.sort(taskSort_).map(publicTask_);
}
