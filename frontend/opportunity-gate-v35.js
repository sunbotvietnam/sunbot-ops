// Sunbot Opportunity Gate V35 — qualify before opening an opportunity.
(function(){
'use strict';
if(typeof state==='undefined'||typeof bridge!=='function'||typeof paint!=='function'||typeof render!=='function')return;
const IS_ADMIN=/admin-workspace/i.test(location.pathname);
const STAGE_LABEL={DISCOVERY:'Khám phá',PROPOSAL:'Đề xuất',NEGOTIATION:'Đàm phán',WON:'Đã chốt',LOST:'Không thành công',HOLD:'Tạm giữ'};
function s(v){return typeof esc==='function'?esc(v):String(v==null?'':v);}
function d(v){return String(v||'').slice(0,10);}
function host(){let h=document.getElementById('oppGateModal');if(!h){h=document.createElement('div');h.id='oppGateModal';document.body.appendChild(h);}return h;}
function closeModal(){host().innerHTML='';}
function modal(title,body,saveLabel){
 const h=host();h.innerHTML='<div style="position:fixed;inset:0;background:#17212b66;z-index:13000;display:grid;place-items:center;padding:18px"><section style="width:min(800px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #fed7aa;border-radius:22px;box-shadow:0 22px 60px #10182830;padding:18px"><div style="display:flex;justify-content:space-between;gap:12px"><div><span class="pill">DISCOVERY GATE</span><h2 style="margin:8px 0 4px">'+s(title)+'</h2></div><button class="btn ghost" id="ogClose">✕</button></div><div style="margin-top:16px">'+body+'</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn ghost" id="ogCancel">Đóng</button>'+(saveLabel?'<button class="btn" id="ogSave">'+s(saveLabel)+'</button>':'')+'</div></section></div>';
 document.getElementById('ogClose').onclick=closeModal;document.getElementById('ogCancel').onclick=closeModal;return h;
}
function field(label,id,val,type,full){
 type=type||'text';val=val==null?'':val;
 if(type==='textarea')return '<label class="field '+(full?'full':'')+'"><span>'+s(label)+'</span><textarea class="input" id="'+id+'" rows="3">'+s(val)+'</textarea></label>';
 return '<label class="field '+(full?'full':'')+'"><span>'+s(label)+'</span><input class="input" id="'+id+'" type="'+type+'" value="'+s(val)+'"></label>';
}
function select(label,id,val,items){
 return '<label class="field"><span>'+s(label)+'</span><select class="input" id="'+id+'>'+items.map(function(x){return '<option value="'+s(x[0])+'" '+(String(val||'')===String(x[0])?'selected':'')+'>'+s(x[1])+'</option>';}).join('')+'</select></label>';
}
function check(label,id,on){return '<label style="display:flex;gap:8px;align-items:center;padding:10px;border:1px solid #eee;border-radius:12px"><input id="'+id+'" type="checkbox" '+(on?'checked':'')+'><span>'+s(label)+'</span></label>';}
function currentSchool(){
 if(IS_ADMIN){const p=(state.schoolProfile||{}).profile||{};return p.school_id?p:null;}
 const p=(state.drawer||{}).school||{};return p.school_id?p:null;
}
function gateHtml(g){
 if(!g)return '<div class="notice">Chưa có đánh giá Discovery.</div>';
 const ok=g.status==='READY';
 return '<div class="notice" style="margin-top:12px"><b>'+ (ok?'ĐỦ ĐIỀU KIỆN MỞ CƠ HỘI':'CHƯA ĐỦ ĐIỀU KIỆN')+'</b> · '+Number(g.score||0)+'/'+Number(g.total||5)+' tiêu chí'+(!ok&&g.missing&&g.missing.length?'<div style="margin-top:6px">Còn thiếu: '+s(g.missing.join(' · '))+'</div>':'')+'</div>';
}
async function openDiscovery(school){
 if(!school||!school.school_id)return;
 let info;
 try{info=await bridge('v2Opportunity','discovery.get',{school_id:school.school_id});}catch(e){toast(e.message,true);return;}
 const x=info.discovery||{},g=x?{score:x.gate_score,total:x.gate_total,status:x.gate_status,missing:x.gate_missing||[],checks:x.gate_checks||[]}:null;
 const body='<div class="notice"><b>'+s(school.school_name)+'</b><br>Chỉ mở Opportunity khi 5 tín hiệu tối thiểu đã rõ. Budget chưa phải điều kiện bắt buộc ở giai đoạn này.</div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:12px">'+
 field('Nhu cầu thực tế của trường *','ogNeed',x.need_summary||'','textarea',true)+
 check('Nhu cầu đã được trường/đầu mối xác nhận','ogNeedConfirmed',!!x.need_confirmed)+
 field('Người quyết định / ảnh hưởng chính *','ogDecision',x.decision_maker||'')+
 field('Vai trò','ogRole',x.decision_role||'')+
 check('Đã xác định đúng người có thẩm quyền/ảnh hưởng','ogAuthority',!!x.authority_confirmed)+
 select('Khả năng triển khai *','ogFit',x.implementation_fit||'',[['','Chưa xác minh'],['YES','Có thể triển khai'],['MAYBE','Có thể, cần làm rõ'],['NO','Chưa khả thi']])+
 field('Sản phẩm / hướng giải pháp phù hợp *','ogProduct',x.product_interest||'')+
 select('Mô hình dự kiến','ogModel',x.preferred_model||'',[['','Chưa xác định'],['DIRECT','Sunbot trực tiếp'],['SCHOOL_LED','Trường chủ động nhân sự'],['CO_DELIVERY','Phối hợp'],['LICENSE','Chuyển giao / license'],['SYSTEM_MULTI_SITE','Nhiều điểm/cơ sở']])+
 field('Tín hiệu ngân sách / nguồn chi','ogBudget',x.budget_signal||'','textarea',true)+
 field('Thời điểm / cửa sổ quyết định','ogTiming',x.timing||'')+
 field('Điểm nghẽn / điều kiện còn thiếu','ogBlockers',x.blockers||'','textarea',true)+
 field('Việc tiếp theo *','ogNext',x.next_action||'','textarea',true)+
 field('Hạn *','ogDue',d(x.next_action_date)||new Date(Date.now()+3*86400000).toISOString().slice(0,10),'date')+
 '</div><div id="ogGate">'+gateHtml(g)+'</div>'+
 (info.opportunity?'<div class="notice" style="margin-top:10px"><b>Đã có Opportunity:</b> '+s(info.opportunity.opportunity_id)+' · '+s(STAGE_LABEL[info.opportunity.stage]||info.opportunity.stage)+'</div>':'')+
 (!info.opportunity&&g&&g.status==='READY'?'<div style="margin-top:12px"><button class="btn secondary" id="ogOpenOpp">Mở Cơ hội kinh doanh</button></div>':'');
 modal('Đánh giá cơ hội · '+school.school_name,body,'Lưu Discovery');
 document.getElementById('ogSave').onclick=async function(){
   const payload={
    school_id:school.school_id,need_summary:document.getElementById('ogNeed').value.trim(),
    need_confirmed:document.getElementById('ogNeedConfirmed').checked,
    decision_maker:document.getElementById('ogDecision').value.trim(),decision_role:document.getElementById('ogRole').value.trim(),
    authority_confirmed:document.getElementById('ogAuthority').checked,implementation_fit:document.getElementById('ogFit').value,
    product_interest:document.getElementById('ogProduct').value.trim(),preferred_model:document.getElementById('ogModel').value,
    budget_signal:document.getElementById('ogBudget').value.trim(),timing:document.getElementById('ogTiming').value.trim(),
    blockers:document.getElementById('ogBlockers').value.trim(),next_action:document.getElementById('ogNext').value.trim(),
    next_action_date:document.getElementById('ogDue').value
   };
   this.disabled=true;
   try{
     const r=await bridge('v2Opportunity','discovery.save',payload);
     toast(r.gate.status==='READY'?'Đã lưu. Trường đã đủ Discovery gate.':'Đã lưu Discovery '+r.gate.score+'/'+r.gate.total+'.');
     closeModal();await refreshAfterDiscovery(school.school_id);await openDiscovery(school);
   }catch(e){toast(e.message,true);this.disabled=false;}
 };
 if(document.getElementById('ogOpenOpp'))document.getElementById('ogOpenOpp').onclick=async function(){
   this.disabled=true;try{const r=await bridge('v2Opportunity','opportunity.open',{school_id:school.school_id});toast(r.already_exists?'Trường đã có Opportunity đang mở.':'Đã mở Cơ hội kinh doanh.');closeModal();await refreshAfterDiscovery(school.school_id);state.tab='opportunities';render();await loadOpportunities(true);}catch(e){toast(e.message,true);this.disabled=false;}
 };
}
async function refreshAfterDiscovery(id){
 try{
  if(IS_ADMIN&&typeof fetchSchools==='function')await fetchSchools(true);
  else if(!IS_ADMIN&&typeof load==='function')await load();
 }catch(e){}
}
function injectDiscoveryButton(){
 const panel=document.querySelector('#drawerHost .drawer-panel');if(!panel||panel.querySelector('#opportunityGateBtn'))return;
 const school=currentSchool();if(!school)return;
 const sec=document.createElement('section');sec.className='section';sec.innerHTML='<h3>Cơ hội kinh doanh</h3><button class="btn secondary" id="opportunityGateBtn">Đánh giá cơ hội</button><div style="font-size:12px;color:#667085;margin-top:6px">Nhu cầu → Người quyết định → Khả năng triển khai → Giải pháp → Next action.</div>';
 const sections=panel.querySelectorAll('.section');if(sections.length)sections[0].insertAdjacentElement('beforebegin',sec);else panel.appendChild(sec);
 sec.querySelector('#opportunityGateBtn').onclick=function(){openDiscovery(school);};
}

state.opportunities=state.opportunities||[];state.opportunitiesLoaded=false;state.opportunitiesBusy=false;
async function loadOpportunities(force){
 if(state.opportunitiesBusy||(!force&&state.opportunitiesLoaded))return;
 state.opportunitiesBusy=true;if(state.tab==='opportunities')opportunityView();
 try{state.opportunities=await bridge('v2Opportunity','opportunity.list',IS_ADMIN?{all:true}:{});state.opportunitiesLoaded=true;}
 catch(e){toast('Không tải được cơ hội: '+e.message,true);}
 finally{state.opportunitiesBusy=false;if(state.tab==='opportunities')opportunityView();}
}
function ensureOpportunityTab(){
 const nav=document.querySelector('.tabs');if(!nav)return;
 let b=nav.querySelector('[data-tab="opportunities"]');
 if(!b){b=document.createElement('button');b.dataset.tab='opportunities';b.textContent='CƠ HỘI';nav.appendChild(b);}
 nav.style.gridTemplateColumns='repeat('+nav.querySelectorAll('button[data-tab]').length+',minmax(0,1fr))';
 b.classList.toggle('active',state.tab==='opportunities');
 b.onclick=async function(){state.tab='opportunities';render();await loadOpportunities(true);};
}
function opportunityCard(o){
 return '<article class="card"><div class="card-top"><div><span class="pill">'+s(STAGE_LABEL[o.stage]||o.stage||'DISCOVERY')+'</span><h3>'+s(o.school_name||o.title)+'</h3><div class="meta"><span>'+s(o.province||'')+'</span><span>'+s(o.owner_name||'')+'</span></div></div><button class="btn secondary ogEditOpp" data-id="'+s(o.opportunity_id)+'">Cập nhật</button></div>'+
 '<div class="next"><span>GIẢI PHÁP</span><b>'+s(o.product||'Chưa xác định')+'</b></div>'+
 (o.need_summary?'<div class="next"><span>NHU CẦU</span><b>'+s(o.need_summary)+'</b></div>':'')+
 '<div class="next"><span>VIỆC TIẾP THEO</span><b>'+s(o.next_action||'Chưa có')+'</b><small>'+s(d(o.next_action_date))+'</small></div></article>';
}
function opportunityView(){
 const rows=state.opportunities||[];
 el('content').innerHTML='<section class="hero"><div><span class="kicker">QUALIFIED PIPELINE</span><h1>Cơ hội</h1><p>Chỉ những trường đã vượt Discovery gate mới xuất hiện tại đây. Trường đang tiếp cận nhưng chưa đủ dữ kiện vẫn ở Trường đang làm.</p></div><button class="btn secondary" id="ogReload">↻</button></section>'+
 '<section class="metrics"><div class="metric"><b>'+rows.length+'</b><span>Cơ hội đang mở</span></div><div class="metric"><b>'+rows.filter(function(x){return x.stage==='DISCOVERY';}).length+'</b><span>Khám phá</span></div><div class="metric"><b>'+rows.filter(function(x){return x.stage==='PROPOSAL';}).length+'</b><span>Đề xuất</span></div><div class="metric"><b>'+rows.filter(function(x){return x.stage==='NEGOTIATION';}).length+'</b><span>Đàm phán</span></div></section>'+
 '<section class="cards">'+(rows.length?rows.map(opportunityCard).join(''):'<div class="empty">Chưa có trường nào vượt Discovery gate.</div>')+'</section>';
 document.getElementById('ogReload').onclick=function(){loadOpportunities(true);};
 document.querySelectorAll('.ogEditOpp').forEach(function(b){b.onclick=function(){const o=rows.find(function(x){return String(x.opportunity_id)===String(b.dataset.id);});if(o)editOpportunity(o);};});
}
function editOpportunity(o){
 const body='<div class="notice"><b>'+s(o.school_name||o.title)+'</b> · '+s(o.opportunity_id)+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:12px">'+
 select('Giai đoạn','ogStage',o.stage||'DISCOVERY',[['DISCOVERY','Khám phá'],['PROPOSAL','Đề xuất'],['NEGOTIATION','Đàm phán'],['HOLD','Tạm giữ'],['WON','Đã chốt'],['LOST','Không thành công']])+
 field('Giá trị dự kiến','ogValue',o.expected_value||0,'number')+
 field('Việc tiếp theo','ogOppNext',o.next_action||'','textarea',true)+field('Hạn','ogOppDue',d(o.next_action_date),'date')+'</div>';
 modal('Cập nhật Opportunity',body,'Lưu');
 document.getElementById('ogSave').onclick=async function(){
   const p={opportunity_id:o.opportunity_id,stage:document.getElementById('ogStage').value,expected_value:Number(document.getElementById('ogValue').value||0),next_action:document.getElementById('ogOppNext').value.trim(),next_action_date:document.getElementById('ogOppDue').value};
   this.disabled=true;try{await bridge('v2Opportunity','opportunity.update',p);closeModal();toast('Đã cập nhật Cơ hội.');state.opportunitiesLoaded=false;await loadOpportunities(true);if(!IS_ADMIN&&typeof load==='function')await load();}catch(e){toast(e.message,true);this.disabled=false;}
 };
}

const oldPaint=paint,oldRender=render;
paint=function(){if(state.tab==='opportunities')return opportunityView();return oldPaint();};
render=function(){oldRender();ensureOpportunityTab();injectDiscoveryButton();};
const obs=new MutationObserver(function(){injectDiscoveryButton();});
function init(){ensureOpportunityTab();injectDiscoveryButton();obs.observe(document.body,{childList:true,subtree:true});if(state.tab==='opportunities')loadOpportunities(false);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.SunbotOpportunityGateV35={openDiscovery:openDiscovery,reload:function(){return loadOpportunities(true);}};
})();
