function apiSessionOutreachWorkspace(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchema_();
  payload = payload || {};
  switch (String(action || '')) {
    case 'detail': return outreachWorkspaceDetail_(user, payload);
    case 'save': return outreachWorkspaceSave_(user, payload);
    case 'reassign': return outreachWorkspaceReassign_(user, payload);
    case 'scheduleFollowup': return outreachWorkspaceScheduleFollowup_(user, payload);
    case 'completeTask': return outreachWorkspaceCompleteTask_(user, payload);
    case 'people': return outreachWorkspacePeople_(user);
    default: throw new Error('Tác vụ hồ sơ trường không hợp lệ.');
  }
}

function outreachWorkspaceDetail_(user, p) {
  required_(p, ['outreach_id']);
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', p.outreach_id);
  assertOutreachOwner_(user, row);
  const account = row.account_id ? findOne_('TRUONG', 'account_id', row.account_id) : null;
  const tasks = getAll_('CONG_VIEC').filter(function(t){
    return String(t.account_id || '') === String(row.account_id || '') && !['DONE','CANCELLED'].includes(String(t.trang_thai || ''));
  }).sort(function(a,b){ return String(a.han_hoan_thanh || a.ngay_hanh_dong_tiep || '').localeCompare(String(b.han_hoan_thanh || b.ngay_hanh_dong_tiep || '')); }).slice(0,8);
  const opportunities = getAll_('CO_HOI').filter(function(o){
    return String(o.account_id || '') === String(row.account_id || '') && String(o.trang_thai || '') !== 'LOST';
  }).slice(0,8);
  const owner = findOne_(APP.SHEETS.PEOPLE, 'user_id', row.owner_user_id);
  const canReassign = !!(user.permissions['ceo.view'] || user.permissions['admin.people'] || user.permissions['account.view_all']);
  return {
    outreach: row,
    account: account || {},
    owner: owner ? {user_id:owner.user_id,ho_ten:owner.ho_ten,email:owner.email,dia_ban:owner.dia_ban} : {},
    tasks: tasks,
    opportunities: opportunities,
    can_reassign: canReassign,
    people: canReassign ? outreachWorkspacePeople_(user).people : []
  };
}

function outreachWorkspacePeople_(user) {
  if (!(user.permissions['ceo.view'] || user.permissions['admin.people'] || user.permissions['account.view_all'])) {
    return {people:[]};
  }
  const people = getAll_(APP.SHEETS.PEOPLE).filter(function(p){ return isActiveStatus_(p.trang_thai) && String(p.email || '').trim(); }).map(function(p){
    return {user_id:String(p.user_id),ho_ten:String(p.ho_ten || ''),email:String(p.email || ''),dia_ban:String(p.dia_ban || '')};
  }).sort(function(a,b){return a.ho_ten.localeCompare(b.ho_ten,'vi');});
  return {people:people};
}

function outreachWorkspaceSave_(user, p) {
  required_(p, ['outreach_id']);
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', p.outreach_id);
  assertOutreachOwner_(user, row);
  const patch = {updated_at:now_()};
  if (p.email_truong !== undefined) {
    const email = String(p.email_truong || '').trim().toLowerCase();
    if (email && !isPlainEmail_(email)) throw new Error('Email trường không hợp lệ.');
    patch.email_truong = email;
  }
  if (p.dien_thoai_dau_moi !== undefined) patch.dien_thoai_dau_moi = String(p.dien_thoai_dau_moi || '').trim();
  if (p.dia_chi_thu_tin !== undefined) patch.dia_chi_thu_tin = String(p.dia_chi_thu_tin || '').trim();
  if (p.hanh_dong_de_xuat !== undefined) patch.hanh_dong_de_xuat = String(p.hanh_dong_de_xuat || '').trim();
  if (p.thong_diep_de_xuat !== undefined) patch.thong_diep_de_xuat = String(p.thong_diep_de_xuat || '').trim();
  if (p.ket_qua_phan_hoi !== undefined) patch.ket_qua_phan_hoi = String(p.ket_qua_phan_hoi || '').trim();
  if (p.ngay_theo_doi_lai !== undefined) patch.ngay_theo_doi_lai = String(p.ngay_theo_doi_lai || '').trim();
  updateById_(OUTREACH.SHEET, 'outreach_id', row.outreach_id, patch);

  if (row.account_id) {
    const accountPatch = {updated_at:now_()};
    if (patch.dien_thoai_dau_moi !== undefined) accountPatch.dien_thoai = patch.dien_thoai_dau_moi;
    if (patch.hanh_dong_de_xuat !== undefined) accountPatch.viec_tiep_theo = patch.hanh_dong_de_xuat;
    if (patch.ngay_theo_doi_lai !== undefined) accountPatch.han_viec_tiep_theo = patch.ngay_theo_doi_lai;
    try { updateById_('TRUONG', 'account_id', row.account_id, accountPatch); } catch (ignored) {}
  }

  // Đồng bộ contact và địa chỉ về bảng nghiên cứu nguồn để tránh sync ngược dữ liệu cũ.
  try {
    if (row.source_sheet && row.source_row) {
      const src = SpreadsheetApp.openById(OUTREACH.SOURCE_SPREADSHEET_ID).getSheetByName(String(row.source_sheet));
      if (src) {
        const sourceRow = Number(row.source_row);
        if (patch.dia_chi_thu_tin !== undefined) src.getRange(sourceRow,7).setValue(patch.dia_chi_thu_tin);
        if (patch.email_truong !== undefined) src.getRange(sourceRow,8).setValue(patch.email_truong);
        if (patch.dien_thoai_dau_moi !== undefined) src.getRange(sourceRow,9).setValue(patch.dien_thoai_dau_moi);
        if (patch.thong_diep_de_xuat !== undefined) src.getRange(sourceRow,12).setValue(patch.thong_diep_de_xuat);
        if (patch.hanh_dong_de_xuat !== undefined) src.getRange(sourceRow,13).setValue(patch.hanh_dong_de_xuat);
      }
    }
  } catch (syncErr) {
    audit_(user,'WORKSPACE_SOURCE_SYNC_WARNING',OUTREACH.SHEET,row.outreach_id,{error:String(syncErr.message||syncErr)});
  }

  audit_(user,'WORKSPACE_SAVE',OUTREACH.SHEET,row.outreach_id,patch);
  return {ok:true,message:'Đã lưu thông tin trường.'};
}

function outreachWorkspaceReassign_(user, p) {
  required_(p, ['outreach_id','owner_user_id']);
  if (!(user.permissions['ceo.view'] || user.permissions['admin.people'] || user.permissions['account.view_all'])) throw new Error('Bạn không có quyền đổi người phụ trách.');
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', p.outreach_id);
  if (!row) throw new Error('Không tìm thấy trường.');
  const person = findOne_(APP.SHEETS.PEOPLE, 'user_id', p.owner_user_id);
  if (!person || !isActiveStatus_(person.trang_thai)) throw new Error('Người phụ trách không hợp lệ.');
  const oldOwner = row.owner_user_id || '';
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{owner_user_id:person.user_id,updated_at:now_()});
  if (row.account_id) try { updateById_('TRUONG','account_id',row.account_id,{owner_user_id:person.user_id,updated_at:now_()}); } catch (ignored) {}
  if (row.work_id) try { updateById_('CONG_VIEC','work_id',row.work_id,{owner_user_id:person.user_id,updated_at:now_()}); } catch (ignored) {}
  audit_(user,'REASSIGN',OUTREACH.SHEET,row.outreach_id,{from:oldOwner,to:person.user_id});
  return {ok:true,message:'Đã đổi người phụ trách sang ' + person.ho_ten + '.'};
}

function outreachWorkspaceScheduleFollowup_(user, p) {
  required_(p, ['outreach_id','date','action']);
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', p.outreach_id);
  assertOutreachOwner_(user,row);
  const date = String(p.date || '').trim();
  const action = String(p.action || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Ngày theo dõi không hợp lệ.');
  if (action.length < 5) throw new Error('Hãy ghi rõ việc cần làm tiếp theo.');
  const workId = id_('WORK');
  append_('CONG_VIEC',{
    work_id:workId,ten_cong_viec:action + ' – ' + row.ten_truong,owner_user_id:row.owner_user_id || user.user_id,
    account_id:row.account_id||'',opp_id:'',nhom_cong_viec:'TIEP_CAN_TRUONG',muc_uu_tien:priorityCode_(row.uu_tien),trang_thai:'OPEN',
    han_hoan_thanh:date,hanh_dong_tiep:action,ngay_hanh_dong_tiep:date,can_ceo:'FALSE',noi_dung_can_ceo:'',ngay_hoan_thanh:'',created_at:now_(),updated_at:now_()
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{ngay_theo_doi_lai:date,hanh_dong_de_xuat:action,work_id:workId,updated_at:now_()});
  if (row.account_id) try { updateById_('TRUONG','account_id',row.account_id,{viec_tiep_theo:action,han_viec_tiep_theo:date,updated_at:now_()}); } catch (ignored) {}
  audit_(user,'SCHEDULE_FOLLOWUP',OUTREACH.SHEET,row.outreach_id,{work_id:workId,date:date,action:action});
  return {ok:true,message:'Đã tạo việc theo dõi vào ' + date + '.',work_id:workId};
}

function outreachWorkspaceCompleteTask_(user,p) {
  required_(p,['work_id']);
  const work = findOne_('CONG_VIEC','work_id',p.work_id);
  if (!work) throw new Error('Không tìm thấy công việc.');
  const canAll = !!user.permissions['task.view_all'] || !!user.permissions['ceo.view'];
  if (!canAll && String(work.owner_user_id)!==String(user.user_id)) throw new Error('Bạn không phụ trách công việc này.');
  updateById_('CONG_VIEC','work_id',work.work_id,{trang_thai:'DONE',ngay_hoan_thanh:dateOutreach_(new Date()),updated_at:now_()});
  audit_(user,'COMPLETE_TASK','CONG_VIEC',work.work_id,{account_id:work.account_id||''});
  return {ok:true,message:'Đã hoàn thành công việc.'};
}
