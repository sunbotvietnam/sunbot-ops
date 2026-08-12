const OTP_PRODUCTION_URL = 'https://script.google.com/macros/s/AKfycbw32BGSXwFVOpRCknx5hn8-k2m5ZXox26_y2mnZKVWL0JKHCv_Qtly5JiY0FS9e87kU/exec';

function doPost(e) {
  const json = parseJsonPost_(e);
  const action = String((json && json.action) || (e && e.parameter && e.parameter.action) || '').trim();

  if (action === 'pagesBridge') {
    return handlePagesBridge_(e);
  }

  if (action === 'hubPermissions') {
    const token = String((json && json.token) || (e && e.parameter && e.parameter.token) || '').trim();
    return hubPermissionsResponse_(token);
  }

  if (action === 'adminPasswordLogin') {
    const username = String((e && e.parameter && e.parameter.username) || '').trim();
    const password = String((e && e.parameter && e.parameter.password) || '');
    try {
      loginAdminPassword(username, password);
      return renderV2LiveApp_();
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

function parseJsonPost_(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || String(raw).trim().charAt(0) !== '{') return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function passwordLoginErrorPage_(message) {
  const safe = String(message || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#fff7ed;margin:0;display:grid;place-items:center;min-height:100vh}.card{background:white;padding:28px;border-radius:18px;max-width:420px;box-shadow:0 10px 30px rgba(249,115,22,.12);text-align:center;border:1px solid #fed7aa}a{color:#c2410c;font-weight:700}</style></head><body><div class="card"><h2>Không đăng nhập được</h2><p>' + safe + '</p><p><a href="' + OTP_PRODUCTION_URL + '">Quay lại đăng nhập</a></p></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Không đăng nhập được').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function otpResultPage_(ok, message) {
  const safe = String(message || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title = ok ? 'Đã gửi yêu cầu OTP' : 'Không gửi được OTP';
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h2>' + title + '</h2><p>' + safe + '</p><p><a href="' + OTP_PRODUCTION_URL + '">Quay lại SUNBOT OPS</a></p></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
