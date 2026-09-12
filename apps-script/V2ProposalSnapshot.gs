// SUNBOT School OS V2 — Calculator Proposal Snapshot
// Sale sends the exact calculator state to Admin; snapshot payload is immutable.
const V2_PROPOSAL_SNAPSHOT=Object.freeze({
  SHEET:'SALE_PROPOSAL_SNAPSHOTS',
  VERSION:'2026.09.12-v1',
  OPEN:{NEW:true,IN_REVIEW:true,NEEDS_INFO:true}
});
function v2ProposalSheet_(){
  const ss=v2Db_();let sh=ss.getSheetByName(V2_PROPOSAL_SNAPSHOT.SHEET);
  const h=['proposal_snapshot_id','school_id','school_name','version','status','created_by','created_at','source','calculator_version','snapshot_json','summary_text','admin_note','handled_by','handled_at','updated_at'];
  if(!sh){sh=ss.insertSheet(V2_PROPOSAL_SNAPSHOT.SHEET);sh.getRange(1,1,1,h.length).setValues([h]);sh.setFrozenRows(1);}
  else{const current=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getDisplayValues()[0].map(String);h.forEach(function(x){if(current.indexOf(x)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(x);current.push(x);}});}
  return sh;
}
function v2ProposalRows_(){v2ProposalSheet_();return v2Rows_(V2_PROPOSAL_SNAPSHOT.SHEET);}
function v2ProposalNextVersion_(schoolId){return v2ProposalRows_().filter(function(r){return String(r.school_id)===String(schoolId);}).length+1;}
function v2ProposalPendingBySchool_(){const m={};v2ProposalRows_().forEach(function(r){if(!V2_PROPOSAL_SNAPSHOT.OPEN[String(r.status||'').toUpperCase()])return;const id=String(r.school_id||'');if(!id)return;const old=m[id];if(!old||String(r.updated_at||r.created_at||'')>String(old.updated_at||old.created_at||''))m[id]=r;});return m;}
function v2ProposalSubmit_(u,p){
  p=p||{};const school=v2AssertSchool_(u,String(p.school_id||''));const raw=p.snapshot;
  if(!raw||typeof raw!=='object')throw new Error('Chưa có dữ liệu phương án từ Máy tính.');
  const json=JSON.stringify(raw);if(json.length>45000)throw new Error('Dữ liệu phương án quá lớn. Hãy tải lại Máy tính và gửi lại.');
  const now=v2Now_(),id='PS-'+Utilities.getUuid().slice(0,8).toUpperCase(),version=v2ProposalNextVersion_(school.school_id);
  v2Append_(V2_PROPOSAL_SNAPSHOT.SHEET,{proposal_snapshot_id:id,school_id:school.school_id,school_name:school.school_name,version:version,status:'NEW',created_by:u.user_id,created_at:now,source:'DEAL_CALCULATOR',calculator_version:v2Clean_(p.calculator_version,80)||'deal-calculator-20260912',snapshot_json:json,summary_text:v2Clean_(p.summary_text,10000),admin_note:'',handled_by:'',handled_at:'',updated_at:now});
  v2Audit_('PROPOSAL_SNAPSHOT',id,'CREATE','','','NEW',u.user_id);
  try{v2CreateInteraction_(u,{school_id:school.school_id,interaction_type:'SENT_TO_ADMIN',summary:'Đã gửi phương án từ Máy tính cho Admin xử lý ('+id+', v'+version+').'});}catch(e){}
  return {ok:true,proposal_snapshot_id:id,version:version,status:'NEW',school_id:school.school_id,school_name:school.school_name};
}
function v2ProposalMine_(u){return v2ProposalRows_().filter(function(r){return String(r.created_by)===String(u.user_id);}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));}).map(v2ProposalView_);}
function v2ProposalView_(r){return {proposal_snapshot_id:r.proposal_snapshot_id,school_id:r.school_id,school_name:r.school_name,version:Number(r.version||1),status:r.status,created_by:r.created_by,created_at:r.created_at,calculator_version:r.calculator_version,summary_text:r.summary_text||'',admin_note:r.admin_note||'',handled_by:r.handled_by||'',handled_at:r.handled_at||'',updated_at:r.updated_at||''};}
function v2ProposalRequireAdmin_(u){if(String(u.role_code||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được xử lý phương án Sale gửi.');}
function v2ProposalAdminList_(u,p){v2ProposalRequireAdmin_(u);p=p||{};const all=String(p.all||'')==='1'||p.all===true;return v2ProposalRows_().filter(function(r){return all||V2_PROPOSAL_SNAPSHOT.OPEN[String(r.status||'').toUpperCase()];}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));}).map(v2ProposalView_);}
function v2ProposalDetail_(u,id){const r=v2ProposalRows_().find(function(x){return String(x.proposal_snapshot_id)===String(id);});if(!r)throw new Error('Không tìm thấy phương án.');const isAdmin=String(u.role_code||'').toUpperCase()==='ADMIN';if(!isAdmin&&String(r.created_by)!==String(u.user_id))throw new Error('Không có quyền xem phương án này.');const out=v2ProposalView_(r);try{out.snapshot=JSON.parse(String(r.snapshot_json||'{}'));}catch(e){out.snapshot={};}return out;}
function v2ProposalStatus_(u,p){v2ProposalRequireAdmin_(u);p=p||{};const id=String(p.proposal_snapshot_id||''),status=String(p.status||'').toUpperCase();if(['NEW','IN_REVIEW','NEEDS_INFO','LOCKED','RELEASED','CANCELLED'].indexOf(status)<0)throw new Error('Trạng thái xử lý không hợp lệ.');const current=v2ProposalRows_().find(function(x){return String(x.proposal_snapshot_id)===id;});if(!current)throw new Error('Không tìm thấy phương án.');const now=v2Now_(),patch={status:status,admin_note:v2Clean_(p.admin_note,2000),handled_by:u.user_id,handled_at:now,updated_at:now};v2UpdateById_(V2_PROPOSAL_SNAPSHOT.SHEET,'proposal_snapshot_id',id,patch);v2Audit_('PROPOSAL_SNAPSHOT',id,'STATUS','status',current.status,status,u.user_id);return {ok:true,status:status};}
function apiSessionV2Proposal(sessionToken,action,payload){const u=v2RequireSession_(sessionToken),a=String(action||'');if(a==='submit')return v2ProposalSubmit_(u,payload||{});if(a==='mine')return v2ProposalMine_(u);if(a==='detail')return v2ProposalDetail_(u,String((payload||{}).proposal_snapshot_id||''));if(a==='admin.list')return v2ProposalAdminList_(u,payload||{});if(a==='admin.status')return v2ProposalStatus_(u,payload||{});throw new Error('Tác vụ phương án không hợp lệ.');}
