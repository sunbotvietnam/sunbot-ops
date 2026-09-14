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
window.SunbotSchoolModel2026={LABELS,label,canonical,summary};

function enrichCardMeta(){document.querySelectorAll('.open-school').forEach(btn=>{const card=btn.closest('.card');if(!card||card.dataset.model2026)return;const s=(state.schools||[]).find(x=>String(x.school_id)===String(btn.dataset.id));if(!s)return;const txt=summary(s);if(!txt)return;const meta=card.querySelector('.meta');if(meta){const el=document.createElement('div');el.className='meta school-model-2026-summary';el.innerHTML='<span>'+txt.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>';meta.insertAdjacentElement('afterend',el);}card.dataset.model2026='1';});}
const obs=new MutationObserver(()=>enrichCardMeta());
function init(){enrichCardMeta();obs.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();