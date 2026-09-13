const V2_PROFILE=Object.freeze({
  SHEET:'SCHOOL_PROFILE_MASTER',
  SOURCE_ID:'1alKUr9W3I-kKEyuTZOmDLCY8ZV1go49N0Q9HzpicnZI',
  VERSION:'2026.09.13-profile-master-v1',
  HEADERS:['school_id','school_name','school_type','province','district','address','owner_user_id','owner_name','relationship_state','sale_status','principal_name','principal_contact','contact_name','contact_role','contact_phone','contact_email','children','steam_status','school_hotline','school_email','website_url','facebook_url','next_action','next_action_date','risk','potential_product','profile_note','data_quality_note','source_version','active','updated_at','updated_by']
});

function apiSessionV2Profile(sessionToken,action,payload){
  const u=v2RequireSession_(sessionToken);payload=payload||{};action=String(action||'');
  v2pmEnsure_();
  if(action==='profiles.list')return v2pmList_(u);
  if(action==='profiles.detail')return v2pmDetail_(u,payload.school_id);
  if(action==='profiles.update')return v2pmUpdate_(u,payload.school_id,payload.patch||{});
  if(action==='profiles.history')return v2pmHistory_(u,payload.school_id);
  if(action==='profiles.rebuild'){if(u.role_code!=='ADMIN')throw new Error('Chỉ Admin được tái tạo hồ sơ trường.');return v2pmRebuild_(u.user_id);}
  throw new Error('Tác vụ hồ sơ trường không hợp lệ.');
}

function v2pmEnsure_(){
  const db=v2Db_();let sh=db.getSheetByName(V2_PROFILE.SHEET);
  if(!sh){sh=db.insertSheet(V2_PROFILE.SHEET);sh.getRange(1,1,1,V2_PROFILE.HEADERS.length).setValues([V2_PROFILE.HEADERS]);sh.setFrozenRows(1);}
  const lastCol=sh.getLastColumn();
  if(lastCol<V2_PROFILE.HEADERS.length)sh.insertColumnsAfter(Math.max(lastCol,1),V2_PROFILE.HEADERS.length-lastCol);
  const hdr=sh.getRange(1,1,1,V2_PROFILE.HEADERS.length).getValues()[0].map(String);
  if(hdr.join('|')!==V2_PROFILE.HEADERS.join('|'))sh.getRange(1,1,1,V2_PROFILE.HEADERS.length).setValues([V2_PROFILE.HEADERS]);
  if(sh.getLastRow()<2)v2pmRebuild_('SYSTEM_BOOTSTRAP');
  return sh;
}
function v2pmRows_(){const sh=v2Db_().getSheetByName(V2_PROFILE.SHEET);if(!sh||sh.getLastRow()<2)return[];const vals=sh.getRange(1,1,sh.getLastRow(),V2_PROFILE.HEADERS.length).getValues();const h=vals[0].map(String);return vals.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o;});}
function v2pmLegacyRows_(name){const db=SpreadsheetApp.openById(V2_PROFILE.SOURCE_ID),sh=db.getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const vals=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues(),h=vals[0].map(String);return vals.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o;});}
function v2pmNorm_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function v2pmTruthy_(v){return v===true||String(v||'').toUpperCase()==='TRUE'||String(v||'')==='1';}
function v2pmText_(v){if(v===null||v===undefined)return'';return String(v).trim();}
function v2pmFirst_(rows,getter){for(let i=0;i<rows.length;i++){const v=getter(rows[i]);if(v!==''&&v!==null&&v!==undefined)return v;}return'';}
function v2pmLatest_(rows){return rows.slice().sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));}
function v2pmProfileNote_(r){const k=Object.keys(r||{}).find(x=>String(x).toLowerCase().indexOf('profile_note')===0);return k?v2pmText_(r[k]):'';}
function v2pmAllowedLineage_(){const allowed={CONFIRMED:true,CONFIRMED_WITH_SOURCE_CONFLICT:true},m={};let rows=[];try{rows=v2Rows_(V2_OS.S.LINEAGE)}catch(e){}rows.forEach(r=>{const st=String(r.status||'').toUpperCase();if(!allowed[st])return;const cur=String(r.current_school_id||''),leg=String(r.legacy_school_id||'');if(cur&&leg)(m[cur]||(m[cur]=[])).push(leg);});return m;}
function v2pmCurrentSchoolMap_(){const m={};v2Rows_(V2_OS.S.SCHOOLS).forEach(r=>m[String(r.school_id||'')]=r);return m;}
function v2pmCanEdit_(u,s){if(u.role_code==='ADMIN')return true;if(String(s.current_owner_id||'')===String(u.user_id))return true;if(u.role_code==='LEADER'&&String(s.leader_id||'')===String(u.user_id))return true;return false;}
function v2pmCanReassign_(u){return u.role_code==='ADMIN'||u.role_code==='LEADER';}

function v2pmRebuild_(actor){
  const sh=v2Db_().getSheetByName(V2_PROFILE.SHEET)||v2Db_().insertSheet(V2_PROFILE.SHEET);
  const schools=v2Rows_(V2_OS.S.SCHOOLS).filter(r=>v2Truthy_(r.active));
  const users=v2UserMap_(),lineage=v2pmAllowedLineage_();
  const legacy=v2pmLegacyRows_('SO_SCHOOLS'),legacyContacts=v2pmLegacyRows_('SO_CONTACTS');
  const byId={},blankByName={},contactsBySchool={};
  legacy.forEach(r=>{const id=String(r.school_id||'');if(id)byId[id]=r;else{const n=v2pmNorm_(r.school_name);if(n)blankByName[n]=r;}});
  legacyContacts.forEach(r=>{const id=String(r.school_id||'');if(id)(contactsBySchool[id]||(contactsBySchool[id]=[])).push(r);});
  const now=v2Now_();
  const rows=schools.map(s=>{
    const id=String(s.school_id||''),scope=[id].concat(lineage[id]||[]),exact=byId[id]||null,named=blankByName[v2pmNorm_(s.school_name)]||null;
    let predecessors=[];scope.slice(1).forEach(x=>{if(byId[x])predecessors.push(byId[x]);});predecessors=v2pmLatest_(predecessors);
    const candidates=[exact,named].concat(predecessors).filter(Boolean),primary=exact||named||predecessors[0]||{};
    let legacyContactsScoped=[];scope.forEach(x=>legacyContactsScoped=legacyContactsScoped.concat(contactsBySchool[x]||[]));
    const lc=legacyContactsScoped.find(x=>v2pmText_(x.name)&&v2pmText_(x.name).indexOf('chưa xác định')<0)||legacyContactsScoped[0]||{};
    const owner=(users[s.current_owner_id]||{}).display_name||v2pmFirst_(candidates,r=>v2pmText_(r.owner));
    const principalFromV2=/hiệu trưởng/i.test(String(s.contact_role||''))?v2pmText_(s.contact_name):'';
    const principalPhoneFromV2=/hiệu trưởng/i.test(String(s.contact_role||''))?v2pmText_(s.contact_phone):'';
    const profile={
      school_id:id,school_name:v2pmText_(s.school_name)||v2pmFirst_(candidates,r=>v2pmText_(r.school_name)),school_type:v2pmText_(s.school_type)||v2pmFirst_(candidates,r=>v2pmText_(r.school_type)),province:v2pmText_(s.province)||v2pmFirst_(candidates,r=>v2pmText_(r.region)),district:v2pmText_(s.district),address:v2pmText_(s.address)||v2pmFirst_(candidates,r=>v2pmText_(r.address)),
      owner_user_id:v2pmText_(s.current_owner_id),owner_name:v2pmText_(owner),relationship_state:v2pmText_(s.relationship_state),sale_status:v2pmFirst_(candidates,r=>v2pmText_(r.status)),
      principal_name:principalFromV2||v2pmFirst_(candidates,r=>v2pmText_(r['Tên Hiệu trưởng'])),principal_contact:principalPhoneFromV2||v2pmFirst_(candidates,r=>v2pmText_(r['ĐT/ FB Hiệu trưởng'])),
      contact_name:v2pmText_(s.contact_name)||v2pmText_(lc.name),contact_role:v2pmText_(s.contact_role)||v2pmText_(lc.role),contact_phone:v2pmText_(s.contact_phone)||v2pmText_(lc.phone),contact_email:v2pmText_(s.contact_email)||v2pmText_(lc.email),
      children:v2pmFirst_(candidates,r=>v2pmText_(r['Sĩ số mới'])||v2pmText_(r.children)),steam_status:v2pmFirst_(candidates,r=>v2pmText_(r.steam_status)),school_hotline:v2pmFirst_(candidates,r=>v2pmText_(r['Hotline'])||v2pmText_(r.hotline)),school_email:v2pmFirst_(candidates,r=>v2pmText_(r.school_email)),website_url:v2pmText_(s.website)||v2pmFirst_(candidates,r=>v2pmText_(r.website_url)),facebook_url:v2pmFirst_(candidates,r=>v2pmText_(r.facebook_url)),
      next_action:v2pmFirst_(candidates,r=>v2pmText_(r.next_action)),next_action_date:v2pmFirst_(candidates,r=>v2pmText_(r.next_action_date)),risk:v2pmFirst_(candidates,r=>v2pmText_(r.risk)),potential_product:v2pmFirst_(candidates,r=>v2pmText_(r['Sản phẩm tiềm năng hoặc trao đổi riêng của sale'])),profile_note:v2pmFirst_(candidates,r=>v2pmProfileNote_(r)),data_quality_note:'',source_version:'7.9+V2 bootstrap '+V2_PROFILE.VERSION,active:true,updated_at:now,updated_by:actor||'SYSTEM'
    };
    return V2_PROFILE.HEADERS.map(h=>profile[h]===undefined?'':profile[h]);
  });
  sh.clearContents();sh.getRange(1,1,1,V2_PROFILE.HEADERS.length).setValues([V2_PROFILE.HEADERS]);if(rows.length)sh.getRange(2,1,rows.length,V2_PROFILE.HEADERS.length).setValues(rows);sh.setFrozenRows(1);
  try{sh.autoResizeColumns(1,Math.min(V2_PROFILE.HEADERS.length,12));}catch(e){}
  return {ok:true,count:rows.length,version:V2_PROFILE.VERSION};
}

function v2pmList_(u){
  const sm=v2pmCurrentSchoolMap_();
  return v2pmRows_().filter(p=>v2pmTruthy_(p.active)&&sm[String(p.school_id||'')]&&v2CanSeeSchool_(u,sm[String(p.school_id||'')])).map(p=>({school_id:p.school_id,school_name:p.school_name,school_type:p.school_type,province:p.province,district:p.district,owner_user_id:p.owner_user_id,owner_name:p.owner_name,relationship_state:p.relationship_state,sale_status:p.sale_status,principal_name:p.principal_name,contact_name:p.contact_name,contact_phone:p.contact_phone,school_hotline:p.school_hotline,school_email:p.school_email,children:p.children,steam_status:p.steam_status,next_action:p.next_action,risk:p.risk,updated_at:p.updated_at}));
}
function v2pmFind_(id){return v2pmRows_().find(r=>String(r.school_id||'')===String(id||''));}
function v2pmDetail_(u,id){const sm=v2pmCurrentSchoolMap_(),s=sm[String(id||'')];if(!s||!v2CanSeeSchool_(u,s))throw new Error('Không có quyền xem trường này.');const p=v2pmFind_(id);if(!p)throw new Error('Chưa có hồ sơ trường.');return {profile:p,can_edit:v2pmCanEdit_(u,s),can_reassign:v2pmCanReassign_(u),version:V2_PROFILE.VERSION};}
function v2pmUpdate_(u,id,patch){
  const sm=v2pmCurrentSchoolMap_(),s=sm[String(id||'')];if(!s||!v2pmCanEdit_(u,s))throw new Error('Không có quyền sửa hồ sơ này.');
  const sh=v2Db_().getSheetByName(V2_PROFILE.SHEET),vals=sh.getRange(1,1,sh.getLastRow(),V2_PROFILE.HEADERS.length).getValues(),h=vals[0].map(String),idCol=h.indexOf('school_id');let row=-1;for(let i=1;i<vals.length;i++)if(String(vals[i][idCol])===String(id)){row=i+1;break;}if(row<0)throw new Error('Không tìm thấy hồ sơ.');
  const protectedFields={school_id:true,source_version:true,active:true,updated_at:true,updated_by:true};
  const allowed={school_name:true,school_type:true,province:true,district:true,address:true,owner_user_id:true,relationship_state:true,sale_status:true,principal_name:true,principal_contact:true,contact_name:true,contact_role:true,contact_phone:true,contact_email:true,children:true,steam_status:true,school_hotline:true,school_email:true,website_url:true,facebook_url:true,next_action:true,next_action_date:true,risk:true,potential_product:true,profile_note:true,data_quality_note:true};
  if(patch.owner_user_id!==undefined&&!v2pmCanReassign_(u))delete patch.owner_user_id;
  Object.keys(patch).forEach(k=>{if(!allowed[k]||protectedFields[k])delete patch[k];else patch[k]=v2Clean_(patch[k],k==='profile_note'?4000:800);});
  if(patch.owner_user_id){const users=v2UserMap_(),target=users[patch.owner_user_id];if(!target||!v2Truthy_(target.active))throw new Error('Người phụ trách không hợp lệ.');if(u.role_code==='LEADER'&&String(target.manager_user_id||'')!==String(u.user_id)&&String(target.user_id)!==String(u.user_id))throw new Error('Leader chỉ được giao cho thành viên thuộc mình.');patch.owner_name=target.display_name||target.login_id||patch.owner_user_id;}
  patch.updated_at=v2Now_();patch.updated_by=u.user_id;
  const current={};h.forEach((k,i)=>current[k]=vals[row-1][i]);Object.keys(patch).forEach(k=>current[k]=patch[k]);sh.getRange(row,1,1,h.length).setValues([h.map(k=>current[k]===undefined?'':current[k])]);
  const core={};['school_name','school_type','province','district','address','relationship_state'].forEach(k=>{if(patch[k]!==undefined)core[k]=patch[k];});
  if(patch.website_url!==undefined)core.website=patch.website_url;if(patch.contact_name!==undefined)core.contact_name=patch.contact_name;if(patch.contact_role!==undefined)core.contact_role=patch.contact_role;if(patch.contact_email!==undefined)core.contact_email=patch.contact_email;if(patch.contact_phone!==undefined)core.contact_phone=patch.contact_phone;
  if(patch.owner_user_id!==undefined){core.current_owner_id=patch.owner_user_id;const target=v2UserMap_()[patch.owner_user_id]||{};core.leader_id=target.role_code==='STAFF'?String(target.manager_user_id||''):(target.role_code==='LEADER'?target.user_id:String(s.leader_id||''));}
  if(Object.keys(core).length){core.updated_at=v2Now_();v2UpdateById_(V2_OS.S.SCHOOLS,'school_id',id,core);}
  try{v2Audit_('SCHOOL_PROFILE',id,'UPDATE','','',Object.keys(patch).join(','),u.user_id);}catch(e){}
  return v2pmDetail_(u,id);
}

function v2pmHistory_(u,id){
  const sm=v2pmCurrentSchoolMap_(),s=sm[String(id||'')];if(!s||!v2CanSeeSchool_(u,s))throw new Error('Không có quyền xem trường này.');
  const scope=v2LineageScope_(id),set={};scope.ids.forEach(x=>set[String(x)]=true);const users=v2UserMap_();
  const interactions=[];
  try{v2Rows_(V2_OS.S.INTERACTIONS).filter(r=>set[String(r.school_id||'')]).forEach(r=>interactions.push({type:r.interaction_type||'Tương tác',summary:r.summary||'',channel:'',actor:(users[r.created_by]||{}).display_name||r.created_by||'',at:r.interaction_at||'',evidence_url:'',source:'V2'}));}catch(e){}
  try{v2pmLegacyRows_('SO_ACTIVITIES').filter(r=>set[String(r.school_id||'')]).forEach(r=>{const t=String(r.event_type||'');if(/_UPSERTED$/i.test(t)||/^(SCHOOL|TASK|CONTACT|USER)_/i.test(t))return;let detail={};try{detail=r.detail_json?JSON.parse(String(r.detail_json)):{};}catch(e){}interactions.push({type:t||'Tương tác',summary:r.summary||'',channel:r.channel||'',actor:r.actor||'',at:r.timestamp||'',evidence_url:detail.bang_chung_url||'',source:'Sale 7.9'});});}catch(e){}
  interactions.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
  const tasks=[];
  try{v2Rows_(V2_OS.S.ACTIONS).filter(r=>set[String(r.school_id||'')]).forEach(r=>tasks.push({title:r.action_text||'',owner:(users[r.owner_id]||{}).display_name||r.owner_id||'',due:r.due_date||'',status:r.status||'',risk:r.priority||'',source:'V2'}));}catch(e){}
  try{v2pmLegacyRows_('SO_TASKS').filter(r=>set[String(r.school_id||'')]).forEach(r=>tasks.push({title:r.title||'',owner:r.owner||'',due:r.due||'',status:v2pmTruthy_(r.done)?'DONE':'HISTORICAL',risk:r.risk||'',source:'Sale 7.9'}));}catch(e){}
  return {interactions:interactions.slice(0,100),tasks:tasks.slice(0,100),history_scope:scope.ids};
}
