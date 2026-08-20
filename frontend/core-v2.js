(function(){
  const BUILD='core-v2.1';
  state.search=state.search||'';
  state.owner=state.owner||'ALL';
  state.pipelineSpecial=state.pipelineSpecial||'';

  function isManager(){const c=(state.boot&&state.boot.can)||{};return !!(c['ceo.view']||c['admin.people']||c['account.view_all']);}
  function statusLabel(r){return (window.STATUS_LABELS&&STATUS_LABELS[r.trang_thai_thuc_hien])||r.trang_thai_thuc_hien||'Chưa xác định';}
  function dueDate(v){if(!v)return null;const d=new Date(String(v).slice(0,10)+'T00:00:00');return isNaN(d)?null:d;}
  function isOverdue(r){const d=dueDate(r.next_action_date);if(!d)return false;const t=new Date();t.setHours(0,0,0,0);return d<t&&!['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||''));}
  function shortName(v){const a=String(v||'').trim().split(/\s+/);return a[a.length-1]||'';}

  window.renderOutreach=function(){
    const host=el('content');if(!host)return;
    const s=state.summary||{},p=s.pipeline||{};
    let rows=(state.rows||[]).slice();
    const q=String(state.search||'').trim().toLowerCase();
    if(q)rows=rows.filter(r=>[r.ten_truong,r.tinh_thanh,r.owner_name,r.next_action,r.email_truong,r.dien_thoai_dau_moi].join(' ').toLowerCase().includes(q));
    if(state.filter&&state.filter!=='ALL')rows=rows.filter(r=>String(r.trang_thai_thuc_hien)===String(state.filter));
    if(state.province&&state.province!=='ALL')rows=rows.filter(r=>String(r.tinh_thanh)===String(state.province));
    if(isManager()&&state.owner!=='ALL')rows=rows.filter(r=>String(r.owner_user_id||'')===String(state.owner));
    if(state.pipelineSpecial==='OVERDUE')rows=rows.filter(isOverdue);
    if(state.pipelineSpecial==='MISSING_NEXT')rows=rows.filter(r=>!String(r.next_action||'').trim()&&!['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||'')));
    if(state.pipelineSpecial==='PROGRESS')rows=rows.filter(r=>['DA_PHAN_HOI','DA_HEN_TRAO_DOI','DA_TAO_CO_HOI'].includes(String(r.trang_thai_thuc_hien||'')));

    const provinces=[...new Set((state.rows||[]).map(r=>r.tinh_thanh).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'vi'));
    const owners=(s.by_owner||[]).filter(x=>x.user_id);
    const ownerFilter=isManager()?`<select id="ownerFilter"><option value="ALL">Tất cả người phụ trách</option>${owners.map(o=>`<option value="${esc(o.user_id)}" ${state.owner===o.user_id?'selected':''}>${esc(shortName(o.name))} · ${Number(o.total||0)} trường</option>`).join('')}</select>`:'';
    const managerStrip=isManager()?`<section class="ceo-school-summary core-summary"><button data-core-filter="OVERDUE"><b>${Number(s.overdue||0)}</b><span>Quá hạn</span></button><button data-core-filter="MISSING_NEXT"><b>${Number(s.missing_next_action||0)}</b><span>Thiếu bước tiếp theo</span></button><button data-core-status="DANG_CHO_PHAN_HOI"><b>${Number(p.waiting||0)}</b><span>Chờ phản hồi</span></button><button data-core-filter="PROGRESS"><b>${Number((p.responded||0)+(p.meeting||0)+(p.opportunity||0))}</b><span>Đang tiến triển</span></button></section>`:`<section class="role-command core-summary"><div><strong>Việc của tôi hôm nay</strong><span>Ưu tiên trường đến hạn và luôn chốt một bước tiếp theo có ngày.</span></div><div class="core-sale-counts"><b>${Number(s.can_lam_hom_nay||0)} cần xử lý</b><b>${Number(s.overdue||0)} quá hạn</b><b>${Number(s.dang_cho_phan_hoi||0)} chờ phản hồi</b></div></section>`;

    host.innerHTML=`<section class="hero compact-hero core-hero"><div><span class="core-kicker">SCHOOL DEVELOPMENT</span><h1>Trường & việc tiếp theo</h1><p>${Number(s.total||0)} trường · ${Number(s.overdue||0)} quá hạn · ${Number(s.dang_cho_phan_hoi||0)} chờ phản hồi</p></div><div class="hero-actions"><small class="core-build">${BUILD}</small><button class="btn add-school-btn" id="addSchoolBtn">＋ Thêm trường</button></div></section>${managerStrip}<section class="filters minimal-filters core-filters"><input id="schoolSearch" class="input" placeholder="Tìm trường / việc tiếp theo…" value="${esc(state.search||'')}"><select id="statusFilter"><option value="ALL">Tất cả trạng thái</option>${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}" ${state.filter===k?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="provinceFilter"><option value="ALL">Tất cả địa bàn</option>${provinces.map(x=>`<option value="${esc(x)}" ${state.province===x?'selected':''}>${esc(x)}</option>`).join('')}</select>${ownerFilter}</section><section class="cards minimal-cards core-school-list">${rows.length?rows.map(cardHtml).join(''):'<div class="empty">Không có trường phù hợp.</div>'}</section>`;

    el('addSchoolBtn').onclick=()=>window.openAddSchool&&window.openAddSchool();
    el('schoolSearch').oninput=e=>{state.search=e.target.value;renderOutreach();};
    el('statusFilter').onchange=e=>{state.filter=e.target.value;state.pipelineSpecial='';renderOutreach();};
    el('provinceFilter').onchange=e=>{state.province=e.target.value;renderOutreach();};
    if(isManager()&&el('ownerFilter'))el('ownerFilter').onchange=e=>{state.owner=e.target.value;renderOutreach();};
    document.querySelectorAll('[data-core-filter]').forEach(b=>b.onclick=()=>{state.filter='ALL';state.pipelineSpecial=b.dataset.coreFilter||'';renderOutreach();});
    document.querySelectorAll('[data-core-status]').forEach(b=>b.onclick=()=>{state.pipelineSpecial='';state.filter=b.dataset.coreStatus||'ALL';renderOutreach();});
    document.querySelectorAll('.core-open-school').forEach(b=>b.onclick=()=>{const r=(state.rows||[]).find(x=>String(x.outreach_id)===String(b.dataset.id));if(r&&window.openSchoolWorkspace)window.openSchoolWorkspace(r);});
    window.dispatchEvent(new CustomEvent('sunbot-core-rendered'));
  };

  function cardHtml(r){
    const action=String(r.next_action||'').trim();const due=String(r.next_action_date||'').trim();const overdue=isOverdue(r);
    return `<article class="school-card core-card ${overdue?'core-overdue':''}" data-id="${esc(r.outreach_id)}"><div class="core-card-top"><div><div class="badges"><span class="badge">${esc(r.tinh_thanh||'')}</span>${isManager()&&r.owner_name?`<span class="badge owner-badge">${esc(shortName(r.owner_name))}</span>`:''}</div><h3>${esc(r.ten_truong||'')}</h3><span class="school-status">${esc(statusLabel(r))}</span></div><button class="btn ghost detail core-open-school" data-id="${esc(r.outreach_id)}">Mở hồ sơ</button></div><div class="core-next"><span>VIỆC TIẾP THEO</span><b>${action?esc(action):'Chưa có bước tiếp theo'}</b><small class="${overdue?'warn':''}">${due?(overdue?'Quá hạn · ':'Hạn ')+esc(due):'Chưa có ngày cam kết'}</small></div></article>`;
  }

  function workspaceRow(){const h=document.querySelector('#workspaceOverlay.open .workspace-head h2');if(!h)return null;const n=String(h.textContent||'').trim();return (state.rows||[]).find(r=>String(r.ten_truong||'').trim()===n)||null;}
  function ensureWorkspaceCore(){
    const panel=document.querySelector('#workspaceOverlay.open .workspace-panel');const toolbar=panel&&panel.querySelector('.workspace-toolbar');if(!toolbar||panel.classList.contains('loading-panel'))return;
    const row=workspaceRow();if(!row)return;
    if(toolbar.dataset.coreV2==='1')return;toolbar.dataset.coreV2='1';
    [...toolbar.children].forEach(x=>x.style.display='none');
    const actions=[
      ['coreConnect','Kết nối',()=>document.getElementById('journeyComposeBtn')?.click()],
      ['coreMeeting','Đặt lịch',()=>document.getElementById('meeting40Btn')?.click()],
      ['primaryRecord','Trao đổi',()=>document.getElementById('discoveryBtn')?.click()],
      ['coreNext','Việc tiếp theo',()=>document.getElementById('wsFollow')?.click()],
      ['coreDocs','Tài liệu & Proposal',()=>document.getElementById('documentsBtn')?.click()]
    ];
    actions.forEach(([id,label,fn])=>{const b=document.createElement('button');b.id=id;b.className='btn primary-action core-action';b.textContent=label;b.onclick=fn;toolbar.appendChild(b);});
    // Engagement module upgrades primaryRecord to full Meeting Mode when available.
    setTimeout(()=>{const p=document.getElementById('primaryRecord');if(p&&!p.dataset.methodBound&&document.getElementById('discoveryBtn'))p.onclick=()=>document.getElementById('discoveryBtn').click();},50);
  }

  const observer=new MutationObserver(()=>ensureWorkspaceCore());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{if(state.boot&&state.tab==='outreach')setTimeout(()=>renderOutreach(),0);});
})();
