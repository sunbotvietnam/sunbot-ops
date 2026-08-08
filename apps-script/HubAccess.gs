const SUNBOT_HUB_URL = 'https://sunbotvietnam.github.io/sunbot-system-hub/';
const SUNBOT_TRAINING_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz6U054D9DYh02IEYU9oD9ssDgdxY2XjZz9gsmmW-TG2SnpqhMm1ZHhZQhA3J12DfWd/exec';

function validateTeacherHubToken_(token) {
  const raw = String(token || '').trim();
  if (!raw) throw new Error('Thiếu phiên đăng nhập Sunbot Hub.');
  const res = UrlFetchApp.fetch(SUNBOT_TRAINING_BACKEND_URL, {
    method: 'post',
    contentType: 'text/plain; charset=utf-8',
    payload: JSON.stringify({action:'sync_teacher_portal', token:raw, source:'sunbot_system_hub'}),
    muteHttpExceptions: true,
    followRedirects: true
  });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) throw new Error('Không xác minh được phiên đăng nhập chung.');
  let data;
  try { data = JSON.parse(res.getContentText()); } catch (err) { throw new Error('Backend tài khoản không trả dữ liệu hợp lệ.'); }
  if (!data || !data.success) throw new Error((data && data.message) || 'Phiên đăng nhập chung không hợp lệ hoặc đã hết hạn.');

  const profile = data.teacherProfile || data.user || data.profile || {};
  const user = data.user || {};
  const candidates = [
    profile.TeacherID, profile.teacher_id, profile.UserID, profile.Username, profile.username,
    user.TeacherID, user.teacher_id, user.UserID, user.Username, user.username
  ].filter(Boolean).map(function(v){ return String(v).trim().toUpperCase(); });
  const people = getAll_(APP.SHEETS.PEOPLE);
  let person = people.find(function(p){ return candidates.indexOf(String(p.user_id || '').trim().toUpperCase()) >= 0; });
  if (!person) {
    const fullName = String(profile.FullName || profile.display_name || user.FullName || user.display_name || '').trim().toLowerCase();
    if (fullName) person = people.find(function(p){ return String(p.ho_ten || '').trim().toLowerCase() === fullName; });
  }
  if (!person || !isActiveStatus_(person.trang_thai)) throw new Error('Tài khoản này chưa được cấp quyền SUNBOT OPS.');
  return {person:person, training:data};
}

function hubLaunchOps_(source, token) {
  ensureProductionProperties_();
  const src = String(source || '').trim().toLowerCase();
  let userId = '';
  if (src === 'teacher' || src === 'training') {
    userId = String(validateTeacherHubToken_(token).person.user_id || '');
  } else if (src === 'ops') {
    userId = String(authenticateSession_(token).user_id || '');
  } else {
    throw new Error('Nguồn phiên đăng nhập không hợp lệ.');
  }
  if (!userId) throw new Error('Không xác định được người dùng.');
  return renderOpsApp_(userId);
}

function renderHubAdminLoginSuccess_(result) {
  const user = authenticateSession_(result.token);
  const payload = {
    source: 'ops',
    token: result.token,
    user: {user_id:user.user_id, ho_ten:user.ho_ten, roles:user.roles || [], dia_ban:user.dia_ban || ''},
    expiresIn: AUTH.SESSION_TTL_SECONDS
  };
  const encoded = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/,'');
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>location.replace(' + JSON.stringify(SUNBOT_HUB_URL + '#sso=' + encoded) + ');<\/script><p>Đang quay lại Sunbot Hub...</p></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Sunbot Hub').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function renderHubLaunchError_(message) {
  const safe = String(message || 'Không mở được ứng dụng.').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#fff7ed;margin:0;min-height:100vh;display:grid;place-items:center}.c{max-width:460px;background:#fff;border:1px solid #fed7aa;border-radius:20px;padding:28px;text-align:center}a{color:#c2410c;font-weight:700}</style></head><body><div class="c"><h2>Không mở được SUNBOT OPS</h2><p>'+safe+'</p><a href="'+SUNBOT_HUB_URL+'">Quay lại Sunbot Hub</a></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
