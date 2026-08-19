(function(){
  state.search=state.search||'';
  state.owner=state.owner||'ALL';
  state.pipelineSpecial=state.pipelineSpecial||'';

  function canTrackProfiles(){
    const can=(state.boot&&state.boot.can)||{};
    return !!(can['ceo.view']||can['admin.people']||can['account.view_all']);
  }

  function isCeoView(){return canTrackProfiles();}

  window.renderApp=function(){
    const u=(state.boot&&state.boot.user)||{};
    const canSync=isCeoView();
    el('app').innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><div class="logo sm">S</div><div><b>SUNBOT OPS</b><small>${esc(u.ho_ten||'')}</small></div></div><div class="header-actions">${canSync?'<button class="icon" id="syncBtn" title="Đồng bộ an toàn">↻</button>':''}<button class="icon" id="logoutBtn" title="Đăng xuất">⇥</button></div></header><nav class="tabs"><button data-tab="outreach" class="${state.tab==='outreach'?'active':''}">Trường</button><button data-tab="tasks" class="${state.tab==='tasks'?'active':''}">Công việc</button></nav><main id="content"></main></div>`;
    document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderContent()});
    el('logoutBtn').onclick=logout;
    if(canSync)el('syncBtn').onclick=syncOutreach;
    renderContent();
  };

  window.renderContent=function(){
    if(state.tab==='tasks'){
      if(!state.tasksLoaded){const c=el('content');if(c)c.innerHTML='<div class="empty">Đang tải công việc…</div>';call('fast','tasks',{filter:'DOING'}).then(rows=>{state.tasks=rows||[];state.tasksLoaded=true;if(state.tab==='tasks')renderTasks()}).catch(e=>toast(e.message,true));return;}
      return renderTasks();
    }
    return renderOutreach();
  };

  window.renderOutreach=function(){
    const s=state.summary||{};let rows=(state.rows||[]).slice();
    const q=String(state.search||'').trim().toLowerCase();
    if(q)rows=rows.filter(r=>[r.ten_truong,r.tinh_thanh,r.owner_name,r.next_action,r.dien_thoai_dau_moi,r.email_truong].join(' ').toLowerCase().includes(q));
    if(state.filter!=='ALL')rows=rows.filter(r=>r.trang_thai_thuc_hien===state.filter);
    if(state.province!=='ALL')rows=rows.filter(r=>r.tinh_thanh===state.province);
    if(isCeoView()&&state.owner!=='ALL')rows=rows.filter(r=>String(r.owner_user_id||'')===state.owner);
    rows=applySpecialRows_(rows,state.pipelineSpecial);
    const provinces=[...new Set((state.rows||[]).map(r=>r.tinh_thanh).filter(Boolean))].sort();
    const owners=(s.by_owner||[]).filter(x=>x.user_id);
    const command=renderRoleCommand_();
    const ceoSummary=isCeoView()?renderCeoSummary(s):'';
    const tracking=isCeoView()?'<section id="profileTrackingStrip" class="ceo-tracking-strip">Đang tải theo dõi E-profile…</section>':'';
    const ownerFilter=isCeoView()?`<select id="ownerFilter"><option value="ALL">Tất cả người phụ trách</option>${owners.map(o=>`<option value="${esc(o.user_id)}" ${state.owner===o.user_id?'selected':''}>${esc(shortOwnerName(o.name))} · ${Number(o.total||0)} trường</option>`).join('')}</select>`:'';
    el('content').innerHTML=`<section class="hero compact-hero"><div><h1>Trường & việc tiếp theo</h1><p>${Number(s.total||0)} trường · ${Number(s.overdue||0)} quá hạn · ${Number(s.dang_cho_phan_hoi||0)} chờ phản hồi</p></div><div class="hero-actions"><span class="freshness">${esc(freshnessText_())}</span><button class="btn add-school-btn" id="addSchoolBtn">＋ Thêm trường</button></div></section>${command}${ceoSummary}${tracking}<section class="filters minimal-filters ${isCeoView()?'ceo-filters':''}"><input id="schoolSearch" class="input" placeholder="Tìm trường / việc tiếp theo…" value="${esc(state.search||'')}"><select id="statusFilter"><option value="ALL">Tất cả trạng thái</option>${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}" ${state.filter===k?'selected':''}>${v}</option>`).join('')}</select><select id="provinceFilter"><option value="ALL">Tất cả địa bàn</option>${provinces.map(p=>`<option ${state.province===p?'selected':''}>${esc(p)}</option>`).join('')}</select>${ownerFilter}</section><section class="cards minimal-cards">${rows.length?rows.map(minimalCard).join(''):'<div class="empty">Không có trường phù hợp.</div>'}</section>`;
    el('addSchoolBtn').onclick=()=>{if(typeof window.openAddSchool==='function')window.openAddSchool();else toast('Chức năng thêm trường chưa sẵn sàng. Hãy tải lại trang.',true)};
    el('schoolSearch').oninput=e=>{state.search=e.target.value;renderOutreach()};
    el('statusFilter').onchange=e=>{state.filter=e.target.value;state.pipelineSpecial='';renderOutreach()};
    el('provinceFilter').onchange=e=>{state.province=e.target.value;renderOutreach()};
    if(isCeoView())el('ownerFilter').onchange=e=>{state.owner=e.target.value;renderOutreach()};
    document.querySelectorAll('[data-pipeline-filter]').forEach(b=>b.onclick=()=>applyPipelineFilter(b.dataset.pipelineFilter));
    document.querySelectorAll('[data-owner-filter]').forEach(b=>b.onclick=()=>{state.owner=b.dataset.ownerFilter||'ALL';renderOutreach()});
    document.querySelectorAll('.school-card .detail').forEach(b=>b.onclick=()=>{const row=state.rows.find(x=>x.outreach_id===b.closest('.school-card').dataset.id);if(row&&window.openSchoolWorkspace)window.openSchoolWorkspace(row)});
    if(isCeoView())loadTrackingStrip(false);
  };

  function renderRoleCommand_(){
    const d=state.dashboard||{};const g=d.guide||{};const e=d.exceptions||{};
    if(!g.title)return '';
    const primary=isCeoView()
      ? `<div class="role-exceptions"><button data-pipeline-filter="OVERDUE"><b>${Number(e.overdue||0)}</b><span>Quá hạn</span></button><button data-pipeline-filter="MISSING_NEXT"><b>${Number(e.missing_next_action||0)}</b><span>Thiếu việc tiếp theo</span></button><button data-pipeline-filter="MISSING_DATE"><b>${Number(e.missing_next_date||0)}</b><span>Thiếu ngày</span></button></div>`
      : `<div class="role-exceptions"><button data-pipeline-filter="TODO"><b>${Number((state.summary||{}).can_lam_hom_nay||0)}</b><span>Cần xử lý</span></button><button data-pipeline-filter="OVERDUE"><b>${Number(e.overdue||0)}</b><span>Quá hạn</span></button><button data-pipeline-filter="WAITING"><b>${Number(e.waiting||0)}</b><span>Chờ phản hồi</span></button></div>`;
    const bullets=(g.bullets||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    return `<section class="role-command"><div class="role-command-copy"><strong>${esc(g.title)}</strong><span>${esc(g.intro||'')}</span></div>${primary}<details class="quick-guide"><summary>Hướng dẫn nhanh</summary><ul>${bullets}</ul></details></section>`;
  }

  function freshnessText_(){
    if(!state.generatedAt)return 'Đang đồng bộ';
    const d=new Date(String(state.generatedAt).replace(' ','T'));
    if(isNaN(d))return 'Dữ liệu vừa tải';
    const mins=Math.max(0,Math.round((Date.now()-d.getTime())/60000));
    if(mins<=1)return 'Dữ liệu vừa cập nhật';
    if(mins<60)return `Cập nhật ${mins} phút trước`;
    return 'Dữ liệu có thể đã cũ · bấm ↻ nếu cần';
  }

  function renderCeoSummary(s){
    const p=s.pipeline||{};const owners=s.by_owner||[];
    const ownerPills=owners.filter(o=>o.user_id).map(o=>`<button class="owner-pill ${state.owner===o.user_id?'active':''}" data-owner-filter="${esc(o.user_id)}"><b>${esc(shortOwnerName(o.name))}</b><span>${Number(o.total||0)} trường${Number(o.overdue||0)?' · '+Number(o.overdue)+' quá hạn':''}</span></button>`).join('');
    return `<section class="ceo-school-summary"><div class="ceo-kpis exception-kpis"><button class="${state.pipelineSpecial==='OVERDUE'?'active':''}" data-pipeline-filter="OVERDUE"><b>${Number(s.overdue||0)}</b><span>Quá hạn</span></button><button class="${state.pipelineSpecial==='MISSING_NEXT'?'active':''}" data-pipeline-filter="MISSING_NEXT"><b>${Number(s.missing_next_action||0)}</b><span>Thiếu bước tiếp theo</span></button><button class="${state.pipelineSpecial==='MISSING_DATE'?'active':''}" data-pipeline-filter="MISSING_DATE"><b>${Number(s.missing_next_date||0)}</b><span>Thiếu ngày cam kết</span></button><button class="${state.filter==='DANG_CHO_PHAN_HOI'?'active':''}" data-pipeline-filter="WAITING"><b>${Number(p.waiting||0)}</b><span>Chờ phản hồi</span></button><button class="${state.pipelineSpecial==='PROGRESS'?'active':''}" data-pipeline-filter="PROGRESS"><b>${Number((p.responded||0)+(p.meeting||0)+(p.opportunity||0))}</b><span>Đang tiến triển</span></button><button class="${state.filter==='CHAM_SOC_ACCOUNT'?'active':''}" data-pipeline-filter="CUSTOMER"><b>${Number(p.customer||0)}</b><span>Đang hợp tác</span></button></div>${ownerPills?`<div class="owner-pills"><span class="owner-label">Phụ trách</span><button class="owner-pill ${state.owner==='ALL'?'active':''}" data-owner-filter="ALL"><b>Tất cả</b></button>${ownerPills}</div>`:''}</section>`;
  }

  function applyPipelineFilter(kind){
    state.pipelineSpecial='';
    if(kind==='ALL')state.filter='ALL';
    else if(kind==='WAITING')state.filter='DANG_CHO_PHAN_HOI';
    else if(kind==='CUSTOMER')state.filter='CHAM_SOC_ACCOUNT';
    else {state.filter='ALL';state.pipelineSpecial=kind;}
    renderOutreach();
  }

  function applySpecialRows_(rows,kind){
    if(!kind)return rows;
    if(kind==='TODO'){
      const allowed=['CAN_GUI','CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU','TIEP_CAN_CHIEN_LUOC','DANG_SOAN'];
      return rows.filter(r=>allowed.includes(String(r.trang_thai_thuc_hien||'')));
    }
    if(kind==='PROGRESS'){
      const allowed=['DA_PHAN_HOI','DA_HEN_TRAO_DOI','DA_TAO_CO_HOI'];
      return rows.filter(r=>allowed.includes(String(r.trang_thai_thuc_hien||'')));
    }
    if(kind==='OVERDUE'){
      const today=new Date();today.setHours(0,0,0,0);
      return rows.filter(r=>{const d=parseLooseDate(r.next_action_date);return d&&d<today&&!['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||''));});
    }
    if(kind==='MISSING_NEXT')return rows.filter(r=>!String(r.next_action||'').trim()&&!['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||'')));
    if(kind==='MISSING_DATE')return rows.filter(r=>String(r.next_action||'').trim()&&!String(r.next_action_date||'').trim()&&!['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||'')));
    return rows;
  }

  function parseLooseDate(v){
    if(!v)return null;const s=String(v).trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);const d=new Date(s);return isNaN(d)?null:d;
  }

  async function loadTrackingStrip(force){
    const host=document.getElementById('profileTrackingStrip');if(!host)return;
    if(state.profileTracking&&!force){paintTrackingStrip(state.profileTracking);return;}
    try{const r=await call('journey','trackingSummary',{});state.profileTracking=r||{};paintTrackingStrip(state.profileTracking);}catch(e){host.textContent='Chưa tải được dữ liệu E-profile.';}
  }

  function paintTrackingStrip(data){
    const host=document.getElementById('profileTrackingStrip');if(!host)return;
    const by=(data&&data.by_user)||[];const prospects=(data&&data.opened_prospects)||[];
    if(!by.length&&!prospects.length){host.innerHTML='<b>E-profile</b> · Chưa có lượt gửi được ghi nhận.';return;}
    const people=by.map(x=>{const sent=Number(x.sent||0),opened=Number(x.opened_links||0),rate=sent?Math.round(opened/sent*100):0;return `<span><b>${esc(shortOwnerName(x.name||x.user_id))}</b>: ${sent} gửi · ${opened} trường mở · ${rate}%</span>`}).join('');
    const recent=prospects.slice(0,5).map(x=>`${esc(x.school_name||'Trường')} — ${esc(shortOwnerName(x.owner_name||''))}${Number(x.interest_score||0)>=25?' ★':''}`).join(' · ');
    host.innerHTML=`<div class="tracking-people"><strong>E-profile</strong>${people}</div>${recent?`<div class="tracking-recent">Mở gần đây: ${recent}</div>`:''}`;
  }

  function shortOwnerName(name){
    const s=String(name||'').trim();if(!s)return '';
    const parts=s.split(/\s+/);return parts[parts.length-1]||s;
  }

  function statusGroup(code){
    code=String(code||'').toUpperCase();
    if(['CAN_GUI','CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU','TIEP_CAN_CHIEN_LUOC','DANG_SOAN'].includes(code))return 'todo';
    if(code==='DANG_CHO_PHAN_HOI')return 'waiting';
    if(['DA_PHAN_HOI','DA_HEN_TRAO_DOI','DA_TAO_CO_HOI'].includes(code))return 'progress';
    if(code==='CHAM_SOC_ACCOUNT')return 'customer';
    if(['TAM_DUNG','THEO_DOI'].includes(code))return 'paused';
    return 'neutral';
  }

  function minimalCard(r){
    const status=STATUS_LABELS[r.trang_thai_thuc_hien]||r.trang_thai_thuc_hien||'Chưa xác định';
    const group=statusGroup(r.trang_thai_thuc_hien);
    const action=String(r.next_action||'').trim();
    const date=String(r.next_action_date||'').trim();
    const due=date?`<span class="next-date">${esc(date)}</span>`:'<span class="next-date missing">Chưa có ngày</span>';
    const next=action?`<div class="next canonical-next"><span class="next-label">Việc tiếp theo</span><b>${esc(action)}</b>${due}</div>`:`<div class="next canonical-next missing-next"><span class="next-label">Việc tiếp theo</span><b>Chưa có cam kết tiếp theo</b></div>`;
    const owner=isCeoView()&&r.owner_name?`<span class="badge owner-badge">${esc(shortOwnerName(r.owner_name))}</span>`:'';
    return `<article class="school-card minimal-card status-${group} ${!action?'needs-next':''}" data-id="${esc(r.outreach_id)}"><div class="card-head"><div><div class="badges"><span class="badge">${esc(r.tinh_thanh||'')}</span>${owner}</div><h3>${esc(r.ten_truong)}</h3><span class="status-chip status-chip-${group}">${esc(status)}</span></div></div>${next}<div class="actions"><button class="btn detail">Mở hồ sơ</button></div></article>`;
  }

  function simplifyWorkspace(){
    const panel=document.querySelector('#workspaceOverlay.open .workspace-panel');if(!panel)return;
    panel.querySelectorAll('.workspace-head .priority,.workspace-head .soft').forEach(x=>x.style.display='none');
    panel.querySelectorAll('.workspace-grid>.ws-card').forEach(card=>{
      const title=(card.querySelector('h3')?.textContent||'').toLowerCase();
      const keep=title.includes('liên hệ')||title.includes('công việc đang mở')||title.includes('lịch sử');
      if(!keep)card.style.display='none';
    });
    const toolbar=panel.querySelector('.workspace-toolbar');if(!toolbar)return;
    [...toolbar.children].forEach(x=>{if(!x.classList.contains('primary-action'))x.style.display='none'});
    if(document.getElementById('primaryConnect'))return;
    const actions=[['primaryConnect','Kết nối',()=>document.getElementById('journeyComposeBtn')?.click()],['primaryMeeting','Đặt lịch',()=>document.getElementById('meeting40Btn')?.click()],['primaryRecord','Ghi nhận',()=>openRecordChoice()],['primaryNext','Việc tiếp theo',()=>document.getElementById('wsFollow')?.click()]];
    actions.forEach(a=>{const b=document.createElement('button');b.id=a[0];b.className='btn primary-action';b.textContent=a[1];b.onclick=a[2];toolbar.appendChild(b)});
  }

  function openRecordChoice(){
    const host=document.getElementById('wsSubpanel');if(!host)return;
    host.innerHTML='<div class="subpanel open"><div class="subpanel-card compact"><div class="subpanel-head"><h3>Ghi nhận</h3><button id="recordClose">×</button></div><p class="muted">Chọn đúng việc vừa xảy ra. Timeline sẽ được cập nhật tự động.</p><div class="row-actions"><button class="btn" id="recordResponse">Phản hồi nhanh</button><button class="btn secondary" id="recordDiscovery">Buổi trao đổi / nhu cầu</button></div></div></div>';
    document.getElementById('recordClose').onclick=()=>host.innerHTML='';
    document.getElementById('recordResponse').onclick=()=>{host.innerHTML='';document.getElementById('wsResponse')?.click()};
    document.getElementById('recordDiscovery').onclick=()=>{host.innerHTML='';document.getElementById('discoveryBtn')?.click()};
  }

  window.addEventListener('sunbot-tracking-changed',()=>{state.profileTracking=null;if(state.tab==='outreach'&&isCeoView())loadTrackingStrip(true)});
  const obs=new MutationObserver(()=>simplifyWorkspace());obs.observe(document.documentElement,{childList:true,subtree:true});
})();
