const PASSWORD_AUTH = Object.freeze({
  SHEET: 'AUTH_CREDENTIALS',
  SECRET_PROP: 'SUNBOT_OPS_PIN_PEPPER_HEX',
  MAX_ATTEMPTS: 5,
  LOCK_SECONDS: 15 * 60
});

function loginPinByEmail_(email, pin) {
  ensureProductionProperties_();
  const normalizedEmail = normalizeEmail_(email);
  const value = String(pin || '').trim();
  if (!/^\d{6}$/.test(value)) throw new Error('Mã PIN phải gồm 6 chữ số.');

  const cache = CacheService.getScriptCache();
  const lockKey = 'PIN_LOGIN_LOCK:' + normalizedEmail;
  const failKey = 'PIN_LOGIN_FAILS:' + normalizedEmail;
  if (cache.get(lockKey)) throw new Error('Tài khoản đang tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.');

  const person = findOne_(APP.SHEETS.PEOPLE, 'email', normalizedEmail);
  const cred = credentialRowForEmail_(normalizedEmail);
  const expected = cred ? String(cred.verifier_hmac_sha256 || '') : '';
  const candidates = credentialVerifierCandidates_(normalizedEmail, value);
  const verifierOk = candidates.some(function(v){ return timingSafeEqual_(v, expected); });
  const valid = !!person && isActiveStatus_(person.trang_thai) && !!cred && String(cred.status || '').toUpperCase() === 'ACTIVE' && verifierOk;

  if (!valid) {
    const failures = Number(cache.get(failKey) || 0) + 1;
    if (failures >= PASSWORD_AUTH.MAX_ATTEMPTS) {
      cache.put(lockKey, '1', PASSWORD_AUTH.LOCK_SECONDS);
      cache.remove(failKey);
    } else {
      cache.put(failKey, String(failures), PASSWORD_AUTH.LOCK_SECONDS);
    }
    logPasswordAuth_('PIN_LOGIN_FAILED', normalizedEmail, {attempts: failures});
    throw new Error('Email hoặc mã PIN không đúng.');
  }

  cache.remove(failKey);
  cache.remove(lockKey);
  const token = createSessionToken_(person);
  logPasswordAuth_('PIN_LOGIN_SUCCESS', String(person.user_id), {userId: person.user_id});
  return {ok:true, token:token, userId:String(person.user_id), expiresIn:AUTH.SESSION_TTL_SECONDS};
}

function credentialRowForEmail_(email) {
  const rows = credentialRows_();
  return rows.find(function(r){ return String(r.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase(); }) || null;
}

function credentialRows_() {
  const sh = getDb_().getSheetByName(PASSWORD_AUTH.SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('Hệ thống xác thực chưa được cấu hình.');
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues().map(function(row){
    const o = {}; h.forEach(function(k,i){ o[k]=row[i]; }); return o;
  });
}

function credentialVerifierCandidates_(email, pin) {
  const pepperHex = credentialSecret_('PIN_PEPPER_HEX');
  const message = String(email).toLowerCase() + ':' + String(pin);
  const asString = hmacHexWithKey_(message, pepperHex);
  const asBytes = hmacHexWithKey_(message, hexBytes_(pepperHex));
  return [asString, asBytes];
}

function credentialVerifier_(email, pin) {
  return credentialVerifierCandidates_(email, pin)[0];
}

function hmacHexWithKey_(message, key) {
  return Utilities.computeHmacSha256Signature(message, key).map(function(b){
    const n=b<0?b+256:b; return ('0'+n.toString(16)).slice(-2);
  }).join('');
}

function credentialSecret_(key) {
  const props = PropertiesService.getScriptProperties();
  const stored = String(props.getProperty(PASSWORD_AUTH.SECRET_PROP) || '').trim();
  if (/^[0-9a-f]{64}$/i.test(stored)) return stored;

  const sh = getDb_().getSheetByName(PASSWORD_AUTH.SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('Cấu hình bảo mật không hợp lệ.');
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const userCol = h.indexOf('user_id');
  const keyCol = h.indexOf('secret_key');
  const valueCol = h.indexOf('secret_value');
  if (userCol < 0 || keyCol < 0 || valueCol < 0) throw new Error('Cấu hình bảo mật không hợp lệ.');
  const rows = sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues();
  const idx = rows.findIndex(function(r){ return String(r[userCol] || '') === '__SYSTEM__' && String(r[keyCol] || '') === String(key); });
  if (idx < 0) throw new Error('Cấu hình bảo mật không hợp lệ.');
  const seed = String(rows[idx][valueCol] || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(seed)) throw new Error('Cấu hình bảo mật không hợp lệ.');
  props.setProperty(PASSWORD_AUTH.SECRET_PROP, seed);
  sh.getRange(idx + 2, valueCol + 1).clearContent();
  return seed;
}

function hexBytes_(hex) {
  const out=[]; for(let i=0;i<hex.length;i+=2) out.push(parseInt(hex.slice(i,i+2),16)); return out;
}

function logPasswordAuth_(action, entityId, detail) {
  try {
    ensureProductionProperties_();
    const sh = getDb_().getSheetByName(APP.SHEETS.AUDIT || 'AUDIT_LOG');
    if (!sh) return;
    sh.appendRow(['AUD-' + Utilities.getUuid(), now_(), entityId || '', action, 'AUTH_PIN', entityId || '', JSON.stringify(detail || {})]);
  } catch (ignored) {}
}
