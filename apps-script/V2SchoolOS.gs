const V2_OS=Object.freeze({DB_ID:'19UA9f8R5onFTHc77cPIYxIyG2a6ugytpvwi8Y0l0Xf8',SESSION_TTL:21600,S:{USERS:'USERS',SCHOOLS:'SCHOOLS',INTERACTIONS:'INTERACTIONS',ACTIONS:'NEXT_ACTIONS',DISCOVERIES:'DISCOVERIES',OPPS:'OPPORTUNITIES',PROPOSALS:'PROPOSALS',DOCUMENTS:'DOCUMENTS',AUDIT:'AUDIT_LOG'}});

function apiSessionV2(sessionToken,action,payload){
  payload=payload||{};action=String(action||'');
  if(action==='auth.login')return v2Login_(payload.login_id,payload.password);
  const user=v2RequireSession_(sessionToken);
  if(action==='app.bootstrap')return v2Bootstrap_(user);
  if(action==='today.list')return v2Today_(user);
  if(action==='schools.list')return v2ListSchools_(user,payload);
  if(action==='schools.detail')return v2SchoolDetail_(user,payload.school_id);
  if(action==='schools.create')return v2CreateSchool_(user,payload);
  if(action==='interactions.create')return v2CreateInteraction_(user,payload);
  if(action==='next_actions.create')return v2CreateAction_(user,payload);
  if(action==='next_actions.complete')return v2CompleteAction_(user,payload.action_id);
  if(action==='admin.users')return v2AdminUsers_(user);
  throw new Error('Tác vụ V2 không hợp lệ.');
}

function v2Login_(loginId,password){
  loginId=String(loginId||'').trim().toLowerCase();password=String(password||'').trim();
  if(!loginId||!password)throw new Error('Cần nhập ID và mật khẩu.');
  const user=v2Rows_(V2_OS.S.USERS).find(function(r){return String(r.login_id||'').trim().toLowerCase()===loginId&&v2Truthy_(r.active);});
  if(!user||String(user.password_visible||'')!==password)throw new Error('ID hoặc mật khẩu không đúng.');
  const token='v2_'+Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  const session={user_id:user.user_id,login_id:user.login_id,display_name:user.display_name,role_code:user.role_code,manager_user_id:user.manager_user_id||''};
  CacheService.getScriptCache().put('V2SESSION:'+token,JSON.stringify(session),V2_OS.SESSION_TTL);
  v2Audit_('USER',user.user_id,'LOGIN','','','SUCCESS',user.user_id);
  return {token:token,user:session};
}
function v2RequireSession_(token){const raw=CacheService.getScriptCache().get('V2SESSION:'+String(token||''));if(!raw)throw new Error('Phiên đăng nhập đã hết hạn.');return JSON.parse(raw);}
function v2Bootstrap_(u){return {user:u,can:{view_all:u.role_code==='ADMIN',assign:u.role_code==='ADMIN'||u.role_code==='LEADER',approve_proposal:u.role_code==='ADMIN'||u.role_code==='LEADER',admin_users:u.role_code==='ADMIN'},schema_version:'2.0.0',server_time:new Date().toISOString()};}
function v2CanSeeSchool_(u,r){if(u.role_code==='ADMIN')return true;if(String(r.current_owner_id||'')===String(u.user_id))return true;if(u.role_code==='LEADER'&&String(r.leader_id||'')===String(u.user_id))return true;return false;}
function v2ListSchools_(u,filters){
  const users=v2UserMap_(),actions=v2CurrentActionMap_();
  return v2Rows_(V2_OS.S.SCHOOLS).filter(function(r){return v2Truthy_(r.active)&&v2CanSeeSchool_(u,r);}).map(function(r){return v2SchoolView_(r,actions[r.school_id],users);});
}
function v2Today_(u){const t=v2DateOnly_(new Date());return v2ListSchools_(u,{}).filter(function(s){return s.overdue||String(s.next_action_date||'')===t;}).sort(function(a,b){if(a.overdue!==b.overdue)return a.overdue?-1:1;return String(a.next_action_date||'').localeCompare(String(b.next_action_date||''));});}
function v2SchoolDetail_(u,id){const s=v2Rows_(V2_OS.S.SCHOOLS).find(function(r){return String(r.school_id)===String(id);});if(!s||!v2CanSeeSchool_(u,s))throw new Error('Không có quyền xem trường này.');const interactions=v2Rows_(V2_OS.S.INTERACTIONS).filter(function(r){return String(r.school_id)===String(id);}).sort(function(a,b){return String(b.interaction_at||'').localeCompare(String(a.interaction_at||''));}).slice(0,80);const a=v2CurrentActionMap_()[id]||null;return {school:v2SchoolView_(s,a,v2UserMap_()),interactions:interactions,next_action:a};}
function v2SchoolView_(s,a,users){const due=a&&a.due_date?String(a.due_date).slice(0,10):'',today=v2DateOnly_(new Date());return {school_id:s.school_id,school_name:s.school_name,school_type:s.school_type,province:s.province,district:s.district,address:s.address,website:s.website,contact_name:s.contact_name,contact_role:s.contact_role,contact_email:s.contact_email,contact_phone:s.contact_phone,current_owner_id:s.current_owner_id,leader_id:s.leader_id,current_owner_name:(users[s.current_owner_id]||{}).display_name||'',relationship_state:s.relationship_state||'TARGET',next_action:a?a.action_text:'',next_action_id:a?a.action_id:'',next_action_date:due,overdue:!!(due&&due<today&&String(a.status)==='OPEN')};}
function v2CurrentActionMap_(){const m={};v2Rows_(V2_OS.S.ACTIONS).filter(function(r){return String(r.status)==='OPEN';}).forEach(function(r){const p=m[r.school_id];if(!p||String(r.due_date||'')<String(p.due_date||''))m[r.school_id]=r;});return m;}
function v2UserMap_(){const m={};v2Rows_(V2_OS.S.USERS).forEach(function(r){m[r.user_id]=r;});return m;}
function v2CreateSchool_(u,p){
  const name=v2Clean_(p.school_name,180),province=v2Clean_(p.province,100);if(!name||!province)throw new Error('Tên trường và tỉnh/thành là bắt buộc.');
  const users=v2UserMap_();let owner=String(p.current_owner_id||u.user_id),leader='';
  if(u.role_code==='STAFF')owner=u.user_id;
  if(u.role_code==='LEADER'){const target=users[owner];if(owner!==u.user_id&&(!target||target.role_code!=='STAFF'||String(target.manager_user_id||'')!==String(u.user_id)))throw new Error('Leader chỉ được giao cho Staff thuộc mình.');leader=u.user_id;}
  if(u.role_code==='ADMIN'&&users[owner]&&users[owner].role_code==='STAFF')leader=String(users[owner].manager_user_id||'');
  const id='SCH-'+Utilities.getUuid().slice(0,8).toUpperCase(),now=v2Now_();
  v2Append_(V2_OS.S.SCHOOLS,{school_id:id,school_name:name,school_type:v2Clean_(p.school_type,40),province:province,district:v2Clean_(p.district,100),address:v2Clean_(p.address,250),website:v2Clean_(p.website,250),contact_name:v2Clean_(p.contact_name,120),contact_role:v2Clean_(p.contact_role,80),contact_email:v2Clean_(p.contact_email,160),contact_phone:v2Clean_(p.contact_phone,50),current_owner_id:owner,leader_id:leader,relationship_state:'TARGET',source:v2Clean_(p.source,80)||'MANUAL',active:true,created_at:now,updated_at:now});
  v2Audit_('SCHOOL',id,'CREATE','','',name,u.user_id);return {school_id:id};
}
function v2CreateInteraction_(u,p){const s=v2AssertSchool_(u,p.school_id),summary=v2Clean_(p.summary,2000);if(!summary)throw new Error('Cần ghi điều đã xảy ra.');const id='INT-'+Utilities.getUuid().slice(0,8).toUpperCase();v2Append_(V2_OS.S.INTERACTIONS,{interaction_id:id,school_id:s.school_id,opportunity_id:v2Clean_(p.opportunity_id,80),interaction_type:v2Clean_(p.interaction_type,50)||'OTHER',interaction_at:p.interaction_at||v2Now_(),summary:summary,result:v2Clean_(p.result,2000),created_by:u.user_id,created_at:v2Now_()});if(String(s.relationship_state)==='TARGET')v2UpdateById_(V2_OS.S.SCHOOLS,'school_id',s.school_id,{relationship_state:'CONTACTED',updated_at:v2Now_()});return {interaction_id:id};}
function v2CreateAction_(u,p){const s=v2AssertSchool_(u,p.school_id),text=v2Clean_(p.action_text,500),due=String(p.due_date||'').slice(0,10);if(!text||!due)throw new Error('Việc tiếp theo phải có nội dung và ngày.');v2Rows_(V2_OS.S.ACTIONS).filter(function(r){return String(r.school_id)===String(s.school_id)&&String(r.status)==='OPEN';}).forEach(function(r){v2UpdateById_(V2_OS.S.ACTIONS,'action_id',r.action_id,{status:'SUPERSEDED',updated_at:v2Now_()});});const id='ACT-'+Utilities.getUuid().slice(0,8).toUpperCase();v2Append_(V2_OS.S.ACTIONS,{action_id:id,school_id:s.school_id,opportunity_id:v2Clean_(p.opportunity_id,80),owner_id:v2Clean_(p.owner_id,80)||s.current_owner_id,action_text:text,due_date:due,status:'OPEN',priority:v2Clean_(p.priority,10)||'P2',completed_at:'',created_by:u.user_id,created_at:v2Now_(),updated_at:v2Now_()});return {action_id:id};}
function v2CompleteAction_(u,id){const r=v2Rows_(V2_OS.S.ACTIONS).find(function(x){return String(x.action_id)===String(id);});if(!r)throw new Error('Không tìm thấy việc.');v2AssertSchool_(u,r.school_id);v2UpdateById_(V2_OS.S.ACTIONS,'action_id',id,{status:'DONE',completed_at:v2Now_(),updated_at:v2Now_()});return {ok:true};}
function v2AdminUsers_(u){if(u.role_code!=='ADMIN')throw new Error('Chỉ Admin có quyền xem người dùng.');return v2Rows_(V2_OS.S.USERS).map(function(r){return {user_id:r.user_id,login_id:r.login_id,display_name:r.display_name,role_code:r.role_code,manager_user_id:r.manager_user_id,active:v2Truthy_(r.active)};});}
function v2AssertSchool_(u,id){const r=v2Rows_(V2_OS.S.SCHOOLS).find(function(x){return String(x.school_id)===String(id);});if(!r||!v2CanSeeSchool_(u,r))throw new Error('Không có quyền với trường này.');return r;}
function v2Db_(){return SpreadsheetApp.openById(V2_OS.DB_ID);}
function v2Rows_(name){const sh=v2Db_().getSheetByName(name);if(!sh)throw new Error('Thiếu bảng '+name);const lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();if(lastRow<2||lastCol<1)return [];const v=sh.getRange(1,1,lastRow,lastCol).getValues(),h=v[0].map(String);return v.slice(1).filter(function(r){return r.some(function(x){return x!==''&&x!==null;});}).map(function(r){const o={};h.forEach(function(k,i){o[k]=r[i];});return o;});}
function v2Append_(name,obj){const sh=v2Db_().getSheetByName(name),lastCol=sh.getLastColumn(),h=sh.getRange(1,1,1,lastCol).getValues()[0].map(String);sh.appendRow(h.map(function(k){return obj[k]===undefined?'':obj[k];}));}
function v2UpdateById_(name,idField,id,patch){const sh=v2Db_().getSheetByName(name),lastRow=sh.getLastRow(),lastCol=sh.getLastColumn(),v=sh.getRange(1,1,lastRow,lastCol).getValues(),h=v[0].map(String),idCol=h.indexOf(idField);for(let i=1;i<v.length;i++){if(String(v[i][idCol])===String(id)){const row=v[i].slice();Object.keys(patch).forEach(function(k){const c=h.indexOf(k);if(c>=0)row[c]=patch[k];});sh.getRange(i+1,1,1,lastCol).setValues([row]);return;}}throw new Error('Không tìm thấy dữ liệu cần cập nhật.');}
function v2Audit_(type,id,action,field,oldV,newV,actor){v2Append_(V2_OS.S.AUDIT,{audit_id:'AUD-'+Utilities.getUuid().slice(0,8).toUpperCase(),entity_type:type,entity_id:id,action:action,field_name:field,old_value:oldV,new_value:newV,actor_id:actor,created_at:v2Now_()});}
function v2Clean_(v,n){return String(v||'').trim().replace(/[\u0000-\u001F]/g,' ').slice(0,n||1000);}
function v2Truthy_(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1';}
function v2Now_(){return new Date().toISOString();}
function v2DateOnly_(d){return Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyy-MM-dd');}
