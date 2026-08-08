function renderOpsApp_(userId) {
  ensureProductionProperties_();
  const person = findOne_(APP.SHEETS.PEOPLE, 'user_id', userId);
  if (!person) throw new Error('Không tìm thấy hồ sơ người dùng.');

  const roles = activeRolesForUser_(userId);
  const isCeo = roles.includes('CEO') || roles.includes('ADMIN');
  const people = getAll_(APP.SHEETS.PEOPLE);
  const roleRows = getAll_(APP.SHEETS.ROLES);
  const userRoleRows = getAll_(APP.SHEETS.USER_ROLES);
  const allTasks = getAll_(APP.SHEETS.TASKS);
  const aiFeed = getAll_(APP.SHEETS.AI_FEED).slice().reverse();

  const visibleTasks = isCeo ? allTasks : allTasks.filter(r => String(r.owner_user_id) === String(userId));
  const openTasks = visibleTasks.filter(r => !['DONE','CANCELLED'].includes(String(r.trang_thai)));
  const doing = openTasks.filter(r => String(r.trang_thai) === 'DOING').length;
  const ceoCount = openTasks.filter(r => bool_(r.can_ceo)).length;

  const roleNameByCode = {};
  roleRows.forEach(r => roleNameByCode[String(r.role_code)] = String(r.ten_vai_tro));
  const rolesByUser = {};
  userRoleRows.forEach(r => {
    const uid = String(r.user_id || '');
    if (!rolesByUser[uid]) rolesByUser[uid] = [];
    if (r.role_code) rolesByUser[uid].push(String(r.role_code));
  });

  const teamIds = ['TCH-LTD-012','TCH-NTA-014','UP-HOANG-NHUNG'];
  const team = people.filter(p => teamIds.includes(String(p.user_id)));
  const taskCountByUser = {};
  allTasks.forEach(t => {
    if (['DONE','CANCELLED'].includes(String(t.trang_thai))) return;
    const uid = String(t.owner_user_id || '');
    taskCountByUser[uid] = (taskCountByUser[uid] || 0) + 1;
  });

  const teamHtml = isCeo ? team.map(p => {
    const uid = String(p.user_id);
    const roleLabels = (rolesByUser[uid] || []).map(code => roleNameByCode[code] || code);
    return '<article class="member-card"><div class="avatar">' + escOps_(initialsOps_(p.ho_ten)) + '</div><div class="member-main"><div class="member-top"><div><h3>' + escOps_(p.ho_ten) + '</h3><p>' + escOps_(p.dia_ban || '') + '</p></div><span class="status">Hoạt động</span></div><div class="tags">' + roleLabels.map(x => '<span>' + escOps_(x) + '</span>').join('') + '</div><div class="member-foot"><strong>' + Number(taskCountByUser[uid] || 0) + '</strong><span>việc đang mở</span><code>' + escOps_(uid) + '</code></div></div></article>';
  }).join('') : '';

  const taskHtml = openTasks.slice().sort(taskSort_).map(t => {
    const owner = people.find(p => String(p.user_id) === String(t.owner_user_id));
    const state = String(t.trang_thai || 'OPEN');
    const stateLabel = state === 'DOING' ? 'Đang làm' : state === 'WAITING' ? 'Chờ' : 'Mở';
    return '<tr><td><div class="task-title">' + escOps_(t.ten_cong_viec) + '</div><div class="task-next">→ ' + escOps_(t.hanh_dong_tiep || '') + '</div></td><td>' + escOps_(owner ? owner.ho_ten : t.owner_user_id) + '</td><td><span class="pill ' + (state === 'DOING' ? 'pill-doing' : '') + '">' + escOps_(stateLabel) + '</span></td><td>' + escOps_(dateOps_(t.han_hoan_thanh || t.ngay_hanh_dong_tiep)) + '</td><td>' + (bool_(t.can_ceo) ? '<span class="ceo-flag">CEO</span>' : '—') + '</td></tr>';
  }).join('');

  const visibleFeed = isCeo ? aiFeed : aiFeed.filter(x => String(x.user_id) === String(userId));
  const feedHtml = visibleFeed.slice(0,6).map(f => '<div class="signal"><div class="signal-dot"></div><div><div class="signal-meta">' + escOps_(f.nhom_tin_hieu || '') + ' · ' + escOps_(f.muc_do || '') + '</div><strong>' + escOps_(f.doi_tuong || '') + '</strong><p>' + escOps_(f.tin_hieu || '') + '</p><div class="signal-action">Hành động: ' + escOps_(f.ceo_action || '—') + '</div></div></div>').join('');

  const roleNames = roles.map(c => roleNameByCode[c] || c).join(' · ');
  const html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUNBOT OPS</title><style>' + opsCss_() + '</style></head><body>' +
    '<header class="topbar"><div class="brand"><div class="brand-mark">S</div><div><b>SUNBOT OPS</b><span>Điều hành vận hành & thị trường</span></div></div><div class="userbox"><div><strong>' + escOps_(person.ho_ten) + '</strong><span>' + escOps_(roleNames) + '</span></div><a class="logout" href="' + OTP_PRODUCTION_URL + '">Đăng xuất</a></div></header>' +
    '<main class="shell"><section class="hero"><div><span class="eyebrow">BẢNG ĐIỀU HÀNH</span><h1>Chào ' + escOps_(person.ho_ten) + '</h1><p>' + (isCeo ? 'Nhìn nhanh việc cần quyết định, tiến độ đội ngũ và tín hiệu vận hành Sunbot.' : 'Tập trung vào công việc, đầu việc tiếp theo và các điểm cần cập nhật trong vai trò của bạn.') + '</p></div><div class="hero-badge">' + escOps_(person.dia_ban || 'SUNBOT') + '</div></section>' +
    '<section class="metrics"><div class="metric"><span>Việc đang mở</span><strong>' + openTasks.length + '</strong><small>phạm vi đang xem</small></div><div class="metric"><span>Đang thực hiện</span><strong>' + doing + '</strong><small>cần theo sát tiến độ</small></div><div class="metric accent"><span>Cần CEO</span><strong>' + ceoCount + '</strong><small>điểm cần quyết định/hỗ trợ</small></div><div class="metric"><span>Vai trò</span><strong>' + roles.length + '</strong><small>' + escOps_(roleNames) + '</small></div></section>' +
    (isCeo ? '<section class="section"><div class="section-head"><div><span class="eyebrow">ĐỘI NGŨ LÕI</span><h2>Dung · Thu · Nhung</h2></div><p>Vai trò, địa bàn và khối lượng việc hiện tại.</p></div><div class="team-grid">' + teamHtml + '</div></section>' : '') +
    '<section class="grid"><div class="panel panel-wide"><div class="section-head compact"><div><span class="eyebrow">ƯU TIÊN</span><h2>Công việc đang mở</h2></div></div><div class="table-wrap"><table><thead><tr><th>Công việc</th><th>Phụ trách</th><th>Trạng thái</th><th>Hạn</th><th></th></tr></thead><tbody>' + taskHtml + '</tbody></table></div></div><div class="panel"><div class="section-head compact"><div><span class="eyebrow">TÍN HIỆU</span><h2>Điểm cần chú ý</h2></div></div><div class="signals">' + (feedHtml || '<p class="empty">Chưa có tín hiệu mới.</p>') + '</div></div></section>' +
    '<footer>Production · dữ liệu đọc trực tiếp từ SUNBOT_OPS_DATABASE · ' + Utilities.formatDate(new Date(), APP.TZ, 'dd/MM/yyyy HH:mm') + '</footer></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escOps_(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initialsOps_(name){ return String(name||'SB').trim().split(/\s+/).slice(-2).map(x => x.charAt(0).toUpperCase()).join(''); }
function dateOps_(v){ if(!v)return '—'; const d=parseDate_(v); return d ? Utilities.formatDate(d,APP.TZ,'dd/MM') : String(v); }
function opsCss_(){ return `:root{--orange:#f97316;--orange2:#c2410c;--soft:#fff7ed;--ink:#172033;--muted:#667085;--line:#eaecf0;--bg:#f7f8fa}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--ink)}.topbar{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 max(22px,calc((100vw - 1240px)/2));position:sticky;top:0;z-index:5}.brand,.userbox{display:flex;align-items:center;gap:12px}.brand-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--orange),#fb923c);color:white;display:grid;place-items:center;font-weight:900}.brand b{display:block;letter-spacing:.04em}.brand span,.userbox span{display:block;font-size:12px;color:var(--muted);margin-top:2px}.userbox{text-align:right}.logout{border:1px solid #fed7aa;background:var(--soft);color:var(--orange2);padding:9px 13px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px}.shell{max-width:1240px;margin:auto;padding:28px 22px 40px}.hero{background:linear-gradient(120deg,#fff 0%,#fff7ed 72%,#ffedd5 100%);border:1px solid #fed7aa;border-radius:24px;padding:30px 34px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(249,115,22,.06)}.hero h1{font-size:32px;margin:6px 0 8px}.hero p{margin:0;color:var(--muted);max-width:720px;line-height:1.5}.hero-badge{background:var(--orange);color:#fff;padding:10px 14px;border-radius:999px;font-weight:800}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.13em;color:var(--orange2)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0 28px}.metric{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px}.metric span{font-size:13px;color:var(--muted)}.metric strong{display:block;font-size:30px;margin:6px 0}.metric small{color:var(--muted);font-size:11px;line-height:1.35}.metric.accent{background:var(--orange);border-color:var(--orange);color:white}.metric.accent span,.metric.accent small{color:#fff7ed}.section{margin:30px 0}.section-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:14px}.section-head h2{margin:4px 0 0;font-size:21px}.section-head p{color:var(--muted);font-size:13px}.section-head.compact{margin-bottom:12px}.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.member-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px;display:flex;gap:14px}.avatar{width:44px;height:44px;border-radius:14px;background:var(--soft);color:var(--orange2);display:grid;place-items:center;font-weight:900;flex:none}.member-main{min-width:0;flex:1}.member-top{display:flex;justify-content:space-between;gap:8px}.member-card h3{margin:0;font-size:16px}.member-card p{margin:3px 0 0;color:var(--muted);font-size:12px}.status{background:#ecfdf3;color:#027a48;font-size:10px;font-weight:800;padding:5px 7px;border-radius:999px;height:max-content}.tags{display:flex;gap:6px;flex-wrap:wrap;margin:13px 0}.tags span{font-size:10px;background:#f2f4f7;padding:5px 7px;border-radius:7px;color:#475467}.member-foot{display:flex;align-items:baseline;gap:6px;border-top:1px solid var(--line);padding-top:11px}.member-foot strong{color:var(--orange2);font-size:20px}.member-foot span{font-size:11px;color:var(--muted)}.member-foot code{margin-left:auto;font-size:9px;color:#98a2b3}.grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);gap:16px}.panel{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line);padding:10px 8px}td{border-bottom:1px solid #f2f4f7;padding:13px 8px;vertical-align:top}.task-title{font-weight:750;font-size:13px}.task-next{color:var(--muted);font-size:11px;margin-top:4px;max-width:480px}.pill{display:inline-block;padding:5px 8px;border-radius:999px;background:#f2f4f7;color:#475467;font-weight:700;font-size:10px}.pill-doing{background:#fff7ed;color:var(--orange2)}.ceo-flag{background:#fef3f2;color:#b42318;padding:5px 7px;border-radius:7px;font-size:10px;font-weight:900}.signals{display:grid;gap:12px}.signal{display:grid;grid-template-columns:8px 1fr;gap:10px;padding-bottom:12px;border-bottom:1px solid #f2f4f7}.signal-dot{width:8px;height:8px;border-radius:50%;background:var(--orange);margin-top:5px}.signal-meta{font-size:9px;color:var(--orange2);font-weight:900;letter-spacing:.05em}.signal strong{font-size:12px}.signal p{font-size:11px;color:var(--muted);line-height:1.45;margin:4px 0}.signal-action{font-size:10px;color:#475467;font-weight:650}.empty{color:var(--muted)}footer{text-align:center;color:#98a2b3;font-size:10px;margin-top:26px}@media(max-width:900px){.metrics{grid-template-columns:repeat(2,1fr)}.team-grid,.grid{grid-template-columns:1fr}.topbar{padding:0 16px}.userbox>div{display:none}.hero{padding:22px;align-items:flex-start;gap:18px}.hero h1{font-size:25px}.hero-badge{font-size:11px}.shell{padding:18px 14px 30px}}`; }
