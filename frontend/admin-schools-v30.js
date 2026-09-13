// Admin School OS visibility patch — 2026-09-13
// Makes V2 SCHOOLS visible in the Admin workspace without changing commercial workflow.
(function(){
  if(typeof state==='undefined'||typeof bridge!=='function'||typeof render!=='function'||typeof paint!=='function')return;

  state.schools=state.schools||[];
  state.schoolDetail=null;
  state.schoolFilters=state.schoolFilters||{q:'',province:'',owner:'',status:''};

  const basePaint=paint;
  paint=function(){
    if(state.tab==='schools')return schoolsView();
    return basePaint();
  };

  const baseRender=render;
  render=function(){
    baseRender();
    const nav=document.querySelector('.tabs');
    if(nav&&!nav.querySelector('[data-tab="schools"]')){
      const b=document.createElement('button');
      b.dataset.tab='schools';
      b.textContent='TRƯỜNG HỌC';
      if(state.tab==='schools')b.classList.add('active');
      b.onclick=()=>{state.tab='schools';render();};
      nav.insertBefore(b,nav.firstChild);
    }
  };

  const baseLoad=load;
  load=async function(){
    await baseLoad();
    if(!state.user||String(state.user.role_code||'').toUpperCase()!=='ADMIN')return;
    try{
      state.schools=(await bridge('v2','schools.list',{}))||[];
    }catch(e){
      state.schools=[];
      if(typeof toast==='function')toast('Không tải được dữ liệu trường: '+e.message,true);
    }
    render();
  };

  function ownerName(id){
    const u=(state.users||[]).find(x=>String(x.user_id)===String(id));
    return u?(u.display_name||u.login_id||id):(id||'Chưa gán');
  }
  function unique(rows,key){return [...new Set(rows.map(x=>String(x[key]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));}
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function filteredSchools(){
    const f=state.schoolFilters||{},q=norm(f.q);
    return (state.schools||[]).filter(s=>{
      if(q&&!norm([s.school_name,s.province,s.district,s.contact_name,s.contact_phone,s.contact_email,ownerName(s.current_owner_id)].join(' ')).includes(q))return false;
      if(f.province&&String(s.province)!==f.province)return false;
      if(f.owner&&String(s.current_owner_id)!==f.owner)return false;
      if(f.status&&String(s.relationship_state)!==f.status)return false;
      return true;
    });
  }

  window.schoolsView=function(){
    const all=state.schools||[],rows=filteredSchools();
    const provinces=unique(all,'province'),statuses=unique(all,'relationship_state');
    const owners=[...new Set(all.map(x=>String(x.current_owner_id||'')).filter(Boolean))];
    const customer=all.filter(x=>String(x.relationship_state)==='CUSTOMER').length;
    const engaged=all.filter(x=>['ENGAGED','CONTACTED','NURTURE'].includes(String(x.relationship_state))).length;
    el('content').innerHTML=`<section class="hero"><div><span class="kicker">SCHOOL OS · MASTER V2</span><h1>Hồ sơ trường</h1><p>Danh sách trường đang hoạt động trong SUNBOT_SCHOOL_OS_DB_V2. Admin có thể tìm theo tên trường, tỉnh, đầu mối, Sale phụ trách và mở hồ sơ để xem lịch sử tương tác.</p></div><button class="btn secondary" id="schoolRefresh">Tải lại dữ liệu</button></section>
    <section class="metrics"><div class="metric"><b>${all.length}</b><span>Trường đang hoạt động</span></div><div class="metric"><b>${rows.length}</b><span>Đang hiển thị</span></div><div class="metric"><b>${customer}</b><span>Customer</span></div><div class="metric"><b>${engaged}</b><span>Đang chăm sóc/tiếp cận</span></div></section>
    <section class="filters"><input id="schoolQ" class="input" placeholder="Tìm trường, tỉnh, hiệu trưởng, số điện thoại..." value="${esc(state.schoolFilters.q||'')}"><select id="schoolProvince"><option value="">Tất cả tỉnh/thành</option>${provinces.map(v=>`<option ${state.schoolFilters.province===v?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="schoolOwner"><option value="">Tất cả phụ trách</option>${owners.map(id=>`<option value="${esc(id)}" ${state.schoolFilters.owner===id?'selected':''}>${esc(ownerName(id))}</option>`).join('')}</select><select id="schoolStatus"><option value="">Tất cả trạng thái</option>${statuses.map(v=>`<option ${state.schoolFilters.status===v?'selected':''}>${esc(v)}</option>`).join('')}</select></section>
    <section class="cards">${rows.length?rows.map(schoolCard).join(''):'<div class="empty">Không có trường phù hợp bộ lọc.</div>'}</section>`;
    el('schoolRefresh').onclick=async()=>{try{state.schools=(await call('v2','schools.list',{}))||[];schoolsView();}catch(e){toast(e.message,true)}};
    el('schoolQ').oninput=e=>{state.schoolFilters.q=e.target.value;schoolsView()};
    el('schoolProvince').onchange=e=>{state.schoolFilters.province=e.target.value;schoolsView()};
    el('schoolOwner').onchange=e=>{state.schoolFilters.owner=e.target.value;schoolsView()};
    el('schoolStatus').onchange=e=>{state.schoolFilters.status=e.target.value;schoolsView()};
    document.querySelectorAll('.open-school').forEach(b=>b.onclick=()=>openSchool(b.dataset.id));
  };

  function schoolCard(s){
    const contact=[s.contact_name,s.contact_phone,s.contact_email].filter(Boolean).join(' · ');
    return `<article class="card"><div class="card-top"><div><span class="pill">${esc(s.relationship_state||'TARGET')}</span><h3>${esc(s.school_name)}</h3><div class="meta"><span>${esc(s.province||'')}</span>${s.district?`<span>${esc(s.district)}</span>`:''}<span>Phụ trách: ${esc(ownerName(s.current_owner_id))}</span>${s.school_type?`<span>${esc(s.school_type)}</span>`:''}</div></div><button class="btn secondary open-school" data-id="${esc(s.school_id)}">Mở hồ sơ</button></div>${contact?`<div class="next"><span>ĐẦU MỐI</span><b>${esc(contact)}</b></div>`:''}</article>`;
  }

  async function openSchool(id){
    try{state.schoolDetail=await call('v2','schools.detail',{school_id:id});schoolDrawer();}
    catch(e){toast(e.message,true)}
  }

  function schoolDrawer(){
    const d=state.schoolDetail||{},s=d.school||{},interactions=d.interactions||[];
    const contact=[s.contact_name,s.contact_role,s.contact_phone,s.contact_email].filter(Boolean).join(' · ');
    el('drawerHost').innerHTML=`<div class="drawer"><section class="drawer-panel"><div class="drawer-head"><div><span class="kicker">HỒ SƠ TRƯỜNG</span><h2>${esc(s.school_name||'')}</h2><div class="meta"><span>${esc(s.province||'')}</span><span>${esc(s.relationship_state||'')}</span><span>Phụ trách: ${esc(ownerName(s.current_owner_id))}</span></div></div><button class="btn ghost" id="closeSchoolDrawer">✕</button></div>
    <section class="section"><h3>Thông tin hiện hành</h3><div class="event"><b>${esc(contact||'Chưa có đầu mối hiện hành')}</b>${s.address?`<div style="margin-top:5px">${esc(s.address)}</div>`:''}${s.website?`<div style="margin-top:5px">${esc(s.website)}</div>`:''}</div></section>
    <section class="section"><h3>Việc tiếp theo</h3><div class="event">${d.next_action?`<b>${esc(d.next_action.action_text||'')}</b><div style="margin-top:5px">Hạn: ${esc(String(d.next_action.due_date||'').slice(0,10))}</div>`:'Chưa có việc tiếp theo đang mở.'}</div></section>
    <section class="section"><h3>Lịch sử tương tác</h3><div class="timeline">${interactions.length?interactions.map(i=>`<div class="event"><b>${esc(i.interaction_type||'Tương tác')}</b><div>${esc(i.summary||'')}</div><small>${esc(String(i.interaction_at||'').slice(0,16).replace('T',' '))}</small></div>`).join(''):'<div class="empty">Chưa có interaction trong V2 cho trường này.</div>'}</div></section></section></div>`;
    el('closeSchoolDrawer').onclick=()=>{state.schoolDetail=null;el('drawerHost').innerHTML=''};
  }

  if(state.token){setTimeout(()=>{if(state.user)load();else baseLoad().then(()=>load()).catch(()=>{});},0);}
})();
