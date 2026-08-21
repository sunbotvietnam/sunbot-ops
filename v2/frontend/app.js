import {API} from './api.js';

const state={user:null,tab:'today',schools:[],today:[],selectedSchool:null,loading:false};
const DEMO_SCHOOLS=[
  {school_id:'S-001',school_name:'Mầm non Sao Sáng 4',province:'Hải Phòng',current_owner_name:'Thu',relationship_state:'ENGAGED',next_action:'Xác nhận lịch trao đổi với Ban Giám hiệu',next_action_date:'2026-08-22',overdue:false},
  {school_id:'S-002',school_name:'Mầm non Hoa Sen',province:'Nghệ An',current_owner_name:'Dung',relationship_state:'CONTACTED',next_action:'Follow-up sau khi gửi E-profile',next_action_date:'2026-08-21',overdue:false},
  {school_id:'S-003',school_name:'Mầm non B Hà Nội',province:'Hà Nội',current_owner_name:'Nhung',relationship_state:'DISCOVERY',next_action:'Gửi phiếu ghi nhận nhu cầu sau meeting',next_action_date:'2026-08-20',overdue:true},
  {school_id:'S-004',school_name:'Mầm non Lý Thái Tổ',province:'Hà Nội',current_owner_name:'Nhung',relationship_state:'TARGET',next_action:'Xác minh đầu mối Ban Giám hiệu',next_action_date:'2026-08-25',overdue:false}
];
const DEMO_TIMELINE=[
  {at:'21/08 · 09:20',type:'Email',summary:'Đã gửi E-profile Sunbot',detail:'Chờ phản hồi từ Ban Giám hiệu.'},
  {at:'20/08 · 15:10',type:'Gọi điện',summary:'Đã trao đổi với văn phòng trường',detail:'Đề nghị gửi thông tin qua email chính thức.'}
];

function h(tag,attrs={},children=[]){const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')el.className=v;else if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),v);else el.setAttribute(k,v)});(Array.isArray(children)?children:[children]).forEach(c=>el.append(c?.nodeType?c:document.createTextNode(String(c??''))));return el}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function initials(name){return String(name||'SV').trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase()}
function statusLabel(s){return {TARGET:'Mục tiêu',CONTACTED:'Đã tiếp cận',ENGAGED:'Đang quan tâm',DISCOVERY:'Khám phá nhu cầu',OPPORTUNITY:'Cơ hội',CUSTOMER:'Khách hàng',NURTURE:'Nuôi dưỡng',CLOSED:'Đã đóng'}[s]||s}
function fmtDate(v){if(!v)return 'Chưa có hạn';const d=new Date(v+'T00:00:00');return Number.isNaN(+d)?v:d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}
function toast(msg,error=false){document.querySelector('.toast')?.remove();const x=h('div',{class:'toast'+(error?' error':'')},msg);document.body.append(x);setTimeout(()=>x.remove(),3000)}

async function init(){
  // V2 preview uses demo data until a dedicated Apps Script deployment URL is configured.
  state.user={display_name:'Nguyễn Thị Tường Vân',role_code:'ADMIN'};
  state.schools=DEMO_SCHOOLS;
  state.today=DEMO_SCHOOLS.filter(x=>x.overdue||x.next_action_date==='2026-08-21');
  renderShell();
}

function renderShell(){
  const app=document.getElementById('app');
  app.innerHTML=`<div class="app-shell">
    <header class="topbar">
      <div class="brand"><div class="brand-mark"><img src="https://sunbotvietnam.github.io/portal/assets/logo-sunbot.png" alt="Sunbot" onerror="this.style.display='none'"></div><div class="brand-copy"><strong>SUNBOT SCHOOL OS</strong><span>Phát triển trường & cơ hội</span></div></div>
      <div class="top-actions"><button class="icon-btn" id="refreshBtn" title="Làm mới">↻</button><div class="avatar">${initials(state.user?.display_name)}</div></div>
    </header>
    <div class="layout">
      <aside class="sidebar"><nav class="nav-group">
        ${navButton('today','⌁','Hôm nay')}
        ${navButton('schools','⌂','Trường')}
        ${navButton('opportunities','◇','Cơ hội')}
        ${state.user?.role_code==='ADMIN'?navButton('admin','⚙','Quản trị'):''}
      </nav><div class="sidebar-foot"><strong>Nguyên tắc vận hành</strong><br>Mỗi trường active phải có người phụ trách và một việc tiếp theo có hạn.</div></aside>
      <main class="main" id="main"></main>
    </div>
  </div>`;
  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderShell()});
  document.getElementById('refreshBtn').onclick=()=>toast('Đã làm mới dữ liệu.');
  renderPage();
}
function navButton(tab,icon,label){return `<button class="nav-btn ${state.tab===tab?'active':''}" data-tab="${tab}"><span>${icon}</span><span>${label}</span></button>`}
function renderPage(){if(state.tab==='today')renderToday();else if(state.tab==='schools')renderSchools();else if(state.tab==='opportunities')renderOpportunities();else renderAdmin()}

function renderToday(){
  const overdue=state.schools.filter(x=>x.overdue).length;
  const dueToday=state.schools.filter(x=>x.next_action_date==='2026-08-21').length;
  const waiting=state.schools.filter(x=>x.relationship_state==='CONTACTED'||x.relationship_state==='ENGAGED').length;
  const meetings=state.schools.filter(x=>x.relationship_state==='DISCOVERY').length;
  document.getElementById('main').innerHTML=`
    <section class="page-head"><div><div class="eyebrow">HÔM NAY</div><h1>Chào chị Vân, đây là việc cần ưu tiên.</h1><p>Không cần đọc toàn bộ pipeline. Hệ thống chỉ đưa lên những trường cần hành động hoặc quyết định.</p></div><button class="btn btn-primary" id="quickSchool">+ Thêm trường</button></section>
    <section class="kpi-grid"><div class="kpi danger"><strong>${overdue}</strong><span>Việc quá hạn</span></div><div class="kpi warning"><strong>${dueToday}</strong><span>Đến hạn hôm nay</span></div><div class="kpi"><strong>${waiting}</strong><span>Đang chờ phản hồi</span></div><div class="kpi"><strong>${meetings}</strong><span>Đang khám phá nhu cầu</span></div></section>
    ${actionPanel('Việc cần xử lý',state.schools.filter(x=>x.overdue||x.next_action_date==='2026-08-21'))}`;
  bindOpenSchool();document.getElementById('quickSchool').onclick=openAddSchool;
}
function renderSchools(){
  document.getElementById('main').innerHTML=`
    <section class="page-head"><div><div class="eyebrow">SCHOOL DEVELOPMENT</div><h1>Trường</h1><p>Một danh sách duy nhất cho account, owner, trạng thái quan hệ và việc tiếp theo.</p></div><button class="btn btn-primary" id="addSchool">+ Thêm trường</button></section>
    <section class="panel"><div class="panel-head"><div><h2>Danh sách trường</h2><p>${state.schools.length} trường đang có trong portfolio.</p></div></div><div class="panel-body"><div class="toolbar"><div class="search"><input id="schoolSearch" placeholder="Tìm theo tên trường, địa bàn, người phụ trách…"></div><select id="stateFilter"><option value="">Tất cả trạng thái</option>${['TARGET','CONTACTED','ENGAGED','DISCOVERY','OPPORTUNITY','CUSTOMER','NURTURE','CLOSED'].map(s=>`<option value="${s}">${statusLabel(s)}</option>`).join('')}</select></div><div id="schoolTable">${schoolTable(state.schools)}</div></div></section>`;
  document.getElementById('addSchool').onclick=openAddSchool;
  const refresh=()=>{const q=document.getElementById('schoolSearch').value.trim().toLowerCase();const st=document.getElementById('stateFilter').value;const rows=state.schools.filter(x=>(!q||[x.school_name,x.province,x.current_owner_name,x.next_action].join(' ').toLowerCase().includes(q))&&(!st||x.relationship_state===st));document.getElementById('schoolTable').innerHTML=schoolTable(rows);bindOpenSchool()};
  document.getElementById('schoolSearch').oninput=refresh;document.getElementById('stateFilter').onchange=refresh;bindOpenSchool();
}
function schoolTable(rows){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Trường</th><th>Phụ trách</th><th>Trạng thái</th><th>Việc tiếp theo</th><th>Hạn</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="school-name">${esc(r.school_name)}</div><div class="subtle">${esc(r.province)}</div></td><td><span class="owner"><span class="owner-dot"></span>${esc(r.current_owner_name||'Chưa giao')}</span></td><td><span class="status ${String(r.relationship_state).toLowerCase()}">${esc(statusLabel(r.relationship_state))}</span></td><td class="next-action">${esc(r.next_action||'Chưa có việc tiếp theo')}</td><td class="due ${r.overdue?'overdue':''}">${r.overdue?'Quá hạn · ':''}${esc(fmtDate(r.next_action_date))}</td><td><button class="btn btn-ghost open-school" data-id="${esc(r.school_id)}">Mở</button></td></tr>`).join('')}</tbody></table></div>`}
function actionPanel(title,rows){return `<section class="panel"><div class="panel-head"><div><h2>${title}</h2><p>Ưu tiên theo hạn và mức độ cần can thiệp.</p></div></div><div class="panel-body">${rows.length?schoolTable(rows):'<div class="empty">Không có việc cần xử lý.</div>'}</div></section>`}
function bindOpenSchool(){document.querySelectorAll('.open-school').forEach(b=>b.onclick=()=>openSchool(b.dataset.id))}

function openSchool(id){
  const r=state.schools.find(x=>x.school_id===id);if(!r)return;state.selectedSchool=r;
  const overlay=h('div',{class:'drawer-backdrop'});overlay.innerHTML=`<aside class="drawer"><header class="drawer-head"><div><div class="eyebrow">HỒ SƠ TRƯỜNG</div><h2>${esc(r.school_name)}</h2><div class="school-meta"><span class="meta-pill">${esc(r.province)}</span><span class="meta-pill">Phụ trách: ${esc(r.current_owner_name)}</span><span class="status ${String(r.relationship_state).toLowerCase()}">${esc(statusLabel(r.relationship_state))}</span></div></div><button class="icon-btn close-drawer">×</button></header><div class="drawer-body"><section class="next-box"><div class="label">Việc tiếp theo</div><strong>${esc(r.next_action||'Chưa có việc tiếp theo')}</strong><div class="due ${r.overdue?'overdue':''}">${r.overdue?'Quá hạn · ':''}${esc(fmtDate(r.next_action_date))}</div></section><div class="action-row"><button class="btn btn-primary" id="logInteraction">Ghi nhận tương tác</button><button class="btn btn-secondary" id="setNext">Đặt việc tiếp theo</button><button class="btn btn-secondary" id="startDiscovery">Khám phá nhu cầu</button>${['DISCOVERY','OPPORTUNITY'].includes(r.relationship_state)?'<button class="btn btn-secondary" id="createOpportunity">Tạo cơ hội</button>':''}</div><section class="section"><h3>Thông tin chính</h3><div class="form-grid"><div class="field"><label>Người phụ trách</label><input value="${esc(r.current_owner_name)}" disabled></div><div class="field"><label>Trạng thái quan hệ</label><input value="${esc(statusLabel(r.relationship_state))}" disabled></div></div></section><section class="section"><h3>Lịch sử tương tác</h3><div class="timeline">${DEMO_TIMELINE.map(t=>`<div class="timeline-item"><div class="timeline-time">${esc(t.at)}</div><div class="timeline-content"><strong>${esc(t.type)} · ${esc(t.summary)}</strong><p>${esc(t.detail)}</p></div></div>`).join('')}</div></section></div></aside>`;
  document.body.append(overlay);overlay.querySelector('.close-drawer').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
  overlay.querySelector('#logInteraction').onclick=()=>openInteractionForm(r,overlay);
  overlay.querySelector('#setNext').onclick=()=>openNextActionForm(r,overlay);
  overlay.querySelector('#startDiscovery').onclick=()=>toast('Discovery Wizard sẽ được triển khai ở Phase 2 sau khi Phase 1 E2E pass.');
  overlay.querySelector('#createOpportunity')?.addEventListener('click',()=>toast('Opportunity chỉ mở sau khi Need Statement được xác nhận.'));
}
function modal(title,body,onSave){const o=h('div',{class:'drawer-backdrop'});o.innerHTML=`<aside class="drawer" style="width:min(560px,100%)"><header class="drawer-head"><div><div class="eyebrow">SUNBOT SCHOOL OS</div><h2>${esc(title)}</h2></div><button class="icon-btn close-drawer">×</button></header><div class="drawer-body">${body}</div></aside>`;document.body.append(o);o.querySelector('.close-drawer').onclick=()=>o.remove();o.onclick=e=>{if(e.target===o)o.remove()};o.querySelector('[data-save]')?.addEventListener('click',()=>onSave(o));return o}
function openInteractionForm(r,parent){modal('Ghi nhận tương tác',`<div class="form-grid"><div class="field"><label>Loại tương tác</label><select id="iType"><option>Gọi điện</option><option>Email</option><option>Zalo</option><option>Meeting</option><option>Demo</option><option>Gặp trực tiếp</option></select></div><div class="field"><label>Thời điểm</label><input id="iAt" type="datetime-local"></div><div class="field full"><label>Điều đã xảy ra</label><textarea id="iSummary" placeholder="Ghi sự thật, ngắn và cụ thể…"></textarea></div><div class="field full"><label>Kết quả</label><textarea id="iResult" placeholder="Nhà trường phản hồi gì? Ta học được gì?"></textarea></div></div><div class="form-actions"><button class="btn btn-primary" data-save>Lưu tương tác</button></div>`,m=>{const text=m.querySelector('#iSummary').value.trim();if(!text)return toast('Cần ghi điều đã xảy ra.',true);m.remove();parent.remove();toast('Đã ghi nhận tương tác.');});}
function openNextActionForm(r,parent){modal('Đặt việc tiếp theo',`<div class="form-grid"><div class="field full"><label>Việc cần làm</label><input id="nAction" value="${esc(r.next_action||'')}"></div><div class="field"><label>Hạn</label><input id="nDue" type="date" value="${esc(r.next_action_date||'')}"></div><div class="field"><label>Ưu tiên</label><select id="nPriority"><option>P1</option><option selected>P2</option><option>P3</option></select></div></div><div class="form-actions"><button class="btn btn-primary" data-save>Lưu việc tiếp theo</button></div>`,m=>{const a=m.querySelector('#nAction').value.trim(),d=m.querySelector('#nDue').value;if(!a||!d)return toast('Việc tiếp theo cần có nội dung và ngày.',true);r.next_action=a;r.next_action_date=d;r.overdue=false;m.remove();parent.remove();toast('Đã cập nhật việc tiếp theo.');renderShell();});}
function openAddSchool(){modal('Thêm trường',`<div class="form-grid"><div class="field full"><label>Tên trường *</label><input id="sName" placeholder="Ví dụ: Mầm non Hoa Sen"></div><div class="field"><label>Tỉnh/thành *</label><input id="sProvince" placeholder="Hà Nội"></div><div class="field"><label>Loại hình</label><select id="sType"><option>Công lập</option><option>Tư thục</option><option>Quốc tế</option></select></div><div class="field"><label>Người phụ trách</label><select id="sOwner"><option>Nhung</option><option>Dung</option><option>Thu</option><option>Staff 1</option><option>Staff 2</option><option>Staff 3</option></select></div><div class="field"><label>Trạng thái ban đầu</label><select id="sState"><option value="TARGET">Mục tiêu</option><option value="CONTACTED">Đã tiếp cận</option></select></div></div><div class="form-actions"><button class="btn btn-primary" data-save>Thêm trường</button></div>`,m=>{const name=m.querySelector('#sName').value.trim(),province=m.querySelector('#sProvince').value.trim();if(!name||!province)return toast('Tên trường và tỉnh/thành là bắt buộc.',true);state.schools.unshift({school_id:'S-'+Date.now(),school_name:name,province,current_owner_name:m.querySelector('#sOwner').value,relationship_state:m.querySelector('#sState').value,next_action:'Chưa có việc tiếp theo',next_action_date:'',overdue:false});m.remove();toast('Đã thêm trường. Hãy đặt việc tiếp theo.');renderShell();});}
function renderOpportunities(){document.getElementById('main').innerHTML=`<section class="page-head"><div><div class="eyebrow">CƠ HỘI</div><h1>Cơ hội đủ điều kiện</h1><p>Chỉ xuất hiện sau Discovery có Need Statement rõ. Không biến mọi trường thành deal.</p></div></section><section class="panel"><div class="empty">Chưa có cơ hội trong bản preview Phase 1.</div></section>`}
function renderAdmin(){document.getElementById('main').innerHTML=`<section class="page-head"><div><div class="eyebrow">QUẢN TRỊ</div><h1>Người dùng & phân quyền</h1><p>ID đăng nhập là email. Admin quản lý Leader/Staff và quyền giao trường.</p></div><button class="btn btn-primary">+ Thêm người dùng</button></section><section class="panel"><div class="panel-body"><div class="empty">Admin user management sẽ kết nối database V2 trong backend Phase 1.</div></div></section>`}

init();
