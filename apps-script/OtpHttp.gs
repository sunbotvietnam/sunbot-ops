const OTP_PRODUCTION_URL = 'https://script.google.com/macros/s/AKfycbw32BGSXwFVOpRCknx5hn8-k2m5ZXox26_y2mnZKVWL0JKHCv_Qtly5JiY0FS9e87kU/exec';

function doPost(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim();

  if (action === 'adminPasswordLogin') {
    const username = String((e && e.parameter && e.parameter.username) || '').trim();
    const password = String((e && e.parameter && e.parameter.password) || '');
    try {
      const result = loginAdminPassword(username, password);
      const ticket = Utilities.getUuid();
      CacheService.getScriptCache().put('LOGIN_TICKET:' + ticket, String(result.token || ''), 60);
      return loginRedirectPage_(ticket);
    } catch (err) {
      return passwordLoginErrorPage_(safeErrorMessage_(err));
    }
  }

  if (action === 'requestOtp') {
    const email = String((e && e.parameter && e.parameter.email) || '').trim();
    try {
      const result = requestOtp(email);
      return otpResultPage_(true, (result && result.message) || 'Đã xử lý yêu cầu gửi mã đăng nhập.');
    } catch (err) {
      return otpResultPage_(false, safeErrorMessage_(err));
    }
  }

  return passwordLoginErrorPage_('Tác vụ không hợp lệ.');
}

function consumeLoginTicket_(ticket) {
  const key = 'LOGIN_TICKET:' + String(ticket || '').trim();
  if (key === 'LOGIN_TICKET:') return '';
  const cache = CacheService.getScriptCache();
  const token = cache.get(key) || '';
  if (token) cache.remove(key);
  return token;
}

function loginRedirectPage_(ticket) {
  const url = OTP_PRODUCTION_URL + '?loginTicket=' + encodeURIComponent(ticket);
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Arial,sans-serif;background:#f5f7fb;margin:0;display:grid;place-items:center;min-height:100vh}.card{background:white;padding:28px;border-radius:16px;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center}</style></head>' +
    '<body><div class="card"><h2>Đăng nhập thành công</h2><p>Đang mở SUNBOT OPS...</p></div>' +
    '<script>window.top.location.replace(' + JSON.stringify(url) + ');</script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Đăng nhập SUNBOT OPS').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function passwordLoginErrorPage_(message) {
  const safe = String(message || '').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Arial,sans-serif;background:#f5f7fb;margin:0;display:grid;place-items:center;min-height:100vh}.card{background:white;padding:28px;border-radius:16px;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center}a{color:#2457b8}</style></head>' +
    '<body><div class="card"><h2>Không đăng nhập được</h2><p>' + safe + '</p><p><a href="' + OTP_PRODUCTION_URL + '">Quay lại đăng nhập</a></p></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Không đăng nhập được').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function otpResultPage_(ok, message) {
  const safe = String(message || '').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
  const title = ok ? 'Đã gửi yêu cầu OTP' : 'Không gửi được OTP';
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Arial,sans-serif;background:#f5f7fb;margin:0;display:grid;place-items:center;min-height:100vh}.card{background:white;padding:28px;border-radius:16px;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center}a{color:#2457b8}</style></head><body><div class="card">' +
    '<h2>' + title + '</h2><p>' + safe + '</p>' +
    '<p><a href="' + OTP_PRODUCTION_URL + '">Quay lại SUNBOT OPS</a></p></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
