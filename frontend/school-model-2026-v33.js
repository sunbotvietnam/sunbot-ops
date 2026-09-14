(function(){
'use strict';
if(typeof state==='undefined')return;
const LABELS={
 school_ownership:{PUBLIC:'Công lập',PRIVATE:'Tư thục',PRIVATE_SYSTEM:'Hệ thống trường tư',OTHER:'Khác'},
 organization_structure:{SINGLE_SITE:'Một trường · một điểm',MULTI_CAMPUS:'Một trường · nhiều điểm/cơ sở',MULTI_SCHOOL_GROUP:'Hệ thống · nhiều trường độc lập',CLUSTER:'Cụm triển khai / đề án địa phương'},
 merger_status:{INDEPENDENT:'Độc lập',POST_MERGER:'Sau sáp nhập',PENDING_VERIFY:'Chờ xác minh'},
 delivery_model:{DIRECT:'Sunbot trực tiếp triển khai',CO_DELIVERY:'Phối hợp triển khai',SCHOOL_LED:'Nhà trường chủ động nhân sự',SYSTEM_MULTI_SITE:'Điều phối nhiều điểm/cơ sở'},
 teacher_source:{SUNBOT:'Giáo viên Sunbot',SCHOOL:'Giáo viên nhà trường',LOCAL:'Nhân sự địa phương',MIXED:'Phối hợp nhiều nguồn',UNKNOWN:'Chưa xác minh'},
 payer_model:{PARENT:'Phụ huynh',SCHOOL:'Nhà trường',PUBLIC_BUDGET:'Ngân sách / đề án công',SPONSOR:'Tài trợ',MIXED:'Hỗn hợp',UNKNOWN:'Chưa xác minh'},
 approval_status:{CLEAR:'Cơ chế đã rõ',NEED_REVIEW:'Cần rà pháp lý/chính sách',NEED_APPROVAL:'Cần phê duyệt',PILOT:'Đang thí điểm',UNKNOWN:'Chưa xác minh'}
};
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function label(group,v){return LABELS[group]?.[v]||v||'Chưa xác minh';}
function legacyOwnership(p){const x=String(p.school_type||p.loai_hinh||p.khoi_truong||'').toLowerCase();if(/công|public/.test(x))return'PUBLIC';if(/tư|private/.test(x))return'PRIVATE';return'';}
function canonical(p){return {
 ownership:p.school_ownership||legacyOwnership(p),
 structure:p.organization_structure||'',
 merger:p.merger_status||'',
 campuses:Number(p.campus_count||0)||0,
 current:p.delivery_model_current||'',
 proposed:p.delivery_model_proposed||'',
 teacher:p.teacher_source||'',
 payer:p.payer_model||'',
 approval:p.approval_status||'',
 policy:p.policy_note||''
};}
function summary(p){const c=canonical(p),bits=[label('school_ownership',c.ownership),label('organization_structure',c.structure)];if(c.structure==='MULTI_CAMPUS'&&c.campuses)bits.push(c.campuses+' điểm/cơ sở');if(c.merger)bits.push(label('merger_status',c.merger));return bits.filter(x=>x&&x!=='Chưa xác minh').join(' · ');}
function guidance(c){
 if(c.ownership==='PUBLIC')return '<b>Cơ chế triển khai trường công:</b> làm rõ ai tổ chức nhân sự, nguồn chi/thu theo cơ chế nào, trạng thái phê duyệt ra sao và Sunbot chịu trách nhiệm phần nào.';
 if(c.ownership==='PRIVATE'||c.ownership==='PRIVATE_SYSTEM')return '<b>Mô hình triển khai trường tư:</b> làm rõ người quyết định, mô hình học phí/dịch vụ, nguồn giáo viên, khả năng triển khai theo hệ thống và mức đầu tư phù hợp.';
 return '<b>Định vị Sunbot:</b> Sunbot là hệ thống giáo dục công nghệ dành cho trẻ mầm non. Robot là học cụ; trọng tâm là trẻ, giáo viên và quá trình học.';
}
window.SunbotSchoolModel2026={LABELS,label,canonical,summary};

function enrichCardMeta(){document.querySelectorAll('.open-school').forEach(btn=>{const card=btn.closest('.card');if(!card||card.querySelector('.school-model-2026-summary'))return;const s=(state.schools||[]).find(x=>String(x.school_id)===String(btn.dataset.id));if(!s)return;const txt=summary(s);if(!txt)return;const meta=card.querySelector('.meta');if(meta){const el=document.createElement('div');el.className='meta school-model-2026-summary';el.innerHTML='<span>'+esc(txt)+'</span>';meta.insertAdjacentElement('afterend',el);}});}
function readBlock(){const host=document.querySelector('#drawerHost .drawer-panel');if(!host||host.querySelector('.school-model-2026-block'))return;const p=(state.schoolProfile||{}).profile||{};if(!p.school_id)return;const c=canonical(p),firstSection=host.querySelector('.section');if(!firstSection)return;const block=document.createElement('section');block.className='section school-model-2026-block';block.innerHTML=`<h3>Mô hình trường 2026</h3><div class="school-model-grid">
<div class="event"><b>Loại hình sở hữu</b><div>${esc(label('school_ownership',c.ownership))}</div></div>
<div class="event"><b>Cấu trúc đơn vị</b><div>${esc(label('organization_structure',c.structure))}</div></div>
<div class="event"><b>Trạng thái tổ chức</b><div>${esc(label('merger_status',c.merger))}</div></div>
<div class="event"><b>Số điểm/cơ sở</b><div>${c.campuses?esc(c.campuses):'Chưa xác minh'}</div></div>
<div class="event"><b>Mô hình hiện tại</b><div>${esc(label('delivery_model',c.current))}</div></div>
<div class="event"><b>Mô hình đề xuất</b><div>${esc(label('delivery_model',c.proposed))}</div></div>
<div class="event"><b>Nguồn nhân sự đứng lớp</b><div>${esc(label('teacher_source',c.teacher))}</div></div>
<div class="event"><b>Nguồn chi/thu</b><div>${esc(label('payer_model',c.payer))}</div></div>
<div class="event"><b>Trạng thái phê duyệt</b><div>${esc(label('approval_status',c.approval))}</div></div>
${c.policy?`<div class="event" style="grid-column:1/-1"><b>Ghi chú chính sách địa phương</b><div>${esc(c.policy)}</div></div>`:''}
</div><div class="school-model-note">${guidance(c)}</div>${c.structure==='MULTI_CAMPUS'?'<div class="school-model-note"><b>Nguyên tắc:</b> một trường có nhiều điểm/cơ sở vẫn là một School Account khi cùng một đơn vị trường. Nhiều trường độc lập phải quản lý thành nhiều School Account.</div>':''}`;
firstSection.insertAdjacentElement('beforebegin',block);
}
function opts(map,val){return '<option value="">Chưa xác minh</option>'+Object.entries(map).map(([k,v])=>`<option value="${esc(k)}" ${String(val||'')===k?'selected':''}>${esc(v)}</option>`).join('');}
function editBlock(){const panel=document.querySelector('#drawerHost .drawer-panel');if(!panel||panel.querySelector('.school-model-2026-edit'))return;const title=[...panel.querySelectorAll('.kicker')].find(x=>/SỬA HỒ SƠ/i.test(x.textContent||''));if(!title)return;const p=(state.schoolProfile||{}).profile||{},c=canonical(p),section=panel.querySelector('.section');if(!section)return;const wrap=section.querySelector('div[style*="grid-template-columns"]');if(!wrap)return;const box=document.createElement('div');box.className='school-model-2026-edit';box.style.display='contents';box.innerHTML=`
<label class="field"><span>Loại hình sở hữu</span><select class="input pf" data-key="school_ownership">${opts(LABELS.school_ownership,c.ownership)}</select></label>
<label class="field"><span>Cấu trúc đơn vị</span><select class="input pf" data-key="organization_structure">${opts(LABELS.organization_structure,c.structure)}</select></label>
<label class="field"><span>Trạng thái tổ chức</span><select class="input pf" data-key="merger_status">${opts(LABELS.merger_status,c.merger)}</select></label>
<label class="field"><span>Số điểm/cơ sở</span><input class="input pf" data-key="campus_count" type="number" min="0" value="${esc(c.campuses||'')}"></label>
<label class="field"><span>Mô hình triển khai hiện tại</span><select class="input pf" data-key="delivery_model_current">${opts(LABELS.delivery_model,c.current)}</select></label>
<label class="field"><span>Mô hình đề xuất</span><select class="input pf" data-key="delivery_model_proposed">${opts(LABELS.delivery_model,c.proposed)}</select></label>
<label class="field"><span>Nguồn nhân sự đứng lớp</span><select class="input pf" data-key="teacher_source">${opts(LABELS.teacher_source,c.teacher)}</select></label>
<label class="field"><span>Nguồn chi/thu</span><select class="input pf" data-key="payer_model">${opts(LABELS.payer_model,c.payer)}</select></label>
<label class="field"><span>Trạng thái phê duyệt</span><select class="input pf" data-key="approval_status">${opts(LABELS.approval_status,c.approval)}</select></label>
<label class="field"><span>Ghi chú chính sách địa phương</span><textarea class="input pf" data-key="policy_note" rows="3">${esc(c.policy)}</textarea></label>`;
wrap.appendChild(box);
const note=document.createElement('div');note.className='school-model-note';note.innerHTML='<b>School Model 2026:</b> không đồng nhất “nhiều điểm/cơ sở” với “nhiều trường độc lập”. Trường công và trường tư cần ghi rõ cơ chế triển khai khác nhau.';section.appendChild(note);
}
function enhance(){enrichCardMeta();readBlock();editBlock();}
const obs=new MutationObserver(enhance);
function init(){enhance();obs.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();