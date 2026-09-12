// SUNBOT School OS V2 — frontend account administration
// Admin can create IDs, assign manager/role, activate/deactivate, reset credentials and revoke sessions.
const V2_ADMIN_USER=Object.freeze({
  EXTRA_HEADERS:['must_change_password','session_version','last_password_reset_at','last_password_reset_by']
});
function v2AdminRequire_(u){if(String(u.role_code||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được quản trị tài khoản.');}
function v2EnsureUserHeaders_(){
  const sh=v2Db_().getSheetByName(V2_OS.S.USERS);if(!sh)throw new Error('Thiếu bảng USERS.');
  let h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0].map(String);
  V2_ADMIN_USER.EXTRA_HEADERS.forEach(function(x){if(h.indexOf(x)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(x);h.push(x);}});
  return h;
}
function v2AdminUserView_(r){return {user_id:r.user_id,login_id:r.login_id,display_name:r.display_name,role_code:r.role_code,manager_user_id:r.manager_user_id||'',active:v2Truthy_(r.active),must_change_password:v2Truthy_(r.must_change_password),session_version:Number(r.session_version||1),created_at:r.created_at||'',updated_at:r.updated_at||'',last_password_reset_at:r.last_password_reset_at||''};}
function v2AdminUsersFull_(u){v2AdminRequire_(u);v2EnsureUserHeaders_();return v2Rows_(V2_OS.S.USERS).map(v2AdminUserView_);}
function v2UserIdFromName_(name){const ascii=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,16)||'SALE';const existing={};v2Rows_(V2_OS.S.USERS).forEach(function(r){existing[String(r.user_id||'')]=true;});let id='U-'+ascii,n=2;while(existing[id])id='U-'+ascii+'-'+(n++);return id;}
function v2TempPassword_(){return String(Math.floor(100000+Math.random()*900000));}
function v2AdminCreateUser_(u,p){
  v2AdminRequire_(u);v2EnsureUserHeaders_();p=p||{};
  const name=v2Clean_(p.display_name,120),login=v2Clean_(p.login_id,180).toLowerCase();if(!name||!login)throw new Error('Cần họ tên và tài khoản/email.');
  if(v2Rows_(V2_OS.S.USERS).some(function(r){return String(r.login_id||'').trim().toLowerCase()===login;}))throw new Error('Tài khoản/email này đã tồn tại.');
  const role=String(p.role_code||'SALE').toUpperCase();if(['ADMIN','SALE','LEADER','STAFF'].indexOf(role)<0)throw new Error('Loại tài khoản không hợp lệ.');
  const manager=v2Clean_(p.manager_user_id,80),id=v2UserIdFromName_(name),temp=v2TempPassword_(),now=v2Now_();
  v2Append_(V2_OS.S.USERS,{user_id:id,login_id:login,display_name:name,role_code:role,manager_user_id:manager,password_visible:'',password_hash:v2PasswordHash_(login,temp),active:true,created_at:now,updated_at:now,must_change_password:true,session_version:1,last_password_reset_at:now,last_password_reset_by:u.user_id});
  v2Audit_('USER',id,'CREATE','','',role,u.user_id);return {ok:true,user_id:id,temp_password:temp,must_change_password:true};
}
function v2AdminUpdateUser_(u,p){
  v2AdminRequire_(u);v2EnsureUserHeaders_();p=p||{};const id=String(p.user_id||''),r=v2Rows_(V2_OS.S.USERS).find(function(x){return String(x.user_id)===id;});if(!r)throw new Error('Không tìm thấy tài khoản.');
  if(id===u.user_id&&p.active===false)throw new Error('Không thể tự khóa tài khoản Admin đang đăng nhập.');
  const patch={updated_at:v2Now_()};
  if(p.display_name!==undefined)patch.display_name=v2Clean_(p.display_name,120);
  if(p.role_code!==undefined){const role=String(p.role_code||'').toUpperCase();if(['ADMIN','SALE','LEADER','STAFF'].indexOf(role)<0)throw new Error('Loại tài khoản không hợp lệ.');patch.role_code=role;}
  if(p.manager_user_id!==undefined)patch.manager_user_id=v2Clean_(p.manager_user_id,80);
  if(p.active!==undefined)patch.active=!!p.active;
  v2UpdateById_(V2_OS.S.USERS,'user_id',id,patch);v2Audit_('USER',id,'UPDATE','','',JSON.stringify(p),u.user_id);return {ok:true};
}
function v2AdminResetPassword_(u,p){
  v2AdminRequire_(u);v2EnsureUserHeaders_();const id=String((p||{}).user_id||''),r=v2Rows_(V2_OS.S.USERS).find(function(x){return String(x.user_id)===id;});if(!r)throw new Error('Không tìm thấy tài khoản.');
  const temp=v2TempPassword_(),version=Number(r.session_version||1)+1,now=v2Now_();
  v2UpdateById_(V2_OS.S.USERS,'user_id',id,{password_hash:v2PasswordHash_(String(r.login_id||'').trim().toLowerCase(),temp),password_visible:'',must_change_password:true,session_version:version,last_password_reset_at:now,last_password_reset_by:u.user_id,updated_at:now});
  v2Audit_('USER',id,'PASSWORD_RESET','','','TEMPORARY',u.user_id);return {ok:true,temp_password:temp,must_change_password:true};
}
function v2AdminRevokeSessions_(u,p){v2AdminRequire_(u);v2EnsureUserHeaders_();const id=String((p||{}).user_id||''),r=v2Rows_(V2_OS.S.USERS).find(function(x){return String(x.user_id)===id;});if(!r)throw new Error('Không tìm thấy tài khoản.');const version=Number(r.session_version||1)+1;v2UpdateById_(V2_OS.S.USERS,'user_id',id,{session_version:version,updated_at:v2Now_()});v2Audit_('USER',id,'REVOKE_SESSIONS','','',String(version),u.user_id);return {ok:true};}
function v2ChangeOwnPassword_(u,p){v2EnsureUserHeaders_();const current=String((p||{}).current_password||''),next=String((p||{}).new_password||'');if(next.length<6)throw new Error('Mật khẩu mới cần ít nhất 6 ký tự.');const r=v2Rows_(V2_OS.S.USERS).find(function(x){return String(x.user_id)===String(u.user_id);});if(!r||!v2CredentialMatches_(r,current))throw new Error('Mật khẩu hiện tại không đúng.');const version=Number(r.session_version||1)+1;v2UpdateById_(V2_OS.S.USERS,'user_id',r.user_id,{password_hash:v2PasswordHash_(String(r.login_id||'').trim().toLowerCase(),next),password_visible:'',must_change_password:false,session_version:version,updated_at:v2Now_()});v2Audit_('USER',r.user_id,'PASSWORD_CHANGED','','','SELF',r.user_id);return {ok:true,relogin:true};}
function apiSessionV2Admin(sessionToken,action,payload){const u=v2RequireSession_(sessionToken),a=String(action||'');if(a==='users.list')return v2AdminUsersFull_(u);if(a==='users.create')return v2AdminCreateUser_(u,payload||{});if(a==='users.update')return v2AdminUpdateUser_(u,payload||{});if(a==='users.reset_password')return v2AdminResetPassword_(u,payload||{});if(a==='users.revoke_sessions')return v2AdminRevokeSessions_(u,payload||{});if(a==='auth.change_password')return v2ChangeOwnPassword_(u,payload||{});throw new Error('Tác vụ quản trị V2 không hợp lệ.');}
