function doPost(e) {
  const json = parseJsonPost_(e);
  const action = String((json && json.action) || (e && e.parameter && e.parameter.action) || '').trim();

  if (action === 'pagesBridge') return handlePagesBridge_(e);

  if (action === 'hubPermissions') {
    const token = String((json && json.token) || (e && e.parameter && e.parameter.token) || '').trim();
    return hubPermissionsResponse_(token);
  }

  if (action === 'publicAssetEvent') {
    try {
      return jsonPostResponse_(assetTrackingPublicEvent_(json || {}));
    } catch (err) {
      return jsonPostResponse_({ok:false});
    }
  }

  return hardenedPostError_('Tác vụ không hợp lệ.');
}

function parseJsonPost_(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || String(raw).trim().charAt(0) !== '{') return null;
    if (String(raw).length > 12000) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function jsonPostResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj || {ok:true})).setMimeType(ContentService.MimeType.JSON);
}

function hardenedPostError_(message) {
  const safe = String(message || '').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; });
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><p>' + safe + '</p></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
