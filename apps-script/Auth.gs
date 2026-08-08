const AUTH = Object.freeze({
  SESSION_SECRET_PROP: 'SUNBOT_OPS_SESSION_SECRET',
  OTP_TTL_SECONDS: 600,
  OTP_RESEND_SECONDS: 60,
  SESSION_TTL_SECONDS: 12 * 60 * 60,
  MAX_OTP_ATTEMPTS: 5
});

function requestOtp(email) {
  const normalized = normalizeEmail_(email);
  const person = findOne_(APP.SHEETS.PEOPLE, 'email', normalized);

  // Trả thông điệp giống nhau để tránh dò danh sách tài khoản nội bộ.
  const generic = {ok:true, message:'Nếu email đã được cấp quyền, mã đăng nhập sẽ được gửi trong ít phút.'};

  if (!person) {
    logOtpDiagnostic_(normalized, '', 'OTP_ACCOUNT_NOT_FOUND', {stage:'account_lookup'});
    return generic;
  }
  if (!isActiveStatus_(person.trang_thai)) {
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_ACCOUNT_INACTIVE', {stage:'account_status', status:String(person.trang_thai || '')});
    return generic;
  }

  const cache = CacheService.getScriptCache();
  const throttleKey = 'OTP_THROTTLE:' + normalized;
  if (cache.get(throttleKey)) {
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_THROTTLED', {stage:'throttle'});
    return generic;
  }

  let remainingQuota;
  try {
    remainingQuota = MailApp.getRemainingDailyQuota();
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_MAIL_PREFLIGHT_OK', {stage:'quota', remainingQuota:remainingQuota});
  } catch (err) {
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_MAIL_PREFLIGHT_ERROR', {stage:'quota', error:safeErrorMessage_(err)});
    throw new Error('SUNBOT OPS chưa được cấp quyền gửi email OTP. Quản trị cần cấp quyền MailApp cho Apps Script production.');
  }

  if (remainingQuota < 1) {
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_MAIL_QUOTA_EMPTY', {stage:'quota', remainingQuota:remainingQuota});
    throw new Error('Hệ thống tạm hết hạn mức gửi mã đăng nhập trong ngày. Vui lòng liên hệ quản trị.');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const record = {
    hash: hmacHex_(normalized + ':' + code),
    attempts: 0,
    issuedAt: Date.now()
  };
  cache.put('OTP:' + normalized, JSON.stringify(record), AUTH.OTP_TTL_SECONDS);

  try {
    MailApp.sendEmail({
      to: normalized,
      subject: 'Mã đăng nhập SUNBOT OPS',
      body: 'Mã đăng nhập SUNBOT OPS của bạn là: ' + code + '\n\nMã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
      htmlBody: '<div style="font-family:Arial,sans-serif;max-width:520px"><h2>SUNBOT OPS</h2><p>Mã đăng nhập của bạn:</p><div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:18px 0">' + code + '</div><p>Mã có hiệu lực trong 10 phút.</p><p style="color:#666;font-size:12px">Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p></div>',
      name: 'SUNBOT OPS'
    });
    cache.put(throttleKey, '1', AUTH.OTP_RESEND_SECONDS);
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_MAIL_SENT', {stage:'send', remainingQuotaBefore:remainingQuota});
  } catch (err) {
    cache.remove('OTP:' + normalized);
    logOtpDiagnostic_(normalized, person.user_id, 'OTP_MAIL_SEND_ERROR', {stage:'send', error:safeErrorMessage_(err)});
    throw new Error('Không gửi được email OTP: ' + safeErrorMessage_(err));
  }

  return {ok:true, message:'Đã gửi mã đăng nhập. Hãy kiểm tra Inbox và Spam.'};
}

function verifyOtp(email, code) {
  const normalized = normalizeEmail_(email);
  const entered = String(code || '').trim();
  if (!/^\d{6}$/.test(entered)) throw new Error('Mã đăng nhập phải gồm 6 chữ số.');

  const person = findOne_(APP.SHEETS.PEOPLE, 'email', normalized);
  if (!person || !isActiveStatus_(person.trang_thai)) throw new Error('Mã đăng nhập không hợp lệ hoặc đã hết hạn.');

  const cache = CacheService.getScriptCache();
  const key = 'OTP:' + normalized;
  const raw = cache.get(key);
  if (!raw) throw new Error('Mã đăng nhập không hợp lệ hoặc đã hết hạn.');

  const record = JSON.parse(raw);
  record.attempts = Number(record.attempts || 0) + 1;
  if (record.attempts > AUTH.MAX_OTP_ATTEMPTS) {
    cache.remove(key);
    throw new Error('Bạn đã nhập sai quá số lần cho phép. Hãy yêu cầu mã mới.');
  }

  const expected = String(record.hash || '');
  const actual = hmacHex_(normalized + ':' + entered);
  if (!timingSafeEqual_(expected, actual)) {
    cache.put(key, JSON.stringify(record), AUTH.OTP_TTL_SECONDS);
    throw new Error('Mã đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  cache.remove(key);
  const token = createSessionToken_(person);
  logOtpDiagnostic_(normalized, person.user_id, 'OTP_LOGIN_SUCCESS', {stage:'verify'});
  return {ok:true, token:token, expiresIn:AUTH.SESSION_TTL_SECONDS};
}

function apiSession(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
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

function authenticateSession_(token) {
  const raw = String(token || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 2) throw new Error('Phiên đăng nhập không hợp lệ.');

  const payloadB64 = parts[0];
  const signature = parts[1];
  const expectedSig = base64WebSafe_(Utilities.computeHmacSha256Signature(payloadB64, getSessionSecret_()));
  if (!timingSafeEqual_(signature, expectedSig)) throw new Error('Phiên đăng nhập không hợp lệ.');

  let payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString());
  } catch (err) {
    throw new Error('Phiên đăng nhập không hợp lệ.');
  }
  if (!payload.exp || Number(payload.exp) < Math.floor(Date.now() / 1000)) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const row = findOne_(APP.SHEETS.PEOPLE, 'email', String(payload.email || '').toLowerCase());
  if (!row || !isActiveStatus_(row.trang_thai) || String(row.user_id) !== String(payload.uid)) throw new Error('Tài khoản không còn được cấp quyền SUNBOT OPS.');

  const roles = activeRolesForUser_(row.user_id);
  const permissions = permissionsForRoles_(roles);
  return {user_id: row.user_id, ho_ten: row.ho_ten, email: row.email, dia_ban: row.dia_ban || '', roles: roles, permissions: permissions};
}

function createSessionToken_(person) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    uid: String(person.user_id),
    email: String(person.email).toLowerCase(),
    iat: now,
    exp: now + AUTH.SESSION_TTL_SECONDS,
    jti: Utilities.getUuid()
  };
  const payloadB64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/,'');
  const signature = base64WebSafe_(Utilities.computeHmacSha256Signature(payloadB64, getSessionSecret_()));
  return payloadB64 + '.' + signature;
}

function getSessionSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty(AUTH.SESSION_SECRET_PROP);
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(AUTH.SESSION_SECRET_PROP, secret);
  }
  return secret;
}

function hmacHex_(text) {
  return Utilities.computeHmacSha256Signature(String(text), getSessionSecret_()).map(function(b){
    const n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function base64WebSafe_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'');
}

function timingSafeEqual_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizeEmail_(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Email không hợp lệ.');
  return value;
}

function isActiveStatus_(status) {
  const raw = String(status || '').trim().toUpperCase();
  if (raw === 'ACTIVE' || raw === 'ĐANG HOẠT ĐỘNG') return true;
  const ascii = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
  return ascii === 'DANG HOAT DONG';
}

function safeErrorMessage_(err) {
  const text = err && err.message ? err.message : String(err || 'Unknown error');
  return text.slice(0, 500);
}

function logOtpDiagnostic_(email, userId, action, detail) {
  try {
    const ss = getDb_();
    const sh = ss.getSheetByName(APP.SHEETS.AUDIT || 'AUDIT_LOG');
    if (!sh) return;
    sh.appendRow([
      'AUD-' + Utilities.getUuid(),
      now_(),
      userId || '',
      action,
      'AUTH_OTP',
      email || '',
      JSON.stringify(detail || {})
    ]);
  } catch (ignored) {}
}
