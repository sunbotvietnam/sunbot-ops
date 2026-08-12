const API_URL='https://script.google.com/macros/s/AKfycbw32BGSXwFVOpRCknx5hn8-k2m5ZXox26_y2mnZKVWL0JKHCv_Qtly5JiY0FS9e87kU/exec';
const SESSION_KEY='sunbot_ops_pages_session_v1';
const EMAIL_KEY='sunbot_ops_pages_email_v1';
const STATUS_LABELS={
  CAN_GUI:'Cần gửi hồ sơ',CAN_XAC_MINH:'Cần xác minh rồi gửi',CAN_XAC_MINH_DU_LIEU:'Cần xác minh dữ liệu',
  TIEP_CAN_CHIEN_LUOC:'Tiếp cận chiến lược',DANG_SOAN:'Đang chuẩn bị thư',DANG_CHO_PHAN_HOI:'Đang chờ phản hồi',
  DA_PHAN_HOI:'Đã có phản hồi',DA_HEN_TRAO_DOI:'Đã hẹn trao đổi',DA_TAO_CO_HOI:'Đã tạo cơ hội',
  TAM_DUNG:'Tạm dừng',THEO_DOI:'Theo dõi',CHAM_SOC_ACCOUNT:'Trường đang hợp tác'
};
const WAVE_LABELS={WAVE_0:'Đợt 0 · Xác minh dữ liệu',WAVE_A:'Đợt A · Gửi ngay',WAVE_B:'Đợt B · Xác minh rồi gửi',WAVE_C:'Đợt C · Tiếp cận chiến lược',WAVE_D:'Đợt D · Theo dõi'};
let state={token:localStorage.getItem(SESSION_KEY)||'',email:localStorage.getItem(EMAIL_KEY)||'',boot:null,summary:null,rows:[],tasks:[],tab:'outreach',filter:'ALL',province:'ALL',busy:false};
const pending=new Map();

function el(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg,bad=false){const t=el('toast');if(!t)return;t.textContent=msg;t.className=bad?'show bad':'show';setTimeout(()=>t.className='',3200)}
function setBusy(v){state.busy=v;document.body.classList.toggle('busy',v)}
function reqId(){return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

window.addEventListener('message',ev=>{
  if(!(ev.origin==='https://script.google.com'||ev.origin.endsWith('.googleusercontent.com')))return;
  const d=ev.data||{};if(d.type!=='sunbot-pages-response'||!d.requestId)return;
  const p=pending.get(d.requestId);if(!p)return;pending.delete(d.requestId);p.frame.remove();clearTimeout(p.timer);
  if(d.ok)p.resolve(d.result);else p.reject(new Error(d.error||'Có lỗi xảy ra.'));
});

function bridge(mode,subaction,payload={},token=state.token){
  return new Promise((resolve,reject)=>{
    const id=reqId();
    const frame=document.createElement('iframe');frame.name='bridge_'+id;frame.className='bridge-frame';document.body.appendChild(frame);
    const timer=setTimeout(()=>{pending.delete(id);frame.remove();reject(new Error('Kết nối máy chủ quá thời gian. Hãy thử lại.'));},25000);
    pending.set(id,{resolve,reject,frame,timer});
    const form=document.createElement('form');form.method='POST';form.action=API_URL;form.target=frame.name;form.className='bridge-form';
    const fields={action:'pagesBridge',request_id:id,mode,subaction:subaction||'',token:token||'',payload:JSON.stringify(payload||{})};
    Object.entries(fields).forEach(([k,v])=>{const input=document.createElement('input');input.type='hidden';input.name=k;input.value=v;form.appendChild(input)});
    document.body.appendChild(form);form.submit();form.remove();
  });
}
async function call(mode,sub,payload={}){setBusy(true);try{return await bridge(mode,sub,payload)}finally{setBusy(false)}}

function loginView(step='email'){
  const email=esc(state.email||'');
  el('app').innerHTML=`<main class="login-shell"><section class="login-card"><div class="logo">S</div><h1>SUNBOT OPS</h1><p>Vận hành đội ngũ · Tiếp cận trường · Theo dõi cơ hội</p>${step==='email'?`
    <label>Email công việc</label><input id="loginEmail" class="input" type="email" value="${email}" placeholder="ten@gmail.com" autocomplete="email">
    <button class="btn" id="sendCode">Gửi mã đăng nhập</button>
    <small>Mã 6 số sẽ được gửi tới email đã được cấp quyền trong SUNBOT OPS.</small>`:`
    <div class="login-email">${email}</div><label>Mã đăng nhập 6 số</label><input id="otpCode" class="input otp" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code">
    <button class="btn" id="verifyCode">Đăng nhập</button><button class="link-btn" id="backEmail">Dùng email khác</button>`}
    <div id="loginMsg" class="login-msg"></div></section></main>`;
  if(step==='email')el('sendCode').onclick=requestOtp;else{el('verifyCode').onclick=verifyOtp;el('backEmail').onclick=()=>loginView('email')}
}
async function requestOtp(){
  const email=String(el('loginEmail').value||'').trim().toLowerCase();if(!email.includes('@'))return toast('Hãy nhập email hợp lệ.',true);
  state.email=email;localStorage.setItem(EMAIL_KEY,email);el('loginMsg').textContent='Đang gửi mã...';
  try{const r=await call('requestOtp','',{email});loginView('otp');el('loginMsg').textContent=(r&&r.message)||'Hãy kiểm tra email.';}catch(e){el('loginMsg').textContent=e.message;toast(e.message,true)}
}
async function verifyOtp(){
  const code=String(el('otpCode').value||'').trim();if(!/^\d{6}$/.test(code))return toast('Mã đăng nhập phải gồm 6 số.',true);
  el('loginMsg').textContent='Đang xác minh...';
  try{const r=await call('verifyOtp','',{email:state.email,code},'');state.token=r.token;localStorage.setItem(SESSION_KEY,state.token);await loadApp();}catch(e){el('loginMsg').textContent=e.message;toast(e.message,true)}
}
function logout(){localStorage.removeItem(SESSION_KEY);state.token='';state.boot=null;loginView('email')}

async function loadApp(){
  try{
    const boot=await call('core','bootstrap',{});state.boot=boot;
    const [summary,rows,tasks]=await Promise.all([call('outreach','summary',{}),call('outreach','list',{}),call('core','tasks',{filter:'DOING'})]);
    state.summary=summary;state.rows=rows||[];state.tasks=tasks||[];renderApp();
  }catch(e){if(/phiên đăng nhập|hết hạn|không còn được cấp quyền/i.test(e.message)){logout();toast('Phiên đăng nhập đã hết hạn.',true)}else{toast(e.message,true);loginView('email')}}
}

function renderApp(){
  const u=state.boot.user||{};const canSync=!!(state.boot.can&&((state.boot.can['ceo.view'])||(state.boot.can['admin.people'])||(state.boot.can['account.view_all'])));
  el('app').innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><div class="logo sm">S</div><div><b>SUNBOT OPS</b><small>${esc(u.ho_ten||'')}</small></div></div><div class="header-actions">${canSync?'<button class="icon" id="syncBtn" title="Đồng bộ danh sách">↻</button>':''}<button class="icon" id="logoutBtn" title="Đăng xuất">⇥</button></div></header>
  <nav class="tabs"><button data-tab="outreach" class="${state.tab==='outreach'?'active':''}">🏫 Tiếp cận trường</button><button data-tab="tasks" class="${state.tab==='tasks'?'active':''}">✓ Công việc</button><button data-tab="guide" class="${state.tab==='guide'?'active':''}">ⓘ Cách dùng</button></nav>
  <main id="content"></main></div>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderContent()});el('logoutBtn').onclick=logout;if(canSync)el('syncBtn').onclick=syncOutreach;renderContent();
}
function renderContent(){if(state.tab==='tasks')return renderTasks();if(state.tab==='guide')return renderGuide();return renderOutreach()}
function metric(label,value,note){return `<div class="metric"><span>${label}</span><b>${Number(value||0)}</b><small>${note||''}</small></div>`}
function renderOutreach(){
  const s=state.summary||{};let rows=state.rows.slice();
  if(state.filter!=='ALL')rows=rows.filter(r=>r.trang_thai_thuc_hien===state.filter);if(state.province!=='ALL')rows=rows.filter(r=>r.tinh_thanh===state.province);
  const provinces=[...new Set(state.rows.map(r=>r.tinh_thanh).filter(Boolean))].sort();
  el('content').innerHTML=`<section class="hero"><div><h1>Tiếp cận trường</h1><p>Danh sách việc được giao theo địa bàn và mức sẵn sàng hành động.</p></div></section>
  <section class="metrics">${metric('Cần xử lý',s.can_lam_hom_nay,'việc cần làm')}${metric('Cần gửi',s.can_gui,'hồ sơ')}${metric('Chờ phản hồi',s.dang_cho_phan_hoi,'trường')}${metric('Đã phản hồi',s.da_phan_hoi,'trường')}</section>
  <section class="filters"><select id="statusFilter"><option value="ALL">Tất cả trạng thái</option>${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}" ${state.filter===k?'selected':''}>${v}</option>`).join('')}</select><select id="provinceFilter"><option value="ALL">Tất cả địa bàn</option>${provinces.map(p=>`<option ${state.province===p?'selected':''}>${esc(p)}</option>`).join('')}</select></section>
  <section class="cards">${rows.length?rows.map(outreachCard).join(''):'<div class="empty">Không có trường trong bộ lọc này.</div>'}</section>`;
  el('statusFilter').onchange=e=>{state.filter=e.target.value;renderOutreach()};el('provinceFilter').onchange=e=>{state.province=e.target.value;renderOutreach()};bindOutreachButtons();
}
function outreachCard(r){
  const status=STATUS_LABELS[r.trang_thai_thuc_hien]||r.trang_thai_thuc_hien||'Chưa xác định';const wave=WAVE_LABELS[r.dot_trien_khai]||r.dot_trien_khai||'';
  const email=r.email_truong?`<span>✉ ${esc(r.email_truong)}</span>`:'<span class="warn">✉ Chưa có email xác minh</span>';
  const canMail=['CAN_GUI','DANG_SOAN'].includes(r.trang_thai_thuc_hien)&&r.email_truong;
  const waiting=r.trang_thai_thuc_hien==='DANG_CHO_PHAN_HOI';const responded=['DA_PHAN_HOI','DA_HEN_TRAO_DOI'].includes(r.trang_thai_thuc_hien);
  return `<article class="school-card" data-id="${esc(r.outreach_id)}"><div class="card-head"><div><div class="badges"><span class="badge priority">${esc(r.uu_tien||'')}</span><span class="badge">${esc(r.tinh_thanh||'')}</span><span class="badge soft">${esc(wave)}</span></div><h3>${esc(r.ten_truong)}</h3><p>${esc(status)}</p></div></div>
  <div class="school-meta">${email}${r.dien_thoai_dau_moi?`<span>☎ ${esc(r.dien_thoai_dau_moi)}</span>`:''}${r.dia_chi_thu_tin?`<span>⌖ ${esc(r.dia_chi_thu_tin)}</span>`:''}</div>
  ${r.hanh_dong_de_xuat?`<div class="next"><b>Việc cần làm:</b> ${esc(r.hanh_dong_de_xuat)}</div>`:''}
  <div class="actions">${!r.email_truong?`<button class="btn secondary verify">Xác minh contact</button>`:''}${canMail?`<button class="btn compose">Soạn bằng Gmail của tôi</button><button class="btn ghost sent">Tôi đã gửi</button>`:''}${waiting?`<button class="btn response">Ghi nhận phản hồi</button>`:''}${responded?`<button class="btn opportunity">Tạo cơ hội</button>`:''}<button class="btn ghost detail">Xem chi tiết</button></div></article>`;
}
function bindOutreachButtons(){document.querySelectorAll('.school-card').forEach(card=>{const id=card.dataset.id;const row=state.rows.find(x=>x.outreach_id===id);card.querySelector('.verify')?.addEventListener('click',()=>verifyContact(row));card.querySelector('.compose')?.addEventListener('click',()=>composeMail(row));card.querySelector('.sent')?.addEventListener('click',()=>markSent(row));card.querySelector('.response')?.addEventListener('click',()=>recordResponse(row));card.querySelector('.opportunity')?.addEventListener('click',()=>createOpportunity(row));card.querySelector('.detail')?.addEventListener('click',()=>showDetail(row));})}

async function verifyContact(r){const email=prompt('Email đã xác minh của trường:',r.email_truong||'');if(email===null)return;const phone=prompt('Điện thoại / đầu mối (có thể để trống):',r.dien_thoai_dau_moi||'');try{await call('contact','',{outreach_id:r.outreach_id,email_truong:email,dien_thoai_dau_moi:phone||''});toast('Đã cập nhật contact.');await refreshOutreach()}catch(e){toast(e.message,true)}}
async function composeMail(r){try{const m=await call('outreach','prepareEmail',{outreach_id:r.outreach_id});const url='https://mail.google.com/mail/?authuser='+encodeURIComponent(m.from_email)+'&view=cm&fs=1&to='+encodeURIComponent(m.to_email)+'&cc='+encodeURIComponent(m.cc_email)+'&su='+encodeURIComponent(m.subject)+'&body='+encodeURIComponent(m.body);window.open(url,'_blank','noopener');toast('Đã mở Gmail. Nhớ đính kèm Thư ngỏ/IP05 trước khi gửi.');await refreshOutreach()}catch(e){toast(e.message,true)}}
async function markSent(r){if(!confirm('Xác nhận bạn đã bấm Gửi trong Gmail và email có CC sunbotvietnam@gmail.com?'))return;try{const res=await call('outreach','markSent',{outreach_id:r.outreach_id,followup_days:3});toast(res.message||'Đã ghi nhận gửi thư.');await refreshOutreach()}catch(e){toast(e.message,true)}}
async function recordResponse(r){const result=prompt('Trường phản hồi như thế nào?','');if(!result)return;const hasMeeting=confirm('Đã có lịch hẹn/trao đổi cụ thể chưa?');try{await call('outreach','updateStatus',{outreach_id:r.outreach_id,status:hasMeeting?'DA_HEN_TRAO_DOI':'DA_PHAN_HOI',result});toast('Đã ghi nhận phản hồi.');await refreshOutreach()}catch(e){toast(e.message,true)}}
async function createOpportunity(r){const value=prompt('Giá trị cơ hội dự kiến (VNĐ, có thể nhập 0):','0');if(value===null)return;try{await call('outreach','createOpportunity',{outreach_id:r.outreach_id,gia_tri_du_kien:Number(String(value).replace(/[^0-9]/g,''))||0});toast('Đã tạo cơ hội kinh doanh.');await refreshOutreach()}catch(e){toast(e.message,true)}}
function showDetail(r){alert([r.ten_truong,r.loai_hinh?'Loại hình: '+r.loai_hinh:'',r.quan_he_sunbot?'Quan hệ Sunbot: '+r.quan_he_sunbot:'',r.tinh_hinh_steam?'STEAM / hiện trạng: '+r.tinh_hinh_steam:'',r.cap_nhat_moi?'Cập nhật: '+r.cap_nhat_moi:'',r.thong_diep_de_xuat?'Hướng tiếp cận: '+r.thong_diep_de_xuat:'',r.nguon_xac_minh?'Nguồn: '+r.nguon_xac_minh:''].filter(Boolean).join('\n\n'))}
async function refreshOutreach(){const [summary,rows,tasks]=await Promise.all([call('outreach','summary',{}),call('outreach','list',{}),call('core','tasks',{filter:'DOING'})]);state.summary=summary;state.rows=rows||[];state.tasks=tasks||[];renderContent()}
async function syncOutreach(){try{const r=await call('outreach','sync',{});toast(r.message||'Đã đồng bộ.');await refreshOutreach()}catch(e){toast(e.message,true)}}

function renderTasks(){const rows=state.tasks||[];el('content').innerHTML=`<section class="hero"><div><h1>Công việc của tôi</h1><p>Các việc đang mở và hạn xử lý hiện tại.</p></div></section><section class="task-list">${rows.length?rows.map(t=>`<article class="task-card"><span class="badge priority">${esc(t.muc_uu_tien||t.priority||'')}</span><h3>${esc(t.ten_cong_viec||t.title||'Công việc')}</h3><p>${esc(t.hanh_dong_tiep||t.next_action||'')}</p><small>Hạn: ${esc(t.han_hoan_thanh||t.due||'')}</small></article>`).join(''):'<div class="empty">Hiện chưa có công việc đang mở.</div>'}</section>`}
function renderGuide(){el('content').innerHTML=`<section class="hero"><div><h1>Cách dùng</h1><p>Ba bước chính để biến danh sách trường thành hành động.</p></div></section><section class="guide-grid"><article><b>1. Xử lý đúng trạng thái</b><p>“Cần xác minh” thì bổ sung email/đầu mối trước. “Cần gửi” mới soạn thư. Trường chiến lược cần gọi/gặp trước khi gửi đại trà.</p></article><article><b>2. Gửi bằng Gmail của bạn</b><p>Nút “Soạn bằng Gmail của tôi” mở Gmail cá nhân, tự điền email trường và CC sunbotvietnam@gmail.com. Bạn kiểm tra nội dung, đính kèm Thư ngỏ/IP05 rồi bấm Gửi.</p></article><article><b>3. Luôn có việc tiếp theo</b><p>Sau khi xác nhận đã gửi, hệ thống tự tạo việc theo dõi lại sau 3 ngày làm việc. Khi trường phản hồi, ghi nhận ngay và chuyển thành cơ hội khi phù hợp.</p></article></section>`}

if(state.token)loadApp();else loginView('email');
