const SUNBOT_PAGES_ORIGIN = 'https://sunbotvietnam.github.io';

function handlePagesBridge_(e) {
  const p = e && e.parameter ? e.parameter : {};
  const requestId = String(p.request_id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const mode = String(p.mode || '').trim();
  const token = String(p.token || '').trim();
  let payload = {};
  try {
    payload = p.payload ? JSON.parse(String(p.payload)) : {};
  } catch (err) {
    return pagesBridgeHtml_(requestId, null, 'Dữ liệu yêu cầu không hợp lệ.');
  }

  try {
    let result;
    if (mode === 'pinLogin') {
      result = pagesPinLogin_(payload.email || '', payload.pin || '');
    } else if (mode === 'requestOtp') {
      result = requestOtp(payload.email || '');
    } else if (mode === 'verifyOtp') {
      result = verifyOtp(payload.email || '', payload.code || '');
    } else if (mode === 'core') {
      result = apiSession(token, String(p.subaction || ''), payload);
    } else if (mode === 'commercial') {
      result = apiSessionCommercial(token, String(p.subaction || ''), payload);
    } else if (mode === 'ceo') {
      result = apiSessionCeo(token, String(p.subaction || ''), payload);
    } else if (mode === 'outreach') {
      result = apiSessionOutreach(token, String(p.subaction || ''), payload);
    } else if (mode === 'contact') {
      result = apiSessionOutreachContact(token, payload);
    } else {
      throw new Error('Tác vụ GitHub Pages không hợp lệ.');
    }
    return pagesBridgeHtml_(requestId, result, '');
  } catch (err) {
    return pagesBridgeHtml_(requestId, null, safeErrorMessage_(err));
  }
}

function pagesPinLogin_(email, pin) {
  const normalized = normalizeEmail_(email);
  const person = findOne_(APP.SHEETS.PEOPLE, 'email', normalized);
  if (!person || !isActiveStatus_(person.trang_thai)) throw new Error('Email hoặc mã PIN không đúng.');
  if (!/^\d{4}$/.test(String(pin || '').trim())) throw new Error('Mã PIN phải gồm 4 chữ số.');
  if (String(person.user_id) === 'USR-TUONGVAN1906') {
    return loginAdminPassword(PASSWORD_AUTH.ADMIN_USERNAME, String(pin).trim());
  }
  return loginPassword_(String(person.user_id), String(pin).trim());
}

function pagesBridgeHtml_(requestId, result, error) {
  const message = {
    type: 'sunbot-pages-response',
    requestId: requestId,
    ok: !error,
    result: result || null,
    error: error || ''
  };
  const json = JSON.stringify(message).replace(/<\//g, '<\\/');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>window.parent.postMessage(' + json + ', ' + JSON.stringify(SUNBOT_PAGES_ORIGIN) + ');<\/script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('SUNBOT OPS Bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
