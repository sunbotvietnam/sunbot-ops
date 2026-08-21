const V2=Object.freeze({
  DB_ID:'19UA9f8R5onFTHc77cPIYxIyG2a6ugytpvwi8Y0l0Xf8',
  ORIGIN:'https://sunbotvietnam.github.io',
  SESSION_TTL:21600,
  SHEETS:{USERS:'USERS',SCHOOLS:'SCHOOLS',INTERACTIONS:'INTERACTIONS',ACTIONS:'NEXT_ACTIONS',DISCOVERIES:'DISCOVERIES',OPPORTUNITIES:'OPPORTUNITIES',PROPOSALS:'PROPOSALS',DOCUMENTS:'DOCUMENTS',AUDIT:'AUDIT_LOG'}
});

function doPost(e){
  const p=e&&e.parameter?e.parameter:{};
  const requestId=clean_(p.request_id,80);
  const action=clean_(p.action,80);
  const token=String(p.token||'');
  let payload={};
  try{payload=p.payload?JSON.parse(String(p.payload)):{};}catch(err){return bridgeResponse_(requestId,null,'Dữ liệu yêu cầu không hợp lệ.');}
  try{return bridgeResponse_(requestId,dispatch_(action,token,payload),'');}
  catch(err){return bridgeResponse_(requestId,null,safeMessage_(err));}
}

function dispatch_(action,token,payload){
  if(action==='auth.login')return login_(payload.login_id,payload.password);
  const user=requireSession_(token);
  if(action==='app.bootstrap')return bootstrap_(user);
  if(action==='today.list')return today_(user);
  if(action==='schools.list')return listSchools_(user,payload);
  if(action==='schools.detail')return schoolDetail_(user,payload.school_id);
  if(action==='schools.create')return createSchool_(user,payload);
  if(action==='interactions.create')return createInteraction_(user,payload);
  if(action==='next_actions.create')return createNextAction_(user,payload);
  if(action==='next_actions.complete')return completeNextAction_(user,payload.action_id);
  throw new Error('Tác vụ không hợp lệ.');
}

function bridgeResponse_(requestId,result,error){
  const message={type:'sunbot-school-os-v2',requestId:requestId,ok:!error,result:result||null,error:error||''};
  const json=JSON.stringify(message).replace(/<\//g,'<\\/');
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"></head><body><script>window.top.postMessage('+json+','+JSON.stringify(V2.ORIGIN)+');<\/script></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function login_(loginId,password){
  loginId=String(loginId||'').trim().toLowerCase();password=String(password||'').trim();
  if(!loginId||!password)throw new Error('Cần nhập ID và mật khẩu.');
  const user=rows_(V2.SHEETS.USERS).find(r=>String(r.login_id||'').trim().toLowerCase()===loginId&&truthy_(r.active));
  if(!user||String(user.password_visible||'')!==password)throw new Error('ID hoặc mật khẩu không đúng.');
  const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  CacheService.getScriptCache().put('V2SESSION:'+token,JSON.stringify({user_id:user.user_id,login_id:user.login_id,display_name:user.display_name,role_code:user.role_code,manager_user_id:user.manager_user_id||''}),V2.SESSION_TTL);
  audit_('USER',user.user_id,'LOGIN','','','SUCCESS',user.user_id);
  return {token:token,user:publicUser_(user)};
}
function requireSession_(token){
  const raw=CacheService.getScriptCache().get('V2SESSION:'+String(token||''));if(!raw)throw new Error('Phiên đăng nhập đã hết hạn.');
  return JSON.parse(raw);
}
function bootstrap_(user){return {user:user,can:permissions_(user),server_time:new Date().toISOString(),schema_version:'2.0.0'};}
function permissions_(u){return {view_all:u.role_code==='ADMIN',assign:u.role_code==='ADMIN'||u.role_code==='LEADER',approve_proposal:u.role_code==='ADMIN'||u.role_code==='LEADER',admin_users:u.role_code==='ADMIN'};}
function publicUser_(u){return {user_id:u.user_id,login_id:u.login_id,display_name:u.display_name,role_code:u.role_code,manager_user_id:u.manager_user_id||''};}

function visibleSchool_(user,row){
  if(user.role_code==='ADMIN')return true;
  if(String(row.current_owner_id||'')===String(user.user_id))return true;
  if(user.role_code==='LEADER'&&String(row.leader_id||'')===String(user.user_id))return true;
  return false;
}
function listSchools_(user,filters){
  const schools=rows_(V2.SHEETS.SCHOOLS).filter(r=>truthy_(r.active)&&visibleSchool_(user,r));
  const actions=currentActionMap_(user);
  const users=userMap_();
  return schools.map(s=>schoolView_(s,actions[s.school_id],users));
}
function schoolDetail_(user,schoolId){
  const school=rows_(V2.SHEETS.SCHOOLS).find(r=>String(r.school_id)===String(schoolId));
  if(!school||!visibleSchool_(user,school))throw new Error('Không có quyền xem trường này.');
  const interactions=rows_(V2.SHEETS.INTERACTIONS).filter(r=>String(r.school_id)===String(schoolId)).sort((a,b)=>String(b.interaction_at||'').localeCompare(String(a.interaction_at||''))).slice(0,60);
  const action=currentActionMap_(user)[schoolId]||null;
  return {school:schoolView_(school,action,userMap_()),interactions:interactions,next_action:action};
}
function today_(user){
  const today=dateOnly_(new Date());
  return listSchools_(user,{}).filter(s=>s.overdue||String(s.next_action_date||'')===today).sort((a,b)=>(a.overdue===b.overdue?String(a.next_action_date||'').localeCompare(String(b.next_action_date||'')):(a.overdue?-1:1)));
}
function schoolView_(s,a,users){
  const due=a&&a.due_date?String(a.due_date).slice(0,10):'';const now=dateOnly_(new Date());
  return {school_id:s.school_id,school_name:s.school_name,school_type:s.school_type,province:s.province,district:s.district,address:s.address,contact_name:s.contact_name,contact_role:s.contact_role,contact_email:s.contact_email,contact_phone:s.contact_phone,current_owner_id:s.current_owner_id,leader_id:s.leader_id,current_owner_name:(users[s.current_owner_id]||{}).display_name||'',relationship_state:s.relationship_state||'TARGET',next_action:a?a.action_text:'',next_action_date:due,overdue:!!(due&&due<now&&String(a.status)==='OPEN')};
}
function currentActionMap_(user){
  const map={};rows_(V2.SHEETS.ACTIONS).filter(r=>String(r.status)==='OPEN').forEach(r=>{const prev=map[r.school_id];if(!prev||String(r.due_date||'')<String(prev.due_date||''))map[r.school_id]=r;});return map;
}
function userMap_(){const m={};rows_(V2.SHEETS.USERS).forEach(r=>m[r.user_id]=r);return m;}

function createSchool_(user,p){
  const name=clean_(p.school_name,180),province=clean_(p.province,100);if(!name||!province)throw new Error('Tên trường và tỉnh/thành là bắt buộc.');
  let owner=String(p.current_owner_id||user.user_id),leader='';
  if(user.role_code==='STAFF'){owner=user.user_id;}
  else if(user.role_code==='LEADER'){
    const target=userMap_()[owner];if(owner!==user.user_id&&(!target||target.role_code!=='STAFF'||String(target.manager_user_id||'')!==String(user.user_id)))throw new Error('Leader chỉ được giao cho Staff thuộc mình.');
    leader=user.user_id;
  }
  const id='SCH-'+Utilities.getUuid().slice(0,8).toUpperCase();
  append_(V2.SHEETS.SCHOOLS,{school_id:id,school_name:name,school_type:clean_(p.school_type,40),province:province,district:clean_(p.district,100),address:clean_(p.address,250),website:clean_(p.website,250),contact_name:clean_(p.contact_name,120),contact_role:clean_(p.contact_role,80),contact_email:clean_(p.contact_email,160),contact_phone:clean_(p.contact_phone,50),current_owner_id:owner,leader_id:leader,relationship_state:'TARGET',source:clean_(p.source,80)||'MANUAL',active:true,created_at:nowIso_(),updated_at:nowIso_()});
  audit_('SCHOOL',id,'CREATE','','',name,user.user_id);return {school_id:id};
}
function createInteraction_(user,p){
  const school=assertSchoolAccess_(user,p.school_id);const summary=clean_(p.summary,2000);if(!summary)throw new Error('Cần ghi điều đã xảy ra.');
  const id='INT-'+Utilities.getUuid().slice(0,8).toUpperCase();
  append_(V2.SHEETS.INTERACTIONS,{interaction_id:id,school_id:school.school_id,opportunity_id:clean_(p.opportunity_id,80),interaction_type:clean_(p.interaction_type,50)||'OTHER',interaction_at:p.interaction_at||nowIso_(),summary:summary,result:clean_(p.result,2000),created_by:user.user_id,created_at:nowIso_()});
  if(String(school.relationship_state)==='TARGET')updateById_(V2.SHEETS.SCHOOLS,'school_id',school.school_id,{relationship_state:'CONTACTED',updated_at:nowIso_()});
  return {interaction_id:id};
}
function createNextAction_(user,p){
  const school=assertSchoolAccess_(user,p.school_id);const text=clean_(p.action_text,500),due=String(p.due_date||'').slice(0,10);if(!text||!due)throw new Error('Việc tiếp theo phải có nội dung và ngày.');
  rows_(V2.SHEETS.ACTIONS).filter(r=>String(r.school_id)===String(school.school_id)&&String(r.status)==='OPEN').forEach(r=>updateById_(V2.SHEETS.ACTIONS,'action_id',r.action_id,{status:'SUPERSEDED',updated_at:nowIso_()}));
  const id='ACT-'+Utilities.getUuid().slice(0,8).toUpperCase();
  append_(V2.SHEETS.ACTIONS,{action_id:id,school_id:school.school_id,opportunity_id:clean_(p.opportunity_id,80),owner_id:clean_(p.owner_id,80)||school.current_owner_id,action_text:text,due_date:due,status:'OPEN',priority:clean_(p.priority,10)||'P2',completed_at:'',created_by:user.user_id,created_at:nowIso_(),updated_at:nowIso_()});
  return {action_id:id};
}
function completeNextAction_(user,id){const row=rows_(V2.SHEETS.ACTIONS).find(r=>String(r.action_id)===String(id));if(!row)throw new Error('Không tìm thấy việc.');assertSchoolAccess_(user,row.school_id);updateById_(V2.SHEETS.ACTIONS,'action_id',id,{status:'DONE',completed_at:nowIso_(),updated_at:nowIso_()});return {ok:true};}
function assertSchoolAccess_(user,id){const r=rows_(V2.SHEETS.SCHOOLS).find(x=>String(x.school_id)===String(id));if(!r||!visibleSchool_(user,r))throw new Error('Không có quyền với trường này.');return r;}

function db_(){return SpreadsheetApp.openById(V2.DB_ID);}
function rows_(name){const sh=db_().getSheetByName(name);if(!sh)throw new Error('Thiếu bảng '+name);const v=sh.getDataRange().getValues();if(v.length<2)return [];const h=v[0].map(String);return v.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o;});}
function append_(name,obj){const sh=db_().getSheetByName(name),h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);sh.appendRow(h.map(k=>obj[k]===undefined?'':obj[k]));}
function updateById_(name,idField,id,patch){const sh=db_().getSheetByName(name),v=sh.getDataRange().getValues(),h=v[0].map(String),idCol=h.indexOf(idField);for(let i=1;i<v.length;i++)if(String(v[i][idCol])===String(id)){Object.keys(patch).forEach(k=>{const c=h.indexOf(k);if(c>=0)sh.getRange(i+1,c+1).setValue(patch[k]);});return;}throw new Error('Không tìm thấy dữ liệu cần cập nhật.');}
function audit_(type,id,action,field,oldV,newV,actor){append_(V2.SHEETS.AUDIT,{audit_id:'AUD-'+Utilities.getUuid().slice(0,8).toUpperCase(),entity_type:type,entity_id:id,action:action,field_name:field,old_value:oldV,new_value:newV,actor_id:actor,created_at:nowIso_()});}
function clean_(v,n){return String(v||'').trim().replace(/[\u0000-\u001F]/g,' ').slice(0,n||1000);}
function truthy_(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1';}
function nowIso_(){return new Date().toISOString();}
function dateOnly_(d){return Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyy-MM-dd');}
function safeMessage_(e){return e&&e.message?String(e.message).slice(0,300):'Có lỗi hệ thống.';}
