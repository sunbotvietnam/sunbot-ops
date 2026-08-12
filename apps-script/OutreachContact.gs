function apiSessionOutreachContact(sessionToken, payload) {
  const user = authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchema_();
  payload = payload || {};
  required_(payload, ['outreach_id']);
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', payload.outreach_id);
  assertOutreachOwner_(user, row);

  const email = String(payload.email_truong || '').trim().toLowerCase();
  if (email && !isPlainEmail_(email)) throw new Error('Email trường không hợp lệ.');
  const phone = String(payload.dien_thoai_dau_moi || '').trim();
  const patch = {email_truong:email, dien_thoai_dau_moi:phone, updated_at:now_()};

  if (email && ['CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU'].includes(String(row.trang_thai_thuc_hien))) {
    if (row.work_id) {
      try { updateById_('CONG_VIEC','work_id',row.work_id,{trang_thai:'DONE',ngay_hoan_thanh:dateOutreach_(new Date()),updated_at:now_()}); } catch (e) {}
    }
    const due = dateOutreach_(addBusinessDaysOutreach_(new Date(),2));
    const workId = id_('WORK');
    append_('CONG_VIEC', {
      work_id:workId,
      ten_cong_viec:'Soạn và gửi hồ sơ tới ' + row.ten_truong,
      owner_user_id:user.user_id,
      account_id:row.account_id || '',
      opp_id:'',
      nhom_cong_viec:'TIEP_CAN_TRUONG',
      muc_uu_tien:priorityCode_(row.uu_tien),
      trang_thai:'OPEN',
      han_hoan_thanh:due,
      hanh_dong_tiep:'Soạn thư phù hợp và gửi hồ sơ tới email đã xác minh.',
      ngay_hanh_dong_tiep:due,
      can_ceo:'FALSE',
      noi_dung_can_ceo:'',
      ngay_hoan_thanh:'',
      created_at:now_(),
      updated_at:now_()
    });
    patch.trang_thai_thuc_hien = 'CAN_GUI';
    patch.work_id = workId;
  }
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,patch);
  if (row.account_id && phone) {
    try { updateById_('TRUONG','account_id',row.account_id,{dien_thoai:phone,updated_at:now_()}); } catch (e) {}
  }
  audit_(user,'VERIFY_CONTACT',OUTREACH.SHEET,row.outreach_id,{email:email,phone:phone,status:patch.trang_thai_thuc_hien||row.trang_thai_thuc_hien});
  return {ok:true,message:email?'Đã xác minh contact. Trường đã sẵn sàng để soạn thư.':'Đã cập nhật contact; vẫn cần email xác minh trước khi gửi.',status:patch.trang_thai_thuc_hien||row.trang_thai_thuc_hien};
}
