// Employee quote detail fast path — 2026-09-07.
// Avoids full-sheet object scans when a salesperson opens one approved quote.

const QUOTATION_EMPLOYEE_FAST_V6 = Object.freeze({
  VERSION: '2026.09.07-employee-fast-v1'
});

function quotationEmployeeFastObject_(headers, row, rowNumber) {
  const out = {_row: rowNumber};
  headers.forEach(function(header, index){
    if (header) out[header] = row[index] === undefined ? '' : row[index];
  });
  return out;
}

function quotationEmployeeFastIdentity_(value) {
  return quotationApprovalNormalizeLogin_(value);
}

function quotationEmployeeFastCanRead_(session, quote) {
  if (String(session.role || '').toUpperCase() === 'ADMIN') return true;
  const identities = [session.login_id, session.display_name].map(quotationEmployeeFastIdentity_).filter(String);
  const owners = [quote.created_by, quote.deal_owner].map(quotationEmployeeFastIdentity_).filter(String);
  return owners.some(function(owner){ return identities.indexOf(owner) >= 0; });
}

function quotationEmployeeFastLatestQuote_(spreadsheet, quoteId) {
  const sheet = spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.QUOTES);
  if (!sheet) throw new Error('Backend thiếu bảng QUOTES.');
  const headerRow = QUOTATION_APPROVAL.HEADER_ROW;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRow || lastCol < 1) return null;

  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0].map(function(v){ return String(v || '').trim(); });
  const ids = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getDisplayValues();
  let best = null;
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0] || '').trim() !== quoteId) continue;
    const rowNumber = headerRow + 1 + i;
    const row = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
    const item = quotationEmployeeFastObject_(headers, row, rowNumber);
    if (!best || Number(item.version || 1) > Number(best.version || 1)) best = item;
  }
  return best;
}

function quotationEmployeeFastLines_(spreadsheet, quoteId, version) {
  const sheet = spreadsheet.getSheetByName(QUOTATION_APPROVAL.SHEETS.LINES);
  if (!sheet) throw new Error('Backend thiếu bảng QUOTE_LINES.');
  const headerRow = QUOTATION_APPROVAL.HEADER_ROW;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRow || lastCol < 1) return [];

  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0].map(function(v){ return String(v || '').trim(); });
  const ids = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getDisplayValues();
  const matches = [];
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === quoteId) matches.push(headerRow + 1 + i);
  }
  if (!matches.length) return [];

  const minRow = matches[0];
  const maxRow = matches[matches.length - 1];
  const block = sheet.getRange(minRow, 1, maxRow - minRow + 1, lastCol).getValues();
  return block.map(function(row, offset){
    return quotationEmployeeFastObject_(headers, row, minRow + offset);
  }).filter(function(line){
    return String(line.quote_id || '').trim() === quoteId && Number(line.version || 1) === Number(version || 1);
  }).sort(function(a, b){ return Number(a.line_no || 0) - Number(b.line_no || 0); });
}

function quotationEmployeeFastGet_(token, payload) {
  const session = quotationApprovalSession_(token);
  const quoteId = String(payload && payload.quote_id || '').trim();
  if (!quoteId) throw new Error('Thiếu mã báo giá.');

  const spreadsheet = quotationApprovalSpreadsheet_();
  const quote = quotationEmployeeFastLatestQuote_(spreadsheet, quoteId);
  if (!quote) throw new Error('Không tìm thấy báo giá.');
  if (!quotationEmployeeFastCanRead_(session, quote)) throw new Error('Bạn không được xem báo giá của người khác.');

  const lines = quotationEmployeeFastLines_(spreadsheet, quoteId, Number(quote.version || 1));
  return {quote: quote, lines: lines, performance_version: QUOTATION_EMPLOYEE_FAST_V6.VERSION};
}

// Final shared-router override: keep all existing authoritative workflow actions intact.
function apiSessionQuotationShared(token, action, payload) {
  const a = String(action || '');
  if (a === 'bootstrapFast') return quotationPerformanceBootstrap_(token);
  if (a === 'getQuoteFast') return quotationEmployeeFastGet_(token, payload || {});
  return apiSessionQuotationApproval(token, a, payload || {});
}
