const PASSWORD_AUTH = Object.freeze({
  ADMIN_USERNAME: 'admin',
  // SHA-256 của chuỗi salt nội bộ + PIN quản trị. Không lưu PIN dạng rõ trong source.
  ADMIN_PASSWORD_SHA256: 'ab9a353f8b7258d39920036df10735666222ece476228cf60a64123a4a7b8d6c',
  SALT: 'sunbot-admin-v1:',
  MAX_ATTEMPTS: 5,
  LOCK_SECONDS: 15 * 60
});

function loginAdminPassword(username, password) {
  // Production mới đôi khi chưa có Script Properties sau migration/deploy.
  // Tự phục hồi DB/root đã pin trong Production.gs trước mọi truy cập dữ liệu.
  ensureProductionProperties_();

  const cache = CacheService.getScriptCache();
  const lockKey = 'ADMIN_LOGIN_LOCK';
  const failKey = 'ADMIN_LOGIN_FAILS';

  if (cache.get(lockKey)) {
    throw new Error('Đăng nhập quản trị đang tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.');
  }

  const user = String(username || '').trim().toLowerCase();
  const pass = String(password || '');
  const validUser = timingSafeEqual_(user, PASSWORD_AUTH.ADMIN_USERNAME);
  const validPass = timingSafeEqual_(sha256Hex_(PASSWORD_AUTH.SALT + pass), PASSWORD_AUTH.ADMIN_PASSWORD_SHA256);

  if (!validUser || !validPass) {
    const failures = Number(cache.get(failKey) || 0) + 1;
    if (failures >= PASSWORD_AUTH.MAX_ATTEMPTS) {
      cache.put(lockKey, '1', PASSWORD_AUTH.LOCK_SECONDS);
      cache.remove(failKey);
    } else {
      cache.put(failKey, String(failures), PASSWORD_AUTH.LOCK_SECONDS);
    }
    logPasswordAuth_('ADMIN_PASSWORD_LOGIN_FAILED', {attempts: failures});
    throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
  }

  cache.remove(failKey);
  cache.remove(lockKey);

  const ownerEmail = String(PRODUCTION.OWNER_EMAIL || '').trim().toLowerCase();
  const person = findOne_(APP.SHEETS.PEOPLE, 'email', ownerEmail);
  if (!person || !isActiveStatus_(person.trang_thai)) {
    throw new Error('Tài khoản quản trị production chưa ở trạng thái hoạt động.');
  }

  const token = createSessionToken_(person);
  logPasswordAuth_('ADMIN_PASSWORD_LOGIN_SUCCESS', {userId: person.user_id});
  return {ok:true, token:token, expiresIn:AUTH.SESSION_TTL_SECONDS};
}

function sha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8)
    .map(function(b){
      const n = b < 0 ? b + 256 : b;
      return ('0' + n.toString(16)).slice(-2);
    }).join('');
}

function logPasswordAuth_(action, detail) {
  try {
    ensureProductionProperties_();
    const sh = getDb_().getSheetByName(APP.SHEETS.AUDIT || 'AUDIT_LOG');
    if (!sh) return;
    sh.appendRow([
      'AUD-' + Utilities.getUuid(),
      now_(),
      '',
      action,
      'AUTH_PASSWORD',
      'admin',
      JSON.stringify(detail || {})
    ]);
  } catch (ignored) {}
}
