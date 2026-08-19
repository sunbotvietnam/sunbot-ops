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
    const toolbar=document.querySelector('#workspaceOverlay.open .workspace-toolbar');if(!toolbar)return;
    const row=rowFromWorkspace();if(!row)return;
    if(!document.getElementById('meeting40Btn')){
      const m=document.createElement('button');m.id='meeting40Btn';m.className='btn secondary';m.textContent='📅 Đặt lịch 40 phút';m.onclick=()=>meetingPanel(row);toolbar.appendChild(m);
    }
    if(!document.getElementById('discoveryBtn')){
      const d=document.createElement('button');d.id='discoveryBtn';d.className='btn secondary';d.textContent='📝 Khám phá nhu cầu';d.onclick=()=>discoveryPanel(row);toolbar.appendChild(d);
    }
    const primary=document.getElementById('primaryRecord');
    if(primary&&!primary.dataset.methodBound){
      primary.dataset.methodBound='1';primary.textContent='Trao đổi';primary.title='Meeting Mode hoặc ghi nhận phản hồi';
      primary.onclick=()=>meetingModePanel(row);
    }
  }

  async function meetingPanel(row){
    host().innerHTML='<div class="subpanel open"><div class="subpanel-card compact"><div class="workspace-loading">Đang chuẩn bị lịch…</div></div></div>';
    try{const p=await call('engagement','prepareMeeting',{outreach_id:row.outreach_id});renderMeeting(p)}catch(e){host().innerHTML='';toast(e.message,true)}
  }
  function renderMeeting(p){
    host().innerHTML=`<div class="subpanel open"><div class="subpanel-card compact"><div class="subpanel-head"><div><h3>Đặt lịch trao đổi 40 phút</h3><small class="muted">Mục tiêu là hiểu nhu cầu và xác định mức độ phù hợp hai chiều.</small></div><button id="meetClose">×</button></div><label>Ngày và giờ bắt đầu<input id="meetStart" type="datetime-local" class="input"></label><label>Email người tham dự<input id="meetGuest" type="email" class="input" value="${esc(p.attendee_email||'')}"></label><div class="method-note"><b>Mạch chuẩn:</b> Bối cảnh → E-profile → Catalogue → Khám phá nhu cầu → Xác nhận nhu cầu → Bước tiếp theo.</div><div class="row-actions"><button class="btn" id="openCalendar">Mở Google Calendar</button><button class="btn secondary" id="confirmMeeting">Xác nhận đã đặt lịch</button></div></div></div>`;
    document.getElementById('meetClose').onclick=()=>host().innerHTML='';
    document.getElementById('openCalendar').onclick=()=>{
      const start=document.getElementById('meetStart').value;if(!start)return toast('Hãy chọn ngày và giờ.',true);
      const s=new Date(start),end=new Date(s.getTime()+40*60000);const fmt=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0')+'T'+String(x.getHours()).padStart(2,'0')+String(x.getMinutes()).padStart(2,'0')+'00';
      const url='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(p.title)+'&dates='+fmt(s)+'/'+fmt(end)+'&ctz=Asia%2FHo_Chi_Minh&details='+encodeURIComponent(p.description)+'&add='+encodeURIComponent(document.getElementById('meetGuest').value||'');window.open(url,'_blank','noopener');
    };
    document.getElementById('confirmMeeting').onclick=async()=>{const start=document.getElementById('meetStart').value;if(!start)return toast('Hãy chọn ngày và giờ.',true);try{const r=await call('engagement','logMeeting',{outreach_id:p.outreach_id,start_local:start});host().innerHTML='';toast(r.message);if(window.refreshOutreach)await window.refreshOutreach(true)}catch(e){toast(e.message,true)}};
  }

  async function meetingModePanel(row){
    host().innerHTML='<div class="subpanel open"><div class="subpanel-card"><div class="workspace-loading">Đang mở Meeting Mode…</div></div></div>';
    try{
      const results=await Promise.all([call('engagement','prepareMeeting',{outreach_id:row.outreach_id}),call('journey','prepare',{outreach_id:row.outreach_id}).catch(()=>null)]);
      renderMeetingMode(row,results[0],results[1]);
    }catch(e){host().innerHTML='';toast(e.message,true)}
  }

  function renderMeetingMode(row,m,j){
    const profile=(j&&j.asset&&j.asset.url)||m.profile_url||'';
    const catalogue=m.catalogue_url||'https://sunbotvietnam.github.io/portal/catalogue/';
    host().innerHTML=`<div class="subpanel open"><div class="subpanel-card meeting-mode"><div class="subpanel-head"><div><h3>Trao đổi 30–40 phút · ${esc(row.ten_truong)}</h3><small class="muted">Không đọc kịch bản. Giữ đúng sườn, dùng ngôn ngữ tự nhiên của bạn.</small></div><button id="methodClose">×</button></div>
      <div class="method-principle"><b>Mục tiêu cuộc gặp:</b> làm nhu cầu rõ hơn và thống nhất bước tiếp theo. Không cần cố chốt bán hàng trong buổi đầu.</div>
      <section class="method-step"><div class="method-no">1</div><div><h4>Bối cảnh · 0–5 phút</h4><p><b>Mục tiêu:</b> hiểu vì sao Nhà trường nhận cuộc gặp và điều gì đang được ưu tiên.</p><div class="sample-line">Gợi ý: “Trước khi em giới thiệu, em muốn hiểu thêm một chút về định hướng năm học và những nội dung Nhà trường đang ưu tiên.”</div><ul><li>Hiện trường đã có STEAM, robotics, coding hay hoạt động tương tự chưa?</li><li>Điều gì BGH muốn cải thiện hoặc bổ sung?</li><li>Vì sao nội dung này đáng quan tâm vào thời điểm hiện tại?</li></ul></div></section>
      <section class="method-step"><div class="method-no">2</div><div><h4>E-profile · 5–10 phút</h4><p><b>Không trình bày toàn bộ.</b> Chỉ làm rõ: Sunbot dành cho mầm non; 2 phân môn; hệ thống gồm chương trình–học liệu–đào tạo/giáo viên–đánh giá/minh chứng.</p><div class="row-actions"><a class="btn" href="${esc(profile)}" target="_blank" rel="noopener">Mở E-profile</a></div><div class="sample-line">Sau đó hỏi: “Trong những phần này, nội dung nào gần nhất với điều Nhà trường đang quan tâm?”</div></div></section>
      <section class="method-step"><div class="method-no">3</div><div><h4>Catalogue · 10–20 phút</h4><p>Dùng Catalogue như <b>bản đồ lựa chọn</b>, không phải bảng để đọc hết sản phẩm. Giúp trường hình dung: ai dạy, triển khai ở quy mô nào, dùng hạ tầng hiện có hay đầu tư thêm, mức độ chủ động mong muốn.</p><div class="row-actions"><a class="btn" href="${esc(catalogue)}" target="_blank" rel="noopener">Mở Catalogue</a></div><div class="sample-line">Gợi ý: “Không phải trường nào cũng cần triển khai giống nhau. Em xin phép đi qua vài cách tổ chức để mình cùng xem hướng nào hợp điều kiện Nhà trường nhất.”</div></div></section>
      <section class="method-step"><div class="method-no">4</div><div><h4>Khám phá nhu cầu · 20–34 phút</h4><p>Thu dữ liệu đủ để biến nhu cầu mơ hồ thành một Need Statement: mục tiêu, trẻ/quy mô, hiện trạng, giáo viên, nguồn lực, decision process, thời điểm.</p><button class="btn" id="methodDiscovery">Mở phiếu khám phá nhu cầu</button></div></section>
      <section class="method-step"><div class="method-no">5</div><div><h4>Phản chiếu & chốt bước tiếp theo · 34–40 phút</h4><p>Đọc lại Need Statement cho Nhà trường xác nhận/chỉnh. Sau đó chỉ thống nhất <b>1 bước tiếp theo chính</b>: demo, khảo sát, meeting mở rộng, phương án, proposal hoặc theo dõi lại.</p><div class="sample-line">“Em xin phép tóm lại để xem bên em đã hiểu đúng nhu cầu Nhà trường chưa…”</div></div></section>
      <div class="method-footer"><button class="btn secondary" id="methodQuickResponse">Chỉ ghi nhận phản hồi nhanh</button><span>Mỗi cuộc gặp dù chưa thành cơ hội vẫn nên để lại dữ liệu có giá trị cho lần tiếp cận sau.</span></div>
    </div></div>`;
    document.getElementById('methodClose').onclick=()=>host().innerHTML='';
    document.getElementById('methodDiscovery').onclick=()=>discoveryPanel(row);
    document.getElementById('methodQuickResponse').onclick=()=>{host().innerHTML='';document.getElementById('wsResponse')?.click()};
  }

  async function discoveryPanel(row){
    let scenario='NEW',asset='PROFILE_PUBLIC';try{const p=await call('journey','prepare',{outreach_id:row.outreach_id});scenario=p.scenario;asset=p.asset.code}catch(e){}
    const privateSchool=asset==='PROFILE_PRIVATE';
    host().innerHTML=`<div class="subpanel open"><div class="subpanel-card discovery-method"><div class="subpanel-head"><div><h3>Khám phá nhu cầu có hướng dẫn</h3><small class="muted">Người Sunbot hỏi và ghi nhận trong lúc trao đổi. Không gửi form cho Hiệu trưởng tự điền.</small></div><button id="discClose">×</button></div>
      <div class="method-note"><b>Nguyên tắc:</b> hỏi có mạch để Nhà trường tự định hình nhu cầu; không ép khách chọn gói Sunbot.</div>
      <h4>1 · Người trao đổi & bối cảnh</h4><label>Người đang trao đổi *<input id="discPerson" class="input" placeholder="Họ tên"></label><label>Chức vụ / vai trò<input id="discRole" class="input" placeholder="Hiệu trưởng, PHT chuyên môn, chủ trường…"></label>
      <div class="form-grid"><label>Loại hình<select id="discType" class="input"><option ${privateSchool?'':'selected'}>Công lập</option><option ${privateSchool?'selected':''}>Tư thục độc lập</option><option>Hệ thống trường</option><option>Trung tâm/đối tác giáo dục</option></select></label><label>Quan hệ với Sunbot<select id="discRelation" class="input"><option value="NEW" ${scenario==='NEW'?'selected':''}>Chưa từng biết/làm việc</option><option value="KNOWN" ${scenario==='KNOWN'?'selected':''}>Đã biết/từng trao đổi</option><option value="FORMER" ${scenario==='FORMER'?'selected':''}>Đã từng triển khai</option><option value="CURRENT" ${scenario==='CURRENT'?'selected':''}>Đang triển khai</option></select></label></div><div id="branchQuestions">${branchHtml(scenario)}</div>

      <h4>2 · Mục tiêu giáo dục</h4><fieldset class="journey-field"><legend>Nhà trường đang ưu tiên điều gì? *</legend>${checks('goal',['Phát triển tư duy và giải quyết vấn đề','Lập trình tư duy/Robotics','STEAM Sáng tạo','Nâng cao năng lực giáo viên','Tạo điểm khác biệt cho nhà trường','Tăng trải nghiệm phụ huynh','Phát triển không gian STEAM','Chuẩn hóa nhiều điểm trường','Chương trình ngắn hạn/trải nghiệm'])}</fieldset>

      <h4>3 · Cấu hình & nguồn lực</h4><div class="form-grid"><label>Hướng chuyên môn<select id="discConfig" class="input"><option>Chưa xác định, cần cùng làm rõ</option><option>Lập trình tư duy cùng Sunbot</option><option>Tích hợp Lập trình tư duy + STEAM Sáng tạo</option></select></label><label>Mô hình giáo viên<select id="discTeacher" class="input"><option>Chưa xác định</option><option>Sunbot cung cấp giáo viên</option><option>Giáo viên nhà trường triển khai</option><option>Sunbot dạy giai đoạn đầu rồi chuyển giao</option></select></label><label>Quy mô bắt đầu<select id="discScale" class="input"><option>Chưa xác định</option><option>Một hoạt động trải nghiệm</option><option>Một lớp</option><option>Một khối tuổi</option><option>Một cơ sở/điểm trường</option><option>Toàn trường</option><option>Toàn hệ thống</option></select></label><label>Thời điểm<select id="discTiming" class="input"><option>Chưa xác định</option><option>Trong 1 tháng tới</option><option>Học kỳ I</option><option>Trong năm học 2026–2027</option><option>Chương trình hè</option></select></label></div>

      <h4>4 · Quyết định</h4><fieldset class="journey-field"><legend>Những ai cần tham gia trước khi quyết định?</legend>${checks('decision',['Hiệu trưởng','Phó hiệu trưởng chuyên môn','Chủ trường/HĐQT','Kế toán/tài chính','Tuyển sinh/marketing','Giáo viên phụ trách','Cơ quan quản lý'])}</fieldset>

      <h4>5 · Intelligence thực địa</h4><p class="muted">Không bắt buộc khách phải trả lời. Chỉ ghi những gì họ tự chia sẻ hoặc sale quan sát được.</p><div class="form-grid"><label>Nhà cung cấp/đối thủ hiện tại<input id="intelVendor" class="input" placeholder="Nếu có"></label><label>Giải pháp đang dùng<input id="intelSolution" class="input" placeholder="STEAM, robotics, tự triển khai…"></label><label>Mức phí/cách thu được chia sẻ<input id="intelPrice" class="input" placeholder="Không suy đoán"></label><label>Rào cản chính<input id="intelBarrier" class="input" placeholder="Ngân sách, cơ chế, giáo viên, thời điểm…"></label></div><label>Tín hiệu thị trường đáng lưu ý<textarea id="intelSignal" class="input textarea" placeholder="Ví dụ: trường ưu tiên GV trường tự dạy; không muốn đầu tư lab; phụ huynh đang quan tâm…"></textarea></label><label>Nếu chưa làm lúc này, lý do/điều kiện để quay lại<textarea id="intelReason" class="input textarea"></textarea></label>

      <h4>6 · Phản chiếu nhu cầu</h4><div class="need-builder"><button class="btn secondary" id="buildNeed">Tạo câu tóm tắt từ dữ liệu trên</button><label>Need Statement *<textarea id="discNeed" class="input textarea" placeholder="Nhà trường muốn… cho nhóm trẻ/quy mô… theo mô hình… với điều kiện… vào thời điểm…"></textarea></label><label class="confirm-line"><input type="checkbox" id="discNeedConfirmed"> Đã đọc lại để Nhà trường xác nhận/chỉnh nhu cầu</label></div>

      <h4>7 · Kết quả & bước tiếp theo</h4><div class="form-grid"><label>Kết quả cuộc trao đổi<select id="discOutcome" class="input"><option value="MORE_DISCOVERY">Cần làm rõ thêm</option><option value="QUALIFIED_OPPORTUNITY">Có cơ hội rõ</option><option value="DEMO_VALIDATION">Cần demo/khảo sát/xác thực</option><option value="NURTURE">Chưa đúng thời điểm – nuôi dưỡng</option><option value="COMPETITOR_IN_PLACE">Đang dùng đối thủ</option><option value="BLOCKED">Bị chặn bởi cơ chế/ngân sách/tổ chức</option><option value="NOT_FIT">Không phù hợp hiện tại</option><option value="INTELLIGENCE_GAIN">Chưa có deal nhưng có intelligence giá trị</option></select></label><label>Mức độ phù hợp<select id="discFit" class="input"><option value="CHUA_XAC_DINH">Chưa xác định</option><option value="CAO">Cao</option><option value="TRUNG_BINH">Trung bình</option><option value="THAP">Thấp</option></select></label><label>Bước tiếp theo *<select id="discNext" class="input"><option value="">Chọn bước tiếp theo</option><option>Nhận tư vấn/phương án sơ bộ</option><option>Xem demo</option><option>Khảo sát tại trường</option><option>Trao đổi với BGH mở rộng</option><option>Nhận phương án triển khai</option><option>Trao đổi về chuyển giao</option><option>Trao đổi về STEAM Corner/Lab</option><option>Trao đổi về giá</option><option>Gửi proposal</option><option>Theo dõi lại</option><option>Đóng – chưa phù hợp</option></select></label><label>Hạn bước tiếp theo *<input id="discDue" type="date" class="input"></label><label>Ngày nên quay lại nếu nurture<input id="discReentry" type="date" class="input"></label></div><label>Ghi chú quan trọng<textarea id="discNotes" class="input textarea" placeholder="Các ranh giới triển khai, yêu cầu ngoài scope, điều kiện đặc biệt…"></textarea></label><button class="btn full" id="saveDiscovery">Hoàn thành & tạo việc tiếp theo</button></div></div>`;
    document.getElementById('discClose').onclick=()=>host().innerHTML='';
    document.getElementById('discRelation').onchange=e=>document.getElementById('branchQuestions').innerHTML=branchHtml(e.target.value);
    document.getElementById('buildNeed').onclick=()=>{document.getElementById('discNeed').value=buildNeedPreview()};
    document.getElementById('saveDiscovery').onclick=()=>saveDiscovery(row);
  }

  function checks(name,arr){return '<div class="choice-grid">'+arr.map(x=>`<label class="choice"><input type="checkbox" name="${name}" value="${esc(x)}"> ${esc(x)}</label>`).join('')+'</div>'}
  function branchHtml(s){
    if(s==='KNOWN')return `<label>Trước đây chưa triển khai chủ yếu vì lý do nào?<textarea id="branchReason" class="input textarea" placeholder="Thời điểm, chi phí, cơ chế, giáo viên, chưa rõ giá trị, chưa phê duyệt, nhà cung cấp khác…"></textarea></label><label>Điều gì đã thay đổi khiến trường quan tâm lúc này?<textarea id="branchChange" class="input textarea"></textarea></label>`;
    if(s==='FORMER'||s==='CURRENT')return `<label>Tình trạng Sunbot/thiết bị hiện tại<select id="branchDevice" class="input"><option>Không rõ tình trạng</option><option>Đang sử dụng tốt</option><option>Còn nhưng cần kiểm tra</option><option>Thiếu/hỏng một phần</option><option>Đã chuyển địa điểm</option><option>Không còn</option></select></label><label>Mong muốn hiện tại với Sunbot<textarea id="branchWant" class="input textarea" placeholder="Tiếp tục, điều chỉnh, chuyển giao, bổ sung chương trình, mở rộng…"></textarea></label>`;
    return `<label>Nhà trường hiện đã có hoạt động tương tự nào?<input id="branchExisting" class="input" placeholder="Robotics, STEAM, STEM, Coding, Khoa học hoặc chưa có"></label><label>Điều Nhà trường muốn cải thiện hoặc bổ sung<textarea id="branchImprove" class="input textarea"></textarea></label>`;
  }

  function buildNeedPreview(){
    const val=id=>document.getElementById(id)?.value||'';const selected=n=>[...document.querySelectorAll(`input[name="${n}"]:checked`)].map(x=>x.value);
    const goals=selected('goal');const parts=[];
    if(goals.length)parts.push('Nhà trường ưu tiên '+goals.join(', ').toLowerCase());
    if(val('discScale')&&!/^Chưa/.test(val('discScale')))parts.push('dự kiến bắt đầu ở '+val('discScale').toLowerCase());
    if(val('discTeacher')&&!/^Chưa/.test(val('discTeacher')))parts.push('mô hình giáo viên: '+val('discTeacher').toLowerCase());
    if(val('discConfig')&&!/^Chưa/.test(val('discConfig')))parts.push('hướng chuyên môn: '+val('discConfig'));
    if(val('discTiming')&&!/^Chưa/.test(val('discTiming')))parts.push('thời điểm: '+val('discTiming').toLowerCase());
    return (parts.join('; ')||'Nhà trường đang làm rõ nhu cầu')+'.';
  }

  async function saveDiscovery(row){
    const val=id=>document.getElementById(id)?.value||'';const selected=n=>[...document.querySelectorAll(`input[name="${n}"]:checked`)].map(x=>x.value);
    const need=val('discNeed').trim();if(!need)return toast('Hãy tạo/chỉnh Need Statement và đọc lại với Nhà trường.',true);
    if(!val('discDue'))return toast('Hãy đặt ngày cho bước tiếp theo.',true);
    const relation=val('discRelation');
    const answers={
      nguoi_trao_doi:val('discPerson'),vai_tro:val('discRole'),loai_hinh:val('discType'),quan_he:relation,muc_tieu:selected('goal'),
      cau_hinh_quan_tam:val('discConfig'),mo_hinh_giao_vien:val('discTeacher'),quy_mo_bat_dau:val('discScale'),thoi_diem:val('discTiming'),nguoi_quyet_dinh:selected('decision'),
      need_statement:need,need_confirmed:!!document.getElementById('discNeedConfirmed')?.checked,outcome_code:val('discOutcome'),fit_level:val('discFit'),
      buoc_tiep_theo:val('discNext'),han_buoc_tiep_theo:val('discDue'),reentry_date:val('discReentry'),ghi_chu:val('discNotes'),
      market_intelligence:{current_vendor:val('intelVendor'),current_solution:val('intelSolution'),price_or_fee:val('intelPrice'),main_barrier:val('intelBarrier'),reason_not_now:val('intelReason'),market_signal:val('intelSignal'),reentry_trigger:val('intelReason')}
    };
    if(relation==='KNOWN'){answers.ly_do_chua_trien_khai=val('branchReason');answers.thay_doi_hien_tai=val('branchChange')}else if(relation==='FORMER'||relation==='CURRENT'){answers.tinh_trang_thiet_bi=val('branchDevice');answers.mong_muon_hien_tai=val('branchWant')}else{answers.hoat_dong_tuong_tu=val('branchExisting');answers.muon_cai_thien=val('branchImprove')}
    if(!answers.need_confirmed&&!['NURTURE','NOT_FIT','BLOCKED','INTELLIGENCE_GAIN'].includes(answers.outcome_code)){
      if(!confirm('Need Statement chưa được đánh dấu là đã xác nhận với Nhà trường. Vẫn hoàn thành Discovery?'))return;
    }
    try{
      const r=await call('engagement','saveDiscovery',{outreach_id:row.outreach_id,answers,started_at:new Date().toISOString()});
      host().innerHTML='';toast(r.message);if(window.refreshOutreach)await window.refreshOutreach(true);
      if(r.outcome_code==='QUALIFIED_OPPORTUNITY')toast('Nhu cầu đã đủ rõ. Có thể tạo Cơ hội từ Timeline của trường.');
    }catch(e){toast(e.message,true)}
  }

  const obs=new MutationObserver(()=>decorate());obs.observe(document.documentElement,{subtree:true,childList:true});
})();
