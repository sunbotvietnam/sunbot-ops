// SUNBOT School OS V2 — School Intake V34
// Sale may propose a potential school; only Admin can approve it into canonical SCHOOLS.
const V2_SCHOOL_INTAKE=Object.freeze({
  SHEET:'SCHOOL_PROPOSALS',
  VERSION:'2026.09.23-v34',
  OPEN:{NEW:true,NEEDS_INFO:true}
});

function v2SchoolIntakeSheet_(){
  const ss=v2Db_();
  let sh=ss.getSheetByName(V2_SCHOOL_INTAKE.SHEET);
  const h=[
    'proposal_id','status','school_name','school_type','province','district','address','website',
    'contact_name','contact_role','contact_email','contact_phone','source','evidence_url','reason',
    'notes','next_action','next_action_date','proposed_owner_id','created_by','created_at',
    'admin_note','handled_by','handled_at','existing_school_id','approved_school_id','updated_at'
  ];
  if(!sh){sh=ss.insertSheet(V2_SCHOOL_INTAKE.SHEET);sh.getRange(1,1,1,h.length).setValues([h]);sh.setFrozenRows(1);}
  else{
    const current=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0].map(String);
    h.forEach(function(x){if(current.indexOf(x)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(x);current.push(x);}});
  }
  return sh;
}
function v2SchoolIntakeRows_(){v2SchoolIntakeSheet_();return v2Rows_(V2_SCHOOL_INTAKE.SHEET);}
function v2SchoolNorm_(v){return String(v||'').normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/\s+/g,' ').trim();}
function v2SchoolProposalView_(r){
  return {
    proposal_id:r.proposal_id,status:r.status,school_name:r.school_name,school_type:r.school_type,
    province:r.province,district:r.district,address:r.address,website:r.website,
    contact_name:r.contact_name,contact_role:r.contact_role,contact_email:r.contact_email,contact_phone:r.contact_phone,
    source:r.source,evidence_url:r.evidence_url,reason:r.reason,notes:r.notes,
    next_action:r.next_action,next_action_date:r.next_action_date,proposed_owner_id:r.proposed_owner_id,
    created_by:r.created_by,created_at:r.created_at,admin_note:r.admin_note||'',handled_by:r.handled_by||'',
    handled_at:r.handled_at||'',existing_school_id:r.existing_school_id||'',approved_school_id:r.approved_school_id||'',
    updated_at:r.updated_at||''
  };
}
function v2SchoolDuplicateCandidates_(p){
  const name=v2SchoolNorm_(p.school_name),province=v2SchoolNorm_(p.province);
  if(!name)return[];
  return v2Rows_(V2_OS.S.SCHOOLS).filter(function(s){
    if(!v2Truthy_(s.active))return false;
    const sn=v2SchoolNorm_(s.school_name),sp=v2SchoolNorm_(s.province);
    return sn===name || (province&&sp===province&&(sn.indexOf(name)>=0||name.indexOf(sn)>=0));
  }).slice(0,10).map(function(s){return {school_id:s.school_id,school_name:s.school_name,province:s.province,district:s.district||'',relationship_state:s.relationship_state||''};});
}
function v2SchoolIntakeSubmit_(u,p){
  p=p||{};
  if(String(u.role_code||'').toUpperCase()==='ADMIN')throw new Error('Admin tạo trường chính thức từ màn quản trị; luồng đề xuất dành cho Sale.');
  const schoolName=v2Clean_(p.school_name,180),province=v2Clean_(p.province,100);
  if(!schoolName||!province)throw new Error('Cần tên trường và tỉnh/thành.');
  const dups=v2SchoolDuplicateCandidates_({school_name:schoolName,province:province});
  const now=v2Now_(),id='SP-'+Utilities.getUuid().slice(0,8).toUpperCase();
  v2Append_(V2_SCHOOL_INTAKE.SHEET,{
    proposal_id:id,status:'NEW',school_name:schoolName,school_type:v2Clean_(p.school_type,40),province:province,
    district:v2Clean_(p.district,100),address:v2Clean_(p.address,250),website:v2Clean_(p.website,250),
    contact_name:v2Clean_(p.contact_name,120),contact_role:v2Clean_(p.contact_role,80),
    contact_email:v2Clean_(p.contact_email,160),contact_phone:v2Clean_(p.contact_phone,50),
    source:v2Clean_(p.source,100)||'SALE_DISCOVERY',evidence_url:v2Clean_(p.evidence_url,500),
    reason:v2Clean_(p.reason,2000),notes:v2Clean_(p.notes,4000),next_action:v2Clean_(p.next_action,500),
    next_action_date:String(p.next_action_date||'').slice(0,10),proposed_owner_id:u.user_id,
    created_by:u.user_id,created_at:now,admin_note:'',handled_by:'',handled_at:'',
    existing_school_id:'',approved_school_id:'',updated_at:now
  });
  v2Audit_('SCHOOL_PROPOSAL',id,'CREATE','','',schoolName,u.user_id);
  return {ok:true,proposal_id:id,status:'NEW',duplicate_candidates:dups};
}
function v2SchoolIntakeMine_(u){
  return v2SchoolIntakeRows_().filter(function(r){return String(r.created_by)===String(u.user_id);})
    .sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})
    .map(v2SchoolProposalView_);
}
function v2SchoolIntakeAdminList_(u,p){
  if(String(u.role_code||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được xem inbox đề xuất trường.');
  p=p||{};const all=p.all===true||String(p.all||'')==='1';
  return v2SchoolIntakeRows_().filter(function(r){return all||V2_SCHOOL_INTAKE.OPEN[String(r.status||'').toUpperCase()];})
    .sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})
    .map(function(r){const out=v2SchoolProposalView_(r);out.duplicate_candidates=v2SchoolDuplicateCandidates_(r);return out;});
}
function v2SchoolIntakeRequireAdmin_(u){if(String(u.role_code||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được xử lý đề xuất trường.');}
function v2SchoolIntakeReview_(u,p){
  v2SchoolIntakeRequireAdmin_(u);p=p||{};
  const id=String(p.proposal_id||''),decision=String(p.decision||'').toUpperCase();
  const r=v2SchoolIntakeRows_().find(function(x){return String(x.proposal_id)===id;});
  if(!r)throw new Error('Không tìm thấy đề xuất trường.');
  if(['NEW','NEEDS_INFO'].indexOf(String(r.status||'').toUpperCase())<0)throw new Error('Đề xuất này đã được xử lý.');
  const now=v2Now_(),note=v2Clean_(p.admin_note,2000);
  if(decision==='NEEDS_INFO'){
    v2UpdateById_(V2_SCHOOL_INTAKE.SHEET,'proposal_id',id,{status:'NEEDS_INFO',admin_note:note,handled_by:u.user_id,handled_at:now,updated_at:now});
    v2Audit_('SCHOOL_PROPOSAL',id,'STATUS','status',r.status,'NEEDS_INFO',u.user_id);
    return {ok:true,status:'NEEDS_INFO'};
  }
  if(decision==='REJECT'){
    v2UpdateById_(V2_SCHOOL_INTAKE.SHEET,'proposal_id',id,{status:'REJECTED',admin_note:note,handled_by:u.user_id,handled_at:now,updated_at:now});
    v2Audit_('SCHOOL_PROPOSAL',id,'STATUS','status',r.status,'REJECTED',u.user_id);
    return {ok:true,status:'REJECTED'};
  }
  if(decision==='DUPLICATE'){
    const existing=String(p.existing_school_id||'');
    if(!existing)throw new Error('Cần chọn school_id hiện có khi đánh dấu trùng.');
    const s=v2Rows_(V2_OS.S.SCHOOLS).find(function(x){return String(x.school_id)===existing&&v2Truthy_(x.active);});
    if(!s)throw new Error('Không tìm thấy trường hiện có.');
    v2UpdateById_(V2_SCHOOL_INTAKE.SHEET,'proposal_id',id,{status:'DUPLICATE',admin_note:note,handled_by:u.user_id,handled_at:now,existing_school_id:existing,updated_at:now});
    v2Audit_('SCHOOL_PROPOSAL',id,'STATUS','status',r.status,'DUPLICATE:'+existing,u.user_id);
    return {ok:true,status:'DUPLICATE',existing_school_id:existing};
  }
  if(decision!=='APPROVE')throw new Error('Quyết định xử lý không hợp lệ.');
  const owner=String(p.owner_user_id||r.proposed_owner_id||r.created_by||'');
  const created=v2CreateSchool_(u,{
    school_name:r.school_name,school_type:r.school_type,province:r.province,district:r.district,address:r.address,website:r.website,
    contact_name:r.contact_name,contact_role:r.contact_role,contact_email:r.contact_email,contact_phone:r.contact_phone,
    current_owner_id:owner,source:'APPROVED_SALE_PROPOSAL'
  });
  if(String(r.next_action||'').trim()&&String(r.next_action_date||'').trim()){
    try{v2CreateAction_(u,{school_id:created.school_id,owner_id:owner,action_text:r.next_action,due_date:r.next_action_date,priority:'P2'});}catch(e){}
  }
  v2UpdateById_(V2_SCHOOL_INTAKE.SHEET,'proposal_id',id,{status:'APPROVED',admin_note:note,handled_by:u.user_id,handled_at:now,approved_school_id:created.school_id,updated_at:now});
  v2Audit_('SCHOOL_PROPOSAL',id,'STATUS','status',r.status,'APPROVED:'+created.school_id,u.user_id);
  return {ok:true,status:'APPROVED',school_id:created.school_id};
}
function apiSessionV2Intake(sessionToken,action,payload){
  const u=v2RequireSession_(sessionToken),a=String(action||'');
  if(a==='submit')return v2SchoolIntakeSubmit_(u,payload||{});
  if(a==='mine')return v2SchoolIntakeMine_(u);
  if(a==='duplicates')return v2SchoolDuplicateCandidates_(payload||{});
  if(a==='admin.list')return v2SchoolIntakeAdminList_(u,payload||{});
  if(a==='admin.review')return v2SchoolIntakeReview_(u,payload||{});
  throw new Error('Tác vụ đề xuất trường không hợp lệ.');
}
