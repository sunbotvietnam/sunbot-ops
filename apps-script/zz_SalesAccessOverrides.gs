// Hierarchy-aware overrides. File name intentionally sorts late in Apps Script source order.
function assertOutreachOwner_(user,row){if(!row)throw new Error('Không tìm thấy trường trong danh sách tiếp cận.');ensureSalesAdminRuntime_();if(!salesCanAccessRow_(user,row))throw new Error('Bạn không được phân công quản lý trường này.');}

function outreachList_(user,p){ensureSalesAdminRuntime_();let rows=getAll_(OUTREACH.SHEET).filter(function(r){return salesCanAccessRow_(user,r);});if(p.status)rows=rows.filter(function(r){return String(r.trang_thai_thuc_hien)===String(p.status);});if(p.province)rows=rows.filter(function(r){return String(r.tinh_thanh)===String(p.province);});return rows.slice(0,500);}

function outreachWorkspacePeople_(user){ensureSalesAdminRuntime_();return salesAssignablePeople_(user);}

function outreachWorkspaceDetail_(user,p){
  required_(p,['outreach_id']);ensureSalesAdminRuntime_();const row=findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);assertOutreachOwner_(user,row);
  const account=row.account_id?findOne_('TRUONG','account_id',row.account_id):null;
  const tasks=getAll_('CONG_VIEC').filter(function(t){return String(t.account_id||'')===String(row.account_id||'')&&!['DONE','CANCELLED'].includes(String(t.trang_thai||''));}).sort(function(a,b){return String(a.han_hoan_thanh||a.ngay_hanh_dong_tiep||'').localeCompare(String(b.han_hoan_thanh||b.ngay_hanh_dong_tiep||''));}).slice(0,8);
  const opportunities=getAll_('CO_HOI').filter(function(o){return String(o.account_id||'')===String(row.account_id||'')&&String(o.trang_thai||'')!=='LOST';}).slice(0,8);
  const owner=findOne_(APP.SHEETS.PEOPLE,'user_id',row.owner_user_id),rc=roleClass_(user),canReassign=rc==='ADMIN'||rc==='LEADER';
  return{outreach:row,account:account||{},owner:owner?{user_id:owner.user_id,ho_ten:owner.ho_ten,email:owner.email,dia_ban:owner.dia_ban}:{},tasks:tasks,opportunities:opportunities,can_reassign:canReassign,people:canReassign?salesAssignablePeople_(user).people:[],viewer_role:rc};
}

function outreachWorkspaceReassign_(user,p){
  required_(p,['outreach_id','owner_user_id']);ensureSalesAdminRuntime_();
  const row=findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);if(!row)throw new Error('Không tìm thấy trường.');
  if(!salesCanAccessRow_(user,row))throw new Error('Bạn không có quyền giao lại trường này.');
  if(roleClass_(user)==='STAFF')throw new Error('Staff không được giao trường ngược cho Leader hoặc người khác.');
  if(!canAssignTo_(user,p.owner_user_id))throw new Error('Không thể giao trường theo hướng vai trò này. Leader chỉ giao cho chính mình hoặc Staff; Admin không được nhận trường từ Leader/Staff.');
  const person=findOne_(APP.SHEETS.PEOPLE,'user_id',p.owner_user_id);if(!person||!isActiveStatus_(person.trang_thai))throw new Error('Người phụ trách không hợp lệ.');
  const oldOwner=String(row.owner_user_id||''),patch={owner_user_id:person.user_id,assigned_by_user_id:String(user.user_id),updated_at:now_()};
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,patch);
  if(row.account_id)try{updateById_('TRUONG','account_id',row.account_id,{owner_user_id:person.user_id,updated_at:now_()});}catch(ignored){}
  getAll_('CONG_VIEC').filter(function(t){return String(t.account_id||'')===String(row.account_id||'')&&!['DONE','CANCELLED'].includes(String(t.trang_thai||''));}).forEach(function(t){try{updateById_('CONG_VIEC','work_id',t.work_id,{owner_user_id:person.user_id,updated_at:now_()});}catch(ignored){}});
  audit_(user,'REASSIGN',OUTREACH.SHEET,row.outreach_id,{from:oldOwner,to:person.user_id,actor_role:roleClass_(user)});
  try{CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX+String(user.user_id));}catch(ignored){}
  return{ok:true,message:'Đã giao '+row.ten_truong+' cho '+person.ho_ten+'.'};
}
