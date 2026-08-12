(function(){
  function q(id){return document.getElementById(id)}
  function esc2(v){return typeof esc==='function'?esc(v||''):String(v||'')}

  function ensureAddButton(){
    if(!window.state||state.tab!=='outreach')return;
    const hero=document.querySelector('#content .hero');
    if(!hero||q('addSchoolBtn'))return;
    const btn=document.createElement('button');
    btn.id='addSchoolBtn';btn.className='btn add-school-btn';btn.textContent='＋ Thêm trường mới';
    btn.onclick=openAddSchool;
    hero.appendChild(btn);
  }

  function openAddSchool(){
    let x=q('workspaceOverlay');
    if(!x){x=document.createElement('div');x.id='workspaceOverlay';x.className='workspace-overlay';document.body.appendChild(x)}
    const provinces=[...new Set((state.rows||[]).map(r=>String(r.tinh_thanh||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
    const preferred=state.province&&state.province!=='ALL'?state.province:'';
    x.classList.add('open');document.body.classList.add('workspace-open');
    x.innerHTML=`<div class="workspace-panel add-school-panel">
      <header class="workspace-head"><div><h2>Thêm trường mới</h2><p>Chỉ cần tên trường và tỉnh/thành. Các thông tin khác có thể bổ sung sau.</p></div><button class="workspace-close" id="addClose">×</button></header>
      <div class="add-school-form">
        <label>Tên trường <span class="required">*</span><input id="newSchoolName" class="input" placeholder="Ví dụ: Mầm non Hoa Mai"></label>
        <label>Tỉnh / thành <span class="required">*</span><input id="newProvince" class="input" list="provinceList" value="${esc2(preferred)}" placeholder="Ví dụ: Hà Nội"><datalist id="provinceList">${provinces.map(p=>`<option value="${esc2(p)}"></option>`).join('')}</datalist></label>
        <details class="optional-details"><summary>Thêm email hoặc điện thoại nếu đã có</summary><div class="form-grid compact-grid">
          <label>Email trường<input id="newSchoolEmail" class="input" type="email" placeholder="Có thể để trống"></label>
          <label>Điện thoại / đầu mối<input id="newSchoolPhone" class="input" placeholder="Có thể để trống"></label>
        </div></details>
        <div class="default-note"><b>Hệ thống sẽ tự làm:</b><br>• Gán người đang đăng nhập làm người chăm sóc<br>• Mặc định P2<br>• Có email → tạo việc gửi hồ sơ<br>• Chưa có email → tạo việc xác minh contact</div>
        <button class="btn full" id="saveNewSchool">Thêm vào danh sách công việc</button>
      </div>
    </div>`;
    q('addClose').onclick=closeAdd;
    x.onclick=e=>{if(e.target===x)closeAdd()};
    q('saveNewSchool').onclick=saveNewSchool;
    setTimeout(()=>q('newSchoolName')?.focus(),30);
  }

  function closeAdd(){const x=q('workspaceOverlay');if(x)x.classList.remove('open');document.body.classList.remove('workspace-open')}

  async function saveNewSchool(){
    const name=String(q('newSchoolName')?.value||'').trim();
    const province=String(q('newProvince')?.value||'').trim();
    const email=String(q('newSchoolEmail')?.value||'').trim();
    const phone=String(q('newSchoolPhone')?.value||'').trim();
    if(name.length<3)return toast('Hãy nhập tên trường.',true);
    if(province.length<2)return toast('Hãy nhập tỉnh/thành.',true);
    try{
      const res=await call('outreachCreate','',{ten_truong:name,tinh_thanh:province,email_truong:email,dien_thoai_dau_moi:phone});
      closeAdd();
      if(window.refreshWorkspaceData)await window.refreshWorkspaceData();
      toast(res.message||'Đã thêm trường.');
      const row=(state.rows||[]).find(r=>String(r.outreach_id)===String(res.outreach_id));
      if(row&&window.openSchoolWorkspace)window.openSchoolWorkspace(row);
    }catch(err){toast(err.message,true)}
  }

  function simplifyWorkspace(){
    const panel=document.querySelector('#workspaceOverlay .workspace-panel');
    if(!panel||!q('wsSchoolEmail')||panel.dataset.simplified==='1')return;
    panel.dataset.simplified='1';

    const contactCard=[...panel.querySelectorAll('.ws-card')].find(s=>s.querySelector('#wsSchoolEmail'));
    if(contactCard){
      const h=contactCard.querySelector('h3');if(h)h.textContent='Liên hệ';
      [...contactCard.querySelectorAll('label')].forEach(label=>{
        if(label.querySelector('#wsAddress')||label.querySelector('#wsOwner')||label.querySelector('#wsFollowDate')||label.textContent.trim().startsWith('Người chăm sóc'))label.classList.add('advanced-field');
      });
      const ownerBtn=q('wsSaveOwner');if(ownerBtn)ownerBtn.classList.add('advanced-field');
      const actions=contactCard.querySelector('.row-actions');
      if(actions&&!q('toggleAdvanced')){
        const b=document.createElement('button');b.id='toggleAdvanced';b.className='btn ghost';b.type='button';b.textContent='Thông tin bổ sung';
        b.onclick=()=>{
          const show=!panel.classList.contains('show-advanced');panel.classList.toggle('show-advanced',show);b.textContent=show?'Ẩn thông tin bổ sung':'Thông tin bổ sung';
        };
        actions.appendChild(b);
      }
    }

    const strategyCard=[...panel.querySelectorAll('.ws-card')].find(s=>s.querySelector('#wsMessage'));
    if(strategyCard)strategyCard.classList.add('advanced-section');

    const softBadge=panel.querySelector('.workspace-head .badge.soft');
    if(softBadge)softBadge.classList.add('advanced-inline');
  }

  const observer=new MutationObserver(()=>{ensureAddButton();simplifyWorkspace()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureAddButton,100));
})();
