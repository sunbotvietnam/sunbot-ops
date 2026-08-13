const OUTREACH = Object.freeze({
  SHEET: 'TIEP_CAN_TRUONG',
  SOURCE_SPREADSHEET_ID: '15HScpr2jEA-3wPQkNzbUz3XEpPIbG_i3bRqOujHYBXQ',
  CC_EMAIL: 'sunbotvietnam@gmail.com',
  SOURCE_SHEETS: [
    {name:'HN_OUTREACH_12082026', province:'Hà Nội', owner:'UP-HOANG-NHUNG'},
    {name:'NA_OUTREACH_12082026', province:'Nghệ An', owner:'TCH-LTD-012'},
    {name:'HP_OUTREACH_12082026', province:'Hải Phòng', owner:'TCH-NTA-014'},
    {name:'BN_OUTREACH_12082026', province:'Bắc Ninh', owner:'TCH-NTA-014'},
    {name:'DN_OUTREACH_12082026', province:'Đà Nẵng', owner:'TCH-LTD-012'}
  ],
  HEADERS: ['outreach_id','source_key','source_sheet','source_row','account_id','owner_user_id','tinh_thanh','nhom','uu_tien','quyet_dinh','ten_truong','loai_hinh','quan_he_sunbot','dia_chi_thu_tin','email_truong','dien_thoai_dau_moi','tinh_hinh_steam','cap_nhat_moi','thong_diep_de_xuat','hanh_dong_de_xuat','tin_cay_contact','nguon_xac_minh','dot_trien_khai','trang_thai_thuc_hien','ngay_gui','email_nguoi_gui','ngay_theo_doi_lai','ket_qua_phan_hoi','work_id','updated_at']
});

function apiSessionOutreach(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchema_();
  payload = payload || {};
  switch (action) {
    case 'list': return outreachList_(user, payload);
    case 'summary': return outreachSummary_(user);
    case 'sync': return outreachSync_(user);
    case 'prepareEmail': return outreachPrepareEmail_(user, payload);
    case 'markSent': return outreachMarkSent_(user, payload);
    case 'updateStatus': return outreachUpdateStatus_(user, payload);
    case 'createOpportunity': return outreachCreateOpportunity_(user, payload);
    default: throw new Error('Tác vụ tiếp cận trường không hợp lệ.');
  }
}

function ensureOutreachRuntimeSchema_() {
  const ss = getDb_();
  let sh = ss.getSheetByName(OUTREACH.SHEET);
  if (!sh) {
    sh = ss.insertSheet(OUTREACH.SHEET);
    sh.getRange(1,1,1,OUTREACH.HEADERS.length).setValues([OUTREACH.HEADERS]);
    sh.setFrozenRows(1);
  }
  const hs = headers_(sh).map(String);
  const missing = OUTREACH.HEADERS.filter(h => !hs.includes(h));
  if (missing.length) throw new Error('Database thiếu cột Tiếp cận trường: ' + missing.join(', '));
  if (sh.getLastRow() <= 1) syncOutreachFromSource_(null, true);
}

function outreachSync_(user) {
  if (!(user.permissions['ceo.view'] || user.permissions['admin.people'] || user.permissions['account.view_all'])) {
    throw new Error('Bạn không có quyền đồng bộ danh sách trường.');
  }
  const result = syncOutreachFromSource_(user, false);
  return {ok:true, message:'Đã đồng bộ danh sách tiếp cận trường.', ...result};
}

function syncOutreachFromSource_(user, silent) {
  const source = SpreadsheetApp.openById(OUTREACH.SOURCE_SPREADSHEET_ID);
  let created = 0, updated = 0, accountsCreated = 0, tasksCreated = 0;
  OUTREACH.SOURCE_SHEETS.forEach(cfg => {
    const sh = source.getSheetByName(cfg.name);
    if (!sh) return;
    const values = sh.getDataRange().getDisplayValues();
    if (values.length < 4) return;
    for (let i = 3; i < values.length; i++) {
      const r = values[i];
      if (!String(r[3] || '').trim()) continue;
      const sourceKey = cfg.name + ':' + (i + 1);
      const existing = findOne_(OUTREACH.SHEET, 'source_key', sourceKey);
      const accountResult = ensureOutreachAccount_(cfg, r, existing);
      if (accountResult.created) accountsCreated++;
      const email = extractVerifiedEmail_(r[7]);
      const row = {
        source_key: sourceKey,
        source_sheet: cfg.name,
        source_row: i + 1,
        account_id: accountResult.account_id,
        owner_user_id: cfg.owner,
        tinh_thanh: cfg.province,
        nhom: r[0] || '',
        uu_tien: r[1] || '',
        quyet_dinh: r[2] || '',
        ten_truong: r[3] || '',
        loai_hinh: r[4] || '',
        quan_he_sunbot: r[5] || '',
        dia_chi_thu_tin: r[6] || '',
        email_truong: email,
        dien_thoai_dau_moi: r[8] || '',
        tinh_hinh_steam: r[9] || '',
        cap_nhat_moi: r[10] || '',
        thong_diep_de_xuat: r[11] || '',
        hanh_dong_de_xuat: r[12] || '',
        tin_cay_contact: r[13] || '',
        nguon_xac_minh: r[14] || '',
        dot_trien_khai: normalizeWave_(r[15]),
        updated_at: now_()
      };
      if (existing) {
        updateById_(OUTREACH.SHEET, 'outreach_id', existing.outreach_id, row);
        updated++;
      } else {
        const outreachId = id_('OUT');
        const status = initialOutreachStatus_(row.dot_trien_khai, row.quyet_dinh, row.email_truong);
        const task = createInitialOutreachTask_(cfg.owner, accountResult.account_id, outreachId, row, status);
        if (task) tasksCreated++;
        append_(OUTREACH.SHEET, {
          outreach_id: outreachId,
          ...row,
          trang_thai_thuc_hien: status,
          ngay_gui: '',
          email_nguoi_gui: '',
          ngay_theo_doi_lai: '',
          ket_qua_phan_hoi: '',
          work_id: task ? task.work_id : ''
        });
        created++;
      }
    }
  });
  if (user && !silent) audit_(user, 'SYNC', OUTREACH.SHEET, 'ALL', {created, updated, accountsCreated, tasksCreated});
  return {created, updated, accountsCreated, tasksCreated};
}

function ensureOutreachAccount_(cfg, r, existing) {
  if (existing && existing.account_id) return {account_id:existing.account_id, created:false};
  const name = String(r[3] || '').trim();
  const all = getAll_('TRUONG');
  const match = all.find(a => normalizeMatch_(a.ten_don_vi) === normalizeMatch_(name) && normalizeMatch_(a.tinh_thanh) === normalizeMatch_(cfg.province));
  if (match) return {account_id:match.account_id, created:false};
  const accountId = id_('ACC');
  const decision = String(r[2] || '').toUpperCase();
  const relationship = String(r[5] || '').toUpperCase();
  let status = 'TARGET';
  if (decision.includes('ACCOUNT HIỆN HỮU') || relationship.includes('ĐANG TRIỂN KHAI')) status = 'CUSTOMER';
  append_('TRUONG', {
    account_id:accountId,
    ten_don_vi:name,
    loai_doi_tuong:r[4] || '',
    tinh_thanh:cfg.province,
    quan_huyen:'',
    khoi_truong:'Mầm non',
    owner_user_id:cfg.owner,
    trang_thai:status,
    mo_hinh_hien_tai:r[9] || '',
    mo_hinh_tiem_nang:r[11] || '',
    nguoi_quyet_dinh:'',
    dien_thoai:r[8] || '',
    viec_tiep_theo:r[12] || '',
    han_viec_tiep_theo:'',
    cong_no_hien_tai:0,
    tai_san:'',
    updated_at:now_()
  });
  return {account_id:accountId, created:true};
}

function createInitialOutreachTask_(ownerUserId, accountId, outreachId, row, status) {
  if (status === 'THEO_DOI' || status === 'CHAM_SOC_ACCOUNT') return null;
  let title = '', dueDays = 3;
  if (status === 'CAN_GUI') { title = 'Soạn và gửi hồ sơ tới ' + row.ten_truong; dueDays = 2; }
  else if (status === 'CAN_XAC_MINH') { title = 'Xác minh thông tin trước khi gửi – ' + row.ten_truong; dueDays = 4; }
  else if (status === 'CAN_XAC_MINH_DU_LIEU') { title = 'Xác minh pháp nhân/contact – ' + row.ten_truong; dueDays = 5; }
  else if (status === 'TIEP_CAN_CHIEN_LUOC') { title = 'Chuẩn bị tiếp cận chiến lược – ' + row.ten_truong; dueDays = 4; }
  else return null;
  const due = addBusinessDaysOutreach_(new Date(), dueDays);
  const workId = id_('WORK');
  append_('CONG_VIEC', {
    work_id:workId,
    ten_cong_viec:title,
    owner_user_id:ownerUserId,
    account_id:accountId,
    opp_id:'',
    nhom_cong_viec:'TIEP_CAN_TRUONG',
    muc_uu_tien:priorityCode_(row.uu_tien),
    trang_thai:'OPEN',
    han_hoan_thanh:dateOutreach_(due),
    hanh_dong_tiep:row.hanh_dong_de_xuat || title,
    ngay_hanh_dong_tiep:dateOutreach_(due),
    can_ceo:'FALSE',
    noi_dung_can_ceo:'',
    ngay_hoan_thanh:'',
    created_at:now_(),
    updated_at:now_()
  });
  return {work_id:workId};
}

function outreachList_(user, p) {
  let rows = getAll_(OUTREACH.SHEET);
  const canAll = !!user.permissions['account.view_all'] || !!user.permissions['task.view_all'] || !!user.permissions['ceo.view'];
  if (!canAll) rows = rows.filter(r => String(r.owner_user_id) === String(user.user_id));
  if (p.status) rows = rows.filter(r => String(r.trang_thai_thuc_hien) === String(p.status));
  if (p.province) rows = rows.filter(r => String(r.tinh_thanh) === String(p.province));
  return rows.slice(0, 500);
}

function outreachSummary_(user) {
  const rows = outreachList_(user, {});
  const counts = {};
  rows.forEach(r => { const s = String(r.trang_thai_thuc_hien || ''); counts[s] = (counts[s] || 0) + 1; });
  return {
    total:rows.length,
    can_lam_hom_nay:(counts.CAN_GUI||0)+(counts.CAN_XAC_MINH||0)+(counts.CAN_XAC_MINH_DU_LIEU||0)+(counts.TIEP_CAN_CHIEN_LUOC||0),
    can_gui:counts.CAN_GUI||0,
    dang_cho_phan_hoi:counts.DANG_CHO_PHAN_HOI||0,
    da_phan_hoi:(counts.DA_PHAN_HOI||0)+(counts.DA_HEN_TRAO_DOI||0),
    da_gui:rows.filter(r=>String(r.ngay_gui||'').trim()).length,
    theo_doi:counts.THEO_DOI||0,
    counts:counts
  };
}

function outreachPrepareEmail_(user, p) {
  required_(p, ['outreach_id']);
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', p.outreach_id);
  assertOutreachOwner_(user, row);
  if (!row.email_truong || !isPlainEmail_(row.email_truong)) throw new Error('Trường chưa có email đã xác minh. Hãy xác minh email trước khi gửi.');
  if (!user.email || !isPlainEmail_(user.email)) throw new Error('Tài khoản của bạn chưa có email Google hợp lệ trong SUNBOT OPS.');
  const subject = subjectForOutreach_(row);
  const body = bodyForOutreach_(user, row);
  if (!String(row.trang_thai_thuc_hien).startsWith('DA_') && row.trang_thai_thuc_hien !== 'DANG_CHO_PHAN_HOI') {
    updateById_(OUTREACH.SHEET, 'outreach_id', row.outreach_id, {trang_thai_thuc_hien:'DANG_SOAN', updated_at:now_()});
  }
  return {
    outreach_id:row.outreach_id,
    from_email:user.email,
    to_email:row.email_truong,
    cc_email:OUTREACH.CC_EMAIL,
    subject:subject,
    body:body,
    attachment_note:'Email đã gắn Digital Profile mới theo loại hình trường và attribution của người gửi. Tài liệu bổ sung chỉ gửi khi phù hợp với từng cơ hội.',
    school:row.ten_truong
  };
}

function outreachMarkSent_(user, p) {
  required_(p, ['outreach_id']);
  const row = findOne_(OUTREACH.SHEET, 'outreach_id', p.outreach_id);
  assertOutreachOwner_(user, row);
  const follow = addBusinessDaysOutreach_(new Date(), Number(p.followup_days || 3));
  const followDate = dateOutreach_(follow);
  if (row.work_id) {
    try { updateById_('CONG_VIEC','work_id',row.work_id,{trang_thai:'DONE',ngay_hoan_thanh:dateOutreach_(new Date()),updated_at:now_()}); } catch (e) {}
  }
  const nextWorkId = id_('WORK');
  append_('CONG_VIEC', {
    work_id:nextWorkId,
    ten_cong_viec:'Theo dõi phản hồi – ' + row.ten_truong,
    owner_user_id:user.user_id,
    account_id:row.account_id || '',
    opp_id:'',
    nhom_cong_viec:'TIEP_CAN_TRUONG',
    muc_uu_tien:priorityCode_(row.uu_tien),
    trang_thai:'OPEN',
    han_hoan_thanh:followDate,
    hanh_dong_tiep:'Liên hệ lại để xác nhận BGH đã nhận hồ sơ và hỏi bước tiếp theo.',
    ngay_hanh_dong_tiep:followDate,
    can_ceo:'FALSE',
    noi_dung_can_ceo:'',
    ngay_hoan_thanh:'',
    created_at:now_(),
    updated_at:now_()
  });
  const updateId = id_('CN');
  append_('CAP_NHAT', {
    update_id:updateId,
    thoi_gian:now_(),
    user_id:user.user_id,
    account_id:row.account_id || '',
    opp_id:'',
    work_id:row.work_id || '',
    loai_cap_nhat:'TIEP_CAN_TRUONG',
    trang_thai_truoc:row.trang_thai_thuc_hien || '',
    trang_thai_moi:'DANG_CHO_PHAN_HOI',
    ket_qua:'Đã gửi hồ sơ tới ' + row.ten_truong + ' từ ' + user.email + ', CC ' + OUTREACH.CC_EMAIL + '.',
    viec_tiep_theo:'Theo dõi phản hồi của trường.',
    han:followDate,
    muc_do:'BINH_THUONG',
    can_ceo:'FALSE',
    noi_dung_can_ceo:'',
    bang_chung_url:''
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{
    trang_thai_thuc_hien:'DANG_CHO_PHAN_HOI',
    ngay_gui:now_(),
    email_nguoi_gui:user.email,
    ngay_theo_doi_lai:followDate,
    work_id:nextWorkId,
    updated_at:now_()
  });
  audit_(user,'EMAIL_SENT_CONFIRMED',OUTREACH.SHEET,row.outreach_id,{to:row.email_truong,cc:OUTREACH.CC_EMAIL,followup:followDate});
  return {ok:true, message:'Đã ghi nhận gửi thư và tạo việc theo dõi lại vào ' + followDate + '.', followup_date:followDate};
}

function outreachUpdateStatus_(user, p) {
  required_(p, ['outreach_id','status']);
  const row = findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  const allowed = ['CAN_GUI','CAN_XAC_MINH','CAN_XAC_MINH_DU_LIEU','TIEP_CAN_CHIEN_LUOC','DANG_SOAN','DANG_CHO_PHAN_HOI','DA_PHAN_HOI','DA_HEN_TRAO_DOI','DA_TAO_CO_HOI','TAM_DUNG','THEO_DOI','CHAM_SOC_ACCOUNT'];
  const status = String(p.status).toUpperCase();
  if (!allowed.includes(status)) throw new Error('Trạng thái tiếp cận không hợp lệ.');
  const patch = {trang_thai_thuc_hien:status, updated_at:now_()};
  if (p.result !== undefined) patch.ket_qua_phan_hoi = String(p.result || '').trim();
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,patch);
  if (p.result) {
    const next = status === 'DA_HEN_TRAO_DOI' ? 'Chuẩn bị buổi trao đổi với trường.' : 'Xác định bước tiếp theo sau phản hồi.';
    const due = dateOutreach_(addBusinessDaysOutreach_(new Date(),2));
    append_('CAP_NHAT',{update_id:id_('CN'),thoi_gian:now_(),user_id:user.user_id,account_id:row.account_id||'',opp_id:'',work_id:row.work_id||'',loai_cap_nhat:'TIEP_CAN_TRUONG',trang_thai_truoc:row.trang_thai_thuc_hien||'',trang_thai_moi:status,ket_qua:String(p.result).trim(),viec_tiep_theo:next,han:due,muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:''});
  }
  audit_(user,'STATUS_CHANGE',OUTREACH.SHEET,row.outreach_id,{from:row.trang_thai_thuc_hien,to:status,result:p.result||''});
  return {ok:true,message:'Đã cập nhật trạng thái tiếp cận.'};
}

function outreachCreateOpportunity_(user,p) {
  required_(p,['outreach_id']);
  const row=findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  const result=commercialCreateOpportunity_(user,{
    account_id:row.account_id,
    ten_co_hoi:p.ten_co_hoi || ('Cơ hội Sunbot – ' + row.ten_truong),
    san_pham:p.san_pham || 'Lập trình tư duy cùng Sunbot',
    trang_thai:'DISCOVERY',
    gia_tri_du_kien:Number(p.gia_tri_du_kien||0),
    viec_tiep_theo:p.viec_tiep_theo || 'Làm rõ nhu cầu và cấu hình đề xuất.',
    han_viec_tiep_theo:p.han_viec_tiep_theo || dateOutreach_(addBusinessDaysOutreach_(new Date(),3)),
    nguon:'TIEP_CAN_TRUONG'
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{trang_thai_thuc_hien:'DA_TAO_CO_HOI',updated_at:now_()});
  return {ok:true,opp_id:result.opp_id,message:'Đã tạo cơ hội kinh doanh từ hoạt động tiếp cận trường.'};
}

function assertOutreachOwner_(user,row) {
  if (!row) throw new Error('Không tìm thấy trường trong danh sách tiếp cận.');
  const canAll=!!user.permissions['account.view_all']||!!user.permissions['task.view_all']||!!user.permissions['ceo.view'];
  if (!canAll && String(row.owner_user_id)!==String(user.user_id)) throw new Error('Bạn không phụ trách trường này.');
}

function subjectForOutreach_(row) {
  const d = String(row.quyet_dinh || '').toUpperCase();
  if (d.includes('RE-ENTRY') || String(row.quan_he_sunbot||'').toUpperCase().includes('ĐÃ')) return 'Trao đổi đề xuất hợp tác Sunbot năm học 2026–2027 – ' + row.ten_truong;
  if (d.includes('CHIẾN LƯỢC') || d.includes('PARTNERSHIP') || String(row.uu_tien||'').toUpperCase().includes('STRATEGIC')) return 'Đề xuất trao đổi chuyên môn về Robotics, tư duy tính toán và STEAM – ' + row.ten_truong;
  return 'Đề xuất phối hợp triển khai chương trình Sunbot năm học 2026–2027 – ' + row.ten_truong;
}

function profileAudienceForOutreach_(row) {
  const type = normalizeMatch_(row.loai_hinh || '');
  if (/he thong|chuoi|system|nhieu co so|multi site/.test(type)) return 'system';
  if (/tu thuc|tu nhan|private|quoc te|ngoai cong lap/.test(type)) return 'private';
  return 'public';
}

function profileLinkForOutreach_(row,user) {
  const audience = profileAudienceForOutreach_(row);
  const params = [
    'audience=' + encodeURIComponent(audience),
    'guided=1',
    'from=outreach'
  ];
  if (row.ten_truong) params.push('school=' + encodeURIComponent(String(row.ten_truong)));
  if (user && user.ho_ten) params.push('sender=' + encodeURIComponent(String(user.ho_ten)));
  if (user && user.email) params.push('sender_email=' + encodeURIComponent(String(user.email)));
  if (row.outreach_id) {
    params.push('source=' + encodeURIComponent(String(row.outreach_id)));
    params.push('lid=' + encodeURIComponent(String(row.outreach_id)));
  }
  return 'https://sunbotvietnam.github.io/portal/profile-v2/?' + params.join('&');
}

function bodyForOutreach_(user,row) {
  const intro = 'Kính gửi Ban Giám hiệu ' + row.ten_truong + ',\n\nEm là ' + user.ho_ten + ', phụ trách phát triển thị trường Sunbot tại Công ty Cổ phần Công nghệ Giáo dục Kiro Việt Nam.';
  const about = '\n\nSunbot là giải pháp giáo dục công nghệ dành cho trẻ mầm non, kết hợp chương trình, robot, học liệu, đào tạo giáo viên, tổ chức vận hành và hệ thống quan sát – đánh giá sự phát triển của trẻ.';
  const personal = row.thong_diep_de_xuat ? '\n\nQua tìm hiểu về nhà trường, em xin phép đề xuất hướng trao đổi phù hợp: ' + row.thong_diep_de_xuat : '';
  const profile = '\n\nEm xin gửi Ban Giám hiệu hồ sơ Sunbot để tiện tham khảo:\n' + profileLinkForOutreach_(row,user);
  const close = '\n\nNếu phù hợp, em mong được sắp xếp một buổi trao đổi ngắn để cùng nhà trường làm rõ nhu cầu và lựa chọn phương án triển khai phù hợp trong năm học 2026–2027.\n\nTrân trọng,\n' + user.ho_ten + '\nSunbot – Kiro Việt Nam\nEmail: ' + user.email;
  return intro + about + personal + profile + close;
}

function extractVerifiedEmail_(text) {
  const s=String(text||'').trim();
  const m=s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if(!m) return '';
  if(/chưa xác minh|cần xác minh|lịch sử|thứ cấp/i.test(s)) return '';
  return m[0].toLowerCase();
}
function isPlainEmail_(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());}
function normalizeMatch_(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
function normalizeWave_(v){const s=String(v||'').toUpperCase();if(s.includes('WAVE A'))return'WAVE_A';if(s.includes('WAVE B'))return'WAVE_B';if(s.includes('WAVE C'))return'WAVE_C';if(s.includes('WAVE D'))return'WAVE_D';if(s.includes('WAVE 0'))return'WAVE_0';return'WAVE_B';}
function initialOutreachStatus_(wave,decision,email){const d=String(decision||'').toUpperCase();if(d.includes('KHÔNG GỬI INTRO'))return'CHAM_SOC_ACCOUNT';if(wave==='WAVE_0')return'CAN_XAC_MINH_DU_LIEU';if(wave==='WAVE_D')return'THEO_DOI';if(wave==='WAVE_C')return'TIEP_CAN_CHIEN_LUOC';if(wave==='WAVE_A')return email?'CAN_GUI':'CAN_XAC_MINH';return'CAN_XAC_MINH';}
function priorityCode_(v){const s=String(v||'').toUpperCase();if(s.includes('P1'))return'P1';if(s.includes('P2'))return'P2';return'P3';}
function addBusinessDaysOutreach_(date,days){const d=new Date(date.getTime());let n=0;while(n<days){d.setDate(d.getDate()+1);const day=d.getDay();if(day!==0&&day!==6)n++;}return d;}
function dateOutreach_(d){return Utilities.formatDate(d,'Asia/Ho_Chi_Minh','yyyy-MM-dd');}
