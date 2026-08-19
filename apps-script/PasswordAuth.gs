const PASSWORD_AUTH = Object.freeze({
  SHEET: 'AUTH_CREDENTIALS',
  SECRET_PROP: 'SUNBOT_OPS_PIN_PEPPER_HEX',
  MAX_ATTEMPTS: 5,
  LOCK_SECONDS: 15 * 60
});

function loginPinByEmail_(identifier, pin) {
  ensureProductionProperties_();
  try{ensureSalesAdminRuntime_();}catch(ignored){}
  const login = String(identifier || '').trim().toLowerCase();
  const value = String(pin || '').trim();
  if (!login) throw new Error('Hãy nhập ID hoặc email đăng nhập.');
  if (!/^\d{6}$/.test(value)) throw new Error('Mã PIN phải gồm 6 chữ số.');

  const cache = CacheService.getScriptCache();
  const lockKey = 'PIN_LOGIN_LOCK:' + login;
  const failKey = 'PIN_LOGIN_FAILS:' + login;
  if (cache.get(lockKey)) throw new Error('Tài khoản đang tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.');

  const cred = credentialRowForIdentifier_(login);
  let person = null;
  if (cred && cred.user_id) person = findOne_(APP.SHEETS.PEOPLE, 'user_id', String(cred.user_id));
  if (!person && login.indexOf('@')>0) person = findOne_(APP.SHEETS.PEOPLE, 'email', login);
  const canonical = cred ? String(cred.login_id || cred.email || login).trim().toLowerCase() : login;
  if (cred && String(cred.visible_pin || '').trim()) syncCredentialVerifierFromVisible_(cred, canonical);
  const liveCred = credentialRowForIdentifier_(login);
  const expected = liveCred ? String(liveCred.verifier_hmac_sha256 || '') : '';
  const verifierOk = timingSafeEqual_(credentialVerifier_(canonical, value), expected);
  const valid = !!person && isActiveStatus_(person.trang_thai) && !!liveCred && String(liveCred.status || '').toUpperCase() === 'ACTIVE' && verifierOk;

  if (!valid) {
    const failures = Number(cache.get(failKey) || 0) + 1;
    if (failures >= PASSWORD_AUTH.MAX_ATTEMPTS) {cache.put(lockKey, '1', PASSWORD_AUTH.LOCK_SECONDS);cache.remove(failKey);} else cache.put(failKey, String(failures), PASSWORD_AUTH.LOCK_SECONDS);
    logPasswordAuth_('PIN_LOGIN_FAILED', login, {attempts: failures});
    throw new Error('ID/email hoặc mã PIN không đúng.');
  }

  cache.remove(failKey);cache.remove(lockKey);
  const token = createSessionToken_(person);
  logPasswordAuth_('PIN_LOGIN_SUCCESS', String(person.user_id), {userId: person.user_id,login_id:canonical});
  return {ok:true, token:token, userId:String(person.user_id), expiresIn:AUTH.SESSION_TTL_SECONDS};
}

function credentialRowForIdentifier_(identifier) {
  const x=String(identifier||'').trim().toLowerCase();
  return credentialRows_().find(function(r){
    return [r.login_id,r.email,r.user_id].some(function(v){return String(v||'').trim().toLowerCase()===x;});
  }) || null;
}
function credentialRowForEmail_(email) { return credentialRowForIdentifier_(email); }

function credentialRows_() {
  const sh = getDb_().getSheetByName(PASSWORD_AUTH.SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('Hệ thống xác thực chưa được cấu hình.');
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues().map(function(row){const o = {}; h.forEach(function(k,i){ o[k]=row[i]; }); return o;});
}

function syncCredentialVerifierFromVisible_(cred,canonical){
  const pin=String(cred.visible_pin||'').trim();if(!/^\d{6}$/.test(pin))return;
  const expected=credentialVerifier_(canonical,pin);if(String(cred.verifier_hmac_sha256||'')===expected)return;
  const sh=getDb_().getSheetByName(PASSWORD_AUTH.SHEET),h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),uid=h.indexOf('user_id'),ver=h.indexOf('verifier_hmac_sha256'),upd=h.indexOf('updated_at');
  if(uid<0||ver<0)return;const vals=sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues();const i=vals.findIndex(function(r){return String(r[uid])===String(cred.user_id);});if(i<0)return;sh.getRange(i+2,ver+1).setValue(expected);if(upd>=0)sh.getRange(i+2,upd+1).setValue(now_());
}

function credentialVerifier_(identifier, pin) {
  const pepperHex = credentialSecret_('PIN_PEPPER_HEX');
  const message = String(identifier).toLowerCase() + ':' + String(pin);
  return Utilities.computeHmacSha256Signature(message, pepperHex).map(function(b){const n=b<0?b+256:b; return ('0'+n.toString(16)).slice(-2);}).join('');
}

function credentialSecret_(key) {
  const props = PropertiesService.getScriptProperties();
  const stored = String(props.getProperty(PASSWORD_AUTH.SECRET_PROP) || '').trim();
  if (/^[0-9a-f]{64}$/i.test(stored)) return stored;
  const sh = getDb_().getSheetByName(PASSWORD_AUTH.SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('Cấu hình bảo mật không hợp lệ.');
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const userCol = h.indexOf('user_id'),keyCol = h.indexOf('secret_key'),valueCol = h.indexOf('secret_value');
  if (userCol < 0 || keyCol < 0 || valueCol < 0) throw new Error('Cấu hình bảo mật không hợp lệ.');
  const rows = sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues();
  const idx = rows.findIndex(function(r){ return String(r[userCol] || '') === '__SYSTEM__' && String(r[keyCol] || '') === String(key); });
  if (idx < 0) throw new Error('Cấu hình bảo mật không hợp lệ.');
  const seed = String(rows[idx][valueCol] || '').trim();
  if (!/^[0-9a-f]{64}$/i.test(seed)) throw new Error('Cấu hình bảo mật không hợp lệ.');
  props.setProperty(PASSWORD_AUTH.SECRET_PROP, seed);sh.getRange(idx + 2, valueCol + 1).clearContent();return seed;
}

function logPasswordAuth_(action, entityId, detail) {
  try {ensureProductionProperties_();const sh = getDb_().getSheetByName(APP.SHEETS.AUDIT || 'AUDIT_LOG');if (!sh) return;sh.appendRow(['AUD-' + Utilities.getUuid(), now_(), entityId || '', action, 'AUTH_PIN', entityId || '', JSON.stringify(detail || {})]);} catch (ignored) {}
}
