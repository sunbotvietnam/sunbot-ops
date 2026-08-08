function doPost(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim();
  if (action !== 'requestOtp') {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Tác vụ không hợp lệ.'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const email = String((e && e.parameter && e.parameter.email) || '').trim();
  try {
    const result = requestOtp(email);
    return ContentService.createTextOutput(JSON.stringify(result || {ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok:false,
      error:safeErrorMessage_(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
