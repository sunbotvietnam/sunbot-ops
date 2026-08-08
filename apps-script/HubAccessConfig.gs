const HUB_TRAINING_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz6U054D9DYh02IEYU9oD9ssDgdxY2XjZz9gsmmW-TG2SnpqhMm1ZHhZQhA3J12DfWd/exec';
const HUB_APP_SHEET = 'HUB_UNG_DUNG';
const HUB_ACCESS_SHEET = 'HUB_QUYEN';

function hubPermissionsResponse_(token) {
  try {
    const verified = validateHubTrainingToken_(token);
    const result = resolveHubAccess_(verified);
    return jsonOutput_({ok:true, identity:result.identity, apps:result.apps});
  } catch (err) {
    return jsonOutput_({ok:false, message:safeErrorMessage_(err), apps:[]});
  }
}

function validateHubTrainingToken_(token) {
  const raw = String(token || '').trim();
  if (!raw) throw new Error('Thiếu phiên đăng nhập Sunbot Hub.');
  const res = UrlFetchApp.fetch(HUB_TRAINING_BACKEND_URL, {
    method: 'post',
    contentType: 'text/plain; charset=utf-8',
    payload: JSON.stringify({action:'sync_teacher_portal', token:raw, source:'sunbot_system_hub_permissions'}),
    muteHttpExceptions: true,
    followRedirects: true
  });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) throw new Error('Không xác minh được phiên đăng nhập chung.');
  let data;
  try { data = JSON.parse(res.getContentText()); } catch (err) { throw new Error('Backend tài khoản không trả dữ liệu hợp lệ.'); }
  if (!data || !data.success) throw new Error((data && data.message) || 'Phiên đăng nhập chung không hợp lệ hoặc đã hết hạn.');
  return data;
}

function resolveHubAccess_(data) {
  const profile = data.teacherProfile || data.profile || {};
  const user = data.user || {};
  const uid = firstNonEmpty_([
    profile.TeacherID, profile.teacher_id, profile.UserID, profile.Username, profile.username, profile.Email, profile.email,
    user.TeacherID, user.teacher_id, user.UserID, user.user_id, user.Username, user.username, user.Email, user.email
  ]).toUpperCase();
  if (!uid) throw new Error('Không xác định được Sunbot ID từ phiên đăng nhập.');

  const displayName = firstNonEmpty_([
    profile.FullName, profile.display_name, profile.ho_ten,
    user.FullName, user.display_name, user.ho_ten, user.Username, user.username, uid
  ]);
  const roleValues = [
    profile.PermissionGroupID, profile.role_id, profile.Role, profile.role,
    user.PermissionGroupID, user.role_id, user.Role, user.role
  ].filter(Boolean).map(function(v){ return String(v).trim(); });
  if (data.isAdmin === true) roleValues.push('Admin');
  if (!roleValues.length && profile.TeacherID) roleValues.push('Teacher');
  const roles = uniqueUpper_(roleValues);

  const apps = getAll_(HUB_APP_SHEET)
    .filter(function(r){ return String(r.trang_thai || '').trim().toUpperCase() === 'ACTIVE' && String(r.app_id || '').trim(); })
    .sort(function(a,b){ return Number(a.thu_tu || 9999) - Number(b.thu_tu || 9999); });
  const rules = getAll_(HUB_ACCESS_SHEET).filter(function(r){ return String(r.app_id || '').trim(); });
  const decision = {};
  const appIds = apps.map(function(a){ return String(a.app_id).trim(); });

  applyHubRules_(decision, appIds, rules.filter(function(r){
    return String(r.subject_type || '').trim().toUpperCase() === 'DEFAULT';
  }));
  applyHubRules_(decision, appIds, rules.filter(function(r){
    if (String(r.subject_type || '').trim().toUpperCase() !== 'ROLE') return false;
    return roles.indexOf(String(r.subject_id || '').trim().toUpperCase()) >= 0;
  }));
  applyHubRules_(decision, appIds, rules.filter(function(r){
    return String(r.subject_type || '').trim().toUpperCase() === 'USER' && String(r.subject_id || '').trim().toUpperCase() === uid;
  }));

  const visible = apps.filter(function(a){ return decision[String(a.app_id).trim()] === true; }).map(function(a){
    return {
      id:String(a.app_id || '').trim(),
      n:String(a.ten_ung_dung || '').trim(),
      u:String(a.url || '').trim(),
      d:String(a.mo_ta || '').trim(),
      c:String(a.nhom || '').trim(),
      i:String(a.icon || '◈').trim(),
      tags:String(a.tags || '').split('|').map(function(x){return x.trim();}).filter(Boolean),
      newTab:toBool_(a.mo_tab_moi)
    };
  });

  return {identity:{uid:uid,name:displayName,roles:roles},apps:visible};
}

function applyHubRules_(decision, appIds, rows) {
  rows.forEach(function(r){
    const target = String(r.app_id || '').trim();
    const allowed = toBool_(r.allowed);
    if (target === '*') appIds.forEach(function(id){ decision[id] = allowed; });
    else if (appIds.indexOf(target) >= 0) decision[target] = allowed;
  });
}

function firstNonEmpty_(values) {
  for (let i=0;i<values.length;i++) {
    const s = String(values[i] == null ? '' : values[i]).trim();
    if (s) return s;
  }
  return '';
}

function uniqueUpper_(values) {
  const out = [];
  values.forEach(function(v){
    const s = String(v || '').trim().toUpperCase();
    if (s && out.indexOf(s) < 0) out.push(s);
  });
  return out;
}

function toBool_(v) {
  if (v === true) return true;
  const s = String(v == null ? '' : v).trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES' || s === 'Y' || s === 'CÓ' || s === 'CO';
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
