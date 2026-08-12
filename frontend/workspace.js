(function(){
  const STATUS_OPTIONS=[
    ['CAN_GUI','Cần gửi hồ sơ'],['CAN_XAC_MINH','Cần xác minh rồi gửi'],['CAN_XAC_MINH_DU_LIEU','Cần xác minh dữ liệu'],
    ['TIEP_CAN_CHIEN_LUOC','Tiếp cận chiến lược'],['DANG_SOAN','Đang chuẩn bị thư'],['DANG_CHO_PHAN_HOI','Đang chờ phản hồi'],
    ['DA_PHAN_HOI','Đã có phản hồi'],['DA_HEN_TRAO_DOI','Đã hẹn trao đổi'],['DA_TAO_CO_HOI','Đã tạo cơ hội'],
    ['TAM_DUNG','Tạm dừng'],['THEO_DOI','Theo dõi'],['CHAM_SOC_ACCOUNT','Trường đang hợp tác']
  ];
  const PRODUCTS=['Lập trình tư duy cùng Sunbot','STEAM Sáng tạo cùng Sunbot','Lab / thiết bị','Chuyển giao / đào tạo','Sự kiện','Khác'];
  let current=null;

  function q(id){return document.getElementById(id)}
  function e(v){return esc(v||'')}
  function todayPlus(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
  function money(v){const n=Number(v||0);return n?new Intl.NumberFormat('vi-VN').format(n)+' đ':'—'}

  async function refreshAll(){
    const [summary,rows,tasks]=await Promise.all([call('outreach','summary',{}),call('outreach','list',{}),call('core','tasks',{filter:'DOING'})]);
    state.summary=summary;state.rows=rows||[];state.tasks=tasks||[];
    if(state.tab==='outreach')renderOutreach(); else renderContent();
  }
  window.refreshWorkspaceData=refreshAll;

  function openShell(){
    let x=q('workspaceOverlay');
    if(!x){x=document.createElement('div');x.id='workspaceOverlay';x.className='workspace-overlay';document.body.appendChild(x)}
    x.classList.add('open');document.body.classList.add('workspace-open');
  }
  function closeShell(){const x=q('workspaceOverlay');if(x)x.classList.remove('open');document.body.classList.remove('workspace-open');current=null}

  async function openWorkspace(row){
    openShell();q('workspaceOverlay').innerHTML='<div class="workspace-panel loading-panel"><div class="workspace-loading">Đang mở hồ sơ trường…</div></div>';
    try{
      current=await call('outreachWorkspace','detail',{outreach_id:row.outreach_id});
      renderWorkspace();
    }catch(err){closeShell();toast(err.message,true)}
  }
  window.openSchoolWorkspace=openWorkspace;

  function renderWorkspace(){
    const d=current||{},r=d.outreach||{},a=d.account||{},owner=d.owner||{};
    const status=STATUS_LABELS[r.trang_thai_thuc_hien]||r.trang_thai_thuc_hien||'';
    const canMail=!!r.email_truong;
    const people=(d.people||[]);
    const tasks=d.tasks||[],opps=d.opportunities||[];
    q('workspaceOverlay').innerHTML=`<div class="workspace-panel">
      <header class="workspace-head">
        <div><div class="badges"><span class="badge priority">${e(r.uu_tien)}</span><span class="badge">${e(r.tinh_thanh)}</span><span class="badge soft">${e(WAVE_LABELS[r.dot_trien_khai]||r.dot_trien_khai)}</span></div><h2>${e(r.ten_truong)}</h2><p>${e(status)}</p></div>
        <button class="workspace-close" id="wsClose" aria-label="Đóng">×</button>
      </header>
      <div class="workspace-toolbar">
        <button class="btn" id="wsEmail" ${canMail?'':'disabled'}>✉ Soạn email</button>
        <button class="btn secondary" id="wsResponse">↩ Ghi nhận phản hồi</button>
        <button class="btn secondary" id="wsFollow">⏰ Đặt việc tiếp theo</button>
        <button class="btn ghost" id="wsOpp">＋ Tạo cơ hội</button>
      </div>
      <div class="workspace-grid">
        <section class="ws-card span2"><h3>Thông tin liên hệ & phụ trách</h3>
          <div class="form-grid">
            <label>Email trường<input id="wsSchoolEmail" class="input" type="email" value="${e(r.email_truong)}" placeholder="email@truong.edu.vn"></label>
            <label>Điện thoại / đầu mối<input id="wsPhone" class="input" value="${e(r.dien_thoai_dau_moi)}"></label>
            <label class="wide">Địa chỉ thư tín<input id="wsAddress" class="input" value="${e(r.dia_chi_thu_tin)}"></label>
            <label>Người chăm sóc${d.can_reassign?`<select id="wsOwner" class="input">${people.map(p=>`<option value="${e(p.user_id)}" ${String(p.user_id)===String(r.owner_user_id)?'selected':''}>${e(p.ho_ten)} · ${e(p.email)}</option>`).join('')}</select>`:`<div class="readonly-field">${e(owner.ho_ten||'Chưa xác định')}<small>${e(owner.email||'')}</small></div>`}</label>
            <label>Ngày theo dõi gần nhất<input id="wsFollowDate" class="input" type="date" value="${e(r.ngay_theo_doi_lai)}"></label>
          </div>
          <div class="row-actions"><button class="btn secondary" id="wsSave">Lưu thông tin</button>${d.can_reassign?'<button class="btn ghost" id="wsSaveOwner">Đổi người phụ trách</button>':''}</div>
        </section>

        <section class="ws-card"><h3>Trạng thái tiếp cận</h3>
          <label>Trạng thái hiện tại<select id="wsStatus" class="input">${STATUS_OPTIONS.map(x=>`<option value="${x[0]}" ${x[0]===r.trang_thai_thuc_hien?'selected':''}>${x[1]}</option>`).join('')}</select></label>
          <label>Kết quả / ghi chú<textarea id="wsResult" class="input textarea" placeholder="Ví dụ: Cô Hiệu trưởng đã nhận hồ sơ, hẹn gọi lại thứ Sáu…">${e(r.ket_qua_phan_hoi)}</textarea></label>
          <button class="btn secondary full" id="wsStatusSave">Cập nhật trạng thái</button>
        </section>

        <section class="ws-card"><h3>Việc cần làm tiếp</h3>
          <label>Hành động tiếp theo<textarea id="wsAction" class="input textarea">${e(r.hanh_dong_de_xuat||a.viec_tiep_theo)}</textarea></label>
          <label>Hạn thực hiện<input id="wsActionDate" class="input" type="date" value="${e(r.ngay_theo_doi_lai||a.han_viec_tiep_theo)}"></label>
          <button class="btn secondary full" id="wsActionSave">Lưu & tạo công việc</button>
        </section>

        <section class="ws-card span2"><h3>Thông tin để tiếp cận đúng</h3>
          <div class="info-pair"><b>Tình hình STEAM / đối thủ</b><p>${e(r.tinh_hinh_steam)||'Chưa có thông tin.'}</p></div>
          <div class="info-pair"><b>Cập nhật mới</b><p>${e(r.cap_nhat_moi)||'Chưa có cập nhật.'}</p></div>
          <label>Thông điệp đề xuất<textarea id="wsMessage" class="input textarea tall">${e(r.thong_diep_de_xuat)}</textarea></label>
          <button class="btn ghost" id="wsMessageSave">Lưu thông điệp</button>
        </section>

        <section class="ws-card"><h3>Công việc đang mở</h3><div class="mini-list">${tasks.length?tasks.map(t=>`<div class="mini-item"><b>${e(t.ten_cong_viec)}</b><small>Hạn ${e(t.han_hoan_thanh||t.ngay_hanh_dong_tiep||'—')}</small><button class="mini-done" data-work="${e(t.work_id)}">Hoàn thành</button></div>`).join(''):'<div class="muted">Không có việc đang mở.</div>'}</div></section>
        <section class="ws-card"><h3>Cơ hội kinh doanh</h3><div class="mini-list">${opps.length?opps.map(o=>`<div class="mini-item"><b>${e(o.ten_co_hoi)}</b><small>${e(o.trang_thai)} · ${money(o.gia_tri_du_kien)}</small></div>`).join(''):'<div class="muted">Chưa tạo cơ hội.</div>'}</div></section>
      </div>
      <div id="wsSubpanel"></div>
    </div>`;
    bindWorkspace();
  }

  function bindWorkspace(){
    q('wsClose').onclick=closeShell;
    q('workspaceOverlay').onclick=ev=>{if(ev.target.id==='workspaceOverlay')closeShell()};
    q('wsSave').onclick=saveInfo;
    q('wsSaveOwner')?.addEventListener('click',saveOwner);
    q('wsStatusSave').onclick=saveStatus;
    q('wsActionSave').onclick=scheduleFollowup;
    q('wsMessageSave').onclick=saveMessage;
    q('wsEmail').onclick=prepareEmailPanel;
    q('wsResponse').onclick=()=>responsePanel();
    q('wsFollow').onclick=()=>followPanel();
    q('wsOpp').onclick=()=>opportunityPanel();
    document.querySelectorAll('.mini-done').forEach(b=>b.onclick=()=>completeTask(b.dataset.work));
  }

  async function reloadDetail(msg){
    current=await call('outreachWorkspace','detail',{outreach_id:current.outreach.outreach_id});
    renderWorkspace();await refreshAll();if(msg)toast(msg);
  }
  async function saveInfo(){
    const r=current.outreach;
    try{const res=await call('outreachWorkspace','save',{outreach_id:r.outreach_id,email_truong:q('wsSchoolEmail').value,dien_thoai_dau_moi:q('wsPhone').value,dia_chi_thu_tin:q('wsAddress').value,ngay_theo_doi_lai:q('wsFollowDate').value});await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }
  async function saveOwner(){
    const id=q('wsOwner').value;if(String(id)===String(current.outreach.owner_user_id))return toast('Người phụ trách chưa thay đổi.');
    if(!confirm('Đổi người phụ trách trường này và công việc hiện tại?'))return;
    try{const res=await call('outreachWorkspace','reassign',{outreach_id:current.outreach.outreach_id,owner_user_id:id});await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }
  async function saveStatus(){
    const status=q('wsStatus').value,result=q('wsResult').value.trim();
    try{const res=await call('outreach','updateStatus',{outreach_id:current.outreach.outreach_id,status,result});await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }
  async function saveMessage(){
    try{const res=await call('outreachWorkspace','save',{outreach_id:current.outreach.outreach_id,thong_diep_de_xuat:q('wsMessage').value});await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }
  async function scheduleFollowup(){
    const action=q('wsAction').value.trim(),date=q('wsActionDate').value;
    if(!action||!date)return toast('Hãy nhập việc cần làm và ngày thực hiện.',true);
    try{const res=await call('outreachWorkspace','scheduleFollowup',{outreach_id:current.outreach.outreach_id,action,date});await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }
  async function completeTask(workId){
    try{const res=await call('outreachWorkspace','completeTask',{work_id:workId});await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }

  async function prepareEmailPanel(){
    try{
      const m=await call('outreach','prepareEmail',{outreach_id:current.outreach.outreach_id});
      q('wsSubpanel').innerHTML=`<div class="subpanel open"><div class="subpanel-card"><div class="subpanel-head"><h3>Soạn email</h3><button id="subClose">×</button></div>
        <label>Tới<input id="mailTo" class="input" value="${e(m.to_email)}"></label><label>CC<input id="mailCc" class="input" value="${e(m.cc_email)}" readonly></label>
        <label>Tiêu đề<input id="mailSubject" class="input" value="${e(m.subject)}"></label><label>Nội dung<textarea id="mailBody" class="input mail-body">${e(m.body)}</textarea></label>
        <div class="attachment-note">📎 ${e(m.attachment_note)}</div>
        <div class="row-actions"><button class="btn" id="openGmail">Mở Gmail của tôi</button><button class="btn ghost" id="markSentBtn">Tôi đã gửi thư</button></div></div></div>`;
      q('subClose').onclick=()=>q('wsSubpanel').innerHTML='';
      q('openGmail').onclick=()=>{const url='https://mail.google.com/mail/?authuser='+encodeURIComponent(m.from_email)+'&view=cm&fs=1&to='+encodeURIComponent(q('mailTo').value)+'&cc='+encodeURIComponent(q('mailCc').value)+'&su='+encodeURIComponent(q('mailSubject').value)+'&body='+encodeURIComponent(q('mailBody').value);window.open(url,'_blank','noopener');toast('Đã mở Gmail. Kiểm tra file đính kèm trước khi bấm Gửi.');};
      q('markSentBtn').onclick=markSentFromWorkspace;
    }catch(err){toast(err.message,true)}
  }
  async function markSentFromWorkspace(){
    if(!confirm('Xác nhận email đã được gửi và có CC sunbotvietnam@gmail.com?'))return;
    try{const res=await call('outreach','markSent',{outreach_id:current.outreach.outreach_id,followup_days:3});q('wsSubpanel').innerHTML='';await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }

  function responsePanel(){
    q('wsSubpanel').innerHTML=`<div class="subpanel open"><div class="subpanel-card compact"><div class="subpanel-head"><h3>Ghi nhận phản hồi</h3><button id="subClose">×</button></div><label>Nội dung phản hồi<textarea id="respText" class="input textarea tall" placeholder="Ghi cụ thể ai phản hồi, nội dung gì, nhu cầu hoặc trở ngại…"></textarea></label><label class="check"><input id="respMeeting" type="checkbox"> Đã có lịch hẹn/trao đổi cụ thể</label><button class="btn full" id="saveResp">Lưu phản hồi</button></div></div>`;
    q('subClose').onclick=()=>q('wsSubpanel').innerHTML='';q('saveResp').onclick=saveResponse;
  }
  async function saveResponse(){
    const result=q('respText').value.trim();if(result.length<5)return toast('Hãy ghi rõ nội dung phản hồi.',true);const status=q('respMeeting').checked?'DA_HEN_TRAO_DOI':'DA_PHAN_HOI';
    try{const res=await call('outreach','updateStatus',{outreach_id:current.outreach.outreach_id,status,result});q('wsSubpanel').innerHTML='';await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }

  function followPanel(){
    q('wsSubpanel').innerHTML=`<div class="subpanel open"><div class="subpanel-card compact"><div class="subpanel-head"><h3>Đặt việc tiếp theo</h3><button id="subClose">×</button></div><label>Việc cần làm<input id="followAction" class="input" value="${e(current.outreach.hanh_dong_de_xuat||'Gọi lại / theo dõi phản hồi')}"></label><label>Ngày thực hiện<input id="followDate" class="input" type="date" value="${e(current.outreach.ngay_theo_doi_lai||todayPlus(3))}"></label><button class="btn full" id="saveFollow">Tạo công việc</button></div></div>`;
    q('subClose').onclick=()=>q('wsSubpanel').innerHTML='';q('saveFollow').onclick=async()=>{try{const res=await call('outreachWorkspace','scheduleFollowup',{outreach_id:current.outreach.outreach_id,action:q('followAction').value,date:q('followDate').value});q('wsSubpanel').innerHTML='';await reloadDetail(res.message)}catch(err){toast(err.message,true)}};
  }

  function opportunityPanel(){
    q('wsSubpanel').innerHTML=`<div class="subpanel open"><div class="subpanel-card compact"><div class="subpanel-head"><h3>Tạo cơ hội kinh doanh</h3><button id="subClose">×</button></div><label>Sản phẩm<select id="oppProduct" class="input">${PRODUCTS.map(x=>`<option>${e(x)}</option>`).join('')}</select></label><label>Giá trị dự kiến (VND)<input id="oppValue" class="input" type="number" min="0" step="1000000" placeholder="0"></label><label>Việc tiếp theo<input id="oppNext" class="input" value="Làm rõ nhu cầu và cấu hình đề xuất."></label><label>Hạn<input id="oppDate" class="input" type="date" value="${todayPlus(3)}"></label><button class="btn full" id="saveOpp">Tạo cơ hội</button></div></div>`;
    q('subClose').onclick=()=>q('wsSubpanel').innerHTML='';q('saveOpp').onclick=createOpp;
  }
  async function createOpp(){
    try{const res=await call('outreach','createOpportunity',{outreach_id:current.outreach.outreach_id,san_pham:q('oppProduct').value,gia_tri_du_kien:Number(q('oppValue').value||0),viec_tiep_theo:q('oppNext').value,han_viec_tiep_theo:q('oppDate').value});q('wsSubpanel').innerHTML='';await reloadDetail(res.message)}catch(err){toast(err.message,true)}
  }

  // Bắt click ở pha capture để thay màn chi tiết cũ bằng workspace thao tác.
  document.addEventListener('click',function(ev){
    const detail=ev.target.closest('.school-card .detail');
    const cardTitle=ev.target.closest('.school-card h3');
    const target=detail||cardTitle;
    if(!target)return;
    const card=target.closest('.school-card');if(!card)return;
    const row=state.rows.find(x=>String(x.outreach_id)===String(card.dataset.id));if(!row)return;
    ev.preventDefault();ev.stopImmediatePropagation();openWorkspace(row);
  },true);
})();
