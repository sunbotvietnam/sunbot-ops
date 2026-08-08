const OTP_PRODUCTION_URL = 'https://script.google.com/macros/s/AKfycbw32BGSXwFVOpRCknx5hn8-k2m5ZXox26_y2mnZKVWL0JKHCv_Qtly5JiY0FS9e87kU/exec';

function doPost(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim();
  if (action !== 'requestOtp') {
    return otpResultPage_(false, 'Tác vụ không hợp lệ.');
  }

  const email = String((e && e.parameter && e.parameter.email) || '').trim();
  try {
    const result = requestOtp(email);
    return otpResultPage_(true, (result && result.message) || 'Đã xử lý yêu cầu gửi mã đăng nhập.');
  } catch (err) {
    return otpResultPage_(false, safeErrorMessage_(err));
  }
}

function otpResultPage_(ok, message) {
  const safe = String(message || '').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
  const title = ok ? 'Đã gửi yêu cầu OTP' : 'Không gửi được OTP';
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Arial,sans-serif;background:#f5f7fb;margin:0;display:grid;place-items:center;min-height:100vh}.card{background:white;padding:28px;border-radius:16px;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center}a{color:#2457b8}</style></head><body><div class="card">' +
    '<h2>' + title + '</h2><p>' + safe + '</p>' +
    (ok ? '<p>Đang quay lại màn đăng nhập...</p><script>setTimeout(function(){history.back();},1200);</script>' : '') +
    '<p><a href="' + OTP_PRODUCTION_URL + '">Quay lại SUNBOT OPS</a></p></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
