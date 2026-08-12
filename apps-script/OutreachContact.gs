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

  // Ghi ngược contact đã xác minh về bảng outreach nguồn để lần sync sau không kéo dữ liệu cũ trở lại.
  try {
    if (row.source_sheet && row.source_row) {
      const src = SpreadsheetApp.openById(OUTREACH.SOURCE_SPREADSHEET_ID).getSheetByName(String(row.source_sheet));
      if (src) {
        const sourceRow = Number(row.source_row);
        if (email) src.getRange(sourceRow, 8).setValue(email);
        if (phone) src.getRange(sourceRow, 9).setValue(phone);
      }
    }
  } catch (syncErr) {
    audit_(user,'CONTACT_SOURCE_SYNC_WARNING',OUTREACH.SHEET,row.outreach_id,{error:String(syncErr.message||syncErr)});
  }

  audit_(user,'VERIFY_CONTACT',OUTREACH.SHEET,row.outreach_id,{email:email,phone:phone,status:patch.trang_thai_thuc_hien||row.trang_thai_thuc_hien});
  return {ok:true,message:email?'Đã xác minh contact. Trường đã sẵn sàng để soạn thư.':'Đã cập nhật contact; vẫn cần email xác minh trước khi gửi.',status:patch.trang_thai_thuc_hien||row.trang_thai_thuc_hien};
}
