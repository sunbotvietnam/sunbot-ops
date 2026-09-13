const V2_LEGACY_READ=Object.freeze({SOURCE_ID:'1alKUr9W3I-kKEyuTZOmDLCY8ZV1go49N0Q9HzpicnZI',S:{SCHOOLS:'SO_SCHOOLS',CONTACTS:'SO_CONTACTS',ACTIVITIES:'SO_ACTIVITIES',TASKS:'SO_TASKS'}});

function apiSessionV2Legacy(sessionToken,action,payload){
  const u=v2RequireSession_(sessionToken);payload=payload||{};
  if(String(action||'')==='schools.detail')return v2LegacySchoolDetail_(u,payload.school_id);
  throw new Error('Tác vụ dữ liệu lịch sử không hợp lệ.');
}

function v2LegacyDb_(){return SpreadsheetApp.openById(V2_LEGACY_READ.SOURCE_ID);}
function v2LegacyRows_(name){
  const sh=v2LegacyDb_().getSheetByName(name);if(!sh)return[];
  const lastRow=sh.getLastRow(),lastCol=sh.getLastColumn();if(lastRow<2||lastCol<1)return[];
  const v=sh.getRange(1,1,lastRow,lastCol).getValues(),h=v[0].map(String);
  return v.slice(1).filter(function(r){return r.some(function(x){return x!==''&&x!==null;});}).map(function(r){const o={};h.forEach(function(k,i){o[k]=r[i];});return o;});
}
function v2LegacySchoolDetail_(u,id){
  const current=v2Rows_(V2_OS.S.SCHOOLS).find(function(r){return String(r.school_id)===String(id);});
  if(!current||!v2CanSeeSchool_(u,current))throw new Error('Không có quyền xem trường này.');
  const scope=v2LineageScope_(id),set={};scope.ids.forEach(function(x){set[String(x)]=true;});
  const schools=v2LegacyRows_(V2_LEGACY_READ.S.SCHOOLS).filter(function(r){return set[String(r.school_id||'')];});
  const contacts=v2LegacyRows_(V2_LEGACY_READ.S.CONTACTS).filter(function(r){return set[String(r.school_id||'')];}).map(function(r){return Object.assign({},r,{origin_school_id:String(r.school_id||''),is_predecessor:String(r.school_id||'')!==String(id),source_system:'7.9'});});
  const interactions=v2LegacyRows_(V2_LEGACY_READ.S.ACTIVITIES).filter(function(r){return set[String(r.school_id||'')];}).map(function(r){return {interaction_id:r.event_id||'',school_id:r.school_id||'',school_name:r.school_name||'',interaction_type:r.event_type||'',interaction_at:r.timestamp||'',summary:r.summary||'',channel:r.channel||'',actor:r.actor||'',detail_json:r.detail_json||'',hot_signal:r.hot_signal||'',origin_school_id:String(r.school_id||''),is_predecessor:String(r.school_id||'')!==String(id),source_system:'7.9'};}).sort(function(a,b){return String(b.interaction_at||'').localeCompare(String(a.interaction_at||''));});
  const tasks=v2LegacyRows_(V2_LEGACY_READ.S.TASKS).filter(function(r){return set[String(r.school_id||'')];}).map(function(r){return Object.assign({},r,{origin_school_id:String(r.school_id||''),is_predecessor:String(r.school_id||'')!==String(id),source_system:'7.9'});});
  return {schools:schools,contacts:contacts,interactions:interactions,tasks:tasks,history_scope:scope.ids,source:'7.9_SUNBOT_SCHOOL_OS_PRODUCTION'};
}
