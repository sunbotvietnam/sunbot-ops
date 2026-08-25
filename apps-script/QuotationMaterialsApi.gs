function quotationMaterialsShared_(token) {
  quotationSharedSession_(token);
  const ss = SpreadsheetApp.openById(QUOTATION_SHARED_AUTH.PRICEBOOK_ID);
  const sh = ss.getSheetByName('MATERIALS');
  if (!sh) throw new Error('Backend thiếu bảng MATERIALS.');
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 4) return {items:[], generated_at:new Date().toISOString()};
  const headers = values[2].map(String);
  function yes(v){ return String(v || '').toUpperCase() === 'TRUE'; }
  function num(v){ const n = Number(String(v || '').replace(/[^0-9.-]/g,'')); return isFinite(n) ? n : 0; }
  const items = values.slice(3).filter(function(r){
    return String(r[0] || '').trim() && String(r[8] || '').toUpperCase() === 'ACTIVE' && yes(r[9]) && yes(r[11]);
  }).map(function(r){
    const o={}; headers.forEach(function(h,i){ if(h) o[h]=r[i] !== undefined ? r[i] : ''; });
    return {
      item_id:String(o.item_id || ''),
      item_type:String(o.item_type || ''),
      category:String(o.category || ''),
      name:String(o.name || ''),
      unit:String(o.unit || ''),
      list_price:num(o.list_price),
      recommended_price:num(o.recommended_price),
      status:String(o.status || ''),
      customer_visible:yes(o.customer_visible),
      quote_selectable:yes(o.quote_selectable),
      note:String(o.note || '')
    };
  });
  return {items:items, generated_at:new Date().toISOString()};
}
