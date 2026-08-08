const V2_FRONTEND_CSS='https://cdn.jsdelivr.net/gh/sunbotvietnam/sunbot-ops@main/frontend/styles.css';
const V2_FRONTEND_JS='https://cdn.jsdelivr.net/gh/sunbotvietnam/sunbot-ops@main/frontend/app.js';

function renderV2LiveApp_(){
  ensureProductionProperties_();
  const data=buildV2LiveData_();
  const json=JSON.stringify(data).replace(/</g,'\\u003c');
  const html='<!doctype html><html lang="vi"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f97316"><title>SUNBOT OPS V2</title><link rel="stylesheet" href="'+V2_FRONTEND_CSS+'?v=live2"></head><body><div id="app"></div><script>window.SUNBOT_LIVE_DATA='+json+';</script><script src="'+V2_FRONTEND_JS+'?v=live2"></script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS V2').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildV2LiveData_(){
  const people=getAll_(APP.SHEETS.PEOPLE);
  const roles=getAll_(APP.SHEETS.USER_ROLES);
  const tasks=getAll_(APP.SHEETS.TASKS).filter(r=>!['DONE','CANCELLED'].includes(String(r.trang_thai||'').toUpperCase()));
  const ids={ceo:'USR-TUONGVAN1906',dung:'TCH-LTD-012',thu:'TCH-NTA-014',nhung:'UP-HOANG-NHUNG'};
  const roleLabel={
    'REGION_LEAD':'Trưởng nhóm Bắc Miền Trung','MARKET':'Phát triển thị trường','TRAINER':'Đào tạo & chuyển giao',
    'SALE_OPS':'Sales Operations','OPS_ADMIN':'Vận hành nội bộ','CEO':'CEO','ADMIN':'Quản trị hệ thống'
  };
  const nameById={}; people.forEach(p=>nameById[String(p.user_id)]=String(p.ho_ten||p.user_id));
  const roleCodesById={}; roles.forEach(r=>{const id=String(r.user_id);(roleCodesById[id]||(roleCodesById[id]=[])).push(String(r.role_code));});
  function person(id){return people.find(p=>String(p.user_id)===id)||{user_id:id,ho_ten:id,dia_ban:''};}
  function personRoles(id){return (roleCodesById[id]||[]).map(x=>roleLabel[x]||x);}
  function ownerTasks(id){return tasks.filter(t=>String(t.owner_user_id)===id);}
  function attentionFor(id,isCeo){
    let rows=isCeo?tasks.filter(t=>bool_(t.can_ceo)):ownerTasks(id).filter(t=>bool_(t.can_ceo)||String(t.muc_uu_tien)==='1');
    return rows.sort(taskSort_).slice(0,5).map(t=>[
      bool_(t.can_ceo)?'red':'orange',String(t.ten_cong_viec||''),String(t.noi_dung_can_ceo||t.hanh_dong_tiep||''),v2Date_(t.han_hoan_thanh||t.ngay_hanh_dong_tiep)
    ]);
  }
  function profile(key,id,label,scope,isCeo){
    const p=person(id), own=ownerTasks(id), doing=own.filter(t=>String(t.trang_thai)==='DOING').length, ceo=own.filter(t=>bool_(t.can_ceo)).length;
    return {name:String(p.ho_ten||id),shortName:key==='ceo'?'Vân':String(p.ho_ten||'').split(' ').slice(-1)[0],role:label,scope:scope||String(p.dia_ban||''),kpis:[
      [isCeo?'Cần CEO':'Việc đang mở',isCeo?String(tasks.filter(t=>bool_(t.can_ceo)).length):String(own.length),isCeo?'quyết định / điểm nghẽn':'công việc đang mở'],
      ['Đang thực hiện',String(isCeo?tasks.filter(t=>String(t.trang_thai)==='DOING').length:doing),'trạng thái DOING'],
      [isCeo?'Đội ngũ chính':'Cần CEO',isCeo?'3':String(ceo),isCeo?'Dung · Thu · Nhung':'điểm cần quyết định'],
      ['Vai trò',isCeo?'CEO':String(personRoles(id).length),isCeo?'Toàn hệ thống':personRoles(id).join(' + ')]
    ],attention:attentionFor(id,isCeo)};
  }
  const profiles={
    ceo:profile('ceo',ids.ceo,'CEO · Kiro Việt Nam','Toàn hệ thống',true),
    dung:profile('dung',ids.dung,'Trưởng nhóm Bắc Miền Trung · Market','Nghệ An · Bắc Miền Trung',false),
    thu:profile('thu',ids.thu,'Market · Trainer','Đông Bắc · lân cận Hà Nội',false),
    nhung:profile('nhung',ids.nhung,'Sales Operations · Ops Admin','Hà Nội',false)
  };
  const team=['dung','thu','nhung'].map(key=>{const id=ids[key],p=person(id),rs=personRoles(id);return {key:key,id:id,name:String(p.ho_ten||id),role:rs.join(' · '),area:String(p.dia_ban||''),open:ownerTasks(id).length};});
  const ownerLabel={};ownerLabel[ids.ceo]='CEO';ownerLabel[ids.dung]='Dung';ownerLabel[ids.thu]='Thu';ownerLabel[ids.nhung]='Nhung';
  const taskRows=tasks.sort(taskSort_).map(t=>[String(t.muc_uu_tien||'2'),String(t.ten_cong_viec||''),ownerLabel[String(t.owner_user_id)]||nameById[String(t.owner_user_id)]||String(t.owner_user_id),String(t.trang_thai||''),v2Date_(t.han_hoan_thanh),bool_(t.can_ceo)?'Có':'Không',String(t.owner_user_id||''),String(t.hanh_dong_tiep||'')]);
  return {profiles:profiles,team:team,tasks:taskRows,meta:{updatedAt:Utilities.formatDate(new Date(),APP.TZ,'dd/MM/yyyy HH:mm'),logoutUrl:OTP_PRODUCTION_URL}};
}

function v2Date_(value){
  if(!value)return '';
  const d=parseDate_(value); if(!d)return String(value);
  return Utilities.formatDate(d,APP.TZ,'dd/MM');
}
