const PASSWORD_AUTH = Object.freeze({
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_SHA256: 'ab9a353f8b7258d39920036df10735666222ece476228cf60a64123a4a7b8d6c',
  ADMIN_SALT: 'sunbot-admin-v1:',
  STAFF_SALT: 'sunbot-staff-v1:',
  STAFF_PIN_SHA256: Object.freeze({
    'TCH-LTD-012': 'de2777cd988501954dc5906f1560eb784fecb215fdf71ec80af0f030d1c08a18',
    'TCH-NTA-014': '7a1fac5e7f93c8e3ced909e78ef80f5bd141aa3a940227b9740687bb4f667e58',
    'UP-HOANG-NHUNG': 'ea1b3a2c684e14b4c807b0a004daeebba94cdba2711f0a688915b079a3197838'
  }),
  MAX_ATTEMPTS: 5,
  LOCK_SECONDS: 15 * 60
});

function loginAdminPassword(username, password) { return loginPassword_(username, password); }

function loginPassword_(username, password) {
  ensureProductionProperties_();
  const cache = CacheService.getScriptCache();
  const rawUser = String(username || '').trim();
  const normalizedUser = rawUser.toUpperCase();
  const pass = String(password || '');
  const lockKey = 'PASSWORD_LOGIN_LOCK:' + normalizedUser;
  const failKey = 'PASSWORD_LOGIN_FAILS:' + normalizedUser;
  if (cache.get(lockKey)) throw new Error('Tài khoản đang tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.');

  let person = null;
  let valid = false;
  if (rawUser.toLowerCase() === PASSWORD_AUTH.ADMIN_USERNAME) {
    valid = timingSafeEqual_(sha256Hex_(PASSWORD_AUTH.ADMIN_SALT + pass), PASSWORD_AUTH.ADMIN_PASSWORD_SHA256);
    if (valid) person = findOne_(APP.SHEETS.PEOPLE, 'email', String(PRODUCTION.OWNER_EMAIL || '').trim().toLowerCase());
  } else {
    const expectedHash = PASSWORD_AUTH.STAFF_PIN_SHA256[normalizedUser] || '';
    valid = !!expectedHash && timingSafeEqual_(sha256Hex_(PASSWORD_AUTH.STAFF_SALT + pass), expectedHash);
    if (valid) person = findOne_(APP.SHEETS.PEOPLE, 'user_id', normalizedUser);
  }

  if (!valid || !person || !isActiveStatus_(person.trang_thai)) {
    const failures = Number(cache.get(failKey) || 0) + 1;
    if (failures >= PASSWORD_AUTH.MAX_ATTEMPTS) { cache.put(lockKey, '1', PASSWORD_AUTH.LOCK_SECONDS); cache.remove(failKey); }
    else cache.put(failKey, String(failures), PASSWORD_AUTH.LOCK_SECONDS);
    logPasswordAuth_('PASSWORD_LOGIN_FAILED', normalizedUser || rawUser, {attempts: failures});
    throw new Error('ID đăng nhập hoặc mật khẩu/PIN không đúng.');
  }

  cache.remove(failKey); cache.remove(lockKey);
  if (String(person.user_id) === 'USR-TUONGVAN1906') ensureInitialOperationalData_(String(person.user_id));
  const token = createSessionToken_(person);
  logPasswordAuth_('PASSWORD_LOGIN_SUCCESS', String(person.user_id), {userId: person.user_id});
  return {ok:true, token:token, userId:String(person.user_id), expiresIn:AUTH.SESSION_TTL_SECONDS};
}

function sha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8).map(function(b){ const n=b<0?b+256:b; return ('0'+n.toString(16)).slice(-2); }).join('');
}

function logPasswordAuth_(action, entityId, detail) {
  try {
    ensureProductionProperties_();
    const sh = getDb_().getSheetByName(APP.SHEETS.AUDIT || 'AUDIT_LOG');
    if (!sh) return;
    sh.appendRow(['AUD-' + Utilities.getUuid(), now_(), entityId || '', action, 'AUTH_PASSWORD', entityId || '', JSON.stringify(detail || {})]);
  } catch (ignored) {}
}
