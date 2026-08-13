(function(){
  state.search=state.search||'';

  window.renderApp=function(){
    const u=(state.boot&&state.boot.user)||{};
    const canSync=!!(state.boot&&state.boot.can&&((state.boot.can['ceo.view'])||(state.boot.can['admin.people'])||(state.boot.can['account.view_all'])));
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
    if(q)rows=rows.filter(r=>[r.ten_truong,r.tinh_thanh,r.hanh_dong_de_xuat,r.dien_thoai_dau_moi,r.email_truong].join(' ').toLowerCase().includes(q));
    if(state.filter!=='ALL')rows=rows.filter(r=>r.trang_thai_thuc_hien===state.filter);
    if(state.province!=='ALL')rows=rows.filter(r=>r.tinh_thanh===state.province);
    const provinces=[...new Set((state.rows||[]).map(r=>r.tinh_thanh).filter(Boolean))].sort();
    el('content').innerHTML=`<section class="hero"><div><h1>Việc với trường</h1><p>${Number(s.can_lam_hom_nay||0)} trường cần xử lý · ${Number(s.dang_cho_phan_hoi||0)} đang chờ phản hồi</p></div><button class="btn add-school-btn" id="addSchoolBtn">＋ Thêm trường</button></section><section class="filters minimal-filters"><input id="schoolSearch" class="input" placeholder="Tìm trường…" value="${esc(state.search||'')}"><select id="statusFilter"><option value="ALL">Tất cả trạng thái</option>${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}" ${state.filter===k?'selected':''}>${v}</option>`).join('')}</select><select id="provinceFilter"><option value="ALL">Tất cả địa bàn</option>${provinces.map(p=>`<option ${state.province===p?'selected':''}>${esc(p)}</option>`).join('')}</select></section><section class="cards minimal-cards">${rows.length?rows.map(minimalCard).join(''):'<div class="empty">Không có trường phù hợp.</div>'}</section>`;
    el('addSchoolBtn').onclick=()=>{if(typeof window.openAddSchool==='function')window.openAddSchool();else toast('Chức năng thêm trường chưa sẵn sàng. Hãy tải lại trang.',true)};
    el('schoolSearch').oninput=e=>{state.search=e.target.value;renderOutreach()};
    el('statusFilter').onchange=e=>{state.filter=e.target.value;renderOutreach()};
    el('provinceFilter').onchange=e=>{state.province=e.target.value;renderOutreach()};
    document.querySelectorAll('.school-card .detail').forEach(b=>b.onclick=()=>{const row=state.rows.find(x=>x.outreach_id===b.closest('.school-card').dataset.id);if(row&&window.openSchoolWorkspace)window.openSchoolWorkspace(row)});
  };

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
    const due=r.ngay_theo_doi_lai?`<small>Hạn: ${esc(r.ngay_theo_doi_lai)}</small>`:'';
    return `<article class="school-card minimal-card status-${group}" data-id="${esc(r.outreach_id)}"><div class="card-head"><div><div class="badges"><span class="badge">${esc(r.tinh_thanh||'')}</span></div><h3>${esc(r.ten_truong)}</h3><span class="status-chip status-chip-${group}">${esc(status)}</span></div></div>${r.hanh_dong_de_xuat?`<div class="next"><b>Tiếp theo:</b> ${esc(r.hanh_dong_de_xuat)} ${due}</div>`:''}<div class="actions"><button class="btn detail">Mở hồ sơ</button></div></article>`;
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

  const obs=new MutationObserver(()=>simplifyWorkspace());obs.observe(document.documentElement,{childList:true,subtree:true});
})();
