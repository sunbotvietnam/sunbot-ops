(function(){
  function rowFromWorkspace(){
    const head=document.querySelector('#workspaceOverlay .workspace-head');if(!head)return null;
    const name=(head.querySelector('h2')?.textContent||'').trim();
    const badges=[...head.querySelectorAll('.badge')].map(x=>(x.textContent||'').trim());
    const province=badges.length>1?badges[1]:'';
    return (state.rows||[]).find(r=>String(r.ten_truong||'').trim()===name&&(!province||String(r.tinh_thanh||'').trim()===province))||(state.rows||[]).find(r=>String(r.ten_truong||'').trim()===name)||null;
  }
  function host(){return document.getElementById('wsSubpanel')}
  function decorate(){
    const toolbar=document.querySelector('#workspaceOverlay.open .workspace-toolbar');if(!toolbar||document.getElementById('meeting40Btn'))return;
    const row=rowFromWorkspace();if(!row)return;
    const m=document.createElement('button');m.id='meeting40Btn';m.className='btn secondary';m.textContent='📅 Đặt lịch 40 phút';m.onclick=()=>meetingPanel(row);toolbar.appendChild(m);
    const d=document.createElement('button');d.id='discoveryBtn';d.className='btn secondary';d.textContent='📝 Phỏng vấn nhu cầu';d.onclick=()=>discoveryPanel(row);toolbar.appendChild(d);
  }
  async function meetingPanel(row){
    host().innerHTML='<div class="subpanel open"><div class="subpanel-card compact"><div class="workspace-loading">Đang chuẩn bị lịch…</div></div></div>';
    try{const p=await call('engagement','prepareMeeting',{outreach_id:row.outreach_id});renderMeeting(p)}catch(e){host().innerHTML='';toast(e.message,true)}
  }
  function renderMeeting(p){
    host().innerHTML=`<div class="subpanel open"><div class="subpanel-card compact"><div class="subpanel-head"><div><h3>Đặt lịch trao đổi 40 phút</h3><small class="muted">Tạo lịch trong Google Calendar của chính bạn.</small></div><button id="meetClose">×</button></div><label>Ngày và giờ bắt đầu<input id="meetStart" type="datetime-local" class="input"></label><label>Email người tham dự<input id="meetGuest" type="email" class="input" value="${esc(p.attendee_email||'')}"></label><div class="attachment-note">Cấu trúc gợi ý: 5 phút bối cảnh · 7 phút Sunbot · 18 phút khám phá nhu cầu · 7 phút gợi ý hướng · 3 phút chốt bước tiếp theo.</div><div class="row-actions"><button class="btn" id="openCalendar">Mở Google Calendar</button><button class="btn secondary" id="confirmMeeting">Xác nhận đã đặt lịch</button></div></div></div>`;
    document.getElementById('meetClose').onclick=()=>host().innerHTML='';
    document.getElementById('openCalendar').onclick=()=>{
      const start=document.getElementById('meetStart').value;if(!start)return toast('Hãy chọn ngày và giờ.',true);
      const s=new Date(start);const end=new Date(s.getTime()+40*60000);const fmt=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0')+'T'+String(x.getHours()).padStart(2,'0')+String(x.getMinutes()).padStart(2,'0')+'00';
      const url='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(p.title)+'&dates='+fmt(s)+'/'+fmt(end)+'&ctz=Asia%2FHo_Chi_Minh&details='+encodeURIComponent(p.description)+'&add='+encodeURIComponent(document.getElementById('meetGuest').value||'');window.open(url,'_blank','noopener');
    };
    document.getElementById('confirmMeeting').onclick=async()=>{const start=document.getElementById('meetStart').value;if(!start)return toast('Hãy chọn ngày và giờ.',true);try{const r=await call('engagement','logMeeting',{outreach_id:p.outreach_id,start_local:start});host().innerHTML='';toast(r.message);if(window.refreshOutreach)await window.refreshOutreach(true)}catch(e){toast(e.message,true)}};
  }

  async function discoveryPanel(row){
    let scenario='NEW',asset='PROFILE_PUBLIC';try{const p=await call('journey','prepare',{outreach_id:row.outreach_id});scenario=p.scenario;asset=p.asset.code}catch(e){}
    const privateSchool=asset==='PROFILE_PRIVATE';
    host().innerHTML=`<div class="subpanel open"><div class="subpanel-card"><div class="subpanel-head"><div><h3>Phiếu khám phá nhu cầu</h3><small class="muted">Người Sunbot hỏi và ghi nhận trong lúc trao đổi; không yêu cầu Hiệu trưởng tự điền.</small></div><button id="discClose">×</button></div>
    <label>Người đang trao đổi *<input id="discPerson" class="input" placeholder="Họ tên"></label><label>Chức vụ / vai trò<input id="discRole" class="input" placeholder="Hiệu trưởng, PHT chuyên môn, chủ trường…"></label>
    <div class="form-grid"><label>Loại hình<select id="discType" class="input"><option ${privateSchool?'':'selected'}>Công lập</option><option ${privateSchool?'selected':''}>Tư thục độc lập</option><option>Hệ thống trường</option><option>Trung tâm/đối tác giáo dục</option></select></label><label>Quan hệ với Sunbot<select id="discRelation" class="input"><option value="NEW" ${scenario==='NEW'?'selected':''}>Chưa từng biết/làm việc</option><option value="KNOWN" ${scenario==='KNOWN'?'selected':''}>Đã biết/từng trao đổi</option><option value="FORMER" ${scenario==='FORMER'?'selected':''}>Đã từng triển khai</option><option value="CURRENT" ${scenario==='CURRENT'?'selected':''}>Đang triển khai</option></select></label></div>
    <div id="branchQuestions">${branchHtml(scenario)}</div>
    <fieldset class="journey-field"><legend>Mục tiêu nhà trường đang quan tâm *</legend>${checks('goal',['Phát triển tư duy và giải quyết vấn đề','Bổ sung Robotics/lập trình tư duy','Phát triển STEAM','Nâng cao năng lực giáo viên','Tạo điểm khác biệt cho nhà trường','Hỗ trợ tuyển sinh','Tăng trải nghiệm phụ huynh','Phát triển phòng STEAM','Chuẩn hóa nhiều điểm trường','Chương trình hè/trải nghiệm'])}</fieldset>
    <div class="form-grid"><label>Cấu hình chuyên môn<select id="discConfig" class="input"><option>Chưa xác định, cần tư vấn</option><option>Lập trình tư duy cùng Sunbot</option><option>Tích hợp Lập trình tư duy + STEAM Sáng tạo</option></select></label><label>Mô hình giáo viên<select id="discTeacher" class="input"><option>Chưa xác định</option><option>Sunbot cung cấp giáo viên</option><option>Giáo viên nhà trường triển khai</option><option>Sunbot dạy giai đoạn đầu rồi chuyển giao</option></select></label><label>Quy mô bắt đầu<select id="discScale" class="input"><option>Chưa xác định</option><option>Một hoạt động trải nghiệm</option><option>Một lớp</option><option>Một khối tuổi</option><option>Một cơ sở/điểm trường</option><option>Toàn trường</option><option>Toàn hệ thống</option></select></label><label>Thời điểm<select id="discTiming" class="input"><option>Chưa xác định</option><option>Trong 1 tháng tới</option><option>Học kỳ I</option><option>Trong năm học 2026–2027</option><option>Chương trình hè</option></select></label></div>
    <fieldset class="journey-field"><legend>Những ai cần tham gia trước khi quyết định?</legend>${checks('decision',['Hiệu trưởng','Phó hiệu trưởng chuyên môn','Chủ trường/HĐQT','Kế toán/tài chính','Tuyển sinh/marketing','Giáo viên phụ trách','Cơ quan quản lý'])}</fieldset>
    <label>Bước tiếp theo *<select id="discNext" class="input"><option value="">Chọn bước tiếp theo</option><option>Nhận tư vấn/phương án sơ bộ</option><option>Xem demo</option><option>Khảo sát tại trường</option><option>Nhận phương án triển khai</option><option>Trao đổi về chuyển giao</option><option>Trao đổi về STEAM Corner/Lab</option><option>Trao đổi về giá</option><option>Theo dõi sau</option></select></label><label>Hạn cho bước tiếp theo<input id="discDue" type="date" class="input"></label><label>Ghi chú quan trọng<textarea id="discNotes" class="input textarea" placeholder="Điểm đau, ràng buộc, người quyết định, đối thủ hiện tại, điều kiện đặc biệt…"></textarea></label><button class="btn full" id="saveDiscovery">Hoàn thành buổi trao đổi</button></div></div>`;
    document.getElementById('discClose').onclick=()=>host().innerHTML='';
    document.getElementById('discRelation').onchange=e=>document.getElementById('branchQuestions').innerHTML=branchHtml(e.target.value);
    document.getElementById('saveDiscovery').onclick=()=>saveDiscovery(row);
  }
  function checks(name,arr){return '<div class="choice-grid">'+arr.map((x,i)=>`<label class="choice"><input type="checkbox" name="${name}" value="${esc(x)}"> ${esc(x)}</label>`).join('')+'</div>'}
  function branchHtml(s){
    if(s==='KNOWN')return `<label>Trước đây chưa triển khai chủ yếu vì lý do nào?<textarea id="branchReason" class="input textarea" placeholder="Thời điểm, chi phí, cơ chế, giáo viên, chưa rõ giá trị, chưa phê duyệt, nhà cung cấp khác…"></textarea></label><label>Điều gì đã thay đổi khiến trường quan tâm lúc này?<textarea id="branchChange" class="input textarea"></textarea></label>`;
    if(s==='FORMER'||s==='CURRENT')return `<label>Tình trạng robot/thiết bị Sunbot hiện có<select id="branchDevice" class="input"><option>Không rõ tình trạng</option><option>Đang sử dụng tốt</option><option>Còn nhưng cần kiểm tra</option><option>Thiếu/hỏng một phần</option><option>Đã chuyển địa điểm</option><option>Không còn</option></select></label><label>Mong muốn hiện tại với Sunbot<textarea id="branchWant" class="input textarea" placeholder="Tiếp tục, điều chỉnh, chuyển giao, kiểm tra thiết bị, bổ sung STEAM, Lab, Camp/Day…"></textarea></label>`;
    return `<label>Nhà trường hiện đã có hoạt động tương tự nào?<input id="branchExisting" class="input" placeholder="Robotics, STEAM, STEM, Coding, Khoa học hoặc chưa có"></label><label>Điều nhà trường muốn cải thiện hoặc bổ sung<textarea id="branchImprove" class="input textarea"></textarea></label>`;
  }
  async function saveDiscovery(row){
    const val=id=>document.getElementById(id)?.value||'';const selected=n=>[...document.querySelectorAll(`input[name="${n}"]:checked`)].map(x=>x.value);
    const relation=val('discRelation');const answers={nguoi_trao_doi:val('discPerson'),vai_tro:val('discRole'),loai_hinh:val('discType'),quan_he:relation,muc_tieu:selected('goal'),cau_hinh_quan_tam:val('discConfig'),mo_hinh_giao_vien:val('discTeacher'),quy_mo_bat_dau:val('discScale'),thoi_diem:val('discTiming'),nguoi_quyet_dinh:selected('decision'),buoc_tiep_theo:val('discNext'),han_buoc_tiep_theo:val('discDue'),ghi_chu:val('discNotes')};
    if(relation==='KNOWN'){answers.ly_do_chua_trien_khai=val('branchReason');answers.thay_doi_hien_tai=val('branchChange')}else if(relation==='FORMER'||relation==='CURRENT'){answers.tinh_trang_thiet_bi=val('branchDevice');answers.mong_muon_hien_tai=val('branchWant')}else{answers.hoat_dong_tuong_tu=val('branchExisting');answers.muon_cai_thien=val('branchImprove')}
    try{const r=await call('engagement','saveDiscovery',{outreach_id:row.outreach_id,answers,started_at:new Date().toISOString()});host().innerHTML='';toast(r.message);if(window.refreshOutreach)await window.refreshOutreach(true)}catch(e){toast(e.message,true)}
  }
  const obs=new MutationObserver(()=>decorate());obs.observe(document.documentElement,{subtree:true,childList:true});
})();
