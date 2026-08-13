function doPost(e) {
  const json = parseJsonPost_(e);
  const action = String((json && json.action) || (e && e.parameter && e.parameter.action) || '').trim();

  if (action === 'pagesBridge') return handlePagesBridge_(e);

  if (action === 'hubPermissions') {
    const token = String((json && json.token) || (e && e.parameter && e.parameter.token) || '').trim();
    return hubPermissionsResponse_(token);
  }

  return hardenedPostError_('Tác vụ không hợp lệ.');
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

function hardenedPostError_(message) {
  const safe = String(message || '').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; });
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><p>' + safe + '</p></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
