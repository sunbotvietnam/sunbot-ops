// Sunbot School Intake V34 — Sale proposes; Admin decides; canonical SCHOOLS stays governed.
(function(){
'use strict';
if(typeof state==='undefined'||typeof bridge!=='function'||typeof paint!=='function'||typeof render!=='function')return;
const IS_ADMIN=/admin-workspace/i.test(location.pathname)||String(state.user&&state.user.role_code||'').toUpperCase()==='ADMIN';
const STATUS={NEW:'Mới gửi',NEEDS_INFO:'Cần bổ sung',APPROVED:'Đã duyệt',REJECTED:'Không duyệt',DUPLICATE:'Trùng trường'};
function safe(v){return typeof esc==='function'?esc(v):String(v==null?'':v);}
function fmtDate(v){return String(v||'').slice(0,10);}
function intakeHost(){let h=document.getElementById('schoolIntakeModal');if(!h){h=document.createElement('div');h.id='schoolIntakeModal';document.body.appendChild(h);}return h;}
function closeIntakeModal(){intakeHost().innerHTML='';}
function field(label,id,value,type,full){
  type=type||'text';value=value||'';
  if(type==='textarea')return '<label class="field '+(full?'full':'')+'"><span>'+safe(label)+'</span><textarea class="input" id="'+id+'" rows="3">'+safe(value)+'</textarea></label>';
  return '<label class="field '+(full?'full':'')+'"><span>'+safe(label)+'</span><input class="input" id="'+id+'" type="'+type+'" value="'+safe(value)+'"></label>';
}
function modal(title,body,saveLabel){
  const h=intakeHost();
  h.innerHTML='<div style="position:fixed;inset:0;background:#17212b66;z-index:12000;display:grid;place-items:center;padding:18px"><section style="width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #fed7aa;border-radius:22px;box-shadow:0 22px 60px #10182830;padding:18px"><div style="display:flex;justify-content:space-between;gap:12px"><div><span class="pill">SCHOOL INTAKE</span><h2 style="margin:8px 0 4px">'+safe(title)+'</h2></div><button class="btn ghost" id="siClose">✕</button></div><div style="margin-top:16px">'+body+'</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn ghost" id="siCancel">Hủy</button><button class="btn" id="siSave">'+safe(saveLabel||'Lưu')+'</button></div></section></div>';
  document.getElementById('siClose').onclick=closeIntakeModal;document.getElementById('siCancel').onclick=closeIntakeModal;
  return h;
}
function statusPill(s){const label=STATUS[String(s||'').toUpperCase()]||s||'—';return '<span class="pill">'+safe(label)+'</span>';}
function ensureTab(label){
  const nav=document.querySelector('.tabs');if(!nav)return null;
  let b=nav.querySelector('[data-tab="school-intake"]');
  if(!b){b=document.createElement('button');b.dataset.tab='school-intake';b.textContent=label;nav.appendChild(b);}
  nav.style.gridTemplateColumns='repeat('+nav.querySelectorAll('button[data-tab]').length+',minmax(0,1fr))';
  b.classList.toggle('active',state.tab==='school-intake');
  b.onclick=async function(){state.tab='school-intake';render();await loadIntake(true);};
  return b;
}
state.schoolIntake=state.schoolIntake||[];state.schoolIntakeLoaded=false;state.schoolIntakeBusy=false;state.schoolIntakeAll=false;
async function loadIntake(force){
  if(state.schoolIntakeBusy||(!force&&state.schoolIntakeLoaded))return;
  state.schoolIntakeBusy=true;if(state.tab==='school-intake')intakeView();
  try{
    state.schoolIntake=await bridge('v2Intake',IS_ADMIN?'admin.list':'mine',IS_ADMIN?{all:state.schoolIntakeAll}:{});
    state.schoolIntakeLoaded=true;
  }catch(e){toast('Không tải được đề xuất trường: '+e.message,true);}
  finally{state.schoolIntakeBusy=false;if(state.tab==='school-intake')intakeView();}
}
function saleForm(){
  const tomorrow=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const body='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">'+
    field('Tên trường *','siName')+field('Tỉnh/Thành *','siProvince','Hà Nội')+
    field('Quận/Huyện/Khu vực','siDistrict')+field('Loại trường','siType')+
    field('Địa chỉ','siAddress')+field('Website/Fanpage nguồn','siWebsite','', 'url')+
    field('Đầu mối','siContact')+field('Điện thoại','siPhone','', 'tel')+
    field('Nguồn phát hiện','siSource','Sale phát hiện')+field('Link minh chứng','siEvidence','', 'url')+
    field('Vì sao nên đưa vào theo dõi?','siReason','', 'textarea',true)+
    field('Thông tin đã biết / ghi chú','siNotes','', 'textarea',true)+
    field('Việc tiếp theo nếu được duyệt','siNext','Gọi xác minh đầu mối và nhu cầu', 'textarea',true)+
    field('Hạn dự kiến','siDue',tomorrow,'date')+
    '</div><div class="notice" style="margin-top:12px"><b>Nguyên tắc:</b> Sale chỉ gửi đề xuất. Trường chỉ trở thành School Account chính thức sau khi Admin duyệt. Nếu hệ thống phát hiện tên trùng, Admin sẽ đối chiếu trước khi duyệt.</div>';
  modal('Đề xuất trường mới',body,'Gửi Admin');
  document.getElementById('siSave').onclick=async function(){
    const p={school_name:document.getElementById('siName').value.trim(),province:document.getElementById('siProvince').value.trim(),district:document.getElementById('siDistrict').value.trim(),school_type:document.getElementById('siType').value.trim(),address:document.getElementById('siAddress').value.trim(),website:document.getElementById('siWebsite').value.trim(),contact_name:document.getElementById('siContact').value.trim(),contact_phone:document.getElementById('siPhone').value.trim(),source:document.getElementById('siSource').value.trim(),evidence_url:document.getElementById('siEvidence').value.trim(),reason:document.getElementById('siReason').value.trim(),notes:document.getElementById('siNotes').value.trim(),next_action:document.getElementById('siNext').value.trim(),next_action_date:document.getElementById('siDue').value};
    if(!p.school_name||!p.province){toast('Cần nhập tên trường và tỉnh/thành.',true);return;}
    this.disabled=true;
    try{
      const r=await bridge('v2Intake','submit',p);closeIntakeModal();state.schoolIntakeLoaded=false;
      const n=(r.duplicate_candidates||[]).length;toast(n?'Đã gửi Admin. Hệ thống phát hiện '+n+' trường có khả năng trùng để Admin đối chiếu.':'Đã gửi đề xuất trường cho Admin.');
      state.tab='school-intake';render();await loadIntake(true);
    }catch(e){toast(e.message,true);this.disabled=false;}
  };
}
function saleIntakeView(){
  const rows=state.schoolIntake||[];
  el('content').innerHTML='<section class="hero"><div><span class="kicker">SALE → ADMIN</span><h1>Đề xuất trường</h1><p>Trường tiềm năng do Sale phát hiện được gửi vào hàng chờ. Sale không tạo School Account chính thức.</p></div><button class="btn" id="siNew">＋ Đề xuất trường</button></section>'+
    (state.schoolIntakeBusy?'<div class="notice">Đang tải…</div>':'')+
    '<section class="cards">'+(rows.length?rows.map(function(r){return '<article class="card"><div class="card-top"><div>'+statusPill(r.status)+'<h3>'+safe(r.school_name)+'</h3><div class="meta"><span>'+safe([r.province,r.district].filter(Boolean).join(' · '))+'</span></div></div></div>'+(r.reason?'<div class="next"><span>LÝ DO ĐỀ XUẤT</span><b>'+safe(r.reason)+'</b></div>':'')+(r.next_action?'<div class="next"><span>NẾU ĐƯỢC DUYỆT</span><b>'+safe(r.next_action)+'</b><small>'+safe(fmtDate(r.next_action_date))+'</small></div>':'')+(r.admin_note?'<div class="next"><span>PHẢN HỒI ADMIN</span><b>'+safe(r.admin_note)+'</b></div>':'')+(r.approved_school_id?'<div class="meta"><span>School ID: '+safe(r.approved_school_id)+'</span></div>':'')+'</article>';}).join(''):'<div class="empty">Chưa có đề xuất trường nào.</div>')+'</section>';
  document.getElementById('siNew').onclick=saleForm;
}
function adminDecision(r,decision){
  const title=decision==='APPROVE'?'Duyệt trường':decision==='NEEDS_INFO'?'Yêu cầu bổ sung':decision==='DUPLICATE'?'Đánh dấu trùng':'Không duyệt';
  let body='<div class="notice"><b>'+safe(r.school_name)+'</b> · '+safe(r.province||'')+'</div>';
  if((r.duplicate_candidates||[]).length){
    body+='<div class="section"><h3>Trường có khả năng trùng</h3>'+(r.duplicate_candidates||[]).map(function(x){return '<div class="event"><b>'+safe(x.school_name)+'</b><div>'+safe([x.province,x.district,x.relationship_state].filter(Boolean).join(' · '))+'</div><small>'+safe(x.school_id)+'</small></div>';}).join('')+'</div>';
  }
  if(decision==='DUPLICATE')body+=field('School ID hiện có *','siExisting');
  if(decision==='APPROVE')body+=field('Owner User ID','siOwner',r.proposed_owner_id||r.created_by||'');
  body+=field('Ghi chú Admin','siAdminNote','', 'textarea',true);
  modal(title,body,title);
  document.getElementById('siSave').onclick=async function(){
    const payload={proposal_id:r.proposal_id,decision:decision,admin_note:document.getElementById('siAdminNote').value.trim()};
    if(decision==='DUPLICATE')payload.existing_school_id=document.getElementById('siExisting').value.trim();
    if(decision==='APPROVE')payload.owner_user_id=document.getElementById('siOwner').value.trim();
    this.disabled=true;
    try{const out=await bridge('v2Intake','admin.review',payload);closeIntakeModal();toast(decision==='APPROVE'?'Đã duyệt và tạo School Account '+out.school_id:'Đã cập nhật đề xuất.');state.schoolIntakeLoaded=false;await loadIntake(true);}
    catch(e){toast(e.message,true);this.disabled=false;}
  };
}
function adminIntakeView(){
  const rows=state.schoolIntake||[];
  el('content').innerHTML='<section class="hero"><div><span class="kicker">GOVERNED INTAKE</span><h1>Đề xuất trường</h1><p>Admin kiểm tra trùng, độ tin cậy và mức ưu tiên trước khi tạo School Account chính thức.</p></div><div style="display:flex;gap:8px"><button class="btn secondary" id="siToggleAll">'+(state.schoolIntakeAll?'Chỉ hồ sơ mở':'Xem cả lịch sử')+'</button><button class="btn secondary" id="siReload">↻</button></div></section>'+
    (state.schoolIntakeBusy?'<div class="notice">Đang tải…</div>':'')+
    '<section class="cards">'+(rows.length?rows.map(function(r){const d=(r.duplicate_candidates||[]);return '<article class="card"><div class="card-top"><div>'+statusPill(r.status)+'<h3>'+safe(r.school_name)+'</h3><div class="meta"><span>'+safe([r.province,r.district].filter(Boolean).join(' · '))+'</span><span>Sale: '+safe(r.created_by||'')+'</span></div></div></div>'+(r.reason?'<div class="next"><span>LÝ DO</span><b>'+safe(r.reason)+'</b></div>':'')+(r.contact_name||r.contact_phone?'<div class="next"><span>ĐẦU MỐI</span><b>'+safe([r.contact_name,r.contact_phone].filter(Boolean).join(' · '))+'</b></div>':'')+(d.length?'<div class="notice" style="margin-top:10px"><b>Có '+d.length+' khả năng trùng.</b> Kiểm tra trước khi duyệt.</div>':'')+(['NEW','NEEDS_INFO'].includes(String(r.status||'').toUpperCase())?'<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px"><button class="btn siDecision" data-id="'+safe(r.proposal_id)+'" data-d="APPROVE">Duyệt</button><button class="btn secondary siDecision" data-id="'+safe(r.proposal_id)+'" data-d="NEEDS_INFO">Cần bổ sung</button><button class="btn secondary siDecision" data-id="'+safe(r.proposal_id)+'" data-d="DUPLICATE">Trùng trường</button><button class="btn ghost siDecision" data-id="'+safe(r.proposal_id)+'" data-d="REJECT">Không duyệt</button></div>':'')+'</article>';}).join(''):'<div class="empty">Không có đề xuất cần xử lý.</div>')+'</section>';
  document.getElementById('siReload').onclick=function(){loadIntake(true);};
  document.getElementById('siToggleAll').onclick=function(){state.schoolIntakeAll=!state.schoolIntakeAll;state.schoolIntakeLoaded=false;loadIntake(true);};
  document.querySelectorAll('.siDecision').forEach(function(b){b.onclick=function(){const r=rows.find(function(x){return String(x.proposal_id)===String(b.dataset.id);});if(r)adminDecision(r,b.dataset.d);};});
}
function intakeView(){return IS_ADMIN?adminIntakeView():saleIntakeView();}

const oldPaint=paint,oldRender=render;
paint=function(){if(state.tab==='school-intake')return intakeView();return oldPaint();};
render=function(){oldRender();ensureTab(IS_ADMIN?'ĐỀ XUẤT TRƯỜNG':'ĐỀ XUẤT');};

if(!IS_ADMIN&&typeof schoolsView==='function'){
  const oldSchoolsView=schoolsView;
  schoolsView=function(){
    oldSchoolsView();
    const b=document.getElementById('addSchool');
    if(b){b.textContent='＋ Đề xuất trường';b.onclick=saleForm;b.title='Sale gửi đề xuất để Admin duyệt trước khi tạo School Account';}
  };
}

document.addEventListener('click',function(e){
  if(!IS_ADMIN&&e.target&&e.target.id==='addSchool'){e.preventDefault();e.stopPropagation();saleForm();}
},true);

setTimeout(function(){render();if(state.tab==='school-intake')loadIntake(false);},0);
window.SunbotSchoolIntakeV34={open:saleForm,reload:function(){return loadIntake(true);}};
})();
