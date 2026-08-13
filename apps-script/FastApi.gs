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
  // Không seed/sync ở request mở app. Login và render phải luôn nhanh;
  // việc seed ban đầu chạy qua syncSafe ở request riêng có timeout dài.
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
  const rows = enrichOutreachOwners_(outreachList_(user, {}));
  const summary = outreachSummaryFromRows_(rows);
  const result = {boot:boot, rows:rows, summary:summary, cached:false, generated_at:now_(), needs_seed:rows.length===0};
  try { cache.put(key, JSON.stringify(result), FAST_API.CACHE_SECONDS); } catch (ignored) {}
  return result;
}

function fastOutreach_(user, payload) {
  const rows = enrichOutreachOwners_(outreachList_(user, payload || {}));
  return {rows:rows, summary:outreachSummaryFromRows_(rows), generated_at:now_(), needs_seed:rows.length===0};
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

function outreachSummaryFromRows_(rows) {
  const counts = {};
  const byOwner = {};
  const today = startOfDay_(new Date());
  let overdue = 0;
  (rows || []).forEach(function(r){
    const s = String(r.trang_thai_thuc_hien || '');
    counts[s] = (counts[s] || 0) + 1;
    const ownerId = String(r.owner_user_id || '');
    if (!byOwner[ownerId]) byOwner[ownerId] = {user_id:ownerId,name:String(r.owner_name||ownerId||'Chưa giao'),total:0,todo:0,waiting:0,progress:0,customer:0,overdue:0};
    const o = byOwner[ownerId];
    o.total++;
    if (['CAN_GUI','CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU','TIEP_CAN_CHIEN_LUOC','DANG_SOAN'].includes(s)) o.todo++;
    if (s === 'DANG_CHO_PHAN_HOI') o.waiting++;
    if (['DA_PHAN_HOI','DA_HEN_TRAO_DOI','DA_TAO_CO_HOI'].includes(s)) o.progress++;
    if (s === 'CHAM_SOC_ACCOUNT') o.customer++;
    const due = parseDate_(r.ngay_theo_doi_lai);
    if (due && due < today && !['CHAM_SOC_ACCOUNT','TAM_DUNG','THEO_DOI'].includes(s)) { overdue++; o.overdue++; }
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
    pipeline:{todo:todo,waiting:waiting,responded:responded,meeting:meeting,opportunity:opportunity,customer:customer},
    by_owner:Object.keys(byOwner).map(function(k){return byOwner[k];}).sort(function(a,b){return b.total-a.total;}),
    counts:counts
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
