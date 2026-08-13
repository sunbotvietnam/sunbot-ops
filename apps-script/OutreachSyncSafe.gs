function ensureOutreachRuntimeSchemaSafe_() {
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{return ensureOutreachRuntimeSchema_();}
  finally{lock.releaseLock();}
}

function apiSessionOutreachSyncSafe(sessionToken, action, payload) {
  const user=authenticateSession_(sessionToken);
  if(!(user.permissions['ceo.view']||user.permissions['admin.people']||user.permissions['account.view_all'])) throw new Error('Bạn không có quyền đồng bộ danh sách trường.');
  if(String(action||'')!=='sync') throw new Error('Tác vụ đồng bộ không hợp lệ.');
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    ensureOutreachRuntimeSchema_();
    const result=syncOutreachFromSource_(user,false);
    return Object.assign({ok:true,message:'Đã đồng bộ danh sách trường an toàn.'},result);
  }finally{lock.releaseLock();}
}
