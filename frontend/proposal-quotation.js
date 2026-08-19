(function(){
  function currentRow(){const h=document.querySelector('#workspaceOverlay .workspace-head h2');if(!h)return null;const n=String(h.textContent||'').trim();return(state.rows||[]).find(r=>String(r.ten_truong||'').trim()===n)||null;}
  function panel(){return document.getElementById('wsSubpanel');}
  async function openIntegratedProposal(row){
    const h=panel();if(!h)return;h.innerHTML='<div class="subpanel open"><div class="subpanel-card"><div class="workspace-loading">Đang tải bảng giá Sunbot…</div></div></div>';
    try{const boot=await call('proposalQuotation','bootstrap',{outreach_id:row.outreach_id});renderForm(row,boot);}catch(e){h.innerHTML='';toast(e.message,true);}
  }
  function money(n){return Number(n||0).toLocaleString('vi-VN')+' đ';}
  function renderForm(row,boot){
    const h=panel(),packages=(boot.packages||[]).filter(x=>x.approved||boot.rights?.role==='CEO/Admin');
    h.innerHTML=`<div class="subpanel open"><div class="subpanel-card proposal-pricebook"><div class="subpanel-head"><div><h3>Proposal từ bảng giá Sunbot</h3><small class="muted">Chọn gói giá đã được kiểm soát. Không nhập giá tự do vào Proposal.</small></div><button id="pqClose">×</button></div>
      <label>Gói triển khai<select id="pqPackage" class="input"><option value="">Chọn gói…</option>${packages.map(x=>`<option value="${esc(x.package_id)}">${esc(x.name)} · ${money(x.payment_price||x.price_before_tax)}</option>`).join('')}</select></label>
      <div class="form-grid"><label>Chiết khấu (%)<input id="pqDiscount" class="input" type="number" min="0" step="0.5" value="0"></label><label>Trạng thái giá<input class="input" value="Theo bảng giá Sunbot đã kiểm soát" disabled></label></div>
      <div id="pqPreview" class="quote-preview muted">Chọn gói để xem giá.</div>
      <label>Hướng triển khai khuyến nghị<textarea id="pqModel" class="input textarea" placeholder="Ví dụ: Giáo viên Nhà trường triển khai sau đào tạo + bộ robot/học liệu cho khối 4–5 tuổi"></textarea></label>
      <label>Bước tiếp theo sau Proposal<textarea id="pqNext" class="input textarea" placeholder="Ví dụ: Nhà trường xác nhận quy mô/lịch để hai bên hoàn thiện kế hoạch triển khai"></textarea></label>
      <label>Ghi chú nội bộ<textarea id="pqNotes" class="input textarea" placeholder="Không đưa các ghi chú nội bộ nhạy cảm vào tài liệu gửi khách"></textarea></label>
      <div class="default-note">Proposal được tạo ở trạng thái <b>Chờ duyệt</b>. Admin duyệt; Leader chỉ duyệt Proposal do Staff thuộc nhóm mình tạo.</div>
      <button class="btn full" id="pqCreate">Tạo Proposal & báo giá</button></div></div>`;
    document.getElementById('pqClose').onclick=()=>document.getElementById('documentsBtn')?.click();
    const refresh=()=>preview(row);document.getElementById('pqPackage').onchange=refresh;document.getElementById('pqDiscount').oninput=refresh;
    document.getElementById('pqCreate').onclick=()=>create(row);
  }
  async function preview(row){
    const pkg=document.getElementById('pqPackage')?.value||'',host=document.getElementById('pqPreview');if(!pkg){if(host)host.textContent='Chọn gói để xem giá.';return;}
    const rate=Math.max(0,Number(document.getElementById('pqDiscount')?.value||0))/100;
    try{const p=await call('proposalQuotation','preview',{package_id:pkg,discount_rate:rate});if(host)host.innerHTML=`<div><span>Giá gốc</span><b>${money(p.subtotal)}</b></div><div><span>Chiết khấu</span><b>${Math.round(rate*10000)/100}%</b></div><div class="quote-final"><span>Giá đề xuất</span><b>${money(p.final_amount)}</b></div>${p.approval_required?'<small class="warn">Mức giá/chiết khấu này cần phê duyệt.</small>':'<small>Trong quyền và bảng giá hiện hành.</small>'}`;}catch(e){if(host)host.innerHTML='<span class="warn">'+esc(e.message)+'</span>';}
  }
  async function create(row){
    const pkg=document.getElementById('pqPackage')?.value||'';if(!pkg)return toast('Hãy chọn gói triển khai.',true);
    const discount=Math.max(0,Number(document.getElementById('pqDiscount')?.value||0))/100;
    try{const r=await call('proposalQuotation','create',{outreach_id:row.outreach_id,package_id:pkg,discount_rate:discount,recommended_model:document.getElementById('pqModel').value,next_step:document.getElementById('pqNext').value,notes:document.getElementById('pqNotes').value});toast('Đã tạo Proposal từ bảng giá · '+r.quotation_id);document.getElementById('documentsBtn')?.click();}catch(e){toast(e.message,true);}
  }
  function bind(){const b=document.getElementById('makeProposal');if(!b||b.dataset.quoteBound==='1')return;b.dataset.quoteBound='1';b.textContent='Tạo Proposal + báo giá';b.onclick=()=>{const r=currentRow();if(r)openIntegratedProposal(r);};}
  const obs=new MutationObserver(bind);obs.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',bind);
})();
