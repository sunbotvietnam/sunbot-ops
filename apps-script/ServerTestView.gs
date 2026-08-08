const SERVER_TEST_VIEW_KEY = 'ceo-test';

function renderServerTestView_() {
  ensureProductionProperties_();
  const owner = findOne_(APP.SHEETS.PEOPLE, 'email', PRODUCTION.OWNER_EMAIL);
  if (!owner) throw new Error('Không tìm thấy tài khoản CEO production.');

  const tasks = getAll_(APP.SHEETS.TASKS)
    .filter(r => String(r.owner_user_id) === String(owner.user_id))
    .sort(taskSort_)
    .slice(0, 20);
  const feed = getAll_(APP.SHEETS.AI_FEED)
    .filter(r => String(r.user_id) === String(owner.user_id))
    .slice(-10).reverse();

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const taskRows = tasks.map(t => `
    <tr>
      <td>${esc(t.muc_uu_tien)}</td>
      <td><b>${esc(t.ten_cong_viec)}</b><div class="sub">${esc(t.hanh_dong_tiep)}</div></td>
      <td>${esc(t.trang_thai)}</td>
      <td>${esc(date_(t.han_hoan_thanh))}</td>
      <td>${bool_(t.can_ceo) ? '<span class="badge high">Cần CEO</span>' : ''}</td>
    </tr>`).join('');

  const feedCards = feed.map(f => `
    <div class="signal">
      <div><span class="badge ${String(f.muc_do)==='HIGH'?'high':''}">${esc(f.muc_do)}</span> <b>${esc(f.doi_tuong)}</b></div>
      <div class="signal-text">${esc(f.tin_hieu)}</div>
      <div class="sub">CEO action: ${esc(f.ceo_action)} · Hạn: ${esc(f.deadline)}</div>
    </div>`).join('');

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUNBOT OPS · CEO Test</title>
  <style>
  body{font-family:Arial,sans-serif;margin:0;background:#f4f6fb;color:#172033} .wrap{max-width:1100px;margin:auto;padding:24px}
  .hero{background:#17365D;color:white;border-radius:18px;padding:24px;margin-bottom:20px}.hero h1{margin:0 0 6px}.hero p{margin:0;opacity:.85}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.card{background:white;border-radius:14px;padding:16px;box-shadow:0 3px 14px rgba(0,0,0,.06)}.num{font-size:30px;font-weight:700}.label{font-size:13px;color:#687086}
  table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{padding:12px;border-bottom:1px solid #edf0f5;text-align:left;vertical-align:top}th{background:#f8f9fc;font-size:12px;text-transform:uppercase;color:#687086}.sub{font-size:12px;color:#7a8191;margin-top:4px}.badge{display:inline-block;padding:3px 8px;border-radius:999px;background:#e9edf5;font-size:11px}.badge.high{background:#ffe3ea;color:#a31943}.section{margin-top:22px}.section h2{font-size:18px}.signal{background:white;padding:14px 16px;border-radius:12px;margin-bottom:10px}.signal-text{margin:8px 0}
  @media(max-width:700px){.grid{grid-template-columns:repeat(2,1fr)}th:nth-child(1),td:nth-child(1),th:nth-child(5),td:nth-child(5){display:none}.wrap{padding:14px}}
  </style></head><body><div class="wrap">
  <div class="hero"><h1>SUNBOT OPS · CEO Test</h1><p>Server-side view · đọc trực tiếp database production · ${esc(now_())}</p></div>
  <div class="grid"><div class="card"><div class="num">${tasks.length}</div><div class="label">Công việc</div></div><div class="card"><div class="num">${tasks.filter(t=>String(t.trang_thai)==='DOING').length}</div><div class="label">Đang làm</div></div><div class="card"><div class="num">${tasks.filter(t=>bool_(t.can_ceo)).length}</div><div class="label">Cần CEO</div></div><div class="card"><div class="num">${feed.length}</div><div class="label">Tín hiệu AI</div></div></div>
  <div class="section"><h2>Ưu tiên điều hành</h2><table><thead><tr><th>Ưu tiên</th><th>Công việc</th><th>Trạng thái</th><th>Hạn</th><th></th></tr></thead><tbody>${taskRows || '<tr><td colspan="5">Chưa có dữ liệu.</td></tr>'}</tbody></table></div>
  <div class="section"><h2>Tín hiệu CEO</h2>${feedCards || '<div class="card">Chưa có tín hiệu.</div>'}</div>
  </div></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS · CEO Test').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
